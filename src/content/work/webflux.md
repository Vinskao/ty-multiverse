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

WebFlux 與 MQ 的最佳結合策略：只在需要的地方用

在高併發與微服務架構中，開發者常會遇到一個問題：
我到底要不要在整個專案裡全面導入 WebFlux？還是只在部分端點使用？

尤其當系統已經有 Controller → MQ → Consumer → JPA 的流程時，如何決定 WebFlux 的導入點，成了設計上的關鍵。

## 一、WebFlux 與 MQ 的角色差異

**WebFlux**：解決 API 層的 **非阻塞 I/O**，適合處理大量請求。

**MQ (Message Queue)**：解決 **服務解耦** 與 **削峰填谷**，適合處理長時間或大量寫入的操作。

WebFlux 是「API 層併發優化」，MQ 是「系統間解耦與削峰」；兩者並不是替代關係，而是互補。

## 二、三種架構詳細比較

| 架構 | 流程 | 優點 | 缺點 | 適用場景 | 適用度 |
|------|------|------|------|----------|--------|
| **WebFlux Controller → JPA** | 用戶 → WebFlux Controller → Service → JPA → DB | - 非阻塞 I/O，API 層能撐高併發<br>- 簡單請求延遲極低<br>- 架構最簡單 | - DB 是同步阻塞瓶頸<br>- 重操作/大批量寫入時易打爆 DB 連線池<br>- 難以削峰 | ✅ 高併發讀取<br>✅ 查詢/小筆寫入<br>✅ 即時性要求高 | ⭐⭐⭐⭐ (80%) |
| **Spring MVC Controller → MQ → Consumer → JPA** | 用戶 → Controller → MQ → 消費者服務 → JPA → DB | - 可用 MQ 削峰填谷<br>- 生產者與消費者解耦<br>- 業務邏輯能拆微服務化<br>- 消費者可水平擴展 | - Controller 阻塞式 (MVC)，API 層效能有限<br>- 延遲較高（需經 MQ）<br>- 架構較複雜 | ✅ 業務邏輯複雜<br>✅ 長時間處理<br>✅ 多服務協作 | ⭐⭐⭐⭐⭐ (100%) |
| **WebFlux Controller → MQ → Consumer → JPA** | 用戶 → WebFlux Controller → MQ → 消費者服務 → JPA → DB | - 結合非阻塞 API + MQ<br>- 能處理極高併發<br>- 生產/消費完全解耦<br>- 適合事件驅動/混合架構 | - 架構最複雜<br>- 開發/除錯成本高<br>- 回應時序不確定，需要事件通知或查詢介面 | ✅ 高併發寫入<br>✅ 複雜任務<br>✅ 解耦 + 擴展性需求高 | ⭐⭐⭐⭐⭐ (95%) |

## 三、WebFlux 應該用在哪？

**結論很清楚：**
WebFlux 不需要全域推廣，只在「會碰到 JPA / DB I/O」的地方才真正有價值。

### Producer（Controller）端點：

如果只是「丟 MQ → 立刻回 202」，WebFlux 用或不用差別很小。

在 Java 21 + Virtual Threads 下，MVC 阻塞成本低 → 用 MVC 回 202 就夠了。

### Consumer 端：

真正會處理 DB I/O 的地方。

WebFlux 在這裡能發揮作用：非阻塞消費，提升吞吐，減少阻塞等待。

## 四、三種導入方案（由簡到繁）

### A. 最簡版（建議起步）

Producer 端點繼續用 Spring MVC。

MQ 端點：enqueue → 立刻回 202 Accepted（附 requestId）。

不需引入 WebFlux 依賴。

✅ **改動最小、穩定性最高。**

### B. 輕量 Reactive 風格

保留 MVC，但讓 MQ 端點回 `Mono<ResponseEntity<?>>`。

表面上 reactive，底層還是 Servlet 容器。

✅ **適合漸進導入 reactive 型別。**

### C. 完整 WebFlux（僅限 MQ 端點）

導入 WebFlux，讓 `/reactive/**` 或 `/async/**` 的端點跑在 Netty。

非 MQ 端點繼續用 MVC（JPA）。

✅ **適合高併發壓力確實存在時再做。**

## 五、Producer Controller (Virtual Thread) → MQ → Consumer (WebFlux) → JPA 架構分析

這個架構是相當務實的折衷方案：

### 架構流程

1. **Producer Controller (Virtual Thread / Spring MVC)**
   - API 進來後，Controller 用虛擬執行緒執行
   - 虛擬執行緒的阻塞成本很低 → enqueue MQ 幾乎沒壓力
   - 直接回 202 Accepted 給客戶端

2. **MQ**
   - 中間解耦，確保 Producer 不被 Consumer 或 DB 拖慢
   - 支援削峰填谷與重試

3. **Consumer (WebFlux Controller)**
   - 消費 MQ 訊息後，進入 reactive pipeline
   - 若 Consumer 要做多個外部呼叫（JPA、API call、Redis），WebFlux 能非阻塞整合這些 I/O
   - 能在 Consumer 層把資源壓榨得比較乾淨

4. **JPA / DB**
   - 還是同步阻塞
   - 在 WebFlux consumer 裡，通常會用 `Mono.fromCallable(() -> repository.save(entity))` 把 JPA 呼叫包裝進 reactive pipeline，避免阻塞 Reactor 執行緒

### ✅ 優點

- **Producer 輕量**：虛擬執行緒處理 enqueue 幾乎無成本，API 層簡單穩定
- **Consumer 彈性**：用 WebFlux 處理 DB + 外部 API，可以同時跑更多 request，提升 throughput
- **削峰解耦**：MQ 把高併發寫入壓力從 DB 隔離開
- **演進空間**：Consumer 可以慢慢從「JPA 包裝」過渡到「R2DBC 全 reactive」

### ⚠️ 缺點

- **架構不一致**：Producer 用 Virtual Thread (MVC)，Consumer 用 WebFlux，團隊需要理解兩套模型
- **JPA 還是阻塞**：即使在 WebFlux consumer 裡，也得小心不要直接用 JPA block Reactor thread，要用 boundedElastic 或 Mono.fromCallable 包裝
- **監控與除錯複雜**：鏈路上既有虛擬執行緒，又有 reactive pipeline，需要更嚴謹的可觀測性

### 適用場景

這個組合很適合：

- Producer 壓力不大（只是 enqueue MQ），所以 Virtual Thread 足夠
- Consumer 壓力大（要做 DB 寫入 + 外部 API call），所以需要 WebFlux 提升資源利用率
- 系統要逐步導入 reactive，不想一次性把 MVC 全改掉

## 六、邊界設計（適用於 MQ 端點）

### 回應契約
固定回 202 Accepted，內容至少包含：

```json
{
  "requestId": "xxxx-xxxx",
  "status": "processing",
  "statusUrl": "/api/request-status/{requestId}"
}
```

### MQ 故障
不要 fallback 到同步 DB → 直接回 503 Service Unavailable。

### 冪等性
如果前端會重試，需用 `(requestId|businessKey)` 去重。

### 可觀測性
記錄 enqueue 成功率、佇列延遲、Consumer 處理耗時。

## 七、落地建議

### 建議

這個組合其實是滿 **務實的折衷方案**：

**短期**：Producer 保持 Virtual Thread + MVC → 不增加複雜度。

**中期**：Consumer 用 WebFlux 處理 I/O heavy 任務。

**長期**：Consumer 如果大量依賴 DB，考慮 R2DBC 取代 JPA，才能完全發揮 WebFlux 的效益。

### 落地順序

1. **先用 A**：標記所有「MQ only」端點，統一回 202
2. **壓測 Producer**：確認是否有瓶頸
3. **若 Producer 撐不住** → 升級到 B 或 C
4. **Consumer 端先考慮 WebFlux**，因為真正的 I/O 壓力在這裡

### 最終建議

**短期**：保持 MVC + MQ，Producer 端統一回 202。

**中期**：在 Consumer 端導入 WebFlux，提高 DB I/O 吞吐。

**長期**：若 Producer 壓力大，再把 MQ 端點切到 WebFlux。

換句話說：
WebFlux 是錦上添花，MQ 是雪中送炭；先解決系統瓶頸，再考慮導入 WebFlux。

## 八、Consumer WebFlux + JPA 實作範例

### 基本模式：用 Mono.fromCallable 包裝 JPA

```java
@Service
public class PersonConsumerService {

    @Autowired
    private PersonRepository personRepository;

    public Mono<Void> processPersonMessage(PersonMessage message) {
        return Mono.fromCallable(() -> {
            // 在 boundedElastic thread pool 執行 JPA 操作
            Person entity = new Person(message.getName(), message.getAge());
            return personRepository.save(entity);
        })
        .subscribeOn(Schedulers.boundedElastic())
        .then();
    }
}
```

### WebFlux Controller 消費 MQ

```java
@RestController
public class PersonConsumerController {

    @Autowired
    private PersonConsumerService personService;

    @PostMapping("/consume/person")
    public Mono<ResponseEntity<Void>> consumePerson(@RequestBody PersonMessage message) {
        return personService.processPersonMessage(message)
            .then(Mono.just(ResponseEntity.ok().build()))
            .onErrorResume(error -> {
                // 處理消費錯誤
                return Mono.just(ResponseEntity.status(500).build());
            });
    }
}
```

### 多個 I/O 操作的組合

```java
public Mono<Void> processComplexMessage(ComplexMessage message) {
    return Mono.zip(
        // 並行執行多個 I/O 操作
        callExternalAPI(message.getData()),
        saveToDatabase(message),
        updateCache(message)
    )
    .flatMap(tuple -> {
        // 組合結果處理
        return sendNotification(message);
    });
}
```

這個架構既保持了系統的穩定性，又能在需要的地方發揮 WebFlux 的優勢，是現代化改造的理想選擇。

## 九、R2DBC（Reactive Relational Database Connectivity）補充

### 1) 背景

傳統 JDBC 為阻塞式（blocking I/O）：
- 呼叫 `jdbcTemplate.query(...)` 之後，執行緒會阻塞直到資料庫回應。
- 在 WebFlux 這種 non-blocking/reactive 架構中，阻塞的 JDBC 會讓執行緒池被卡住，抵消 reactive 的優勢。

為了在反應式環境下存取關聯式資料庫，Spring 生態系提供了 R2DBC（Reactive Relational Database Connectivity）。

### 2) R2DBC 的特性

- 非阻塞 I/O：以 Netty 或非同步驅動與資料庫互動。
- Publisher-based API：回傳 `Flux<T>` 或 `Mono<T>`，可與 WebFlux pipeline 無縫整合。
- 支援多種關聯式資料庫：PostgreSQL、MySQL、SQL Server 等皆有 R2DBC driver。
- 與 JDBC API 不相容：並非換 JAR 即可使用，API 與用法完全不同。

### 3) R2DBC vs JDBC 對比

| 特性 | JDBC | R2DBC |
|------|------|-------|
| 執行模型 | Blocking I/O | Non-blocking I/O |
| API | ResultSet / Statement | Reactive Streams（Flux/Mono）|
| 適用場景 | 傳統 Servlet、Thread-per-request | WebFlux、Netty-based reactive app |
| 資源利用 | 一個查詢占用一個 Thread | 少量 Thread 處理大量請求 |

### 4) 範例比較

JDBC（阻塞）
```java
List<User> users = jdbcTemplate.query("SELECT * FROM users", userRowMapper);
```

R2DBC（非阻塞）
```java
Flux<User> users = databaseClient.sql("SELECT * FROM users")
    .map(row -> new User(row.get("id", Long.class), row.get("name", String.class)))
    .all();
```

上述 `users` 是 Publisher，需在 reactive 流程中 `subscribe()` 或經由 WebFlux 回傳給客戶端才會觸發查詢。

### 5) 適用情境與本文架構融合

- 專案為 WebFlux + Reactive Stack（高併發 I/O 密集）→ 強烈建議使用 R2DBC，避免 JDBC 阻塞成為瓶頸。
- 專案為傳統 Spring MVC + Thread-per-request → 繼續使用 JDBC，沒有必要強改。
- 只是在 Producer 端加入 MQ 或採用 Virtual Threads → JDBC 仍可用；VT 能降低阻塞成本。

與本文的「Producer（MVC/VT）→ MQ → Consumer（WebFlux）→ JPA」架構對齊：
- 短中期：Consumer 端先以 `Mono.fromCallable(...)`/`Schedulers.boundedElastic()` 包裝 JPA，逐步導入 reactive 型別與流程。
- 長期：若 Consumer 對 DB I/O 依賴重且併發壓力高，再將 Consumer 的持久層由 JPA 過渡到 R2DBC，讓整條消費鏈路真正 non-blocking。

---

# TY Multiverse Consumer：Reactive 架構實戰指南

## Overview

以下是基於 TY Multiverse 專案的完整 Reactive 架構遷移實戰指南，涵蓋從傳統 MVC 到全 Reactive 棧的演進路徑。

### **Web 層**：Spring WebFlux（Netty）
- 完全非阻塞 I/O 的 Web 框架
- 使用 Netty 作為底層服務器
- 所有端點回傳 `Mono<ResponseEntity<?>>` 或 `Flux<T>`

### **DB 層**：Spring Data R2DBC（PostgreSQL）
- 專為 Reactive 設計的資料庫連線層
- 連線池上限 5（遵循 K8s 限制）
- 端到端非阻塞資料庫操作

### **MQ 層**：Reactor RabbitMQ + Spring AMQP
- 雙棧支援：同時提供 Reactive 和傳統 MQ 消費者
- 完全 reactive 消息處理
- 支援背壓控制和並發管理

### **其他組件**
- **OpenAPI**：springdoc-webflux-ui
- **Virtual Threads**：開啟供一般任務池使用
- **異常處理**：責任鏈模式的全局異常處理

## 不變更承諾 ✅

### **API 規格不動**
- 所有 REST 路徑、HTTP 方法、JSON 格式維持相同
- 外部系統無需任何修改

### **MQ 不動**
- 保留既有交換器/隊列/路由鍵配置
- 對外 MQ 規格完全不變

### **DB 連線限制**
- R2DBC 連線池 `max-size=5`
- 嚴格遵循 K8s 環境限制

## 模組重點

### 實體層（Entity）
```java
// 傳統 JPA 實體
@Entity
@Table(name = "people")
public class People {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;
}

// 轉換為 R2DBC 實體
@Table("people")
public class People {
    @Id
    private Long id;

    @Column("name")
    private String name;
}
```

### 資料層（Repository）
```java
// 傳統 JPA Repository
public interface PeopleRepository extends JpaRepository<People, Long> {
    List<People> findByName(String name);
}

// 轉換為 Reactive Repository
public interface PeopleRepository extends ReactiveCrudRepository<People, Long> {
    Flux<People> findByName(String name);
}
```

### 服務層（Service）
```java
// 傳統同步 Service
@Service
public class PeopleService {
    public List<People> getAllPeople() {
        return peopleRepository.findAll();
    }
}

// 轉換為 Reactive Service
@Service
public class PeopleService {
    public Flux<People> getAllPeople() {
        return peopleRepository.findAll();
    }
}
```

### 控制層（Controller）
```java
// 傳統 MVC Controller
@RestController
public class PeopleController {
    @GetMapping("/api/people")
    public ResponseEntity<List<People>> getAllPeople() {
        List<People> people = peopleService.getAllPeople();
        return ResponseEntity.ok(people);
    }
}

// 轉換為 WebFlux Controller
@RestController
public class PeopleController {
    @GetMapping("/api/people")
    public Mono<ResponseEntity<Flux<People>>> getAllPeople() {
        Flux<People> people = peopleService.getAllPeople();
        return Mono.just(ResponseEntity.ok(people));
    }
}
```

## MQ 消費者架構

### 🚀 完全 Reactive MQ 消費者

使用 **Reactor RabbitMQ** 實現端到端非阻塞消息處理：

#### ReactivePeopleConsumer
```java
@Service
public class ReactivePeopleConsumer {

    @Autowired
    private PeopleService peopleService;

    public Flux<Void> consumePeopleMessages() {
        return rabbitFlux.flatMap(delivery -> {
            try {
                PeopleMessage message = parseMessage(delivery);
                return peopleService.processPeopleMessage(message)
                    .doOnSuccess(result -> delivery.ack())
                    .doOnError(error -> delivery.nack(false));
            } catch (Exception e) {
                delivery.nack(false);
                return Mono.empty();
            }
        })
        .flatMap(concurrency -> 2)  // 控制並發數
        .prefetch(2);               // 背壓控制
    }
}
```

**關鍵特性：**
- **並發控制**：`flatMap(concurrency=2)` 與 DB 連線池協調
- **背壓管理**：`prefetch=2`，避免耗盡 DB 連線
- **手動 ACK/NACK**：`AcknowledgableDelivery` 精確控制消息確認

#### ReactiveWeaponConsumer
```java
@Service
public class ReactiveWeaponConsumer {

    public Flux<Void> consumeWeaponMessages() {
        return rabbitFlux.flatMap(delivery -> {
            WeaponMessage message = parseWeaponMessage(delivery);

            // 依操作類型調整並發
            int concurrency = message.isWriteOperation() ? 1 : 2;

            return weaponService.processWeaponMessage(message)
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(concurrency)
                .doOnSuccess(result -> delivery.ack())
                .doOnError(error -> delivery.nack(false));
        });
    }
}
```

### 🔄 傳統 MQ 消費者（保留，預設禁用）

```java
@Service
@ConditionalOnProperty(name = "spring.rabbitmq.legacy.enabled", havingValue = "true")
public class LegacyPeopleConsumer {

    @RabbitListener(queues = "people-queue")
    public void consumePeopleMessage(PeopleMessage message) {
        // 同步處理邏輯
        try {
            Mono<Void> result = peopleService.processPeopleMessage(message);
            result.block(); // 在邊界處阻塞
        } catch (Exception e) {
            // 錯誤處理
        }
    }
}
```

### MQ 設定對比

| 特性 | Reactor RabbitMQ | Spring AMQP |
|------|------------------|-------------|
| **I/O 模式** | 完全非阻塞 | 阻塞監聽 + reactive service |
| **背壓控制** | 原生支援 | 無 |
| **並發控制** | `flatMap(concurrency)` | `@RabbitListener(concurrency)` |
| **ACK 策略** | 手動 ACK/NACK | 自動 ACK |
| **資源效率** | 高（事件驅動） | 中（線程池） |

## 配置檔重點

### application.yml
```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/peoplesystem
    pool:
      max-size: 5  # 限制為個位數連線

  rabbitmq:
    enabled: true
    legacy.enabled: false  # 禁用傳統 MQ 消費者

server:
  port: 8081

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

### ReactiveRabbitMQConfig
```java
@Configuration
public class ReactiveRabbitMQConfig {

    @Bean
    public Receiver receiver(ConnectionFactory connectionFactory) {
        return RabbitFlux.createReceiver(connectionFactory);
    }

    @Bean
    public Sender sender(ConnectionFactory connectionFactory) {
        return RabbitFlux.createSender(connectionFactory);
    }
}
```

## 啟動與運行

### 本地執行
```bash
# 設定 local.properties
cp src/main/resources/env/local.properties.example src/main/resources/env/local.properties

# 啟動（預設使用 Reactive MQ）
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### 如需啟用傳統 MQ 消費者
```bash
# 在 application-local.yml 中新增：
spring:
  rabbitmq:
    legacy:
      enabled: true
```

## API 文件
- **Swagger UI**: http://localhost:8081/ty_multiverse_consumer/swagger-ui.html
- **OpenAPI Docs**: http://localhost:8081/ty_multiverse_consumer/v3/api-docs

---

## 📚 Reactive 架構設計概念指南

### 🎯 為什麼選擇 Reactive 架構？

**核心問題分析：**
- **資源瓶頸**：傳統阻塞 I/O 在高併發下造成線程浪費，DB 連線數限制讓問題更嚴重
- **延遲累積**：網路 I/O + DB I/O + 應用邏輯形成串聯延遲，無法有效並行處理
- **擴展限制**：線程池模式在 K8s 環境下無法有效利用有限資源

**Reactive 解決方案：**
- **事件驅動**：從"拉取數據"轉變為"數據推送"，減少等待時間
- **背壓控制**：上游生產者根據下游消費能力自動調整速度
- **資源共享**：少量線程處理大量併發請求，提高資源利用率

### 🔰 Mono 與 Flux 基礎教學

在進入 Reactive 架構設計之前，讓我們先掌握 Mono 與 Flux 的基本概念和寫法。

#### 1. Mono 基礎操作

**Mono<T>**：0-1 個元素的非同步結果，類似 Optional 的非同步版本

```java
// 創建 Mono
Mono<String> mono = Mono.just("Hello");                    // 直接創建
Mono<String> emptyMono = Mono.empty();                      // 空 Mono
Mono<String> errorMono = Mono.error(new RuntimeException()); // 錯誤 Mono

// 基本操作
mono.map(s -> s + " World")                                // 轉換： "Hello World"
    .flatMap(s -> Mono.just(s.toUpperCase()))             // 平坦化轉換： "HELLO WORLD"
    .filter(s -> s.length() > 5)                           // 過濾： 通過
    .defaultIfEmpty("Default")                             // 默認值
    .onErrorResume(e -> Mono.just("Fallback"))            // 錯誤恢復
    .subscribe(System.out::println);                       // 訂閱並消費
```

**常見使用場景：**
```java
// 單個數據庫查詢
Mono<User> findUserById(Long id) {
    return userRepository.findById(id);
}

// 單個外部 API 調用
Mono<String> callExternalApi(String param) {
    return webClient.get()
        .uri("/api/data/" + param)
        .retrieve()
        .bodyToMono(String.class);
}

// 異步計算結果
Mono<Integer> calculateAsync(int a, int b) {
    return Mono.fromCallable(() -> a + b);
}
```

#### 2. Flux 基礎操作

**Flux<T>**：0-N 個元素的非同步串流，類似 Stream 的非同步版本

```java
// 創建 Flux
Flux<String> flux = Flux.just("A", "B", "C");              // 多個元素
Flux<String> fromList = Flux.fromIterable(Arrays.asList("X", "Y", "Z")); // 從集合
Flux<Integer> range = Flux.range(1, 5);                    // 1, 2, 3, 4, 5

// 基本操作
flux.map(s -> s.toLowerCase())                             // 轉換每個元素
    .flatMap(s -> Flux.just(s, s + "!"))                   // 每個元素展開為多個
    .filter(s -> !s.contains("B"))                          // 過濾： "a", "c"
    .take(2)                                               // 只取前2個： "a", "c"
    .collectList()                                         // 收集為 List
    .subscribe(list -> System.out.println(list));          // 訂閱
```

**常見使用場景：**
```java
// 多個數據庫查詢
Flux<User> findAllUsers() {
    return userRepository.findAll();
}

// 批量處理
Flux<User> processUsers(List<User> users) {
    return Flux.fromIterable(users)
        .flatMap(user -> userRepository.save(user));
}

// 分頁查詢
Flux<User> findUsersWithPagination(int page, int size) {
    return userRepository.findAll()
        .skip((long) page * size)
        .take(size);
}
```

#### 3. Mono 與 Flux 互轉

```java
// Flux 轉 Mono
Mono<List<String>> listMono = flux.collectList();           // 收集所有元素為 List
Mono<String> firstMono = flux.next();                       // 只取第一個元素
Mono<Boolean> hasElements = flux.hasElements();             // 是否有元素

// Mono 轉 Flux
Flux<String> singleFlux = mono.flux();                      // 單元素 Flux
Flux<String> multipleFlux = mono.flatMapMany(s -> Flux.just(s, s)); // 多元素 Flux
```

#### 4. 錯誤處理

```java
// Mono 錯誤處理
Mono<String> result = service.callApi()
    .onErrorReturn("Default Value")                         // 返回默認值
    .onErrorResume(e -> Mono.just("Fallback"))              // 恢復邏輯
    .doOnError(e -> log.error("Error occurred", e))         // 側邊效果
    .retry(3);                                              // 重試 3 次

// Flux 錯誤處理
Flux<String> stream = service.getDataStream()
    .onErrorContinue((e, item) -> log.warn("Skip item: {}", item)) // 跳過錯誤項
    .doOnError(e -> log.error("Stream error", e));
```

#### 5. 組合操作

```java
// 並行執行
Mono.zip(mono1, mono2)
    .map(tuple -> tuple.getT1() + tuple.getT2());           // 等待兩個 Mono 完成

// 順序執行
mono1.flatMap(result1 ->
    mono2.map(result2 -> result1 + result2));              // mono2 依賴 mono1 結果

// 合併多個 Flux
Flux.merge(flux1, flux2, flux3)                             // 隨機順序合併
    .subscribe(System.out::println);

// 有序合併
Flux.concat(flux1, flux2, flux3)                            // 保持順序合併
    .subscribe(System.out::println);
```

#### 6. 測試 Reactive 程式碼

```java
@Test
void testMonoOperations() {
    StepVerifier.create(
        Mono.just("hello")
            .map(String::toUpperCase)
            .filter(s -> s.length() > 3)
    )
    .expectNext("HELLO")
    .verifyComplete();
}

@Test
void testFluxOperations() {
    StepVerifier.create(
        Flux.just("a", "b", "c")
            .map(String::toUpperCase)
            .collectList()
    )
    .expectNext(Arrays.asList("A", "B", "C"))
    .verifyComplete();
}
```

#### 7. 常見陷阱與最佳實踐

**陷阱 1：阻塞操作**
```java
// ❌ 錯誤：在 Reactive 鏈中阻塞
Mono<String> bad = Mono.fromCallable(() -> {
    Thread.sleep(1000); // 阻塞當前線程
    return "result";
});

// ✅ 正確：使用非阻塞操作
Mono<String> good = Mono.delay(Duration.ofSeconds(1))
    .map(i -> "result");
```

**陷阱 2：忽略訂閱**
```java
// ❌ 忘記訂閱，什麼都不會發生
Mono<String> mono = service.getData();
// 沒有 .subscribe()，不會執行

// ✅ 正確訂閱
mono.subscribe(
    data -> System.out.println(data),                      // onNext
    error -> System.err.println(error),                    // onError
    () -> System.out.println("Complete")                   // onComplete
);
```

**最佳實踐：**
- 總是記得訂閱 Reactive 串流
- 使用 `StepVerifier` 進行單元測試
- 避免在 Reactive 鏈中使用阻塞操作
- 善用操作符組合，而非嵌套回調

---

### 🌊 Reactive 編程模型的核心概念

#### 1. 資料流（Data Flow）
```java
// 傳統：同步方法呼叫
List<People> people = peopleService.getAllPeople();

// Reactive：非同步資料流
Flux<People> people = peopleService.getAllPeople();
```
**設計理念：**
- `Mono<T>`：0-1 個元素的非同步結果
- `Flux<T>`：0-N 個元素的非同步串流
- **推模型**：數據主動"推送"給訂閱者，而非被動"拉取"

#### 2. 背壓（Backpressure）
**問題：** 生產者速度 > 消費者速度，造成記憶體累積或系統崩潰

**Reactive 解決方案：**
```java
// 控制上游生產速度
.flatMap(this::processItem, 2)  // 最多同時處理 2 個項目

// 請求式拉取
.subscribe(subscriber, Long.MAX_VALUE);  // 請求無限多數據
```

**設計原則：**
- **請求-響應模式**：消費者主動請求數據量，生產者按需提供
- **流量控制**：自動調整生產速度，防止系統過載

#### 3. 非阻塞 I/O（Non-blocking I/O）
**傳統阻塞 I/O：**
```
線程 A ──► 發送請求 ──► 等待回應 ──► 處理結果
     ▲                                    │
     └────────────────────────────────────┘
                    線程被阻塞無法處理其他任務
```

**Reactive 非阻塞 I/O：**
```
線程 A ──► 發送請求 ──► 註冊回調 ──► 處理其他任務
     ▲                                    │
     └────────────────────────────────────┘
                    線程繼續處理其他請求，回調觸發時再處理結果
```

**設計優勢：**
- **線程複用**：單個線程處理多個 I/O 操作
- **並發提升**：在相同資源下支援更高併發
- **延遲降低**：消除阻塞等待時間

### 🏗️ 架構層次設計理念

#### 1. Web 層：Spring WebFlux
**設計決策：**
- **Netty 替代 Tomcat**：事件驅動的非阻塞服務器
- **Reactive Controller**：所有端點回傳 `Mono<ResponseEntity<T>>`
- **函數式編程**：使用 `map()`, `flatMap()`, `onErrorResume()` 組合操作

**架構優勢：**
- **零阻塞**：請求處理不佔用線程
- **自動擴展**：根據負載動態調整資源
- **背壓友好**：上游壓力會自動傳播到下游

#### 2. 資料層：R2DBC
**設計決策：**
- **驅動級非阻塞**：直接使用非阻塞資料庫協議
- **連線池限制**：`max-size=5` 嚴格控制資源使用
- **Reactive Transaction**：事務操作同樣非阻塞

**架構優勢：**
- **資源節省**：少量連線處理大量請求
- **延遲預測性**：消除連線等待時間
- **K8s 友好**：符合容器環境資源限制

#### 3. 消息層：Reactor RabbitMQ
**設計決策：**
- **串流消費**：消息作為連續事件流處理
- **手動 ACK/NACK**：精確控制消息確認時機
- **並發控制**：`flatMap(concurrency)` 動態調整處理速度

**架構優勢：**
- **端到端背壓**：從 MQ 到 DB 的完整壓力控制
- **故障恢復**：消息處理失敗自動重試和重新入隊
- **資源協調**：MQ 消費速度與 DB 處理能力同步

### 🔄 系統間的背壓傳播設計

```
HTTP 請求 ──► WebFlux ──► Service ──► R2DBC ──► DB
     ▲             ▲           ▲           ▲
     │             │           │           │
     └─────────────┴───────────┴───────────┴─────背壓傳播路徑
```

**設計原則：**
1. **HTTP 層背壓**：Netty 根據處理能力限制新請求接受
2. **應用層背壓**：Service 根據 DB 連線可用性控制處理速度
3. **資料層背壓**：R2DBC 根據連線池狀態限制並發查詢
4. **MQ 層背壓**：Reactor RabbitMQ 根據消費能力調整 prefetch

### 🎨 程式設計模式變革

#### 1. 從命令式到宣告式
```java
// 命令式：告訴電腦"如何做"
for (People person : peopleList) {
    person.setUpdatedAt(now);
    repository.save(person);
}

// 宣告式：告訴電腦"要做什麼"
Flux.fromIterable(peopleList)
    .map(person -> person.setUpdatedAt(now))
    .flatMap(repository::save)
```

#### 2. 從同步錯誤處理到非同步錯誤處理
```java
// 同步：try-catch 包圍
try {
    List<People> people = service.getAllPeople();
    return ResponseEntity.ok(people);
} catch (Exception e) {
    return ResponseEntity.internalServerError().build();
}

// 非同步：串流錯誤處理
return service.getAllPeople()
    .collectList()
    .map(people -> ResponseEntity.ok(people))
    .onErrorResume(error -> Mono.just(
        ResponseEntity.internalServerError().build()));
```

#### 3. 從線程池到事件循環
```java
// 線程池模式：每個請求一個線程
@RequestMapping("/api/people")
public Callable<ResponseEntity> getPeople() {
    return () -> service.getPeopleBlocking();
}

// 事件循環模式：事件驅動處理
@RequestMapping("/api/people")
public Mono<ResponseEntity> getPeople() {
    return service.getPeopleReactive()
        .collectList()
        .map(people -> ResponseEntity.ok(people));
}
```

### 📊 性能模型分析

#### 傳統阻塞架構的限制
```
請求數量 = 線程池大小 × 處理速度
         = 100線程 × 每秒10個請求
         = 1000 RPS
```

**問題：**
- 線程浪費：大多數時間在等待 I/O
- 記憶體壓力：每個線程需獨立棧空間
- 擴展困難：K8s 環境下線程數受限

#### Reactive 架構的優勢
```
請求數量 = 事件循環數量 × 事件處理速度 × 並發度
         = 4核心 × 每秒1000個事件 × 背壓控制
         = 10,000+ RPS（理論值）
```

**優勢：**
- **資源效率**：4個事件循環處理數千請求
- **動態擴展**：根據負載自動調整處理速度
- **故障隔離**：單個請求失敗不影響其他請求

### 🎯 Reactive 架構的成功關鍵

#### 1. 全棧一致性
**設計原則：** 整個應用棧都必須是 reactive 的
- ❌ 混合模式：WebFlux + JPA（會造成阻塞點）
- ✅ 純 Reactive：WebFlux + R2DBC + Reactor RabbitMQ

#### 2. 背壓策略設計
**設計原則：** 明確定義各層的背壓策略
```yaml
# DB 層：連線池限制
r2dbc:
  pool:
    max-size: 5

# MQ 層：prefetch 控制
consumeOptions:
  qos: 2

# 應用層：flatMap 並發控制
flatMap(concurrency=2)
```

#### 3. 錯誤處理重設計
**設計原則：** 從異常拋出到錯誤訊號傳播
```java
// 傳統：異常中斷執行
throw new BusinessException("資料不存在");

// Reactive：錯誤訊號傳播
return Mono.error(new BusinessException("資料不存在"));
```

#### 4. 資源管理重新思考
**設計原則：** 從資源競爭到資源協調
- **連線池**：從"搶連線"到"協調使用"
- **線程**：從"線程池"到"事件循環"
- **記憶體**：從"緩衝區"到"串流處理"

### 🚀 架構演進路徑

#### 階段 1：基礎 Reactive（已完成）
- WebFlux + R2DBC + Reactor RabbitMQ
- 基本背壓控制
- 端到端非阻塞

#### 階段 2：進階優化（建議）
- 智慧背壓：根據系統負載動態調整參數
- 熔斷模式：自動降級保護系統穩定性
- 分散式追蹤：全鏈路性能監控

#### 階段 3：架構升級（未來）
- 事件驅動架構：從請求-響應到事件驅動
- 響應式微服務：服務間的事件流通信
- 雲原生 Reactive：充分利用容器化優勢

### 💡 設計思維轉變

#### 從"同步思考"到"非同步思考"
```java
// 同步思考：線性執行
開始 → 執行任務A → 等待A完成 → 執行任務B → 結束

// 非同步思考：並行優化
開始 → 同時啟動任務A和任務B → 誰先完成就處理誰 → 結束
```

#### 從"資源管理"到"流量控制"
```java
// 資源管理：限制資源使用量
connectionPool.setMaxSize(5);

// 流量控制：協調生產消費節奏
.flatMap(this::process, maxConcurrency)
.onBackpressureBuffer(bufferSize)
```

#### 從"錯誤處理"到"恢復策略"
```java
// 錯誤處理：被動補救
try { doSomething(); } catch (Exception e) { handleError(); }

// 恢復策略：主動適應
doSomething()
    .retryWhen(Retry.backoff(maxAttempts, Duration.ofSeconds(1)))
    .onErrorResume(fallback::handle);
```

---

**🎉 Reactive 架構不僅是技術升級，更是系統設計思維的根本轉變！**
