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
        F
        G
        H
    end
```

### SSO 認證流程

```mermaid
sequenceDiagram
    participant Client
    participant Router
    participant Keycloak
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
    Client->>Router: 帶 token 訪問資源
    Router->>API: 驗證 token (/keycloak/introspect)
    API-->>Router: 驗證結果
    Router-->>Client: 返回受保護資源
    
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
    A[Astro Pages<br>.astro<br>頁面路由和整體布局<br>可導入 React 組件] --> B[Astro Components<br>.astro<br>純 Astro 組件<br>可與 React 混合使用]
    A --> C[React Components<br>.tsx<br>提供交互功能<br>可導入到 Astro 組件]
    B --> D[Icon.tsx<br>React<br>圖標渲染組件<br>被 Astro 和 React 共用]
    C --> D
    D --> E[IconPaths.ts<br>Shared<br>定義所有圖標的 SVG 路徑<br>被 Icon.tsx 使用]
    
    subgraph "Astro"
        A
        B
    end
    
    subgraph "React"
        C
        D
    end
    
    subgraph "Shared"
        E
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#ff9,stroke:#333,stroke-width:2px
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