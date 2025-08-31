---
title: "io-multiplexing"
publishDate: "2025-08-27 01:00:00"
img: /tymultiverse/assets/algorithm.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: 從 select() 到 epoll：理解現代 Web 框架的 I/O 多工技術
tags:
  - System Programming
  - I/O Multiplexing
  - Web Frameworks
  - Performance
  - OS Kernel
---

# I/O 多工技術深度解析：從 select() 到 epoll

## 🎯 前言

現代 Web 框架（如 Spring WebFlux、Django ASGI）的核心秘密，就是理解操作系統的「I/O 多工」技術。本文將用最簡單的方式，解釋為什麼一個 Event Loop 可以管理成千上萬個連線。

## 📞 OS 的「三種聽電話方法」

想像電腦要「接電話」（處理很多 socket 連線）。

### **1️⃣ select()：傳統點名法（效率最差）**
```c
// 像老師每天要點名一整個班級，每次都要從頭數到尾
int select(int nfds, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);
```

**缺點：**
- 每次都要掃描所有 socket
- O(n) 複雜度，人一多就慢
- 最大監聽數量有限（通常 1024）

### **2️⃣ poll()：改善版點名法**
```c
// 改善一點，不用 bitset，但還是一個一個問：「你有事嗎？」
int poll(struct pollfd *fds, nfds_t nfds, int timeout);
```

**優點：** 支援更多 socket（理論上無上限）
**缺點：** 還是 O(n)，效率沒有根本改善

### **3️⃣ epoll/kqueue/IOCP：智慧舉手系統（現代標準）**
```c
// Linux epoll：學生自己舉手，有事再叫老師
int epoll_create(int size);
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event);
int epoll_wait(int epfd, struct epoll_event *events, int maxevents, int timeout);
```

**核心優勢：**
- **O(1) 複雜度**：不管多少 socket，效能都一樣
- **事件驅動**：OS 主動通知，不用輪詢
- **無上限**：理論上可以監聽數百萬個 socket

## 🎡 Event Loop（事件迴圈）

有了 epoll/kqueue/IOCP 這些「聰明的點名系統」，程式就可以：

### **🔄 工作流程：**
1. **註冊監聽**：把「這個 socket 有事時要通知我」交給 OS
2. **OS 監控**：OS kernel 幫忙盯著所有 socket
3. **事件通知**：一旦有事件，OS 通知 event loop
4. **處理事件**：event loop 派 coroutine 去處理

### **⚡ 效能優勢：**
- **一個 thread** 就能管理幾千上萬連線
- **不會傻傻地每個都檢查**
- **資源利用率極高**

## 🏗️ 框架如何使用這些技術？

重點：**你不用自己挑選 select/epoll/kqueue**。

### **🎭 框架的智慧選擇：**
- **Linux** → 自動使用 `epoll`
- **macOS/FreeBSD** → 自動使用 `kqueue`
- **Windows** → 自動使用 `IOCP`

### **🔧 底層實現：**
- **Spring WebFlux** → Netty 自動選擇
- **Django ASGI** → uvicorn/daphne 自動選擇
- **Node.js** → libuv 自動選擇

## 🌍 傳統世界 vs 新世界

### **🔴 傳統世界：Spring MVC、Django WSGI**

```java
// Spring MVC：一個請求 = 一個 thread
@RestController
public class TraditionalController {
    @GetMapping("/sync")
    public String syncEndpoint() {
        // Thread 會在這裡卡住等待 I/O
        return blockingDatabaseCall();
    }
}
```

**特點：**
- **阻塞式、thread-per-request** 設計
- Thread 在等待資料時直接卡住
- 底層可能還在用 select()/poll()
- 人一多 thread 就爆掉

**比喻：** 「來了一個客人，派一個專屬服務生，服務生要等廚房上菜，就只能乾等，不能去做別的事。」

### **🟢 新世界：Spring WebFlux、Django ASGI**

```java
// Spring WebFlux：一個 thread 管理所有請求
@RestController
public class ReactiveController {
    @GetMapping("/reactive")
    public Mono<String> reactiveEndpoint() {
        // 不會卡住 thread，event loop 繼續處理其他請求
        return r2dbcTemplate.queryForObject("SELECT * FROM users", String.class);
    }
}
```

**特點：**
- **非阻塞 + event loop** 設計
- Thread 不會傻傻地卡住
- 用 epoll/kqueue/IOCP 由 OS 幫忙監聽
- 一個 thread 可以管理成千上萬請求

**比喻：** 「只有一個超強管家，他不用每天數學生，而是學生有事自己舉手。」

## 📊 對應表

| OS 聽電話方式 | Spring Boot/Django 傳統版 | Spring Boot/Django 非阻塞版 |
|---------------|---------------------------|-----------------------------|
| **select/poll（傻傻掃）** | Spring MVC (Tomcat 傳統 blocking I/O)<br/>Django WSGI (Gunicorn + sync workers) | 幾乎不用（效率太差） |
| **epoll (Linux)** | 傳統 thread pool 還是阻塞 | **Spring WebFlux** (Netty on Linux)<br/>**Django ASGI** (uvicorn/daphne) |
| **kqueue (macOS/FreeBSD)** | 同上 | **Spring WebFlux** (Netty on macOS)<br/>**Django ASGI** (uvicorn on macOS) |
| **IOCP (Windows)** | 同上 | **Spring WebFlux** (Netty on Windows)<br/>**Django ASGI** (uvicorn on Windows) |

## 🎯 總結

### **💡 核心技術演進：**
1. **石器時代**：select() - 一個一個檢查，效率低下
2. **青銅時代**：poll() - 小幅改善，仍有瓶頸
3. **資訊時代**：epoll/kqueue/IOCP - OS 主動通知，效能爆發

### **🔑 現代 Web 框架的秘密：**
- **傳統框架**：thread-per-request，靠數量取勝
- **現代框架**：event loop + I/O 多工，靠智慧取勝

### **🎪 實戰建議：**
- **新專案**：優先考慮 Spring WebFlux / Django ASGI
- **舊專案**：評估遷移成本 vs 效能收益
- **混合部署**：傳統框架處理簡單請求，現代框架處理高併發

**理解 I/O 多工，就是理解現代 Web 架構的精髓！** 🚀
