---
title: "chain-of-responsibility"
publishDate: "2025-10-12 15:30:00"
img: /tymultiverse/assets/java.jpg
img_alt: Chain of Responsibility pattern illustration
description: |
  TY Multiverse 專案中責任鏈模式的實戰應用：從 ControllerAdvice 到 Middleware/Filter 的完整實現指南
tags:
  - Design Pattern
  - Chain of Responsibility
  - Spring Boot
  - ControllerAdvice
  - Middleware
  - JWT
---

# TY Multiverse 責任鏈模式實戰應用

## 🎯 專案概覽

本文分析 TY Multiverse 四個專案中責任鏈模式的應用場景，涵蓋 ControllerAdvice、Middleware/Filter、JWT 認證和 Spring Boot 請求生命週期。

## ControllerAdvice 使用情況

### ✅ 已使用 ControllerAdvice 的專案：

- **ty-multiverse-backend**: 有 `GlobalExceptionHandler` 使用 `@ControllerAdvice`，採用責任鏈模式處理異常
- **ty-multiverse-consumer**: 有 `GlobalExceptionHandler` 使用 `@ControllerAdvice`，使用 Reactive 異常處理

### ❌ 未使用 ControllerAdvice 的專案：

- **ty-multiverse-gateway**: 使用 Spring Cloud Gateway，沒有傳統的 ControllerAdvice（因為是反應式網關）
- **ty-multiverse-frontend**: 非 Spring Boot 專案（使用 Astro）

## 🔧 Middleware/Filter 使用情況

### Backend (ty-multiverse-backend):

- ✅ **RequestConcurrencyLimiter**: 實現 `Filter` 介面，用於請求併發控制
- ✅ **RateLimiterAspect**: 使用 `@Aspect` 實現 AOP 限流
- ✅ **Spring Security Filters**: JWT 認證過濾器

### Gateway (ty-multiverse-gateway):

- ✅ **LoggingGlobalFilter**: 實現 `GlobalFilter`，記錄所有請求響應
- ✅ **CORS Filter**: Spring Cloud Gateway 內建 CORS 處理
- ✅ **Rate Limiting Filter**: 可選的 Redis 分散式限流

### Consumer (ty-multiverse-consumer):

- ✅ **CorsWebFilter**: WebFlux CORS 過濾器
- ✅ **Reactive Exception Handlers**: 責任鏈模式的異常處理器

## 🔐 JWT 認證現狀

**ty-multiverse-backend 已經在使用 JWT 認證！**

### 現有 JWT 架構：

- **認證服務器**: Keycloak
- **Token 驗證**: OAuth2 Resource Server + JWT Decoder
- **認證策略**: 混合模式
  - 無狀態服務：JWT 認證 (大部分 API)
  - 有狀態服務：Session 認證 (CKEditor, DeckOfCards)

### JWT 相關配置：

```java
.oauth2ResourceServer(oauth2 -> oauth2
    .bearerTokenResolver(customBearerTokenResolver())
    .jwt(jwt -> jwt
        .jwkSetUri(keycloakAuthServerUrl + "/realms/" + keycloakRealm + "/protocol/openid-connect/certs")
        .jwtAuthenticationConverter(jwtAuthenticationConverter())))
```

## 🔄 Spring Boot 請求生命週期

基於 **ty-multiverse-backend** 的配置，請求生命週期如下：

### 1. **網路層 → Tomcat/Jetty**
```
Client Request → Tomcat Connector (8080)
```

### 2. **Servlet 過濾器鏈**
```
Tomcat → RequestConcurrencyLimiter (Filter) → Spring Security Filters
```

### 3. **Spring Security 處理**
```
Security Filters → Authentication (JWT/Session) → Authorization
```

### 4. **DispatcherServlet**
```
DispatcherServlet → HandlerMapping → Controller Method
```

### 5. **Controller 層**
```
Controller → Service → Repository → Database
```

### 6. **響應處理**
```
Database → Repository → Service → Controller → ViewResolver/ResponseBody
```

### 7. **異常處理**
```
任何層級異常 → GlobalExceptionHandler (@ControllerAdvice) → Error Response
```

### 請求流程圖：

```mermaid
graph TD
    A[Client HTTP] --> B[RequestConcurrencyLimiter<br/>Filter]
    B --> C[Spring Security Filters<br/>JWT + Session]
    C --> D{Authentication<br/>& Authorization}

    D --> E[DispatcherServlet]
    D --> F[Access Denied Handler]

    E --> G[Controller<br/>@RequestMapping]
    G --> H[Service Layer]

    H --> I[Repository<br/>JPA/R2DBC]
    I --> J[Database<br/>PostgreSQL]

    J --> I
    I --> H
    H --> G
    G --> K[GlobalException Handler<br/>@ControllerAdvice]

    K --> L[Error Response]
    F --> L
```

### 詳細生命週期圖：

```
┌─────────────────┐
│   Client HTTP   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐     ┌─────────────────┐
│ RequestConc-    │────▶│ Spring Security  │
│ urrencyLimiter  │     │   Filters       │
│    (Filter)     │     │ (JWT + Session) │
└─────────────────┘     └─────────────────┘
          │                        │
          │                        ▼
          │               ┌─────────────────┐
          │               │ Authentication  │
          │               │   & Auth-       │
          │               │   orization     │
          │               └─────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│ Dispatcher-     │     │ Access Denied   │
│   Servlet       │     │   Handler       │
└─────────────────┘     └─────────────────┘
          │
          ▼
┌─────────────────┐     ┌─────────────────┐
│   Controller    │────▶│ GlobalException │
│   (@Request-    │     │ Handler (@Con-  │
│    Mapping)     │     │   trollerAdvice)│
└─────────────────┘     └─────────────────┘
          │
          ▼
┌─────────────────┐
│   Service       │
│   Layer         │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│  Repository     │
│   (JPA/R2DBC)   │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   Database      │
│ (PostgreSQL)    │
└─────────────────┘
```

## 📊 責任鏈模式應用總結

### 各層級責任鏈實現：

1. **網路層**: Tomcat Connectors + Filters
2. **安全層**: Spring Security Filters + JWT/OAuth2
3. **應用層**: ControllerAdvice Exception Handlers
4. **業務層**: Service 方法鏈式調用
5. **資料層**: Repository 查詢優化

### 設計模式綜合應用：

- **責任鏈模式**: 異常處理、請求過濾、中間件處理
- **裝飾器模式**: Filter 鏈、Aspect 增強
- **策略模式**: 多重認證策略 (JWT + Session)
- **工廠模式**: Bean 創建和管理

### 效能優化：

- **非同步處理**: Reactive Streams in Consumer
- **快取策略**: Redis Session + Cache
- **連接池**: HikariCP + R2DBC
- **限流熔斷**: Resilience4j + Rate Limiting

## 📊 各專案責任鏈模式應用圖

### TY Multiverse 專案責任鏈架構圖：

```mermaid
graph TB
    subgraph "ty-multiverse-backend [Spring Boot MVC]"
        BE_Client[HTTP Client] --> BE_Filter1[RequestConcurrencyLimiter<br/>Filter]
        BE_Filter1 --> BE_Security[Spring Security Filters<br/>JWT + Session]
        BE_Security --> BE_Auth{Authentication<br/>& Authorization}

        BE_Auth --> BE_Dispatcher[DispatcherServlet]
        BE_Auth --> BE_AccessDenied[Access Denied Handler]

        BE_Dispatcher --> BE_Controller[Controller Layer]
        BE_Controller --> BE_GlobalHandler[GlobalExceptionHandler<br/>@ControllerAdvice]

        BE_GlobalHandler --> BE_Chain[Exception Handler Chain]
        BE_Chain --> BE_Business[BusinessApiExceptionHandler]
        BE_Business --> BE_DataIntegrity[DataIntegrityApiExceptionHandler]
        BE_DataIntegrity --> BE_Validation[ValidationApiExceptionHandler]
        BE_Validation --> BE_Default[DefaultApiExceptionHandler]

        BE_Controller --> BE_Service[Service Layer]
        BE_Service --> BE_Aspect[RateLimiterAspect<br/>@Aspect]
        BE_Aspect --> BE_Repository[Repository Layer]
    end

    subgraph "ty-multiverse-consumer [Spring Boot WebFlux]"
        CE_Client[gRPC/RabbitMQ Client] --> CE_Filter[CorsWebFilter<br/>Reactive Filter]
        CE_Filter --> CE_Controller[Controller Layer]
        CE_Controller --> CE_GlobalHandler[GlobalExceptionHandler<br/>@ControllerAdvice]

        CE_GlobalHandler --> CE_Chain[ExceptionHandlerChain<br/>Reactive Chain]
        CE_Chain --> CE_Validation[ValidationExceptionHandler]
        CE_Validation --> CE_Business[BusinessExceptionHandler]
        CE_Business --> CE_DataIntegrity[DataIntegrityExceptionHandler]
        CE_DataIntegrity --> CE_Resilience[ResilienceExceptionHandler]
        CE_Resilience --> CE_Illegal[IllegalArgumentExceptionHandler]
        CE_Illegal --> CE_Runtime[RuntimeExceptionHandler]
        CE_Runtime --> CE_Default[DefaultExceptionHandler]

        CE_Controller --> CE_Service[Reactive Service Layer]
        CE_Service --> CE_Repository[Reactive Repository<br/>R2DBC]
    end

    subgraph "ty-multiverse-gateway [Spring Cloud Gateway]"
        GW_Client[HTTP Client] --> GW_GlobalFilter1[LoggingGlobalFilter<br/>GlobalFilter]
        GW_GlobalFilter1 --> GW_CORS[CORS Filter<br/>Built-in]
        GW_CORS --> GW_RateLimit[Rate Limiting Filter<br/>Optional Redis]

        GW_RateLimit --> GW_Route[Route Configuration]
        GW_Route --> GW_Backend[ty-multiverse-backend]
        GW_Route --> GW_Consumer[ty-multiverse-consumer]

        GW_GlobalFilter1 --> GW_Fallback[Fallback Controller<br/>Circuit Breaker]
    end

    subgraph "ty-multiverse-frontend [Astro]"
        FE_Client[Browser Client] --> FE_Page[Page Components]
        FE_Page --> FE_API[API Services]
        FE_API --> FE_Gateway[ty-multiverse-gateway]
        FE_API --> FE_Backend[ty-multiverse-backend]
    end

    %% 連接線
    GW_Backend --> BE_Client
    GW_Consumer --> CE_Client

    %% 樣式定義
    classDef backendClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef consumerClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef gatewayClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef frontendClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef chainClass fill:#ffebee,stroke:#b71c1c,stroke-width:2px

    class BE_Filter1,BE_Security,BE_Controller,BE_GlobalHandler,BE_Service,BE_Aspect backendClass
    class CE_Filter,CE_Controller,CE_GlobalHandler,CE_Service consumerClass
    class GW_GlobalFilter1,GW_CORS,GW_RateLimit,GW_Route,GW_Fallback gatewayClass
    class FE_Client,FE_Page,FE_API frontendClass
    class BE_Chain,BE_Business,BE_DataIntegrity,BE_Validation,BE_Default,CE_Chain,CE_Validation,CE_Business,CE_DataIntegrity,CE_Resilience,CE_Illegal,CE_Runtime,CE_Default chainClass
```

### 責任鏈模式實現詳解：

#### 1. **Backend 專案責任鏈**：
```
HTTP Request → RequestConcurrencyLimiter → Spring Security → Controller → GlobalExceptionHandler
                                                                             ↓
                                                                   Exception Handler Chain
                                                                   ↓
                                                         ┌─── BusinessExceptionHandler
                                                         ↓
                                               DataIntegrityExceptionHandler
                                                         ↓
                                               ValidationExceptionHandler
                                                         ↓
                                               DefaultExceptionHandler
```

#### 2. **Consumer 專案責任鏈**：
```
Reactive Request → CorsWebFilter → Controller → GlobalExceptionHandler → ExceptionHandlerChain
                                                                 ↓
                                                ┌─── ValidationExceptionHandler
                                                ↓
                                      BusinessExceptionHandler
                                                ↓
                            DataIntegrityExceptionHandler
                                                ↓
                      ResilienceExceptionHandler
                                                ↓
                IllegalArgumentExceptionHandler
                                                ↓
                RuntimeExceptionHandler
                                                ↓
                DefaultExceptionHandler (兜底)
```

#### 3. **Gateway 專案責任鏈**：
```
HTTP Request → LoggingGlobalFilter → CORS Filter → Rate Limiting Filter → Route → Backend/Consumer
                                      ↓
                            Fallback Controller (熔斷降級)
```

#### 4. **Frontend 專案**：
```
Browser → Astro Pages → API Services → Gateway → Backend/Consumer
```

---

## 🔗 相關資源

- [Spring Boot 官方文檔](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Security 架構](https://docs.spring.io/spring-security/reference/)
- [設計模式：可復用物件導向軟體的基礎](https://www.amazon.com/Design-Patterns-Object-Oriented-Addison-Wesley-Professional/dp/0201633612)
