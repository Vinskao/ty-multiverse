---
title: "spring-boot-middleware"
publishDate: "2025-02-25 12:00:00"
img: /tymultiverse/assets/java.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  TY Multiverse Spring Boot 中間件與責任鏈模式實戰指南：從核心概念到專案應用，掌握 Filter、Interceptor、ControllerAdvice 的實戰技巧
tags:
  - Spring Boot
  - Middleware
  - Filter
  - Interceptor
  - ControllerAdvice
  - AOP
  - Chain of Responsibility
  - JWT
---

#### TY Multiverse Spring Boot 中間件與責任鏈模式實戰指南

## 🧠 核心概念：Filter / Middleware 是什麼？

無論是 **Servlet Filter**、**Spring Security Filter**、**Spring Cloud Gateway Filter**、或是 **WebFlux 的 WebFilter**，它們在本質上都是**「責任鏈模式（Chain of Responsibility Pattern）」**的具體實現。

**定義**：
一連串具相同介面的「處理節點」，每個節點可選擇
→ **攔截請求**（中止鏈式處理）
→ 或 **放行**（交給下一個節點處理）
最後到達實際的業務處理（Controller 或 Handler）。

### 🔍 簡單比喻

🏦 **銀行辦業務**：
- 保安（Filter）檢查身份證件
- 服務台（Interceptor）登記需求並記錄時間
- 業務員（Controller）處理具體業務
- 緊急處理中心（@ControllerAdvice）處理各種意外

## 🚀 為什麼能做這些事情？

HTTP 請求生命週期：`HTTP請求 → Tomcat → Filter鏈 → DispatcherServlet → Interceptor鏈 → Controller → 業務邏輯`

### ⚙️ 功能實現原理

| 功能 | 為什麼能做到 | 實作方式 |
|------|-------------|----------|
| **JWT 認證** | 攔截 Header，解析 token | Security Filter |
| **限流** | 檢查請求頻率 | RateLimiter Filter |
| **CORS** | 改寫 Response Header | CORS Filter |
| **日誌記錄** | 讀取 Request/Response | Logging Filter/Interceptor |
| **異常處理** | 包裹整個請求流程 | @ControllerAdvice |

## 🔄 Spring Boot Request 生命週期全解析

Spring Boot 處理一個 HTTP 請求的完整生命週期可分為 8 個階段，每個階段都可以被不同類型的 Middleware（Filter、Interceptor、AOP、ControllerAdvice）攔截或擴展。

### 🧩 整體流程圖

```
Client
  ↓
[1] Servlet Container (Tomcat/Jetty)
  ↓
[2] Filter Chain (如 JWTFilter, CorsFilter)
  ↓
[3] DispatcherServlet
  ↓
[4] HandlerMapping (尋找對應的 Controller)
  ↓
[5] HandlerInterceptor (preHandle)
  ↓
[6] Controller (執行業務邏輯)
  ↓
[7] HandlerInterceptor (postHandle / afterCompletion)
  ↓
[8] ViewResolver / ResponseBody 返回
  ↓
@ControllerAdvice / ExceptionHandler（全域異常處理）
  ↓
Response 回傳 Client
```

### 🧮 演算法與資料結構深度剖析

#### 總體觀：整個 Request Flow = 一條「有向鏈結串列 (Directed Linked List) + 責任鏈 (Chain of Responsibility)」

**Client → [1] → [2] → [3] → [4] → [5pre] → [6] → [7post] → [8] → ExceptionHandler → Response**

這個鏈條可以抽象成：

```java
interface Handler {
    Response handle(Request req, Chain next);
}
```

每一層都：
- 接收請求
- 決定是否往下一層傳遞 (`next.handle()`)
- 處理回應
- 可包裹上下層（形成遞迴結構）

這正是**責任鏈模式 (Chain of Responsibility Pattern)**的演算法表現。

#### 🧱 一層層用演算法與資料結構角度剖析

##### 🧱 [1] Servlet Container

**資料結構觀點**：執行緒池 + 阻塞佇列（ThreadPool + BlockingQueue）  
**演算法類型**：Producer-Consumer（生產者消費者模式）

```
HTTP Socket Request → 放入請求佇列 → 工作執行緒取出處理
```

Tomcat 透過 Acceptor Thread 接收請求，放入 Request Queue；Worker Threads 從 Queue 取任務處理，並呼叫 Filter Chain。屬於典型的 I/O 多工 + 任務分派演算法。

➡️ 功能類似於 **Dispatcher Pattern**：I/O 與任務解耦。

##### 🔗 [2] Filter Chain

**資料結構觀點**：單向鏈結串列 (Linked List)  
**演算法類型**：責任鏈 (Chain of Responsibility)

```java
class FilterChain {
    private List<Filter> filters;
    private int index = 0;

    public void doFilter(Request req, Response res) {
        if (index < filters.size()) {
            filters.get(index++).doFilter(req, res, this);
        }
    }
}
```

每個 Filter 都包裹下一個 Filter，可提前中止（如認證失敗），支援動態插入與排序（LinkedList 結構最合適）。

➡️ 類似於遞歸呼叫的「包裝式函數」；可視為「遞歸鏈表的疊層結構」。

##### 🚦 [3] DispatcherServlet

**資料結構觀點**：Router Map（HashMap<String, Handler>）  
**演算法類型**：查表 (Hash lookup) + 控制流程調度器 (Dispatcher Pattern)

```java
handler = handlerMappings.get(url);
handlerAdapter.handle(handler, request);
```

DispatcherServlet 根據 URL/Method 等條件查表，映射到對應 Controller 的 HandlerMethod，對應到演算法的「分派器」或「策略選擇器」。

➡️ 核心演算法：**O(1) 查找 + 流程控制**。

##### 🗺️ [4] HandlerMapping

**資料結構觀點**：多層索引樹（HashMap + Trie 結構）  
**演算法類型**：模式匹配 (Pattern Matching)

```
GET /api/user/{id}  →  Controller: UserController#getUserById()
```

URL pattern 可帶參數、萬用字元，Spring MVC 使用 AntPathMatcher / PathPatternParser，實際上是 Trie + 字串匹配演算法。

➡️ 類似於**路由表匹配演算法**，可視為 **Trie 路徑搜尋**。

##### 🧩 [5] HandlerInterceptor (preHandle)

**資料結構觀點**：棧 (Stack)  
**演算法類型**：遞歸回溯（Pre/Post Handler 形成雙向呼叫）

```java
for (Interceptor i : interceptors) {
    if (!i.preHandle(req)) break;
}
```

多個攔截器按順序前進 (preHandle)，回傳時反向執行 (afterCompletion)，資料結構行為與**呼叫棧**相同（LIFO）。

➡️ 執行邏輯為遞歸：**前進 → 執行 → 回溯**。

##### 🎯 [6] Controller

**資料結構觀點**：函式呼叫棧 (Call Stack)  
**演算法類型**：命令模式 (Command Pattern)

```java
Response handle(Request req) {
    return userService.findUser(req.id);
}
```

每個 Controller 方法封裝成一個 Command，DispatcherServlet 執行該 Command，可透過 AOP 插入額外邏輯（如 Transaction Proxy）。

➡️ 資料結構層面：**函式棧 + 動態代理（Proxy Chain）**

##### 🧱 [7] HandlerInterceptor (postHandle / afterCompletion)

**資料結構觀點**：棧 (Stack)（呼叫回溯階段）  
**演算法類型**：遞歸回溯 (Recursive Backtracking)

```java
for (Interceptor i : reverse(interceptors)) {
    i.afterCompletion(req, res);
}
```

回溯過程逐層釋放，可在此計時、記錄 log、釋放資源。

➡️ **呼叫鏈結的反向遍歷階段**。

##### 🧾 [8] ViewResolver / ResponseBody

**資料結構觀點**：策略表 (Strategy Pattern) + 序列化樹 (Object Graph)  
**演算法類型**：策略選擇 + 遞歸序列化

使用 HttpMessageConverter 決定輸出格式（JSON / XML / HTML），ObjectMapper 對象序列化時，遍歷物件圖（樹狀資料結構）。

```java
response = jsonMapper.writeValueAsString(object);
```

➡️ 是典型的**策略 + 遞歸樹遍歷演算法**。

##### ⚠️ ExceptionHandler / @ControllerAdvice

**資料結構觀點**：全域異常表 (HashMap<Class<?>, Handler>)  
**演算法類型**：動態分派 (Dynamic Dispatch)

根據 Exception 類型查找對應處理器，若未匹配 → 尋找父類型（繼承鏈搜索）。

➡️ 本質上是「**型別查表演算法**」。

### 🧮 小結：演算法對應總表

| 階段 | 核心資料結構 | 對應演算法 | 核心概念 |
|------|-------------|-----------|---------|
| [1] Servlet Container | ThreadPool + Queue | Producer-Consumer | 任務分派 |
| [2] Filter Chain | LinkedList | Chain of Responsibility | 外層包裝 |
| [3] DispatcherServlet | HashMap | Dispatcher / Lookup | 中央分發 |
| [4] HandlerMapping | Trie / HashMap | Pattern Matching | URL 路由 |
| [5] Interceptor (pre) | Stack | Recursive Forward | 前置邏輯 |
| [6] Controller | Call Stack | Command Pattern | 執行核心邏輯 |
| [7] Interceptor (post) | Stack | Backtracking | 回溯釋放 |
| [8] ViewResolver | Strategy + Object Tree | 遞歸序列化 | 結果輸出 |
| ExceptionHandler | HashMap<Class<?>> | Dynamic Dispatch | 錯誤回復 |

### 🧩 最後一句總結

Spring Boot 的 Request Flow，其實就是一條「動態鏈式責任鏈」，以**鏈表、棧、Map、策略表、任務佇列**為核心資料結構，結合 **Dispatcher / 責任鏈 / 策略 / 遞歸** 等演算法設計，實現高可擴充、可插拔、低耦合的 Request 處理框架。

## 🔍 跨語言架構對比：Middleware Pipeline 通用設計

### 🧠 核心觀念：Middleware Pipeline = Filter Chain = 責任鏈

無論是 **Servlet Filter**、**Spring Security Filter**、**Spring Cloud Gateway Filter**、或是 **WebFlux 的 WebFilter**，它們在本質上都是**「責任鏈模式（Chain of Responsibility Pattern）」**的具體實現。

所有 Web Framework 的請求流程基本上都是：

**Request → 一連串中介層 / 過濾器 → Handler / Controller → Response**

換句話說，它們只是「在不同語言中用不同名字」實作出同一種資料結構：
➡️ **鏈式呼叫（Linked Chain）＋遞歸傳遞（next()）＋前後邏輯包裹（Around pattern）**

### 🧩 對應到不同語言體系的結構比較表

| 系統 / 語言 | 對應結構 | 與 Spring MVC 的對照 |
|------------|---------|-------------------|
| **Java (Spring MVC)** | FilterChain + HandlerInterceptor | Filter + Interceptor 對應中介層 |
| **Python (Django)** | Middleware（在 settings.MIDDLEWARE 中設定） | 與 Filter/Interceptor 類似，支援 process_request / process_response |
| **Python (FastAPI / Starlette)** | Middleware（decorator 型或 class 型） | 支援 async middleware、AOP 風格包裹請求 |
| **Node.js (Express / Koa)** | app.use(fn(req, res, next)) | next() 呼叫下一層，鏈式結構完全一致 |
| **Go (Gin / Fiber)** | Use(middleware) + Context.Next() | Go 版本的責任鏈模式 |
| **ASP.NET Core (C#)** | RequestDelegate + UseMiddleware() | 也是 pipeline 模式 |
| **Ruby on Rails** | Rack middleware | 也是「request-response」環狀鏈設計 |

### 🔥 FastAPI 深度對比：8 層流水線結構

#### 🧭 FastAPI vs Spring Boot 對照總覽表

| Spring Boot 階段 | FastAPI / Starlette 對應層級 | 功能對應說明 |
|-----------------|---------------------------|------------|
| **[1] Servlet Container (Tomcat/Jetty)** | **ASGI Server (Uvicorn / Hypercorn)** | 負責接收 HTTP 請求與建立 Request/Response 物件。相當於 Servlet Container。 |
| **[2] Filter Chain (FilterChain.doFilter)** | **Middleware Stack (app.add_middleware)** | 一連串中介層，如 Logging、CORS、RateLimit、Auth 等。執行順序 = 責任鏈。 |
| **[3] DispatcherServlet** | **Router (Starlette Routing 層)** | 將請求分派給正確的 Endpoint（route handler）。相當於請求分發中心。 |
| **[4] HandlerMapping** | **路由比對 (Path + Method matching)** | 根據 path / method 找出對應的 @app.get("/users") 函數。 |
| **[5] HandlerInterceptor (preHandle)** | **Dependency Injection / Request Lifecycle Hooks (e.g. Depends)** | 在進入 endpoint 前進行驗證、session 檢查等。 |
| **[6] Controller (Controller / Service)** | **FastAPI Endpoint Function (async def handler)** | 執行實際的業務邏輯。 |
| **[7] HandlerInterceptor (postHandle / afterCompletion)** | **Middleware 的 response return 階段** | Middleware 可在 Response 回傳後進行修改或記錄。 |
| **[8] ViewResolver / ResponseBody** | **ResponseModel / JSONResponse / TemplateResponse** | FastAPI 負責將 Python 對象轉成 JSON / HTML 回應。 |
| **@ControllerAdvice / ExceptionHandler** | **ExceptionMiddleware / @app.exception_handler** | 統一異常攔截、回應格式化。 |

#### 🧩 FastAPI 的「8 層流水線」可視化流程

```
Client
  ↓
[1] ASGI Server (Uvicorn)
  ↓
[2] Middleware Stack
      ├─ CORS
      ├─ Logging
      ├─ Authentication
      └─ Custom Middleware (Rate Limit / Trace)
  ↓
[3] Router 分派
  ↓
[4] 路由比對 (path=/user, method=GET)
  ↓
[5] Dependency Resolution (preHandle)
  ↓
[6] Endpoint Function 執行
  ↓
[7] Response 回傳（Middleware 可 post 處理）
  ↓
[8] ResponseModel / JSONResponse 序列化
  ↓
ExceptionMiddleware 捕捉錯誤 → 回傳標準格式
  ↓
Response 傳回 Client
```

#### ⚙️ FastAPI Middleware 實際範例（對應 Filter Chain）

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

# [2] Filter/Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming: {request.method} {request.url}")
    response = await call_next(request)  # 呼叫下一層（相當於 FilterChain.doFilter）
    print(f"Completed: {response.status_code}")
    return response

# [3~6] Dispatcher + Handler
@app.get("/hello")
async def hello_user():
    return {"msg": "Hello, World!"}

# [ExceptionHandler]
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(content={"error": str(exc)}, status_code=500)
```

執行順序會是：
→ `log_requests` pre
→ `hello_user()`
→ `log_requests` post

這與 Spring Boot 的 Filter + Interceptor 呼叫鏈完全一致。

#### 🧠 底層設計結構（演算法觀點）

FastAPI 的整個 middleware pipeline 是一個**異步責任鏈 (async chain)**：

```python
async def middleware1(req, next):
    pre1()
    await next(req)
    post1()

async def middleware2(req, next):
    pre2()
    await next(req)
    post2()

# 呼叫順序：
# pre1 → pre2 → handler → post2 → post1
```

這等價於 Spring 的：
```
filter1 -> filter2 -> controller -> filter2 post -> filter1 post
```

➡️ 都是**鏈表 + 遞歸回傳**的結構。FastAPI 只是用 `await call_next(request)` 代替 Java 的 `chain.doFilter(req, res)`。

#### ✅ 總結：FastAPI vs Spring Boot 對照精華

| 概念 | Spring Boot | FastAPI |
|------|------------|---------|
| **容器** | Servlet Container | ASGI Server |
| **過濾器** | Filter Chain | Middleware |
| **分派器** | DispatcherServlet | Router |
| **路由對應** | HandlerMapping | Route Matching |
| **前置邏輯** | HandlerInterceptor.preHandle | Dependencies / Middleware pre |
| **業務處理** | Controller | Endpoint Function |
| **後置邏輯** | postHandle / afterCompletion | Middleware post / response hook |
| **異常處理** | @ControllerAdvice | @app.exception_handler |
| **回應輸出** | ViewResolver / ResponseBody | ResponseModel / JSONResponse |

### 📘 為什麼這些框架都設計為這 8 層？

這種結構符合 Web 伺服器要處理的「演算法需求」：

- **O(N) 鏈式遍歷**（依序處理每個 middleware）
- **可前後包裹的遞歸結構**（像是棧 Stack，可支援 pre/post）
- **易於擴展與組合**（責任鏈可插拔）
- **符合 HTTP pipeline 特性**（每個階段都能改動 request/response）

實際上，你可以把整個流程看成一個「包層」的結構：

```
Client
 ↓
[M1: CORS]
  ↓
[M2: Logging]
  ↓
[M3: Auth]
  ↓
[M4: Controller]
  ↑
[return response 回傳時再經過這些 middleware 的 post 處理]
```

這個結構在演算法層面上，其實是：

**鏈表 + 遞歸（或堆疊）呼叫的責任鏈設計模式**

#### 🧮 抽象成資料結構模型

假設有 N 個中介層：

```
M1 → M2 → M3 → Controller
```

每個中介層都有：

```python
void handle(Request req, Response res, Next next)
```

則整體演算法等價於：

```python
handle_i(req, res):
    preProcess()
    next(req, res)  # 呼叫下一層
    postProcess()
```

這在執行上是一個「遞歸展開 → 回溯收斂」的過程，像：

```
M1.pre → M2.pre → M3.pre → Controller → M3.post → M2.post → M1.post
```

➡️ 這正是 Filter / Middleware 可以同時「修改 Request」與「攔截/修改 Response」的原因。

### 📋 架構設計理念總結

| 概念 | 通用名稱 | 資料結構 / 設計模式 |
|------|---------|-------------------|
| **Request Pipeline** | Middleware / Filter Chain | 責任鏈 (Chain of Responsibility) |
| **Request Handler** | Controller / Endpoint | 呼叫終端業務邏輯 |
| **Response Handler** | ViewResolver / Response Middleware | 處理輸出或錯誤包裝 |
| **全域錯誤處理** | ExceptionHandler / ErrorMiddleware | 頂層攔截異常 |

### ⚙️ 各階段詳細說明

| 階段 | 元件 | 主要工作 | 可插入邏輯 |
|------|------|----------|------------|
| **1** | Servlet Container | 啟動 Web 容器、建立 ServletContext | 無（屬於容器層） |
| **2** | Filter Chain | 最外層攔截，通常用於安全、限流、日誌 | JWT、CORS、RateLimiter |
| **3** | DispatcherServlet | Spring MVC 的中央路由器 | AOP 攔截 |
| **4** | HandlerMapping | 動態匹配 Controller / Handler | 自定義路由邏輯 |
| **5** | HandlerInterceptor | Controller 執行前後的可插拔邏輯 | 驗證、監控、審計 |
| **6** | Controller | 業務邏輯執行 | AOP 橫切關注點 |
| **7** | ViewResolver/ResponseBody | 結果轉換與回傳 | 回應格式化 |
| **8** | ExceptionResolver/ControllerAdvice | 統一錯誤處理與例外回傳 | 全域異常處理 |

### 🧭 為什麼設計為這 8 個階段？

這不是偶然的，而是經過長期架構演進形成的分層設計，核心目的是**「高內聚 + 低耦合 + 可擴展 + 可插拔」**。

#### **架構原則與設計理念**

1. **Single Responsibility (單一職責)**：每一層只負責一件事
2. **Open/Closed Principle (開放封閉)**：可新增 Filter/Interceptor，不需改舊邏輯
3. **Separation of Concerns (關注點分離)**：協議層、框架層、業務層各自獨立
4. **Extensibility (可擴展性)**：支援 AOP、自定義 Filter、ExceptionResolver
5. **Consistency (一致性)**：不論錯誤或成功回應都經同一路徑處理

#### **各階段核心價值**

- **Servlet Container**：統一協議層與執行緒管理，隔離框架與底層伺服器
- **Filter Chain**：屬於 Servlet 規範，可在框架外層攔截原始 HTTP Request
- **DispatcherServlet**：MVC 分層架構的中樞，統一流量入口和調度
- **HandlerMapping**：使路由可配置、可擴充（支援自定義 handler 來源）
- **HandlerInterceptor**：能拿到 Controller 資訊，適合業務層攔截
- **Controller**：透過 IoC + AOP 讓業務邏輯專注「做事」
- **ViewResolver**：抽象回應格式，讓 Controller 專注「回傳資料」
- **ControllerAdvice**：保證「錯誤也有格式」，使客戶端能一致解析錯誤

**設計精髓**：每層解耦後可替換、可插拔，讓你在不改業務邏輯的情況下，自由插入框架功能。

## 🏗️ 三種中間件實戰

### 1. @ControllerAdvice：統一錯誤處理

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(
            new ErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND.value())
        );
    }
}
```

**適用場景**：統一處理所有異常，確保一致的錯誤響應格式。

### 2. Servlet Filter：JWT 認證

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {

        String token = request.getHeader("Authorization");
        if (token != null && jwtService.validateToken(token)) {
            Authentication auth = jwtService.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
```

**適用場景**：需要在 Spring MVC 之前攔截請求，如認證、CORS、安全檢查。

### 3. Handler Interceptor：日誌與監控

```java
public class LoggingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, ...) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, ...) {
        Long startTime = (Long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - startTime;
        logger.info("Request {} took {}ms", request.getRequestURI(), duration);
    }
}
```

**適用場景**：需要在 Controller 方法前後執行邏輯，如日誌記錄、性能監控。

## 🎯 TY Multiverse 專案實戰應用

### 各專案中間件使用情況

| 專案 | GlobalFilter | Servlet Filter | Handler Interceptor | @ControllerAdvice | AOP |
|------|-------------|---------------|-------------------|------------------|-----|
| **ty-multiverse-backend** | ❌ | ✅ (JWT, 限流) | ✅ | ✅ | ✅ (限流) |
| **ty-multiverse-gateway** | ✅ (日誌, CORS, 限流) | ❌ | ❌ | ❌ | ✅ |
| **ty-multiverse-consumer** | ❌ | ✅ (CORS) | ❌ | ✅ (Reactive) | ✅ |

### 🔐 JWT 認證架構

**Backend 已實現混合認證策略**：
- **無狀態服務**：JWT 認證（大部分 API）
- **有狀態服務**：Session 認證（CKEditor, DeckOfCards）
- **認證服務器**：Keycloak + OAuth2

## 🔍 gRPC API 下的責任鏈分析

### 🎯 關鍵發現

**Gateway 層 (HTTP 入口)**：✅ 中間件完全有效
**Backend 層 (gRPC 服務端)**：❌ 傳統 Servlet Filter/Interceptor 失效

### 🛠️ gRPC 替代方案

#### 1. gRPC Server Interceptor
```java
public class LoggingServerInterceptor implements ServerInterceptor {
    // 實現 gRPC 級別的日誌、認證、監控
}
```

#### 2. 應用層中間件
```java
@Service
public class GrpcPeopleServiceImpl extends PeopleServiceGrpc.PeopleServiceImplBase {
    @Override
    public void getAllPeople(...) {
        middlewareChain.process(request, () -> {
            // 業務邏輯
            List<PeopleData> people = peopleService.getAllPeople();
            responseObserver.onNext(buildResponse(people));
            responseObserver.onCompleted();
        });
    }
}
```

### 📋 架構建議

**防禦性架構**：Gateway 做入口防護，Backend 做業務防護
- Gateway：全域限流、日誌、基本認證
- Backend：業務權限檢查、數據快取、異常處理

## 🎓 學習總結

### 📚 學習路徑建議

1. **新手階段**：掌握 @ControllerAdvice → 學習 Filter → 探索 Interceptor
2. **進階階段**：AOP → Spring Security → Spring Cloud Gateway
3. **專家階段**：自定義中間件框架 → 性能優化 → 分散式追蹤

### 🏆 最佳實踐

- ✅ **每個中間件只做一件事**
- ✅ **統一錯誤響應格式**
- ✅ **合理日誌記錄層級**
- ✅ **性能監控和測試覆蓋**

### 🔍 常見問題

**Q: Filter vs Interceptor？**
A: Filter 在 Spring 外攔截，能阻止請求進入框架；Interceptor 在 Spring 內，可訪問業務上下文。

**Q: gRPC 下中間件失效怎麼辦？**
A: 使用 gRPC Server Interceptor 替代，並在應用層補償業務邏輯中間件。

---

*本文基於 TY-Multiverse 專案實戰，涵蓋 HTTP/gRPC 雙協議的中間件實現，希望幫助你掌握 Spring Boot 中間件的核心技巧。*
