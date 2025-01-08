---
title: K8s Network
publishDate: 2024-12-26 13:00:00
img: /tymultiverse/assets/k8s.png
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/12/13
tags:
  - K8s
  - Network
---

## 連入連線

### 1. kube-proxy 封包虛擬網路
kube-proxy 是 Kubernetes 集群中實現虛擬網絡的關鍵組件。它負責管理集群內各節點之間的網絡流量，並且為每個服務 (Service) 提供虛擬 IP 地址，從而實現負載均衡。每個節點上的 kube-proxy 都會監控服務的變化並更新其轉發規則。

### 2. Pod 連線方式
- **IP 連線**：每個 Pod 都有一個唯一的 IP 地址，Pod 之間可以直接通過 IP 地址進行通信。
- **Service 連線**：使用 Service 的虛擬 IP 來代表一組 Pod，實現對外訪問和負載均衡。

### 3. Service 物件
Service 是 Kubernetes 中的一個抽象層，負責路由流量到一組運行中的 Pod：
- **Discovering**：通過 Label Selector 動態選擇後端 Pod。
- **Load Balancing**：在 Pod 之間分配流量。
- 可暴露為 ClusterIP（內部）、NodePort（外部訪問）或 LoadBalancer（外部負載均衡器）。

### 4. Spring Cloud LB
Spring Cloud LoadBalancer 提供微服務負載均衡，適用於 Spring Cloud 應用中，用於提升服務之間的高可用性。

### 5. LB 的 External IP 與 NodePort 的差異
- **External IP**：由外部負載均衡器分配，用於公共訪問。
- **NodePort**：將 Service 暴露於每個節點的特定端口上，用於開發或測試。

### 6. Selector
Selector 是用於篩選 Pod 的條件，例如 `run: nginx` 篩選標籤為 `run=nginx` 的 Pod。

### 7. Server / Endpoint Controller
- **Server**：指提供服務的實體或邏輯組件。
- **Endpoint Controller**：負責監控服務與 Pod 之間的關係，更新 Service 的 Endpoints。

### 8. EndpointSlice
EndpointSlice 提供對 Endpoints 的優化管理，分片化提升性能。

### 9. Service 抽象與自動負載均衡
Service 提供一個靜態 IP 地址，並通過負載均衡機制將流量分配到後端 Pod。

### 10. LB 前端、Backend NodePort 及 EndpointSlice 觀察
- **LB 前端**：處理外部流量。
- **Backend NodePort**：處理內部流量。
- **EndpointSlice**：檢查 Selector 與 Pod 的映射。

### 11. Ingress 物件
- **應用層**：處理 HTTP/HTTPS 請求。
- **Gateway API**：支援更多協議和流量管理功能。
- **Host 和 Path**：根據域名與路徑進行流量轉發。
- **TLS SNI**：根據 SNI 提供正確憑證。
- **Reverse Proxy 角色**：Ingress 控制器作為反向代理。
- **Gateway API 支援更多功能**：如 TCP、gRPC、路由重寫等。

### 12. SSL Termination vs SSL Passthrough
1. **SSL Termination**：TLS/SSL 加密在 Ingress 層終止，適用於內部流量使用 HTTP。
2. **SSL Passthrough**：TLS/SSL 加密保留到後端服務，適用於敏感數據場景。

## 連出連線

### 13. Egress
1. 建立 IP Pool。
2. 決定 Pod 的出口 IP。
3. 解決 IP 飄走後的 ARP 收斂問題。

### Network Policy
- **Selector**：選擇適用的流量。
- **Policy 和 Rule**：先全拒，後以白名單模式允許特定流量。

### CNI 如何辨別流量
1. 先阻擋所有流量，再允許 CoreDNS 的相關策略。
2. 使用 Network Policy 阻擋進入 API Server 的流量。

### layer 2 至 layer 3
實現從資料鏈路層到網絡層的傳輸管理。


### VIP 不通的整段流程排查
首先確認是誰吐出502 504 不知道是後端還是lb回的
ha proxy standalone VM 等等其他proxy來確認
透過lb 確認