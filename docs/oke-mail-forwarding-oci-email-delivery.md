---
slug: oke-mail-forwarding-oci-email-delivery
title: 用 OKE Postfix 與 OCI Email Delivery 建立自有網域收信轉寄
description: 從 MX、PROXY protocol、STARTTLS、最小寄件權限到原信保存，設計可測試的自有網域郵件轉寄，並說明如何延伸至 Gmail 自訂寄件地址。
category: 郵件系統與 Kubernetes
tags: [Kubernetes, Postfix, OCI, Email Delivery, SMTP, DKIM, SPF, TDD]
publishDate: 2026-10-29T12:01:00+08:00
---

# 用 OKE Postfix 與 OCI Email Delivery 建立自有網域收信轉寄

少量自有網域郵件不一定需要完整IMAP信箱。若日常收件介面已經是Gmail，可以讓自架Postfix負責接收與排隊，交給OCI Email Delivery外寄，再集中到原本的信箱。

這個設計仍然需要處理DNS、郵件認證、持久佇列與權限。Managed relay只接管外寄，並不提供自有網域的收件匣，也不會自動替Kubernetes建立MX。

## 收信與寄信分成兩條信任邊界

```text
外部寄件主機 → MX → OCI LB TCP25 + PROXY v1
  → 私有 worker NodePort → Postfix → 持久佇列
  → 非 root 轉寄程式 → OCI SMTP465 TLS → Gmail
```

公開listener只接受SMTP收信，不提供帳號登入寄信。外寄使用另一條經驗證TLS與SMTP credentials的連線。即使外寄失敗，原信仍在Postfix佇列等待重試；不回退成直接TCP 25投遞。

既有負載平衡器可新增獨立listener與backend set，不必把SMTP塞進HTTP Ingress，也不必改動網站或資料庫的TCP路由。網路權限分三段：公網到LB的25、LB到指定worker的專用NodePort、worker接受LB子網路來源的該埠。

## 為什麼保留原始寄件 IP

若只有一般TCP proxy，Postfix可能只看到LB或Kubernetes節點IP，郵件來源判讀會失真。這裡讓OCI listener輸出PROXY v1，Postfix在獨立後端埠要求HAProxy protocol，再把正常SMTP流量交給smtpd。

PROXY protocol不是寄件者認證。它是受信proxy傳遞連線資料的機制，所以後端必須限制網路來源，不能對任意公網客戶端開放可以自行宣告來源IP的埠。一般內部SMTP與健康探測保留在另一個埠，避免把兩種協定混在同一入口。

實際公開測試中，Postfix能看到Google寄件主機的公網IP，而不是只看到LB。這比「端口已開」提供更完整的驗證。

## DNS 與 TLS 各自解決不同問題

MX指定外部郵件應送往的主機，該主機需有A記錄。SPF授權服務商代表網域寄信，DKIM讓收件端驗證內容簽章；它們不負責把郵件路由到收件主機。

收信STARTTLS由Postfix使用Let's Encrypt憑證完成；LB用TCP穿透，不把SMTP STARTTLS誤設成連線建立時就必須協商的隱含TLS。寄往OCI則使用465隱含TLS，連線開始就驗證服務端憑證，再送出SMTP認證。

憑證簽發成功只是維運起點，仍需確認續期後Postfix重新載入憑證。自架元件與node-local佇列也需要備份與復原演練。

## Managed relay 不能任意冒用外部 From

OCI要求核准的header From與envelope From。透明轉寄外部郵件時，原始From通常是第三方網域，並不在自己的核准範圍。把任意來源加入approved sender或移除限制都不是合適做法。

此設計由自有地址寄出新信，將有效的原始Reply-To或寄件地址放入Reply-To，內文列出來源資訊，附上完整`original.eml`。純文字預覽保留驗證連結，HTML腳本不執行。原始郵件包含的附件與標頭保存在eml中，方便回查。

代價是收件清單顯示轉寄服務的From，原始寄件者需要看內文或附件。使用者必須先理解並接受這個行為；它不能被描述成完全透明的郵件轉寄。

## 最小權限與可獨立撤銷的憑證

專用OCI使用者只啟用SMTP credentials，不給Console本機密碼、API key或一般管理權限。Policy限制在專用compartment及指定寄件網域，approved sender使用確切地址。

SMTP秘密經stdin匯入固定Kubernetes Secret，不放命令參數、Git或截圖。避免對含明文stringData的Secret使用會留下last-applied註解的工作流。執行時由init container建立非root程式可讀的私有檔案；節點root仍是信任邊界的一部分。

寄件地址限制與收件目的地限制不同。OCI policy限制的是核准From；本案例「只能轉寄到擁有者Gmail」由轉寄程式與Postfix transport map共同實作，不能宣稱OCI policy也限制了收件人。

## 用測試定義服務可用的含義

| 層次 | 檢查內容 |
| --- | --- |
| 郵件轉換 | 原信bytes、Reply-To、HTML預覽、大小限制、固定目的地、穩定Message-ID |
| SMTP提交 | 憑證驗證TLS、固定envelope、錯誤不洩密、失敗暫緩 |
| Postfix設定 | 真實parser解析pipe、非root執行、PROXY後端、無直接外寄fallback |
| 收件政策 | 正確地址250、未知地址550、外部relay拒絕 |
| 端到端 | 外部Gmail寄到MX，再經OCI轉回Gmail，核對簽章、TLS與原信附件 |

部署測試先於公開MX：先驗證私有relay，再簽發TLS、建立公開listener，從外部確認協定與收件限制，最後發布MX。首次連線失敗時，也要等待雲端backend健康狀態完成更新，不能把表單顯示Succeeded當成流量已可用。

目前原信上限為1,000,000 bytes，以容納預覽與base64原信附件並符合初始OCI提交上限。需要更大附件時，應協調服務quota與程式／Postfix限制，不能只改其中一處。

## Gmail 能否用這個地址寄信

**時效限制（2026-10-29查證）：Google官方公告2027年1月起停止第三方地址Send-as；Google Workspace alias與其他Gmail地址不受此項公告影響。下述Gmail外部SMTP設定只適合目前過渡使用，長期應選支援獨立SMTP身分的客戶端，或另行規劃Workspace網域信箱。**

可以。Gmail的「以其他地址寄信」可設定自訂地址並透過OCI SMTP送出；確認信會寄到自訂地址，再由收信轉寄流程送回Gmail。

設定使用區域SMTP endpoint、587 STARTTLS或465 SSL/TLS，以及OCI產生的SMTP帳號密碼。SMTP帳號不是email地址。建議為Gmail另外建立可獨立撤銷的憑證，不共用伺服器轉寄秘密。

Thunderbird、Apple Mail等支援自訂SMTP identity的客戶端也可採相同寄件方式，收件則沿用Gmail。這不等於自架系統已提供IMAP／POP，也不代表Gmail的Send-as設定會自動同步成每個客戶端的寄件身分。本次部署驗證的是公開收信與relay；Gmail自訂From尚未另行設定。

## 官方參考

- [OCI核准寄件者](https://docs.oracle.com/en-us/iaas/Content/Email/Reference/gettingstarted_topic-Create_an_approved_sender.htm)
- [OCI Email Delivery權限](https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/emailpolicyreference.htm)
- [OCI SMTP連線](https://docs.oracle.com/en-us/iaas/Content/Email/Reference/gettingstarted_topic-Configure_the_SMTP_connection.htm)
- [OCI listener設定](https://docs.oracle.com/en-us/iaas/Content/Balance/Tasks/managinglisteners_topic-Creating_Listeners.htm)
- [Postfix smtpd](https://www.postfix.org/smtpd.8.html)
- [Gmail以其他地址寄信](https://support.google.com/mail/answer/22370?hl=en)
