---
title: "webflux"
publishDate: "2025-09-16 16:00:00"
img: /tymultiverse/assets/java.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: WebFlux 與 MQ 的最佳結合策略：只在需要的地方用，從 MVC 到全 Reactive 的演進路徑
tags:
  - WebFlux
  - Spring Boot
  - Reactive Programming
  - Message Queue
  - JPA
  - R2DBC
  - Java
---

# 🌟 WebFlux 從零開始：初學者友好指南

> **目標讀者**：想要學習 Reactive 編程的開發者
> **學習路徑**：從基礎概念 → 簡單示例 → 架構理解 → 實戰應用

---

## 🚀 第一章：初學者入門 - 理解 Reactive 世界

### 🤔 什麼是 Reactive 編程？

想象一下，你在咖啡廳點餐的場景：

**傳統方式（同步）：**
1. 你點餐 → 服務員記錄 → 你等待 → 拿到咖啡 → 繼續做事
2. **問題**：你必須停下來等待，無法同時處理其他事情

**Reactive 方式（非同步）：**
1. 你點餐 → 服務員給你一個號碼牌 → 你繼續做事
2. 咖啡做好時，號碼牌會通知你 → 你去拿咖啡
3. **好處**：你可以在等待時做其他事情，提高效率

**Reactive 編程就是這樣**：讓程式在等待 I/O 操作時，能夠繼續處理其他任務！

### ❓ 為什麼需要 WebFlux？

在現代應用中，我們面臨這些挑戰：

#### 問題場景 1：高併發請求
```java
// ❌ 傳統 MVC：每個請求占用一個線程
@GetMapping("/users")
public List<User> getUsers() {
    // 這個請求會阻塞一個線程直到數據庫返回
    return userRepository.findAll();
}
```

**問題**：1000個用戶同時訪問，需要1000個線程！

#### 問題場景 2：慢速 I/O 操作
```java
// ❌ 傳統方式：線程等待外部 API
@GetMapping("/user-details")
public UserDetails getUserDetails() {
    User user = userService.getUser();        // 等待數據庫
    Address address = addressService.getAddress(); // 等待外部 API
    return combine(user, address);
}
```

**問題**：如果數據庫或外部 API 慢，整個請求就慢！

#### ✅ WebFlux 的解決方案
```java
// ✅ Reactive 方式：非阻塞處理
@GetMapping("/user-details")
public Mono<UserDetails> getUserDetails() {
    return Mono.zip(
        userService.getUserReactive(),        // 非阻塞
        addressService.getAddressReactive()   // 非阻塞
    ).map((user, address) -> combine(user, address));
}
```

**好處**：同一個線程可以處理多個請求！

### 🎯 WebFlux 的核心價值

| 傳統 MVC | WebFlux |
|---------|---------|
| **線程模型** | 一個請求一個線程 | 少量線程處理大量請求 |
| **I/O 處理** | 阻塞等待 | 非阻塞回調 |
| **資源利用** | 線程浪費 | 資源高效利用 |
| **併發能力** | 受限於線程數 | 高併發友好 |

---

## 🔧 第二章：核心概念 - Mono 與 Flux

### 📦 什麼是 Mono 和 Flux？

把它們想象成特殊的"盒子"：

#### 🍱 Mono<T> - 單一結果的盒子
```java
// Mono 就像一個最多裝一個物品的盒子
Mono<String> result = Mono.just("Hello World");

// 使用場景
Mono<User> user = userRepository.findById(1L);      // 查詢單一用戶
Mono<Void> saved = userRepository.save(user);       // 保存操作
Mono<Boolean> exists = userRepository.existsById(1L); // 存在性檢查
```

#### 📦 Flux<T> - 多個結果的盒子
```java
// Flux 就像一個能裝很多物品的盒子
Flux<String> results = Flux.just("A", "B", "C");

// 使用場景
Flux<User> users = userRepository.findAll();        // 查詢所有用戶
Flux<User> activeUsers = userRepository.findByStatus("ACTIVE"); // 條件查詢
```

### 🎮 簡單上手示例

#### 示例 1：基本使用
```java
@RestController
public class HelloController {

    // ❌ 傳統方式
    @GetMapping("/traditional")
    public String traditionalHello() {
        return "Hello World";
    }

    // ✅ Reactive 方式
    @GetMapping("/reactive")
    public Mono<String> reactiveHello() {
        return Mono.just("Hello World");
    }
}
```

#### 示例 2：數據庫查詢
```java
@Service
public class UserService {

    // ❌ 傳統方式
    public List<User> getAllUsers() {
        return userRepository.findAll(); // 阻塞等待
    }

    // ✅ Reactive 方式
    public Flux<User> getAllUsersReactive() {
        return userRepository.findAll(); // 立即返回，結果後續推送
    }
}
```

### 🔄 數據流的工作原理

```java
// 數據流就像自來水管
Flux<User> userStream = userRepository.findAll()
    .filter(user -> user.getAge() > 18)    // 🔧 過濾器：只留成年用戶
    .map(user -> user.getName())          // 🔧 轉換器：提取用戶名
    .take(10);                            // 🔧 限制器：只取前10個

// 訂閱數據流（打開水龍頭）
userStream.subscribe(
    name -> System.out.println(name),     // 📥 接收數據
    error -> System.err.println(error),  // ❌ 處理錯誤
    () -> System.out.println("完成")      // ✅ 處理完成
);
```

---

## 📊 第二章補充：List<T> vs Flux<T> - 資料結構深度對比

### 🎯 核心差異概覽

| 特性 | List<T> | Flux<T> |
|-----|---------|---------|
| **記憶體載入時機** | 立即載入全部數據 | 按需載入，串流處理 |
| **處理方式** | 同步批量處理 | 非同步串流處理 |
| **記憶體使用** | 全部數據常駐記憶體 | 數據流過後即可釋放 |
| **阻塞行為** | 會阻塞當前線程 | 不會阻塞線程 |
| **適合場景** | 小數據集、同步處理 | 大數據集、非同步處理 |

### 🔍 詳細比較說明

#### 1. **記憶體管理差異**

**List<T> 的記憶體行為：**
```java
// ❌ 一次性載入所有數據到記憶體
public List<User> getAllUsers() {
    List<User> users = userRepository.findAll(); // 100萬個用戶全部載入！
    return users; // 記憶體中同時存在100萬個User物件
}
```
**問題：** 如果有100萬個用戶，List會一次性將所有用戶載入到JVM堆記憶體中

**Flux<T> 的記憶體行為：**
```java
// ✅ 串流處理，數據逐個流過
public Flux<User> getAllUsersReactive() {
    return userRepository.findAll() // 不載入到記憶體
        .filter(user -> user.isActive()) // 過濾時才處理
        .take(100); // 只處理前100個
}
```
**優勢：** 記憶體使用量大幅降低，只需要處理當前數據項

#### 2. **處理時機差異**

**List<T> 的處理方式：**
```java
// 同步處理：必須等待所有數據準備完成
List<User> users = getAllUsers(); // 阻塞等待數據庫查詢完成
for (User user : users) {
    processUser(user); // 逐個處理，但前面已經全部載入
}
```

**Flux<T> 的處理方式：**
```java
// 非同步處理：數據到達時立即處理
getAllUsersReactive()
    .subscribe(user -> {
        // 每當有數據到達就立即處理
        processUser(user);
    });
```

#### 3. **錯誤處理差異**

**List<T> 的錯誤處理：**
```java
try {
    List<User> users = getAllUsers(); // 如果這裡出錯，整個操作失敗
    for (User user : users) {
        processUser(user); // 錯誤已經發生，這裡不會執行
    }
} catch (Exception e) {
    // 錯誤處理
}
```

**Flux<T> 的錯誤處理：**
```java
getAllUsersReactive()
    .map(user -> processUser(user))
    .onErrorResume(error -> {
        // 恢復邏輯：可以返回備用數據或空串流
        return Flux.empty();
    })
    .subscribe();
```

#### 4. **並發處理差異**

**List<T> 的並發處理：**
```java
List<User> users = getAllUsers(); // 先獲取所有數據
users.parallelStream() // 然後並行處理
    .forEach(user -> processUser(user));
```

**Flux<T> 的並發處理：**
```java
getAllUsersReactive()
    .flatMap(user -> processUserAsync(user), 10) // 限制並發數量
    .subscribe();
```

#### 5. **資源利用差異**

**List<T> 的資源使用：**
```java
// 資源使用曲線：前期高負載，後期閒置
// [數據庫查詢] → [載入記憶體] → [處理數據] → [返回結果]
List<User> result = queryAndProcessUsers();
return result;
```

**Flux<T> 的資源使用：**
```java
// 資源使用曲線：平滑分佈
// 數據流：數據庫 → 處理 → 訂閱者
return userRepository.findAll()
    .filter(this::isValidUser)
    .map(this::enrichUserData);
```

### 💡 選擇指南

#### 什麼時候選擇 List<T>？
```java
// ✅ 適合場景
public List<User> getTop10Users() {
    return userRepository.findTop10(); // 數據量小
}

public List<Product> getProductsByIds(List<Long> ids) {
    return productRepository.findByIdIn(ids); // ID列表已知
}
```

#### 什麼時候選擇 Flux<T>？
```java
// ✅ 適合場景
public Flux<Order> getAllOrders() {
    return orderRepository.findAll(); // 可能有大量數據
}

public Flux<User> searchUsers(String keyword) {
    return userRepository.findByNameContaining(keyword); // 搜索結果不確定
}
```

### 🔄 轉換實戰

#### List 轉 Flux：
```java
List<User> userList = getUsers();
Flux<User> userFlux = Flux.fromIterable(userList);
```

#### Flux 轉 List：
```java
Flux<User> userFlux = getUsersReactive();
Mono<List<User>> userList = userFlux.collectList();
```

#### 實際應用場景：
```java
@RestController
public class UserController {

    // 適合小數據集
    @GetMapping("/users/top10")
    public List<User> getTop10Users() {
        return userService.getTop10Users(); // 直接返回List
    }

    // 適合大數據集或串流處理
    @GetMapping("/users/stream")
    public Flux<User> getAllUsersStream() {
        return userService.getAllUsersReactive(); // 返回Flux
    }

    // 混合使用：Reactive處理，最後收集為List
    @GetMapping("/users/processed")
    public Mono<List<User>> getProcessedUsers() {
        return userService.getAllUsersReactive()
            .filter(user -> user.isActive())
            .collectList(); // 最後收集為List返回
    }
}
```

### 🎯 記憶重點

1. **List<T>**：同步、批量、記憶體常駐
2. **Flux<T>**：非同步、串流、記憶體友好
3. **選擇原則**：小數據用List，大數據用Flux
4. **轉換自由**：可以隨時在兩者間轉換
5. **性能考量**：Flux在高併發和大數據場景下更優

---

## 🏗️ 第三章：架構設計 - 系統工作流程

### 📊 簡單架構圖

```mermaid
graph LR
    A[👤 用戶] --> B[🌐 WebFlux Controller]
    B --> C[⚙️ Service 層]
    C --> D[💾 Repository 層]
    D --> E[(🗄️ 數據庫)]

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fafafa
```

### 🔄 請求處理流程

#### 同步請求流程（簡單理解）
```
1. 用戶發送請求 → WebFlux 接收
2. Controller 處理 → 調用 Service
3. Service 處理 → 調用 Repository
4. Repository 查詢數據庫 → 返回結果
5. 結果逐層返回給用戶
```

#### Reactive 請求流程（高效處理）
```
用戶請求 1 ──┐
用戶請求 2 ──┼─→ 同一個線程處理多個請求
用戶請求 3 ──┘
             │
             └─→ 非阻塞 I/O 操作
             │
             └─→ 結果返回時通知對應請求
```

### 🎨 觀察者模式解釋

Reactive 編程的核心是**觀察者模式**：

```java
// 就像報紙訂閱
Publisher（報社） ── 發佈新聞 ──→ Subscriber（訂閱者）
    ↑                                     │
    └──── 當有新聞時 ────────────────────┘
```

在 WebFlux 中：
- **Publisher**：數據的生產者（數據庫查詢、API 調用）
- **Subscriber**：數據的消費者（Controller、Service）
- **Subscription**：訂閱關係的管理

---

## 📋 第四章：實戰應用 - 常見使用場景

### 場景 1：簡單的數據查詢

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    // 查詢所有用戶
    @GetMapping
    public Flux<User> getAllUsers() {
        return userService.getAllUsers();
    }

    // 查詢單個用戶
    @GetMapping("/{id}")
    public Mono<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }
}
```

### 場景 2：數據處理管道

```java
@Service
public class UserService {

    public Flux<UserDTO> getActiveUsersWithDetails() {
        return userRepository.findByStatus("ACTIVE")
            .map(this::convertToDTO)                    // 轉換為 DTO
            .filter(dto -> dto.getAge() >= 18)          // 過濾未成年
            .sort(Comparator.comparing(UserDTO::getName)); // 按姓名排序
    }

    private UserDTO convertToDTO(User user) {
        return new UserDTO(user.getName(), user.getAge());
    }
}
```

### 場景 3：錯誤處理

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    public Mono<ResponseEntity<User>> getUser(@PathVariable Long id) {
        return userService.getUserById(id)
            .map(user -> ResponseEntity.ok(user))                    // 成功時返回用戶
            .defaultIfEmpty(ResponseEntity.notFound().build())      // 用戶不存在
            .onErrorResume(error ->                                  // 發生錯誤時
                Mono.just(ResponseEntity.status(500).build()));
    }
}
```

---

## 🔄 第五章：進階概念 - 背壓控制

### 💡 什麼是背壓？

背壓就像水龍頭的調節器：

```java
// 沒有背壓控制
Flux<User> users = userRepository.findAll(); // 可能返回100萬個用戶！
users.subscribe(user -> process(user));     // 記憶體爆炸！

// 有背壓控制
Flux<User> users = userRepository.findAll()
    .take(100)                              // 只取前100個
    .onBackpressureBuffer(50);              // 最多緩衝50個
```

### 🎛️ 背壓策略

```java
public Flux<User> getUsersWithBackpressure() {
    return userRepository.findAll()
        .take(1000)                         // 限制總數
        .onBackpressureBuffer(100)          // 緩衝區大小
        .onBackpressureDrop(user ->         // 超過時丟棄
            log.warn("Dropped user: {}", user.getName()));
}
```

---

## 📚 第六章：學習資源與下一步

### 📖 學習建議

1. **從簡單開始**：先掌握基本概念，再學習複雜應用
2. **多寫代碼**：理論理解後，要通過實踐鞏固
3. **循序漸進**：不要一次學太多，先掌握一種模式

### 🎯 下一步學習

- **基礎鞏固**：多練習 Mono/Flux 的基本操作
- **應用實戰**：將 Reactive 應用到實際項目中
- **架構設計**：學習如何設計 Reactive 系統
- **性能優化**：掌握背壓控制和資源管理

### 📚 推薦資源

- **官方文檔**：Spring WebFlux 官方文檔
- **實戰項目**：查看本專案的完整實現
- **社區資源**：Stack Overflow、GitHub Issues

---

## 🔧 第七章：實戰指南 - 遷移實戰

### 🎯 從 JPA 到 R2DBC 的遷移路徑

#### 階段 1：理解差異
```java
// ❌ 傳統 JPA
@Entity
public class User {
    @Id
    private Long id;
    private String name;
}

// ✅ R2DBC 實體
@Table("user")
public class User {
    @Id
    private Long id;
    private String name;
}
```

#### 階段 2：Repository 轉換
```java
// ❌ JPA Repository
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);
}

// ✅ R2DBC Repository
public interface UserRepository extends ReactiveCrudRepository<User, Long> {
    Flux<User> findByName(String name);
}
```

#### 階段 3：Service 層適配
```java
// ❌ 同步 Service
@Service
public class UserService {
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}

// ✅ Reactive Service
@Service
public class UserService {
    public Flux<User> getAllUsers() {
        return userRepository.findAll();
    }
}
```

#### 階段 4：Controller 適配
```java
// ❌ MVC Controller
@RestController
public class UserController {
    @GetMapping("/users")
    public List<User> getUsers() {
        return userService.getAllUsers();
    }
}

// ✅ WebFlux Controller
@RestController
public class UserController {
    @GetMapping("/users")
    public Flux<User> getUsers() {
        return userService.getAllUsers();
    }
}
```

### 💡 常見問題解答

#### Q1：我一定要把整個項目都改成 Reactive 嗎？
**A**：不需要！可以採用漸進式遷移：
1. 先在新的 API 端點使用 WebFlux
2. 舊的 MVC 端點繼續運行
3. 逐步替換高負載的端點

#### Q2：學習 Reactive 難度大嗎？
**A**：其實不難！重點是：
1. 理解非同步思維
2. 掌握 Mono/Flux 的基本操作
3. 多寫代碼練習

#### Q3：性能真的會提升嗎？
**A**：在高併發場景下是的：
- **線程利用率**：從 1:1 變成 1:N
- **記憶體使用**：減少線程棧空間
- **響應時間**：減少阻塞等待

---

## 🎉 結語

你已經完成了從初學者到實戰專家的 Reactive 編程學習之旅！

**記住**：Reactive 編程的核心在於**非同步思維**和**數據流處理**。不要被複雜的概念嚇倒，從簡單的例子開始，一步一步深入。

**Happy Coding! 🚀**
