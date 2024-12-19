---
title: K8s Basic
publishDate: 2024-12-13 13:00:00
img: /tymultiverse/assets/k8s.png
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/12/13
tags:
  - K8s
  - Basic
---

## K8S基礎元件架構
#### OS層級的虛擬化清單：
1. C group: Kernal 管理
2. Library
3. Runtime

#### K8s網路
1. lb
2. reverse-proxy
3. domain register

#### K8s網路解決方案
1. lb
2. tls
3. fail over

#### 儲存
1. Component to API
這指的是 Kubernetes 的不同組件（如 PVC、PV）透過 Kubernetes 的 API 來管理儲存。

2. LUN (Logical Unit Number)
LUN 是一個標識儲存設備中某個區塊的編號，通常用於 iSCSI 儲存設備，用來識別儲存資源。


#### K8s 大腦
```
API Server --> ETCD DBs

```

##### Scheduler
決定新create要進去哪個node

##### kubelet 
node 與 control plane 的溝通代理。

##### Static Pod
1. 由kubelet所管理

##### Daemon Type
1. 用Systemd的方式啟動
2. Daemon Set 每個pod運行同一服務

##### ingress-nginx
1. 如何固定在一個pod啟動一個controller

##### ns vs nns
1. nns: PV
2. 共用的ns: storage, network

##### CNI 網路
內部網路機制
##### CSI 儲存
內部儲存機制


##### StatefulSet何時使用

##### 資料要區分pod跑
1. 使用message queue 讓第一個pod跑完讓第2個pod去跑
2. AP 控制

##### PV/C
1. PV 是一個代號，代表在Storage的一塊空間
2. PVC是規格設定

##### session affinity
1. none default
2. client ip, 會使 nginx 過重, 因為只有指定一個pod跑

##### control panel 拓墣
1. 主流control plane: 3 台

##### DNS
C name vs A record


##### pod 流程
1. client
2. api server
3. etcd
4. controller manager: 生成pod
5. scheduler
6. kubelet
7. containerd

##### 物件建立好後 -> container建立完成


##### K8s憑證
1. kubelet mtls
2. admin mtls
3. api server mtls
4. api server 連線
* 裸機rotate 指令

## DNS層級
Dns delegation 
Wildcar domain 