---
title: "nio"
publishDate: "2025-09-16 18:00:00"
img: /tymultiverse/assets/java.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: 深入理解 Java NIO：非阻塞 I/O 的核心原理與實戰應用
tags:
  - Java
  - NIO
  - I/O
  - Non-blocking
  - Reactor Pattern
  - Network Programming
  - Performance Optimization
---

# 用簡單方式理解 NIO

## 前言

在高併發網路程式設計中，I/O 效能是關鍵瓶頸。Java NIO（New I/O）作為解決方案，徹底改變了我們處理網路連線的方式。本文將用簡單易懂的方式，帶你理解 NIO 的核心原理與實戰應用。

---

## 一、傳統 BIO（Blocking I/O）的問題

### 傳統模式的缺陷

```
傳統 BIO 模式
├─ 一個連線 = 一個專屬執行緒
├─ accept()、read()、write() 都是阻塞的
├─ 遇到大量連線時問題重重
```

一個連線（Socket）要一個專屬執行緒去處理。`accept()`、`read()`、`write()` 都是**阻塞**的。

遇到大規模連線（例如 1 萬、10 萬），問題就來了：

#### 🔴 執行緒太貴
- **建立/銷毀成本高**：每次建立執行緒都要分配系統資源
- **記憶體消耗大**：每個執行緒要 512KB ~ 1MB 記憶體，幾千個就爆掉
- **切換成本高**：OS 要保存上下文、頻繁切換，CPU 花在切換比做事還多

#### 🔴 負載不穩定
- 連線卡住 → 大量執行緒同時甦醒 → 系統負載暴衝
- 無法有效控制系統資源使用

#### 📊 BIO 的適用範圍
```java
// 傳統 BIO 伺服器
ServerSocket server = new ServerSocket(8080);
while (true) {
    Socket socket = server.accept();  // 阻塞等待連線
    new Thread(() -> {
        // 每個連線一個執行緒
        InputStream in = socket.getInputStream();
        int data = in.read();  // 阻塞讀取
        // 處理業務邏輯...
    }).start();
}
```

👉 **結論**：BIO 可以應付小規模（< 1000 連線），但遇到高併發就崩。

---

## 二、幾種 I/O 模型的比較

### I/O 操作的兩個階段

```
一次 I/O 分兩步：
├─ 階段一：等待就緒（能不能讀寫）- 這個階段可能很慢
└─ 階段二：真正操作（搬資料，CPU 記憶體複製）- 這個階段很快
```

### 三種 I/O 模型對比

| 模型 | 等待就緒 | 資料操作 | 特點 |
|------|----------|----------|------|
| **BIO** | 傻等（阻塞） | 同步處理 | 簡單但低效 |
| **NIO** | 詢問狀態 | 同步處理 | 非阻塞，高效 |
| **AIO** | 系統通知 | 非同步處理 | 最先進但複雜 |

#### 🔍 差別在於「等的方式」

**BIO**：我要讀（結果卡住）
```java
int data = inputStream.read();  // 沒資料就卡住
```

**NIO**：我能不能讀？（能再去讀）
```java
if (channel.isReadable()) {      // 先檢查能不能讀
    int data = channel.read();   // 再讀
}
```

**AIO**：幫我讀好再通知我
```java
channel.read(buffer, attachment, completionHandler);  // 系統讀好後通知
```

---

## 三、NIO 的本質：事件模型

### Reactor 模式（事件驅動）

NIO 把「等」交給 Selector，程式不用自己開一堆執行緒來傻等。

#### 🎯 核心流程

```java
// 1. 把 Socket 註冊到 Selector
Selector selector = Selector.open();
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);  // 設定為非阻塞
serverChannel.register(selector, SelectionKey.OP_ACCEPT);

// 2. 用一個 IO 執行緒跑迴圈
while (true) {
    int readyChannels = selector.select();  // 等事件（非阻塞）
    Set<SelectionKey> keys = selector.selectedKeys();

    for (SelectionKey key : keys) {
        if (key.isAcceptable()) {
            // 新連線
            ServerSocketChannel server = (ServerSocketChannel) key.channel();
            SocketChannel client = server.accept();
            client.configureBlocking(false);
            client.register(selector, SelectionKey.OP_READ);
        } else if (key.isReadable()) {
            // 可讀
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            int bytesRead = client.read(buffer);
            if (bytesRead > 0) {
                // 處理資料...
            }
        }
        // ... 其他事件處理
    }
}
```

#### 🚀 單執行緒處理萬連線

```
單執行緒就能處理成千上萬連線，因為它只是：
├─ 「挑出能處理的 I/O」
├─ 再交給處理器
└─ 不需要為每個連線維護獨立執行緒
```

---

## 四、優化與多執行緒

### 單執行緒的極限

單執行緒已經很省資源，但現代伺服器有多核 → 可以分工：

```
事件分發器：專門等 Selector（1 個執行緒）
I/O 處理器：負責快速的讀寫（開 CPU 核心數個）
業務執行緒：做 DB 查詢、邏輯處理（這可能會阻塞，必須分開）
```

### ⚠️ 重要注意事項

- **一個 socket 只能被一個 IO 執行緒管理**
- **如果連線量再大，可以「分組」（多個 Selector）**
- **業務邏輯處理必須與 I/O 分離**

#### 進階架構示例

```java
public class NIOServer {
    private static final int BOSS_THREADS = 1;     // 事件分發器
    private static final int WORKER_THREADS = 4;   // I/O 處理器
    private static final int BUSINESS_THREADS = 8; // 業務處理器

    // Boss Group: 處理連線事件
    private EventLoopGroup bossGroup = new NioEventLoopGroup(BOSS_THREADS);

    // Worker Group: 處理 I/O 事件
    private EventLoopGroup workerGroup = new NioEventLoopGroup(WORKER_THREADS);

    // Business Group: 處理業務邏輯
    private ExecutorService businessExecutor = Executors.newFixedThreadPool(BUSINESS_THREADS);
}
```

---

## 五、為什麼 NIO 能解放執行緒

### 傳統 BIO vs NIO 對比

#### 🔴 BIO 的浪費
```
BIO 模式：
├─ 每個連線一個執行緒
├─ 大部分時間在等待 I/O
├─ 資源極度浪費
└─ 無法擴展到萬級連線
```

#### ✅ NIO 的高效
```
NIO 模式：
├─ 一個執行緒「監控」很多連線
├─ 只有就緒才去處理
├─ 資源利用率極高
└─ 可以輕鬆處理十萬、百萬級連線
```

### 📊 具體效益

| 方面 | BIO | NIO |
|------|-----|-----|
| **執行緒數量** | 數千個 | 數個 |
| **記憶體耗用** | 幾 GB | 幾百 MB |
| **上下文切換** | 頻繁 | 極少 |
| **支援連線數** | 千級 | 萬級/百萬級 |

### 🎮 實際應用場景

NIO 讓以下場景成為可能：
- **遊戲伺服器**：同時處理數萬玩家連線
- **IM 系統**：即時訊息服務
- **WebSocket**：全雙工通訊
- **代理伺服器**：負載均衡、高併發代理

---

## 六、客戶端場景

### 傳統客戶端問題

客戶端常用「BIO + 連線池」來解決阻塞，但還是受限於執行緒。

```java
// 傳統客戶端連線池
GenericObjectPool<Socket> connectionPool = new GenericObjectPool<>();
Socket socket = connectionPool.borrowObject();  // 可能阻塞
```

### NIO 客戶端優勢

用 NIO，客戶端也可以：

#### ✅ 資源優化
```java
// NIO 客戶端
Selector selector = Selector.open();
SocketChannel channel = SocketChannel.open();
channel.configureBlocking(false);
channel.register(selector, SelectionKey.OP_CONNECT);

// 一個執行緒處理多個連線
while (true) {
    selector.select();
    // 處理所有就緒的連線...
}
```

#### ✅ 減少連線開銷
- **共享少量執行緒**處理大量連線
- **減少頻繁建立/銷毀連線的開銷**
- **更好的資源控制**

### 📱 實際應用案例

```java
public class NIOClientPool {
    private final Selector selector;
    private final Map<String, SocketChannel> connections;

    public NIOClientPool(int maxConnections) {
        this.selector = Selector.open();
        this.connections = new ConcurrentHashMap<>();
        // 初始化連線池...
    }

    public void sendToServer(String host, int port, ByteBuffer data) {
        SocketChannel channel = getOrCreateConnection(host, port);
        channel.write(data);
    }
}
```

---

## 七、實戰建議與注意事項

### 🚀 最佳實踐

#### 1. **選擇合適的場景**
- **小規模應用**：BIO 足夠，開發簡單
- **高併發場景**：NIO 必選
- **超高併發**：考慮 AIO 或 Netty

#### 2. **資源配置建議**
```properties
# 推薦配置
server.tomcat.threads.max=200
server.tomcat.threads.min-spare=10
server.tomcat.accept-count=100

# NIO 特有配置
server.tomcat.protocol=org.apache.coyote.http11.Http11NioProtocol
```

#### 3. **監控重點**
- **連線數量**：避免超過系統限制
- **記憶體使用**：監控 Buffer 分配
- **CPU 使用率**：關注 Selector 的效能

### ⚠️ 常見陷阱

#### 1. **忘記設定非阻塞**
```java
// ❌ 錯誤：還是阻塞的
SocketChannel channel = SocketChannel.open();

// ✅ 正確：設定非阻塞
channel.configureBlocking(false);
```

#### 2. **Buffer 管理不當**
```java
// ❌ 錯誤：重複使用 Buffer 忘記清理
ByteBuffer buffer = ByteBuffer.allocate(1024);
buffer.put(data);
// 忘記 flip() 或 clear()

// ✅ 正確：正確的 Buffer 操作
buffer.put(data);
buffer.flip();  // 切換到讀模式
channel.read(buffer);
buffer.clear(); // 清理準備下次使用
```

#### 3. **Selector 記憶體洩漏**
```java
// ❌ 錯誤：忘記取消註冊
SelectionKey key = channel.register(selector, ops);
// 使用完後忘記取消

// ✅ 正確：記得清理
key.cancel();
selector.selectNow(); // 立即更新
```

---

## 八、總結

### NIO 的核心價值

NIO 徹底改變了我們處理網路 I/O 的方式：

#### 🎯 **從阻塞到非阻塞**
- BIO：一個連線一個執行緒，資源浪費
- NIO：事件驅動，多路複用，資源節省

#### 🚀 **效能提升**
- **連線數量**：從千級到萬級/百萬級
- **資源使用**：記憶體減少 90%，CPU 利用率提升
- **擴展性**：線性擴展，無瓶頸

#### 💡 **程式設計思維的轉變**
- **從同步到事件驅動**
- **從阻塞等待到狀態檢查**
- **從資源浪費到精準控制**

### 適用場景總結

| 場景 | 推薦技術 | 理由 |
|------|----------|------|
| **小規模應用** | BIO | 簡單開發，足夠使用 |
| **Web 服務** | NIO | 高併發，資源節省 |
| **遊戲伺服器** | NIO/Netty | 萬級連線，實時通訊 |
| **微服務** | NIO | 輕量高效，易於擴展 |
| **大資料處理** | AIO | 非同步，最大化效能 |

NIO 讓 Java 在高併發網路程式設計中重獲新生，成為現代分佈式系統的基石。
