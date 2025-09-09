# TY-Multiverse 系統架構

## 系統概述

TY-Multiverse 是一個多維度管理系統，用於管理 TY 的個人專案。

## 架構圖

### 整體架構

```mermaid
graph TD
    Client[客戶端/瀏覽器] --> |請求| Router[路由層]
    Router --> |重定向| SSO[SSO Server 認證]
    SSO --> |驗證| API[TY-Multiverse-Backend]
    API --> |查詢| DB[(數據庫)]
    
    Client --> |請求圖片| Nginx[Nginx Static File Server]
    Nginx --> |提供| Images[角色圖片]
    Client --> |緩存圖片| BrowserImageCache[瀏覽器圖片緩存]
    
    subgraph 客戶端緩存
        BrowserCache[瀏覽器緩存]
        BrowserCache --> |localStorage| CharacterData[角色戰力數據]
        BrowserCache --> |localStorage| ThemeData[主題設置]
        BrowserCache --> |localStorage| EditorContent[編輯器內容]
        BrowserCache --> |localStorage| FightData[戰鬥數據]
    end
    
    Client --> |讀取/寫入| BrowserCache
    API --> |返回數據| Client
    Client --> |緩存數據| BrowserCache
```

### 路由架構

```mermaid
graph TD
    A[Client] --> B[Router<br>Astro Pages]
    B --> C[Home]
    B --> D[Login]
    B --> I[Work]
    B --> J[About]
    B --> E[Auth<br>Middleware]
    
    E --> F[wildland<br>admin]
    E --> G[palais<br>admin]
    E --> H[control<br>guest]
    
    I -->|部分功能| E
    
    subgraph 公開路由
        C
        D
        I
        J
    end
    
    subgraph 受保護路由
        F[wildland<br>需要 admin 權限]
        G[palais<br>需要 admin 權限]
        H[control<br>需要 user 權限]

        Note over F,G: 管理員專用功能
        Note over H: 用戶權限即可使用
    end
```

### 認證與權限驗證流程

```mermaid
sequenceDiagram
    participant Client
    participant Router
    participant Keycloak
    participant Guardian
    participant API
    participant DB
    
    Client->>Router: 訪問受保護資源
    Router->>Keycloak: 重定向到 Keycloak 登入頁
    Client->>Keycloak: 輸入憑證
    Keycloak->>API: 驗證憑證 (/keycloak/token)
    API->>DB: 查詢用戶
    DB-->>API: 返回用戶數據
    API-->>Keycloak: 返回 access_token 和 refresh_token
    Keycloak-->>Client: 重定向回應用 + tokens
    
    Note over Client,Guardian: 三層權限驗證系統
    Client->>Guardian: 第一層：管理員權限驗證 (/guardian/admin)
    Guardian-->>Client: 200 OK (管理員) / 403 Forbidden
    
    Client->>Guardian: 第二層：用戶權限驗證 (/guardian/user)
    Guardian-->>Client: 200 OK (用戶) / 401 Unauthorized
    
    Client->>Guardian: 第三層：基本權限檢查 (token 存在)
    Guardian-->>Client: 驗證結果
    
    Client->>Router: 帶驗證結果訪問資源
    Router-->>Client: 返回對應權限的資源
    
    Note over Client,API: Token 過期處理
    Client->>API: 使用 refresh_token 獲取新 token (/keycloak/refresh)
    API-->>Client: 返回新 access_token 和 refresh_token
    
    Note over Client,API: 登出流程
    Client->>API: 登出請求 (/keycloak/logout)
    API->>Keycloak: 註銷 token
    Keycloak-->>API: 註銷確認
    API-->>Client: 登出成功
    Client->>Router: 重定向到登入頁
```

### Guardian API 權限系統

#### 權限層級
- **Admin (管理員)**：可訪問 `/guardian/admin`，需要 `manage-users` 角色
- **User (用戶)**：可訪問 `/guardian/user`，任何有效 token
- **Visitor (訪客)**：可訪問 `/guardian/visitor`，無需驗證

#### 驗證流程
1. **第一層**：嘗試管理員權限驗證
   - 成功 → 設定 `isAdmin = true`, `hasUserAccess = true`
   - 失敗 → 進入第二層
2. **第二層**：嘗試用戶權限驗證
   - 成功 → 設定 `hasUserAccess = true`, `isAdmin = false`
   - 失敗 → 進入第三層
3. **第三層**：基本權限檢查
   - 有 token → 設定 `hasUserAccess = true`, `isAdmin = false`
   - 無 token → 設定所有權限為 `false`

#### Guardian API 端點

```typescript
// 管理員端點
GET /guardian/admin
Authorization: Bearer <token>
Response: 200 OK / 403 Forbidden / 401 Unauthorized

// 用戶端點  
GET /guardian/user
Authorization: Bearer <token>
Response: 200 OK / 401 Unauthorized

// 訪客端點
GET /guardian/visitor
Response: 200 OK
```

### 緩存架構

```mermaid
graph TD
    API[TY-Multiverse-Backend] --> Cache[緩存層]
    
    subgraph 客戶端緩存
        LocalStorage[localStorage]
        LocalStorage --> |character_power_cache| CharacterData[角色戰力數據]
        LocalStorage --> |theme| ThemeData[主題設置]
        LocalStorage --> |editorContent| EditorContent[編輯器內容]
        LocalStorage --> |fight_data| FightData[戰鬥數據]
    end
    
    subgraph 服務端緩存
        TokenCache[Token 緩存]
        TokenCache --> |token 驗證| TokenValidation[Token 驗證結果]
        TokenCache --> |refresh_token| RefreshToken[刷新 Token]
    end
    
    API --> LocalStorage
    API --> TokenCache
```

### 訪問計數隊列流程(你是第幾個訪問者)

```mermaid
sequenceDiagram
    participant Frontend as Frontend
    participant Django as Django API
    participant Redis as Redis Queue
    participant Consumer as Consumer Service
    participant Mongo as MongoDB

    Frontend->>Django: 1. Call Push API
    Django->>Redis: 2. Push to Redis List
    Consumer->>Redis: 3. Pop from Redis List
    Consumer->>Mongo: 4. Update Increment in Document
    Frontend->>Django: 5. Call Count API
    Django->>Mongo: 6. Query Count from Document
    Mongo-->>Django: Return Count
    Django-->>Frontend: Return Count

    Note over Frontend,Mongo: 異步處理訪問計數
    Note over Redis,Consumer: 使用 Consumer YAML 配置
```

## 啟動方式

```bash
# 構建 Docker 鏡像
docker build --no-cache -t papakao/ty-multiverse-frontend .

# 運行容器
docker run -p 4321:4321 ty-multiverse-frontend

# 直接運行 Node.js
node ./dist/server/entry.mjs

# 構建 ARM64 架構鏡像
docker build --build-arg PLATFORM=linux/arm64 -t papakao/ty-multiverse-frontend .
docker push papakao/ty-multiverse-frontend:latest

# 構建並推送最新版本
docker build -t papakao/ty-multiverse-frontend:latest .
docker push papakao/ty-multiverse-frontend:latest
```

## 架構圖

```mermaid
graph TD
    A[Astro Pages<br/>.astro<br/>頁面路由和整體布局<br/>可導入 React 組件] --> B[Astro Components<br/>.astro<br/>純 Astro 組件<br/>可與 React 混合使用]
    A --> C[React Components<br/>.tsx<br/>提供交互功能<br/>可導入到 Astro 組件]
    B --> D[Icon.tsx<br/>React<br/>圖標渲染組件<br/>被 Astro 和 React 共用]
    C --> D
    D --> E[IconPaths.ts<br/>Shared<br/>定義所有圖標的 SVG 路徑<br/>被 Icon.tsx 使用]
    
    subgraph "Astro Framework"
        A
        B
    end
    
    subgraph "React Integration"
        C
        D
    end
    
    subgraph "Shared Resources"
        E
    end

    %% Professional color scheme
    style A fill:#6366f1,stroke:#4338ca,stroke-width:3px,color:#ffffff
    style B fill:#8b5cf6,stroke:#7c3aed,stroke-width:3px,color:#ffffff
    style C fill:#06b6d4,stroke:#0891b2,stroke-width:3px,color:#ffffff
    style D fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#ffffff
    style E fill:#10b981,stroke:#059669,stroke-width:3px,color:#ffffff
    
    %% Subgraph styling
    classDef astroGroup fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px
    classDef reactGroup fill:#f0f9ff,stroke:#7dd3fc,stroke-width:2px
    classDef sharedGroup fill:#f0fdf4,stroke:#86efac,stroke-width:2px
```

1. Astro 頁面導入 React 組件
2. React 組件使用共享資源
3. 組件渲染結果被整合到最終的 HTML 輸出中

### Astro Pages 路由運作機制

1. **路由類型**
   - 靜態路由：直接映射到固定 URL
     - `/about.astro` -> `/about`
     - `/work/index.astro` -> `/work`
   - 動態路由：使用參數匹配多個 URL
     - `/work/[slug].astro` -> `/work/1`, `/work/2` 等
   - 嵌套路由：支持多層級 URL 結構

Astro 使用文件系統路由，路由由 `src/pages/` 目錄下的文件結構自動決定：

```
src/pages/
├── index.astro      -> /
├── about.astro      -> /about
├── work.astro       -> /work
├── work/[slug].astro -> /work/*
├── login.astro      -> /login
├── control.astro    -> /control
├── wildland.astro   -> /wildland
└── palais.astro     -> /palais
```
- 無需額外路由配置
- 支持靜態和動態路由
- 基於文件系統的自動路由映射
- 支持嵌套路由結構

### 動態路由與 Markdown 內容處理

Astro 的動態路由 `[slug].astro` 可以處理 Markdown 文件作為頁面內容：

```
src/
├── pages/
│   └── work/
│       └── [slug].astro    # 動態路由處理器
└── content/
    └── work/
        ├── project1.md     # Markdown 內容
        ├── project2.md     # Markdown 內容
        └── project3.md     # Markdown 內容
```

處理流程：
1. **內容組織**：
   - Markdown 文件放在 `src/content/work/` 目錄
   - 每個 `.md` 文件對應一個工作項目頁面

2. **路由匹配**：
   - URL `/work/project1` 會匹配 `[slug].astro`
   - `slug` 參數值為 "project1"

4. **頁面渲染**：
   - 解析 frontmatter（元數據）
   - 渲染 Markdown 內容為 HTML

- 無需手動創建每個頁面
- 支持 Markdown 格式的內容管理
- 可以添加自定義元數據（frontmatter）
- 支持內容預覽和草稿模式

## CI/CD Pipeline

### 1. Pipeline Overview
```mermaid
graph LR
    A[GitHub Repository] --> B[Clone and Setup]
    B --> C[Build with Node.js]
    C --> D[Build Docker Image with BuildKit]
    D --> E[Push to Docker Hub]
    E --> F[Deploy to Kubernetes]
```

### 2. Pipeline Components

#### 2.1 Agent Configuration
- **Node Container**: `node:18`
- **Docker Container**: `docker:23-dind`
- **Kubectl Container**: `bitnami/kubectl:1.30.7`

## Article Sync API 測試文檔

### API 端點

#### 本地開發測試

**Linux/macOS (curl):**
```bash
# 檢查文件狀態 (GET)
curl -X GET "http://localhost:4321/tymultiverse/md-exporter"

# 執行同步 (POST)
curl -X POST "http://localhost:4321/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}'
```

**Windows PowerShell:**
```powershell
# 檢查文件狀態 (GET)
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method GET

# 執行同步 (POST)
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method POST -ContentType "application/json" -Body '{"action": "sync"}'
```

#### 生產環境測試

**Linux/macOS (curl):**
```bash
# 檢查文件狀態 (GET)
curl -X GET "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter"

# 執行同步 (POST)
curl -X POST "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}'
```

**Windows PowerShell:**
```powershell
# 檢查文件狀態 (GET)
Invoke-RestMethod -Uri "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" -Method GET

# 執行同步 (POST)
Invoke-RestMethod -Uri "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" -Method POST -ContentType "application/json" -Body '{"action": "sync"}'
```

### 測試步驟

#### 步驟 1: 檢查當前狀態

**Linux/macOS:**
```bash
# 本地測試
curl -X GET "http://localhost:4321/tymultiverse/md-exporter" | jq

# 生產環境測試
curl -X GET "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" | jq
```

**Windows PowerShell:**
```powershell
# 本地測試
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method GET | ConvertTo-Json -Depth 10

# 生產環境測試
Invoke-RestMethod -Uri "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" -Method GET | ConvertTo-Json -Depth 10
```

預期回應：
```json
{
  "success": true,
  "data": {
    "total_files": 35,
    "existing_articles": 3,
    "file_status": [
      {
        "file_path": "interview-20250526.md",
        "local_content_length": 9123,
        "local_file_date": "2025-01-27 10:30:00",
        "exists_remotely": false,
        "remote_content_length": 0,
        "has_changes": true
      }
    ]
  }
}
```

#### 步驟 2: 執行同步

**Linux/macOS:**
```bash
# 本地測試
curl -X POST "http://localhost:4321/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}' | jq

# 生產環境測試
curl -X POST "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}' | jq
```

**Windows PowerShell:**
```powershell
# 本地測試
Invoke-RestMethod -Uri "http://localhost:4321/tymultiverse/md-exporter" -Method POST -ContentType "application/json" -Body '{"action": "sync"}' | ConvertTo-Json -Depth 10

# 生產環境測試
Invoke-RestMethod -Uri "https://peoplesystem.tatdvsonorth.com/tymultiverse/md-exporter" -Method POST -ContentType "application/json" -Body '{"action": "sync"}' | ConvertTo-Json -Depth 10
```

預期回應：
```json
{
  "success": true,
  "message": "Sync completed",
  "data": {
    "created": 35,
    "updated": 0,
    "unchanged": 0,
    "errors": 0,
    "details": [
      {
        "file_path": "interview-20250526.md",
        "status": "created",
        "message": "Article created successfully"
      }
    ]
  }
}
```

### 自動化部署

#### Kubernetes CronJob
- 每天凌晨 2:00 自動執行同步
- 部署文件：`k8s/cronjob-sync-articles.yaml`
- 通過 Jenkins 自動部署

#### 手動觸發 CronJob
```bash
# 查看 CronJob 狀態
kubectl get cronjobs -n default

# 手動觸發一次同步
kubectl create job --from=cronjob/ty-multiverse-article-sync manual-sync-$(date +%s) -n default

# 查看執行日誌
kubectl logs job/manual-sync-$(date +%s) -n default
```

### 監控和日誌

#### 查看同步日誌
```bash
# 查看最近的同步任務
kubectl get jobs -n default | grep ty-multiverse-article-sync

# 查看特定任務的日誌
kubectl logs job/ty-multiverse-article-sync-<timestamp> -n default
```

#### 檢查同步結果
```bash
# 檢查外部 API 的文章列表
curl -X GET "https://peoplesystem.tatdvsonorth.com/paprika/articles" | jq
```

## 問答系統架構

### 整體架構流程

```mermaid
graph TD
    A[前端 MD 文件集<br/>src/content/work/] --> B[定期同步]
    B --> C[後端 Paprika<br/>Laravel API]
    C --> D[PostgreSQL<br/>向量資料庫]
    
    E[FastAPI Maya-Sawa<br/>定期任務] --> F[從 Paprika API<br/>取得 MD 文章]
    F --> G[Embedding 處理]
    G --> D
    
    H[前端 Astro<br/>QABot 組件] --> I[後端 Maya-Sawa<br/>FastAPI]
    I --> J[Redis<br/>聊天記錄緩存]
    I --> K[OpenAI API<br/>GPT-3.5-turbo]
    
    K --> L[回答生成]
    L --> I
    I --> H
    
    subgraph "數據流程"
        A
        B
        C
        D
    end
    
    subgraph "AI 處理"
        E
        F
        G
    end
    
    subgraph "問答互動"
        H
        I
        J
        K
        L
    end
    
    %% 顏色主題
    style A fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff
    style C fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    style D fill:#06b6d4,stroke:#0891b2,stroke-width:2px,color:#ffffff
    style E fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff
    style F fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#ffffff
    style H fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    style I fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#ffffff
    style J fill:#f97316,stroke:#ea580c,stroke-width:2px,color:#ffffff
    style K fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#ffffff
```

### 詳細流程說明

#### 1. 數據同步階段
```mermaid
sequenceDiagram
    participant Frontend as 前端 MD 文件
    participant Paprika as Paprika Laravel
    participant PG as PostgreSQL
    
    Frontend->>Paprika: 定期同步 MD 文件
    Paprika->>PG: 存儲原始 MD 內容
    Note over Paprika,PG: 包含文件路徑、內容、時間戳
```

#### 2. Embedding 處理階段
```mermaid
sequenceDiagram
    participant MayaSawa as Maya-Sawa FastAPI
    participant Paprika as Paprika Laravel API
    participant PG as PostgreSQL
    participant Embedding as Embedding 服務
    
    MayaSawa->>Paprika: 定期請求文章列表 API
    Paprika-->>MayaSawa: 返回現有 MD 文章內容
    MayaSawa->>Embedding: 生成向量嵌入
    Embedding-->>MayaSawa: 返回向量數據
    MayaSawa->>PG: 更新向量資料庫
    Note over MayaSawa,Paprika: 定期執行，從 Paprika API 取得最新文章
```

#### 3. 問答互動階段
```mermaid
sequenceDiagram
    participant User as 用戶
    participant Astro as Astro 前端
    participant MayaSawa as Maya-Sawa API
    participant Redis as Redis 緩存
    participant OpenAI as OpenAI API
    participant PG as PostgreSQL
    
    User->>Astro: 提交問題
    Astro->>MayaSawa: 發送問題
    MayaSawa->>Redis: 存儲聊天記錄
    MayaSawa->>PG: 查詢相關向量資料
    PG-->>MayaSawa: 返回相似內容
    MayaSawa->>OpenAI: 發送問題 + 上下文
    OpenAI-->>MayaSawa: 返回 AI 回答
    MayaSawa->>Redis: 更新聊天記錄
    MayaSawa-->>Astro: 返回回答
    Astro-->>User: 顯示回答
```
