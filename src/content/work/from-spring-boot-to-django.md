---
title: "from-spring-boot-to-django"
publishDate: 2025-08-25 03:00:00
img: /tymultiverse/assets/django.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  Django專案基礎教學 + 設計模式對應，用Java思維理解Django架構
tags:
  - Django
  - Python
  - Java
  - Design Pattern
  - AI
  - Architecture
---

# 從 Spring Boot 到 Django：用 Java 思維理解 Django 專案架構

## 概述

本文將用 Java 開發者的思維來解釋 Django 專案架構，透過與 Spring Boot 的類比，讓你快速理解 Django 的設計模式和架構理念。特別適合從 Java 轉移到 Python 的開發者。

## 🧑‍💻 Django 專案基礎教學 + 設計模式對應

### 1️⃣ Django 與 Java 框架的類比

Django 在 Python 世界 ≈ Spring Boot 在 Java 世界。

它幫你處理：

- **Model** → 對應 Spring JPA 的 `@Entity`
- **View** → 對應 Spring Controller (`@RestController`)
- **URL (路由)** → 對應 Spring 的 `@RequestMapping`
- **Service 層** → 你自己寫的業務邏輯 (和 Java 幾乎一樣)
- **Celery** → 類似 Spring + Kafka/RabbitMQ 的 Async 任務

所以你就可以這樣比喻：

> 「Django + Celery 在 Python 世界就像 Java 世界的 Spring Boot + JPA + RabbitMQ。」

### 2️⃣ 專案分層（設計模式：分層架構 Layered Architecture）

架構流程：
```
前端 → API層 (View) → Service層 → 工作流 (LangGraph) → AI能力層 → 資料層 → 外部系統
```

在 Java 你會這樣想：

```
Controller → Service → Repository → DB
```

這裡只是多了 **工作流層** 和 **AI能力層**。

### 3️⃣ Django 三大核心

#### (A) Models（資料模型） → 倉儲模式（Repository Pattern）

就像 JPA 的 `@Entity`，但 Django 的 Model **同時包含 Repository 功能**！

```python
class Conversation(models.Model):  # 對話
    user = models.ForeignKey(User)  # 對應用戶
    session_id = models.CharField()

    # Django Model 內建 Repository 功能！
    # objects 就是預設的 Manager (Repository)
    conv = Conversation.objects.create(user=user, session_id="abc123")
    conversations = Conversation.objects.filter(user=user)
```

**Java 類比：**

```java
@Entity
class Conversation {
    @ManyToOne
    User user;
    String sessionId;
}

// Java 需要額外寫 Repository 介面
@Repository
interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUser(User user);
}
```

**關鍵差異：**
- **Java Spring：** Entity + Repository 分離設計
- **Django：** Model = Entity + Repository 一體化

**設計模式：** 倉儲模式（Repository Pattern）

Django Model 負責「資料結構定義」並內建資料存取功能（objects Manager）。



##### 補充：Manager 的角色

在 Django，`objects` 其實是一個 Manager，你可以理解成「Repository 實例」。

```python
class Conversation(models.Model):
    user = models.ForeignKey(User)
    session_id = models.CharField()

    # 預設 Manager
    objects = models.Manager()

    # 自訂 Manager（就像不同的 Repository 實作）
    active = ActiveConversationManager()

# 使用方式
Conversation.objects.filter(active=True)      # 使用預設 Manager
Conversation.active.filter(status='active')  # 使用自訂 Manager
```

**Java 類比：**
```java
// 就像你在 Java 裡面做不同的 Repository 實作
@Repository
interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByActiveTrue();
}

@Repository
interface ActiveConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByStatus(String status);
}
```

#### (B) Views（控制器） → 控制器模式（Controller Pattern）

Django 的 ViewSet ≈ Spring 的 `@RestController`

```python
class ConversationViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        ...
```

**Java 類比：**

```java
@RestController
@RequestMapping("/conversations")
class ConversationController {
    @PostMapping("/{id}/send-message")
    public ResponseEntity<?> sendMessage(...) { ... }
}
```

#### (C) URLs（路由） → 路由映射模式

Django urlpatterns ≈ Spring `@RequestMapping`

```python
urlpatterns = [
    path('api/v1/', include(conversation_router.urls)),
]
```

**Java 類比：**

```java
@RequestMapping("/api/v1")
```

### 4️⃣ 異步任務（設計模式：任務隊列 + 非同步處理）

我們可以使用 Celery + RabbitMQ/Redis，就像 Java 用：

- Spring `@Async`
- 或 Kafka Consumer

**流程：**

1. 建立 Conversation + Message + Task
2. 丟到 Celery 隊列 (非同步)
3. Worker 執行 AI 任務
4. 前端輪詢 task 狀態

**Java 類比：**

```java
// 你會用 CompletableFuture + Kafka/RabbitMQ + @Async
```

##### 補充：非同步 API 設計方式

###### Spring Boot 的非同步 API 設計

**(A) WebFlux (Reactive)**
```java
@RestController
public class ReactiveController {
    @GetMapping("/conversations")
    public Mono<List<Conversation>> getConversations() {
        return conversationService.findAll()
            .collectList();  // Mono/Flux 模型
    }
}
```
**優點：** 適合高併發、非阻塞 IO  
**缺點：** 學習曲線高

**(B) CompletableFuture + @Async**
```java
@RestController
public class AsyncController {
    @GetMapping("/conversations")
    public CompletableFuture<List<Conversation>> getConversations() {
        return CompletableFuture.supplyAsync(() ->
            conversationService.findAll()
        );  // 適合把多個後端查詢並行處理
    }
}
```

**(C) Message Queue (Kafka, RabbitMQ)**
```java
@RestController
public class QueueController {
    @PostMapping("/process")
    public ResponseEntity<?> processTask(@RequestBody TaskRequest request) {
        taskService.sendToQueue(request);  // API 只做 ack
        return ResponseEntity.accepted().body("Processing started");
    }
}
```

###### Django 的非同步 API 設計

**(A) Django 3.1+ 原生 async view**
```python
# views.py
from django.http import JsonResponse
from django.views import View

class AsyncConversationView(View):
    async def get(self, request):
        # 適合 I/O bound 任務
        conversations = await Conversation.objects.filter(
            user=request.user
        ).aget()
        return JsonResponse({"data": conversations})
```

**(B) Celery（非同步任務隊列）**
```python
# views.py
def process_ai_task(request):
    # API 回傳立即成功
    result = process_ai.delay(request.POST['data'])
    return JsonResponse({
        'task_id': result.id,
        'status': 'processing'
    })

# tasks.py
@shared_task
def process_ai(data):
    # 實際任務丟給 Celery Worker
    # 適合長時間處理 / 延遲任務
    return do_heavy_processing(data)
```

**(C) Channels（WebSocket / background worker）**
```python
# consumers.py
class ChatConsumer(WebsocketConsumer):
    async def connect(self):
        # 適合即時性（聊天、通知）
        await self.accept()
```

##### 補充：底層伺服器處理機制

###### Spring Boot 的世界

**Spring Boot 本身不直接處理 socket，它依賴容器：**

**(A) Tomcat / Jetty / Undertow（Servlet 容器）**
```java
// application.properties
server.servlet.context-path=/api
server.port=8080

// Spring MVC（同步風格）就跑在這上面
@RestController
class SyncController {
    @GetMapping("/data")
    public List<Data> getData() {
        // 每個請求一條執行緒（blocking I/O 模型）
        // 請求進來後由容器的 ThreadPool 分配給某個 worker thread 處理
        return dataService.findAll();
    }
}
```

**特點：**
- 傳統 Servlet 容器
- 每個請求一條執行緒（blocking I/O）
- 對應 Django 的 WSGI

**(B) Reactor Netty（Reactive 引擎）**
```java
// Spring WebFlux 預設引擎
@Configuration
public class WebFluxConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder().build();
    }
}

// 像 Node.js 的模式
@RestController
public class ReactiveController {
    @GetMapping("/data")
    public Flux<Data> getData() {
        // event loop + non-blocking I/O
        // 請求進來不會直接「卡住 thread」
        // 把 I/O 事件掛在 event loop 上，後續有資料才回呼
        return dataService.findAll();
    }
}
```

**Spring 的兩個面向：**
- **Servlet 模式 (Tomcat)** → 傳統 WSGI 類似
- **Reactive 模式 (Netty)** → 類似 ASGI

##### 補充：Spring Boot 非同步處理概要

Spring Boot 提供兩種主要的非同步處理方式：

###### (A) 傳統 Spring MVC + Tomcat/Jetty/Undertow

**底層協定：** Servlet API（Blocking I/O）

**執行模式：** Thread-per-request（請求來就綁定一條 thread）

```java
@RestController
public class AsyncController {
    @GetMapping("/async")
    public CompletableFuture<String> asyncEndpoint() {
        return CompletableFuture.supplyAsync(() -> {
            // 這個 lambda 會在另一條 thread 執行
            try {
                Thread.sleep(1000); // 模擬 I/O 操作
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return "Async response";
        });
    }
}
```

**Async Support (@Async, CompletableFuture, Callable, DeferredResult)：**

```java
@Service
public class AsyncService {
    @Async  // 使用 Thread Pool 執行
    public CompletableFuture<String> asyncMethod() {
        // 實際上還是阻塞 I/O，只是換到 worker thread
        return CompletableFuture.completedFuture("result");
    }
}
```

**本質分析：**
- 本質還是把同步阻塞 I/O 丟進 ThreadPool，由額外的 worker thread 執行
- 對於 Tomcat 來說：主請求 thread 可以釋放，等 worker thread 做完再 callback
- **效果：** 避免佔用 Servlet thread，但 worker thread 還是同步 I/O → 沒有真正「非阻塞 I/O」
- **比喻：** 多開幾個廚房（thread pool），但每個廚房還是傳統瓦斯爐（同步 I/O）

###### (B) Spring WebFlux + Netty（或 Undertow 的 reactive 模式）

**底層協定：** Reactor + Reactive Streams + Non-blocking IO（基於 Netty NIO event loop）

**執行模式：** 事件迴圈（event loop + coroutine-like callback chain）

```java
@Configuration
public class ReactiveConfig {
    @Bean
    public WebClient webClient() {
        return WebClient.builder().build();
    }
}

@RestController
public class ReactiveController {
    private final WebClient webClient;

    public ReactiveController(WebClient webClient) {
        this.webClient = webClient;
    }

    @GetMapping("/reactive")
    public Mono<String> reactiveEndpoint() {
        return webClient.get()
            .uri("https://api.example.com/data")
            .retrieve()
            .bodyToMono(String.class);
            // 整個 pipeline 都是非阻塞的
    }
}
```

**特徵：**
- 每個 Netty event loop thread 可以同時處理上千個連線（靠非阻塞 socket 與 callback/reactive pipeline）
- 必須搭配**非阻塞 driver**才有意義：
  - R2DBC（Reactive Relational Database Connectivity）
  - WebClient（非阻塞 HTTP 客戶端）
  - Redis reactive driver
  - MongoDB reactive driver

**比喻：** 只有一個廚房（event loop），但瓦斯爐換成電磁爐（非阻塞 I/O），可以同時煮一百鍋水，等滾的時候不用人守。

##### 補充：Spring Boot 一定要用到 Netty/WebFlux 才有真正非阻塞效果？

**✅ 正確理解：**

```java
// ❌ Tomcat + @Async：只是 thread pool 切換（並行，但不是非阻塞）
@RestController
public class TomcatAsyncController {
    @Async
    @GetMapping("/tomcat-async")
    public CompletableFuture<String> tomcatAsync() {
        // 實際上是：同步 I/O + Thread Pool 切換
        // 效果：避免佔用 Servlet thread，但沒有節省資源
        return someBlockingOperation();
    }
}

// ✅ WebFlux + Netty：才是 event loop + 非阻塞 I/O
@RestController
public class WebFluxController {
    @GetMapping("/webflux")
    public Mono<String> webflux() {
        // 真正的非阻塞 I/O
        // 效果：節省系統資源，提升併發處理能力
        return someNonBlockingOperation();
    }
}
```

**關鍵差異總結：**
- **Tomcat + @Async：** Thread pool 切換（並行處理）
- **WebFlux + Netty：** Event loop + 非阻塞 I/O（高效資源利用）

這就是為什麼 WebFlux + Netty 被稱為「真正的非阻塞架構」。

###### Django 的世界

**(A) WSGI (Web Server Gateway Interface)**
```python
# 傳統 Python web 標準
# Django 早期（3.0 以前）都是 WSGI-only
# 對應：Spring MVC + Tomcat/Jetty/Undertow

# wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
application = get_wsgi_application()

# views.py
def sync_view(request):
    # Thread-per-request 模型
    # 請求進來就綁定一條 thread 處理到底
    import time
    time.sleep(1)  # 會卡住整個 thread（blocking I/O）
    return JsonResponse({'data': 'sync response'})

# 支援 @async_to_sync 或 thread pool 模擬非同步
from asgiref.sync import async_to_sync

def pseudo_async_view(request):
    # 使用 thread pool 模擬非同步
    # 類似 Spring MVC + @Async + ThreadPool
    result = async_to_sync(some_async_operation)()
    return JsonResponse({'data': result})
```

**特點：**
- Thread-per-request（每個請求一條執行緒）
- Blocking I/O 模型
- 支援 thread pool 模擬非同步
- **對應：** Spring MVC + Tomcat/Jetty/Undertow + @Async

**(B) ASGI (Asynchronous Server Gateway Interface)**
```python
# Django 3.1+ 支援
# 真正的非阻塞 I/O 支援
# 對應：Spring WebFlux + Reactor Netty

# asgi.py
import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()
application = get_asgi_application()

# views.py - 原生 async view
async def async_view(request):
    # Event loop + coroutine 模型
    # 整個請求生命週期可跑在 event loop
    import asyncio
    await asyncio.sleep(1)  # 不會卡住 thread（non-blocking）
    return JsonResponse({'data': 'async response'})

# 支援 WebSocket（真正的長連線）
from channels.generic.websocket import WebsocketConsumer

class ChatConsumer(WebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'message': 'WebSocket connection established'
        }))

    async def receive(self, text_data):
        # 即時雙向通訊
        await self.send(text_data=json.dumps({
            'message': f'Echo: {text_data}'
        }))

# 支援非阻塞資料庫操作（需要配合 async driver）
async def async_db_view(request):
    # 使用 asyncpg 或 Tortoise ORM
    # 對應 Spring WebFlux + R2DBC
    user = await User.objects.aget(id=request.user.id)
    return JsonResponse({'user': user.username})
```

**特點：**
- Event loop + 非阻塞 I/O（真正的 async/await）
- 可以同時處理上千個連線
- 原生支援 WebSocket 和長連線
- 需要搭配非阻塞 driver 才有最佳效果
- **對應：** Spring WebFlux + Reactor Netty + Reactive Drivers

##### 補充：完整技術對照表

| 技術棧 | 語言 | I/O 模型 | 執行模式 | 非同步支援 | 適用場景 | 最大併發 | 資源效率 |
|--------|------|----------|----------|------------|----------|----------|----------|
| **WSGI** | Python | Blocking | Thread-per-request | 有限(thread pool) | 傳統 Web | 中等 | 中等 |
| **ASGI** | Python | Non-blocking | Event loop | 原生async/await | 即時應用/WebSocket | 高 | 高 |
| **Servlet + @Async** | Java | Blocking | Thread pool | 模擬非同步 | 傳統 Web | 中等 | 中等 |
| **Reactive (WebFlux)** | Java | Non-blocking | Event loop | 真正的Reactive | 高併發應用 | 很高 | 很高 |

##### 補充：Django ORM 與資料庫驅動的選擇

```python
# Django ORM（同步）- Blocking I/O
# 使用 psycopg2, MySQL sync driver
# 對應：Hibernate / JPA
def sync_db_view(request):
    user = User.objects.get(id=request.user.id)  # 會卡住 thread
    return JsonResponse({'user': user.username})

# Tortoise ORM / asyncpg（非同步）- Non-blocking I/O
# 使用 asyncpg 或 Tortoise ORM
# 對應：Spring WebFlux + R2DBC
async def async_db_view(request):
    user = await User.objects.aget(id=request.user.id)  # 不會卡住 thread
    return JsonResponse({'user': user.username})
```

**關鍵選擇：**
- **同步 ORM + WSGI：** 簡單開發，適合大多數應用
- **非同步 ORM + ASGI：** 高併發，適合即時應用
- **對應 Spring：** Hibernate ↔ Django ORM，R2DBC ↔ asyncpg/Tortoise

### 5️⃣ Service Layer Pattern（服務層模式）

Django 雖然沒有強制，但我們可以抽取服務層來處理業務邏輯。

```python
class ChatService:
    def process_request(self, question, model_name, session_id):
        # 建立對話 + 建立訊息 + 建立任務
        process_ai_response.delay(task.id)
```

**Java 類比：**

```java
@Service
class ChatService {
    public TaskResponse processRequest(String question, String model, String sessionId) {
        Conversation conv = findOrCreate(sessionId);
        Message msg = saveUserMessage(conv, question);
        ProcessingTask task = createTask(msg);
        asyncExecutor.submit(() -> processAI(task));
        return new TaskResponse(task.getId(), "queued");
    }
}
```

**設計模式：**

- **服務層模式 (Service Layer)**：統一進入點
- **單一責任原則 (SRP)**：每個 Service 做一件事

### 6️⃣ Dependency Injection（依賴注入）

```python
class AppService:
    def __init__(self, ai_response_service=None):
        self.ai_response_service = ai_response_service or AIResponseService()
```

**Java 類比：**

```java
@Service
class AppService {
    private final AIResponseService aiResponseService;

    @Autowired
    public AppService(AIResponseService service) {
        this.aiResponseService = service;
    }
}
```

**設計模式：** 依賴注入 (DI)

高層只依賴抽象介面，不綁死具體實作。

##### 補充：為什麼 Spring 有 @Autowired / Repository，而 Django 沒有？

###### Spring Boot (Java)：強調依賴倒置 (DIP)、抽象介面

```java
@Repository
interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUser(User user);
}

// Controller 只知道「介面」，不管背後連的是哪個資料庫
@RestController
class ConversationController {
    @Autowired
    ConversationRepository repo;  // 自動注入實作

    @GetMapping
    public List<Conversation> getConversations(User user) {
        return repo.findByUser(user);
    }
}
```

**優點：**
- 適合多資料來源 / 換 ORM / 單元測試替換
- 依賴倒置原則 (DIP)
- 高度抽象化

###### Django (Python)：強調快速開發

```python
class Conversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_id = models.CharField()

# 直接使用，沒有抽象層
def list_conversations(request):
    return Conversation.objects.filter(user=request.user)
```

**特點：**
- ORM 與 Model 緊密耦合
- 沒有 Repository Interface，也沒有自動 wiring
- 減少樣板程式，但犧牲了「架構上的抽象」

**Django 開發三種主流做法：**
1. **簡單做法：** 直接用 `Model.objects.filter()`（80%專案適用）
2. **進階做法：** 自訂 Manager/QuerySet（需要整理查詢邏輯時）
3. **架構做法：** 抽取 Service Layer（大型專案適用）

這些做法在前面已經有詳細說明。

### 7️⃣ 策略模式（Strategy Pattern）

```python
def get_ai_provider(provider_name, config):
    if provider_name == 'openai':
        return OpenAIProvider(config)
    elif provider_name == 'gemini':
        return GeminiProvider(config)
```

**Java 類比：**

```java
AIProvider provider;
switch(providerName) {
   case "openai": provider = new OpenAIProvider(config); break;
   case "gemini": provider = new GeminiProvider(config); break;
}
```

**設計模式：** 策略模式

可以動態切換 AI 提供者。



## 實務架構比較

### Django MTV 架構 vs Spring MVC

| Django MTV | Spring MVC | 說明 |
|------------|------------|------|
| **Models** | **Models/Entities** | 資料模型，負責資料存取 |
| **Views** | **Controllers** | 處理請求，回傳回應 |
| **Templates** | **Views/Templates** | 呈現資料給使用者 |

### 設計模式應用

#### 倉儲模式 (Repository Pattern)
```python
# Django Model 就是 Repository
class User(models.Model):
    username = models.CharField(max_length=100)

    @classmethod
    def find_by_username(cls, username):
        return cls.objects.filter(username=username).first()
```

#### 服務層模式 (Service Layer)
```python
class UserService:
    @staticmethod
    def create_user(username, email):
        # 業務邏輯處理
        user = User(username=username, email=email)
        user.save()
        # 發送歡迎郵件等業務邏輯
        return user
```

#### 依賴注入
```python
class UserController:
    def __init__(self, user_service=None):
        self.user_service = user_service or UserService()
```

### 異步處理比較

#### Django + Celery
```python
# tasks.py
@shared_task
def send_welcome_email(user_id):
    user = User.objects.get(id=user_id)
    # 發送郵件邏輯

# views.py
def register_user(request):
    user = User.objects.create(...)
    send_welcome_email.delay(user.id)  # 非同步執行
    return JsonResponse({'status': 'processing'})
```

#### Spring Boot + @Async
```java
@Service
public class EmailService {
    @Async
    public void sendWelcomeEmail(Long userId) {
        // 發送郵件邏輯
    }
}

@RestController
public class UserController {
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserDto userDto) {
        User user = userService.create(userDto);
        emailService.sendWelcomeEmail(user.getId());  // 非同步
        return ResponseEntity.ok().body("Processing");
    }
}
```

## 總結

從 Java 開發者的角度來看，Django 專案架構其實相當熟悉：

1. **分層架構**：Controller → Service → Repository → DB
2. **設計模式**：Repository、Service Layer、DI、Strategy
3. **異步處理**：Celery ≈ @Async + Message Queue
4. **ORM**：Django Models ≈ JPA/Hibernate

主要差異在於：
- Python 的語法更簡潔
- Django 內建的功能更多（Admin、ORM、Template Engine）
- 動態語言的特性讓開發更靈活

這個理解方式可以幫助你快速掌握 Django 專案的架構思維！
