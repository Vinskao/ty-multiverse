# TY Multiverse Frontend

![Astro](https://img.shields.io/badge/Astro-Framework-FF5D01.svg) ![React](https://img.shields.io/badge/React-UI-61DAFB.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-Enabled-3178C6.svg)

> The main frontend application unifying multiple project domains through a modern Astro and React hybrid architecture.

Technical SEO policy and SSR sitemap workflow: [docs/SEO.md](docs/SEO.md).

## Table of Contents

- [Background](#background)
- [Architecture](#architecture)
- [Design Patterns](#design-patterns)
- [Other](#other)

## Background

### 系統概述

TY-Multiverse 前端為多維度管理系統，包含：
- **Frontend (Astro)** - 主前端應用（`astro@6`，需 Node.js >= 22.12.0）
- **Video Service (Node.js)** - 影片合併服務（`video-service/` 目錄）

### 核心技術與架構設計

#### 技術棧
- **前端框架**：Astro + React，靜態生成與動態交互
- **後端服務**：多服務架構（FastAPI、Spring Boot）
- **數據層**：PostgreSQL、MongoDB、Redis
- **即時通訊**：WebSocket + RabbitMQ 事件驅動

#### 權限驗證機制（三層）
- **管理員層**：`manage-users` 角色，訪問管理面板
- **用戶層**：標準 JWT token 驗證
- **訪客層**：基本 token 檢查或公開訪問

#### 系統核心設計模式

##### Producer–Consumer 架構
1. **非同步計數系統**：前端事件 → Redis 佇列 → Consumer 批次更新 MongoDB
2. **AI 問答系統**：三階段管道（查詢預處理 → Embedding → LLM 生成）
3. **即時通知**：事件 → RabbitMQ → WebSocket 推送

#### 多層快取策略
- **Client 層**：localStorage 持久化
- **Server 層**：Redis 高速快取
- **Cache Key 設計**：語言、用戶、查詢條件組合鍵

## Architecture

### 整體架構

```mermaid
graph TD
    Browser["瀏覽器"] --> Pages["Astro SSR 頁面 (src/pages/*.astro)"]
    Browser --> Islands["React islands (src/components/*.tsx)"]
    Browser --> Scripts["前端腳本 (src/scripts/)"]
    Browser --> Storage["localStorage (主題、語言、token、快取)"]

    Pages --> Middleware["middleware.ts (舊網址 301 轉址)"]
    Pages --> Layout["BaseLayout.astro + Nav / Footer"]
    Pages --> Feeds["sitemap.xml / llms.txt / podcast.xml / brief.json"]

    Scripts --> ApiRoutes["Astro API routes (src/pages/api/)"]
    Islands --> ApiRoutes
    ApiRoutes --> MarketApi["/api/market/* 市場、報告、通知、訂閱"]
    ApiRoutes --> BlogApi["/api/blog/*"]
    ApiRoutes --> SearchApi["/api/search/benchmark"]
    ApiRoutes --> RunpodApi["/api/runpod/cost"]
    ApiRoutes --> AvatarApi["/api/people/avatar"]

    MarketApi -->|"HTTP (MAYA_SAWA_INTERNAL_URL)"| MayaSawa["maya-sawa (FastAPI)"]
    BlogApi -->|HTTP| MayaSawa
    SearchApi -->|HTTP| MayaSawa
    RunpodApi -->|HTTP| MayaSawa
    Feeds -->|HTTP| MayaSawa

    Scripts -->|"HTTP (PUBLIC_TYMG_URL)"| Gateway["ty-multiverse-gateway"]
    Scripts -->|"QA: /maya-sawa/qa/query"| Gateway
    AvatarApi -->|"HTTP (TYMG_INTERNAL_URL)"| Gateway
    Gateway --> Backend["ty-multiverse-backend"]
    Gateway --> MayaSawa
    Browser -->|"登入轉址 (PUBLIC_SSO_URL)"| Keycloak["Keycloak SSO"]
    Scripts -->|"角色圖片 (PUBLIC_PEOPLE_IMAGE_URL)"| ImageServer["靜態圖片伺服器"]
    Pages --> Ads["廣告 (Adsterra / Monetag)"]
```

### 市場儀表板資料流（src/pages/api/market/、src/scripts/market/）

```mermaid
sequenceDiagram
    participant B as 瀏覽器 (src/scripts/index.ts)
    participant M as src/scripts/market/* 純邏輯模組
    participant A as Astro API /api/market/*
    participant S as maya-sawa /market/*
    B->>A: GET /api/market/dashboard、history、reports …
    A->>S: HTTP（伺服器端，必要時帶 MARKET_INTERNAL_SECRET）
    S-->>A: JSON
    A-->>B: JSON（Cache-Control）
    B->>M: 計算月增率／年增率、TDCC、數字格式化
    M-->>B: 圖表與讀數
```

### Astro 組件架構

```mermaid
graph TD
    A["Astro Pages (src/pages/*.astro)"] --> B["BaseLayout.astro"]
    B --> C["Nav.astro / Footer.astro"]
    B --> D["Page Content Slot"]
    C --> E["ThemeToggle.tsx (client:load)"]
    D --> F["React islands"]
    F --> G["SkillsBubbleChart.tsx (React + D3, client:visible)"]
    F --> H["ResearchZone.tsx (client:visible)"]
    F --> I["AiTokenUsageDashboard.tsx (client:load)"]
    F --> J["RunpodCostDashboard.tsx (client:load)"]
    D --> K["PeopleManagement.tsx (createRoot, people-management.astro)"]
```

### API Gateway 路由架構

```mermaid
graph TD
    A["Frontend Request (PUBLIC_TYMG_URL)"] --> B{"ty-multiverse-gateway"}
    B --> D["/people/** 角色管理"]
    B --> E["/weapons/** 武器管理"]
    B --> F["/gallery/** 圖庫"]
    B --> H["/auth/** 與 /keycloak/** 認證"]
    B --> Q["/maya-sawa/qa/** 問答"]
    D --> C["ty-multiverse-backend"]
    E --> C
    F --> C
    H --> C
    Q --> MS["maya-sawa"]
```

### 問答系統架構

```mermaid
graph TD
    H["QABot.astro / QABotV2.astro"] --> S["qaService.ts (src/services/api/)"]
    S --> R["qaRateLimiter.ts (localStorage 限流)"]
    S -->|"POST /maya-sawa/qa/query"| G["ty-multiverse-gateway"]
    G --> M["maya-sawa (回答生成)"]
    M --> G
    G --> S
```

### CI/CD Pipeline

```mermaid
graph LR
    A["GitHub Repository"] --> B["Jenkins: Clone and Setup"]
    B --> D["Build Docker Image (npm build 於 Dockerfile 內)"]
    D --> E["Push to Docker Hub"]
    E --> F["Deploy to Kubernetes (kubectl set image)"]
```

## Design Patterns

### 🎯 設計模式 (Design Patterns)

- **外觀模式 (Facade Pattern)**: 透過統一的 Service 層封裝 API 呼叫，對 UI 層隱藏後端與網路請求的複雜度。
- **組件模式 (Component Pattern)**: 透過 Astro 與 React 的混合架構將 UI 劃分為獨立、高重用性的組件。
- **觀察者模式 (Observer Pattern)**: 運用 React 的狀態管理與 Hook 機制，實現組件視圖對底層數據變化的響應。

## Other

### People 模組 API 端點

| API 端點 | 方法 | 描述 |
|---------|------|------|
| `/api/people/names` | GET | 獲取所有角色名稱 |
| `/api/people/get-by-name` | POST | 根據名稱查詢角色 |
| `/api/people/update` | POST | 更新角色資訊 |

### Video Merge Service

影片合併服務位於 `video-service/` 目錄，提供：
- 合併 4 個 480x832 影片為 1920x1080
- 自動去背（偵測黑色/綠色背景）
- 輸出支援透明度的 WebM 格式

服務 URL：`http://localhost:3000`（dev）/ `https://video.tatdvsonorth.com`（prod）

> 啟動指令、API 測試範例、Article Sync 操作、Video Service 部署、Troubleshooting 請見 [AGENTS.md](AGENTS.md)。
