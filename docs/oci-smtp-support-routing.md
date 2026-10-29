---
slug: oci-smtp-support-routing
title: OCI TCP 25 與 PTR 申請：如何釐清支援入口並建立可驗證的案件
description: 區分區域 SMTP 限制、PTR 與一般資源配額，整理表單缺少選項時的官方轉交方法，以及選擇 managed relay 的判斷依據。
category: 雲端網路與維運
tags: [OCI, SMTP, DNS, PTR, Cloud Support, Email Delivery]
publishDate: 2026-10-29T12:00:00+08:00
---

# OCI TCP 25 與 PTR 申請：如何釐清支援入口並建立可驗證的案件

在雲端自行架設郵件系統時，應先拆開三件事：伺服器能不能向外連TCP 25、寄件IP能不能建立PTR，以及網域的郵件應送到哪裡。它們分別涉及雲端出口政策、反向DNS管理與網域MX，不能用同一張「增加配額」表單概括。

本文依一次OCI Singapore West的實際處理整理，目的在建立可重用的排查方法。對話中的客服說明與特定帳戶處理結果，不應直接當成對所有租戶的保證。

## 先分清楚外寄限制與收信入口

一般MTA直接投遞到收件網域的MX，需要向對方TCP 25連線。OCI對這類出口有SMTP限制，官方要求透過支援與限制申請處理。相反地，外部MTA向自家負載平衡器TCP 25送信，屬於入站；就算改用managed relay處理外寄，公開收信仍須有MX、入站listener與防火牆。

申請前應記錄API region、tenancy OCID、帳戶狀態、業務用途與預估量。這次區域為`ap-singapore-2`，預估每月約100封。帳戶擁有者確認為PAYG；Identity Domain標示Free不能用來判斷帳戶是否付費。

## 表單沒有對應項目時，不應拿相近配額代替

實際入口包括Console的Service Limits申請，以及既有技術服務請求。當Service Limits的VCN選單只有一般配額，缺少TCP 25專用項目時，提交不相關項目只會讓案件失去上下文。

較有效的處理是把問題寫回同一個SR：說明已查過的表單、缺少哪個項目、目標區域、預估量與用途，再請官方確認轉交團隊。這次透過Console的Help → Request help → Ask Oracle → Live agent接到真人客服；對方說明TCP 25解封由CAM（Customer Account Management）處理，應請既有SR團隊轉交，而非另送錯誤配額。

真人客服表示解封本身不收費。這個資訊與「郵件架構總成本為零」不同：主機、IP、流量、儲存、負載平衡器與managed relay各有自己的計費條件。原案件已要求轉交，不代表限制已解除；狀態報告應保留這個差別。

## PTR 必須先有正確的 forward DNS

PTR是IP到主機名稱的反向解析，公網IP的管理者才有權建立；在網域DNS新增TXT或CNAME無法代替。申請PTR前，先讓指定名稱的A記錄公開解析到該出口IP，讓支援團隊驗證forward與reverse的一致性。

子網域容易填錯。例如在`example.com`的zone內，`smtp-out.service`與`smtp-out`是兩個名稱。DNS後台出現紀錄不代表全球解析已更新；應使用公用resolver查詢，保存查詢時間、完整名稱、類型與實際回傳值，再向官方表示forward DNS已就緒。

收信負載平衡器IP與外寄NAT出口IP也可能不同。PTR應對應真正的外寄IP，不應因為MX使用另一個IP，就把PTR申請改指向MX。

## 當需求是少量轉寄，managed relay 能縮短維運鏈

最後採用OCI Email Delivery作外寄relay，以有憑證驗證的TLS連線提交郵件。直接外寄TCP 25與自有出口PTR因此退出必要路徑，投遞端的IP信譽與外寄基礎設施由服務商處理。

代價是寄件語意改變：Email Delivery要求核准寄件地址，不能透明保留每一封外部郵件的From。本案例改由自有地址寄出包裝信，保留原始Reply-To與完整原信附件。選型必須同時評估使用體驗、認證限制與退信處理，不能只比較連接埠是否可通。

## 一份有效的案件更新應包含什麼

| 欄位 | 用途 |
| --- | --- |
| Region與租戶識別 | 避免送到錯誤區域或帳戶 |
| 實際用途與預估封數 | 讓官方理解需要的是SMTP能力，不是一般VCN配額 |
| Forward DNS證據 | PTR處理的驗證前提 |
| 已嘗試入口及缺少項目 | 避免重複要求填不存在的選項 |
| 要求轉交的問題 | 明確要求路由確認，而非宣稱已核准 |
| 架構變更 | 讓支援知道managed relay是否已取代原需求 |

這次經驗可重用的部分，是把技術前提、證據與支援責任整理成同一條案件脈絡。服務入口可能改版，客服路由也可能依帳戶不同；保留可驗證的資料，比記住某個下拉選項更重要。

## 官方參考

- [OCI SMTP限制說明](https://docs.oracle.com/en-us/iaas/releasenotes/changes/f7e95770-9844-43db-916c-6ccbaf2cfe24/index.htm)
- [OCI Reverse DNS](https://docs.oracle.com/en-us/iaas/Content/DNS/Tasks/reversedns.htm)
- [OCI Email Delivery概觀](https://docs.oracle.com/en-us/iaas/Content/Email/Concepts/overview.htm)
- MOS KB94353：區域TCP 25限制申請，可能需要登入；本次未以接受首次使用條款作為排查前提。
