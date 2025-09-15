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
