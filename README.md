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
graph LR
    Client[客戶端] --> Router[路由層]
    Router --> |/tymultiverse/| Home[首頁]
    Router --> |/tymultiverse/login| Login[登入頁]
    Router --> |/tymultiverse/levellist| LevelList[等級列表]
    Router --> |/tymultiverse/character| Character[角色詳情]
    Router --> |/tymultiverse/weapon| Weapon[武器管理]
    Router --> |/tymultiverse/work| Work[工作管理]
    Router --> |/tymultiverse/control| Control[控制面板]
    
    subgraph 路由保護
        Auth[認證中間件]
        Auth --> |驗證通過| Protected[受保護路由]
        Auth --> |驗證失敗| Login
    end
    
    LevelList --> Auth
    Character --> Auth
    Weapon --> Auth
    Work --> Auth
    Control --> Auth
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