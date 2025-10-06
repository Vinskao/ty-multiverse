---
title: "microservices"
publishDate: "2025-02-24 10:00:00"
img: /tymultiverse/assets/java.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: A comprehensive guide to Spring Boot microservices architecture, covering API Gateway, gRPC communication, and practical implementation strategies.
tags:
  - Microservices
  - Spring Boot
  - API Gateway
  - Spring Cloud
---

# Spring Boot 微服務的合理範圍

如果 `peoplesystem.tatdvsonorth.com/tymultiverse` 這類 HR 系統是以 Spring Boot 打造的微服務架構，我們通常會預期至少三個（甚至更多）獨立的 Spring Boot 應用程式。這是因為微服務的核心精神，就是依據業務職責拆分服務，讓每個服務獨立部署與擴充。

# 基於業務的最低 Spring Boot 服務

以下三種服務，是以 HR 系統視角最常見的拆分方式：

## 1. 認證與授權服務（Auth Service）

- **職責**：處理登入、權杖（Token）驗證與用戶權限查詢。
- **技術重點**：高度聚焦於安全性，常搭配 Spring Security、OAuth2、JWT。
- **獨立理由**：安全性是所有服務的共同依賴，因此必須獨立運作、獨立更新。

## 2. 員工資料與組織服務（Employee/Org Service）

- **職責**：維護員工基本資料、部門結構、職位定義等靜態業務資訊。
- **技術重點**：以大量讀取為主（Read-Heavy），提供單一真實來源（SSOT）。
- **獨立理由**：作為整個系統的基礎資料池，拆分後能確保資料一致性與可用性。

## 3. 假勤管理服務（Leave/Attendance Service）

- **職責**：處理請假申請、審批流程、出勤記錄等動態業務邏輯。
- **技術重點**：常涉及狀態機與流程引擎，可能整合 Kafka、RabbitMQ 等訊息佇列。
- **獨立理由**：工作負載在月初、月末或節日前後波動大，適合單獨水平擴展。

# 常見的微服務基礎設施

在實務上，完整的 Spring Cloud 技術棧往往還會納入以下服務，使整體服務數量落在五到七個之間：

- **API 閘道器（API Gateway）**：以 Spring Cloud Gateway 或 Zuul 為門面，負責路由、限流、基礎安全。前端只需呼叫閘道器的單一網域。
- **配置服務（Config Service）**：使用 Spring Cloud Config 集中管理所有服務的設定檔。
- **服務註冊與發現（Discovery Service）**：多採用 Eureka 或 Consul，讓服務之間能自動尋址。

# REST、OpenAPI 與 gRPC 的協定視角

REST 堅守「資源導向」原則，要求客戶端透過 HTTP 動詞與超連結來操作資源；OpenAPI 延續 RPC 思維但依附在 HTTP URL 結構上，因此客戶端仍需處理實際的路徑與動詞。gRPC 同樣源自 RPC 範式，卻拋開了 HTTP 動詞的限制，在 HTTP/2 之上構建自己的高效傳輸協定，讓呼叫端幾乎感受不到網路存在，只需像呼叫本地方法一樣操作遠端服務。

# 為什麼前端只需要一個網域

直接讓前端打多個網域（例如 `auth.backend.com`、`employee.backend.com`）會遇到 CORS 管理負擔與資安風險。API 閘道器提供單一入口 (`https://api.peoplesystem.com`)，再依路徑將請求轉送給對應的後端服務，實現「前端只打一個 Domain」的最佳實務：

| 前端請求路徑 | 閘道器轉送目標 |
| --- | --- |
| `POST /api/auth/login` | 認證服務 |
| `GET /api/employees/123` | 員工資料服務 |
| `POST /api/leave/request` | 假勤管理服務 |

同時，閘道器可以集中處理 SSL/TLS 憑證與驗證機制。對於 HTTPS 來說，我們常見兩種部署模式：

| 模式 | 憑證部署位置 | 優點 |
| --- | --- | --- |
| 終止於閘道器 | 憑證僅部署在 API 閘道器或負載平衡器 | 最常見、維護成本低；內部流量可視需求選擇 HTTP 或內網憑證 |
| 端到端加密 | 憑證部署於閘道器與各後端服務 | 安全性最高，但管理成本大幅增加 |

登入後的身分憑證通常使用 JWT。流程如下：

1. 使用者登入時，Auth Service 發行 JWT。
2. 前端將 JWT 放在每次請求的 `Authorization` header。
3. API 閘道器攔截請求，驗證 JWT（可同步呼叫 Auth Service）。
4. 後端服務解析 JWT，確認發出請求的身分與權限。

# API 閘道器與 HTTP 202 的適用時機

雖然閘道器可以改寫狀態碼，但不建議把所有回應都改成 `202 Accepted`。HTTP 202 表示「請求已接受，但尚未完成」，適合用於長時間的非同步作業，例如產生大型報表，並搭配查詢進度的端點。一般同步請求應維持原本的 `200 OK`、`201 Created` 或 `4xx/5xx` 以符合 RESTful 慣例，避免誤導客戶端。

# API 閘道器為什麼不該直連資料庫

閘道器的責任是流量管理與安全控制，而非資料存取。若閘道器直接連 DB，會帶來以下風險：

- **違反單一職責原則**：閘道器不應混入業務邏輯或資料讀寫。
- **安全性隱患**：閘道器位於邊界層，一旦被攻破就等同取得核心資料庫存取權。
- **耦合度過高**：資料庫 schema 變動會迫使閘道器同步調整，破壞微服務自治。
- **資源競爭**：閘道器佔用 DB 連線，影響後端服務的處理能力。

正確的分層是：`Client → API Gateway → Microservice（業務邏輯 + Repository）→ Database`。

# 閘道器如何回傳正確的狀態碼

閘道器不需直接存取資料庫，也能回傳正確的 HTTP 狀態碼，因為狀態碼來源分為兩類：

- **後端服務回傳**：閘道器收到後端服務的完整 Response（含狀態碼、Header、Body）後，透明轉發給客戶端。業務錯誤或成功（200、201、400、404、500）都由服務決定。
- **閘道器內部決定**：只有在請求未送達後端時，閘道器才自行回應，例如 401（驗證失敗）、429（限流）、503（服務無法連線）、或找不到路由時使用 404。

透過這種責任切分，架構更安全、維護性更高，也符合微服務的分層設計理念。

# Protocol Buffers 與程式碼生成

Protocol Buffers（Protobuf）是一種介面描述語言（IDL），用來跨語言定義資料結構與 RPC 服務合約。透過 `protoc` 編譯器，這些宣告會轉換成目標語言的程式碼：

- **資料類別**：採不可變物件與 Builder 模式，內建二進位序列化／反序列化邏輯，確保跨語言資料一致性。
- **服務 Stub**：封裝 gRPC 在 HTTP/2 上的連線管理、錯誤處理與超時控制，讓呼叫端只需執行看似本地的方法即可觸發遠端服務。

這種自動生成方式，把最容易出錯的網路細節抽象掉，開發者可以專注在業務邏輯與測試。

# Java gRPC 範例

以下示範如何定義 `GreetingService` 的 Protobuf 介面，並分別實作 gRPC 伺服器與客戶端。伺服器端提供 `Greet` 方法，客戶端呼叫後即可取得問候訊息。

```proto
// greeting.proto
syntax = "proto3";
option java_package = "com.example.grpc.greeting";
option java_multiple_files = true;

service GreetingService {
  rpc Greet (GreetingRequest) returns (GreetingResponse);
}

message GreetingRequest {
  string name = 1;
}

message GreetingResponse {
  string message = 1;
}
```

```java
// GreetingServer.java
import com.example.grpc.greeting.GreetingRequest;
import com.example.grpc.greeting.GreetingResponse;
import com.example.grpc.greeting.GreetingServiceGrpc;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;

public class GreetingServer extends GreetingServiceGrpc.GreetingServiceImplBase {

    @Override
    public void greet(GreetingRequest request, StreamObserver<GreetingResponse> responseObserver) {
        GreetingResponse response = GreetingResponse.newBuilder()
                .setMessage("Hello, " + request.getName() + "! This is a gRPC response.")
                .build();
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(50051)
                .addService(new GreetingServer())
                .build()
                .start();
        System.out.println("gRPC Server started on port 50051");
        server.awaitTermination();
    }
}
```

```java
// GreetingClient.java
import com.example.grpc.greeting.GreetingRequest;
import com.example.grpc.greeting.GreetingResponse;
import com.example.grpc.greeting.GreetingServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;

public class GreetingClient {

    public static void main(String[] args) {
        ManagedChannel channel = ManagedChannelBuilder.forAddress("localhost", 50051)
                .usePlaintext()
                .build();

        GreetingServiceGrpc.GreetingServiceBlockingStub stub =
                GreetingServiceGrpc.newBlockingStub(channel);

        GreetingResponse response = stub.greet(GreetingRequest.newBuilder()
                .setName("Charlie")
                .build());

        System.out.println(response.getMessage());
        channel.shutdown();
    }
}
```

# REST 與 gRPC 的協同架構

在真實的部署中，瀏覽器或行動裝置仍以 REST/JSON 呼叫 API 閘道器；閘道器接著改用 gRPC 與內部服務互動，再將結果轉為 REST 回應。非同步流程（例如 Producer 將訊息推送至 MQ、由 Consumer 消費）維持現有拓撲，但可以逐步將 Payload 由 JSON 替換成 Protobuf 以提升效能。

漸進式調整的建議順序如下：

1. **導入 API 閘道器**：對外暴露 REST 端點，處理身份驗證、限流與路由。
2. **Producer 改用 gRPC**：保留業務邏輯，改寫為 gRPC 服務實作，移除對外 REST Controller。
3. **MQ 保持既有流程**：必要時在 Producer/Consumer 中導入 Protobuf 序列化，但保留既有的訊息佇列與重試機制。

如此一來，只有「前端 → API 閘道器」保留 REST，其餘內部同步呼叫皆可升級為 gRPC，兼顧效益、穩定性與安全性。

