# 前端 Services 目錄結構優化建議

生成時間：2025-11-10

## 📊 當前結構分析

### ✅ 現有優點

#### 1. 已有統一的 API Caller
- **`apiService.ts`**: 提供統一的 HTTP 請求介面
  - 支持所有 HTTP 方法
  - 自動附加 Bearer Token
  - 統一的錯誤處理
  - 超時配置

```typescript
// apiService.ts 核心功能
export interface ApiRequestOptions {
  url: string;
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
}
```

#### 2. 完善的配置管理
- **`config.ts`**: 集中管理環境變量
  - API 基礎 URL
  - Backend/Gateway URL 分離
  - 資源 URL 配置

#### 3. 專業的錯誤處理和監控
- **`errorHandler.ts`** & **`errorService.ts`**: 錯誤分類和處理
- **`retryService.ts`**: 自動重試機制
- **`serviceManager.ts`**: 統一的 API 執行管理器
- **`monitorService.ts`**: 性能監控和指標收集

#### 4. 業務邏輯服務層
- `auth.ts` - 認證服務
- `peopleService.ts` - 人物管理（異步模式）
- `weaponService.ts` - 武器管理
- `galleryService.ts` - 圖庫管理
- `characterService.ts` - 角色服務（帶緩存）
- `damageService.ts` - 傷害計算（帶緩存）
- `syncService.ts` - 同步服務

---

## ❌ 發現的問題

### 1. 不一致的 API 調用方式

#### 問題 1.1：繞過 `apiService` 的直接 fetch 調用

**位置：`src/scripts/weapon.js`**
```javascript
// ❌ 直接使用 fetch
const response = await fetch(apiUrl, { 
  method: "GET",
  credentials: 'include'
});
```

**問題：**
- 沒有使用統一的錯誤處理
- 沒有使用重試機制
- 沒有性能監控
- 缺少 Bearer Token 自動附加

**位置：`src/components/QABot.astro`**
```javascript
// ❌ 直接使用 fetch
const response = await fetch(`${apiBaseUrl}${apiPathPrefix}/qa/query`, {
  method: 'POST',
  headers,
  body: JSON.stringify(finalPayload),
  credentials: 'include'
});
```

**問題：同上**

#### 問題 1.2：使用 axios 而非統一的 apiService

**位置：`src/components/BlackJack.astro`**
```javascript
// ❌ 使用 axios
const axios = window.axios;
const response = await axios.get(`${API_BASE_URL}/status`);
```

**問題：**
- 引入了第二個 HTTP 客戶端庫
- 增加了依賴複雜度
- 與專案標準不一致

#### 問題 1.3：`damageService.ts` 內部直接 fetch

**位置：`src/services/damageService.ts`**
```typescript
// ⚠️ 在 service 內部直接使用 fetch
const response = await fetch(`${baseUrl}/people/damageWithWeapon?name=${encodeURIComponent(characterName)}`, {
  method: "GET",
  headers,
  credentials: 'include'
});
```

**問題：**
- 雖然使用了 `serviceManager.executeAPI`，但內部仍直接 fetch
- 應該使用 `apiService.request()`

### 2. Astro API Routes 作為代理層

**發現：** `src/pages/api/*` 中有大量 API 代理路由

```
src/pages/api/
├── gallery/
│   ├── delete.ts
│   ├── getAll.ts
│   ├── getById.ts
│   ├── save.ts
│   └── update.ts
├── people/
│   ├── damageWithWeapon.ts
│   ├── get-by-name.ts
│   ├── names.ts
│   └── update.ts
├── weapons/
│   ├── index.ts
│   ├── [name].ts
│   └── owner/
│       └── [ownerName].ts
├── deckofcards/
│   └── blackjack/*
├── qa-proxy.ts
└── sync-characters.ts
```

**問題：**
- 增加了一層不必要的代理
- 前端直接調用 Backend/Gateway 更簡單
- 維護兩套路由配置（前端 + Astro API）
- 性能開銷（多一次 HTTP 跳轉）

**唯一合理的使用場景：**
- 需要在前端服務器端隱藏敏感信息（如 API Keys）
- 需要聚合多個 Backend API 調用
- 需要在服務器端進行數據轉換

### 3. 服務層使用不一致

**好的例子：`peopleService.ts`**
```typescript
private async makeRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  const url = `${this.baseUrl}${endpoint}`;
  return apiService.request({  // ✅ 使用 apiService
    url,
    method,
    body,
    auth: true,
  });
}
```

**不好的例子：`damageService.ts`**
```typescript
// ❌ 直接 fetch
const response = await fetch(`${baseUrl}/people/damageWithWeapon?name=${...}`, {
  method: "GET",
  headers,
  credentials: 'include'
});
```

---

## 🎯 優化建議

### 優先級 1：統一所有 API 調用使用 `apiService`

#### 1.1 重構 `damageService.ts`

**修改前：**
```typescript
const response = await fetch(`${baseUrl}/people/damageWithWeapon?name=${encodeURIComponent(characterName)}`, {
  method: "GET",
  headers,
  credentials: 'include'
});
```

**修改後：**
```typescript
private async fetchDamageFromAPI(characterName: string): Promise<number> {
  const serviceManager = (await import('./serviceManager')).default.getInstance();

  return await serviceManager.executeAPI(async () => {
    const { config } = await import('./config');
    const { apiService } = await import('./apiService');
    
    const response = await apiService.request<number>({
      url: `${config.api.baseUrl}/people/damageWithWeapon`,
      method: 'GET',
      auth: true,  // 自動附加 Bearer Token
      headers: {
        'Accept': 'application/json'
      },
      // 使用 query parameters
      body: undefined  // GET 請求不需要 body
    });

    return response.data;
  }, 'FetchCharacterDamage');
}
```

#### 1.2 重構 `weapon.js`

**創建新的 `weaponDamageService.ts`：**
```typescript
// src/services/weaponDamageService.ts
import { apiService } from './apiService';
import { config } from './config';

export async function fetchCharacterDamage(characterName: string): Promise<number> {
  const response = await apiService.request<number>({
    url: `${config.api.backendUrl}/people/damageWithWeapon`,
    method: 'GET',
    auth: true,
    headers: {
      'Accept': 'application/json'
    }
  });

  return response.data;
}
```

**修改 `weapon.js` 使用新服務：**
```javascript
// src/scripts/weapon.js
import { fetchCharacterDamage } from '../services/weaponDamageService';

export async function applyWeaponDamage(character, weapons) {
  try {
    const characterName = character?.name || character?.nameOriginal || "";
    if (!characterName) throw new Error("Character name is missing");

    // ✅ 使用統一的服務層
    const totalAttack = await fetchCharacterDamage(characterName);
    
    return {
      totalAttack,
      character,
      weapons
    };
  } catch (error) {
    console.error("API call failed, fallback to local calculation:", error);
    // Fallback to local calculation
    return calculateWeaponDamage(character, weapons);
  }
}
```

#### 1.3 重構 `QABot.astro`

**創建 `qaService.ts`：**
```typescript
// src/services/qaService.ts
import { apiService } from './apiService';
import { config } from './config';

export interface QARequest {
  text: string;
  user_id: string;
  language: string;
  name: string;
}

export interface QAResponse {
  answer: string;
  confidence: number;
  // ... 其他字段
}

export async function queryQA(request: QARequest): Promise<QAResponse> {
  const apiBaseUrl = import.meta.env.PUBLIC_QA_API_URL || config.api.baseUrl;
  
  const response = await apiService.request<QAResponse>({
    url: `${apiBaseUrl}/maya-sawa/qa/query`,
    method: 'POST',
    body: request,
    auth: true
  });

  return response.data;
}
```

**修改 `QABot.astro`：**
```typescript
import { queryQA } from '../services/qaService';

// 在組件中使用
const result = await queryQA({
  text: userInput,
  user_id: this.state.userId,
  language: this.state.currentLanguage,
  name: this.state.botName
});
```

#### 1.4 重構 `BlackJack.astro` - 移除 axios

**創建 `blackjackService.ts`：**
```typescript
// src/services/blackjackService.ts
import { apiService } from './apiService';
import { config } from './config';

const BLACKJACK_BASE = `${config.api.gatewayUrl}/blackjack`;

export interface GameState {
  playerCards: string[];
  dealerCards: string[];
  playerScore: number;
  dealerScore: number;
  gameOver: boolean;
  winner: string | null;
}

export const blackjackService = {
  async checkStatus(): Promise<{ available: boolean }> {
    const response = await apiService.request({
      url: `${BLACKJACK_BASE}/status`,
      method: 'GET',
      auth: false
    });
    return response.data;
  },

  async startGame(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${BLACKJACK_BASE}/start`,
      method: 'POST',
      auth: true
    });
    return response.data;
  },

  async hit(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${BLACKJACK_BASE}/hit`,
      method: 'POST',
      auth: true
    });
    return response.data;
  },

  async stand(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${BLACKJACK_BASE}/stand`,
      method: 'POST',
      auth: true
    });
    return response.data;
  }
};
```

**修改 `BlackJack.astro`：**
```typescript
import { blackjackService } from '../services/blackjackService';

async function checkApiAvailability() {
  try {
    await blackjackService.checkStatus();
    document.getElementById('maintenance-overlay').style.display = 'none';
    document.getElementById('game-content').style.display = 'block';
  } catch (error) {
    console.log('Black Jack API not available');
  }
}
```

### 優先級 2：評估 Astro API Routes 的必要性

#### 2.1 移除不必要的代理層

**建議移除：**
- `src/pages/api/people/*` → 前端直接調用 `peopleService.ts`
- `src/pages/api/weapons/*` → 前端直接調用 `weaponService.ts`
- `src/pages/api/gallery/*` → 前端直接調用 `galleryService.ts`

**保留（如果有業務需求）：**
- `src/pages/api/qa-proxy.ts` - 如果需要隱藏 QA API 密鑰
- `src/pages/api/sync-characters.ts` - 如果需要服務器端聚合

#### 2.2 優化後的架構

**修改前（有代理層）：**
```
Browser → Astro API Route → Backend/Gateway API
```

**修改後（直接調用）：**
```
Browser → Service Layer (apiService) → Backend/Gateway API
```

### 優先級 3：增強 `apiService.ts` 功能

#### 3.1 支持 Query Parameters

**當前問題：**
```typescript
// 需要手動拼接 URL
url: `${baseUrl}/people/damageWithWeapon?name=${encodeURIComponent(name)}`
```

**建議增強：**
```typescript
// src/services/apiService.ts
export interface ApiRequestOptions {
  url: string;
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, string | number | boolean>;  // 新增
  headers?: Record<string, string>;
  auth?: boolean;
  timeout?: number;
}

async function apiRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  let { url } = options;
  const {
    method = 'GET',
    body,
    params,
    headers: customHeaders = {},
    auth = true,
    timeout = config.api?.timeout ?? 15_000,
  } = options;

  // 處理 query parameters
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url = `${url}?${searchParams.toString()}`;
  }

  // ... 其餘邏輯
}
```

**使用示例：**
```typescript
// 不需要手動拼接 URL
const response = await apiService.request({
  url: `${config.api.baseUrl}/people/damageWithWeapon`,
  method: 'GET',
  params: { name: characterName },  // ✅ 自動編碼
  auth: true
});
```

#### 3.2 支持請求攔截器和響應攔截器

```typescript
// src/services/apiService.ts
export interface Interceptor<T = any> {
  onFulfilled?: (value: T) => T | Promise<T>;
  onRejected?: (error: any) => any;
}

class ApiService {
  private requestInterceptors: Interceptor<ApiRequestOptions>[] = [];
  private responseInterceptors: Interceptor<ApiResponse>[] = [];

  addRequestInterceptor(interceptor: Interceptor<ApiRequestOptions>) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: Interceptor<ApiResponse>) {
    this.responseInterceptors.push(interceptor);
  }

  async request<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    // 應用請求攔截器
    let finalOptions = options;
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onFulfilled) {
        finalOptions = await interceptor.onFulfilled(finalOptions);
      }
    }

    try {
      const response = await this.executeRequest(finalOptions);

      // 應用響應攔截器
      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onFulfilled) {
          finalResponse = await interceptor.onFulfilled(finalResponse);
        }
      }

      return finalResponse;
    } catch (error) {
      // 應用錯誤攔截器
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onRejected) {
          return await interceptor.onRejected(error);
        }
      }
      throw error;
    }
  }
}
```

### 優先級 4：創建服務索引文件

**創建 `src/services/index.ts`：**
```typescript
// 統一導出所有服務
export { apiService, type ApiRequestOptions, type ApiResponse, ApiError } from './apiService';
export { config, getUrlParams, updateUrlParams } from './config';
export { default as ServiceManager } from './serviceManager';
export { default as CharacterService } from './characterService';
export { peopleService } from './peopleService';
export { weaponService } from './weaponService';
export { galleryService } from './galleryService';
export { damageService } from './damageService';
export { syncService } from './syncService';
export { monitorService } from './monitorService';
export { verifyToken, type AuthResult } from './auth';

// 新增的服務
export { blackjackService } from './blackjackService';
export { qaService } from './qaService';
export { weaponDamageService } from './weaponDamageService';
```

**使用示例：**
```typescript
// 統一導入
import { peopleService, weaponService, apiService } from '@/services';

// 而不是
import { peopleService } from '@/services/peopleService';
import { weaponService } from '@/services/weaponService';
import { apiService } from '@/services/apiService';
```

---

## 📋 實施計劃

### 階段 1：立即修復（1-2 天）

1. **修復 Gateway 配置問題**（已完成）
   - [x] 啟用 `grpc.client.enabled = true`
   - [x] 補充缺失的路由配置

2. **統一 API 調用**
   - [ ] 重構 `damageService.ts` 使用 `apiService`
   - [ ] 創建 `weaponDamageService.ts`
   - [ ] 重構 `weapon.js`

3. **驗證修復**
   - [ ] 重啟 Gateway
   - [ ] 重新運行測試腳本
   - [ ] 確認成功率 > 80%

### 階段 2：服務層優化（3-5 天）

1. **創建缺失的服務**
   - [ ] 創建 `blackjackService.ts`
   - [ ] 創建 `qaService.ts`
   - [ ] 創建服務索引文件 `index.ts`

2. **重構組件使用服務**
   - [ ] 重構 `BlackJack.astro`
   - [ ] 重構 `QABot.astro`
   - [ ] 重構 `Fight.astro`（如需要）

3. **移除 axios 依賴**
   - [ ] 檢查 `package.json`
   - [ ] 移除未使用的 axios
   - [ ] 更新組件引用

### 階段 3：架構優化（1-2 週）

1. **增強 `apiService`**
   - [ ] 添加 query parameters 支持
   - [ ] 添加攔截器機制
   - [ ] 改進錯誤處理

2. **評估 Astro API Routes**
   - [ ] 識別必要的代理
   - [ ] 移除不必要的代理
   - [ ] 更新前端調用

3. **完善文檔**
   - [ ] 更新 `AGENTS.md`
   - [ ] 創建服務層使用指南
   - [ ] 添加最佳實踐文檔

### 階段 4：測試和優化（持續）

1. **端到端測試**
   - [ ] 所有 API 端點測試通過
   - [ ] 性能測試
   - [ ] 錯誤處理測試

2. **性能優化**
   - [ ] 監控 API 調用性能
   - [ ] 優化緩存策略
   - [ ] 減少不必要的請求

---

## 📊 預期收益

### 1. 代碼質量
- **統一性**: 所有 API 調用使用相同模式
- **可維護性**: 集中管理 API 邏輯
- **可測試性**: 更容易編寫和維護測試

### 2. 性能
- **減少依賴**: 移除 axios，減少打包大小
- **優化請求**: 統一的重試和緩存機制
- **監控改進**: 完整的性能指標收集

### 3. 開發效率
- **快速定位問題**: 集中的錯誤處理
- **減少重複代碼**: 共用的 API 邏輯
- **清晰的結構**: 易於理解和擴展

---

## 🎓 最佳實踐指南

### 1. 創建新服務時

```typescript
// src/services/newService.ts
import { apiService } from './apiService';
import { config } from './config';

export interface NewServiceData {
  // 定義數據類型
}

class NewService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  // 使用 apiService 而非直接 fetch
  async getData(): Promise<NewServiceData> {
    const response = await apiService.request<NewServiceData>({
      url: `${this.baseUrl}/endpoint`,
      method: 'GET',
      auth: true
    });
    return response.data;
  }
}

export const newService = new NewService();
```

### 2. 在組件中使用服務

```typescript
// Component.astro
import { newService } from '@/services/newService';
import ServiceManager from '@/services/serviceManager';

const manager = ServiceManager.getInstance();

try {
  const data = await manager.executeAPI(
    () => newService.getData(),
    'GetNewServiceData'
  );
  // 使用 data
} catch (error) {
  // 錯誤已由 serviceManager 處理
  console.error('Failed to fetch data');
}
```

### 3. 避免的模式

```typescript
// ❌ 不要直接 fetch
const response = await fetch('/api/endpoint');

// ❌ 不要使用 axios
import axios from 'axios';
const response = await axios.get('/api/endpoint');

// ❌ 不要繞過服務層
// 組件中直接調用 API

// ✅ 正確的方式
import { someService } from '@/services/someService';
const data = await someService.getData();
```

---

**文檔維護者：** AI Assistant  
**最後更新：** 2025-11-10  
**相關文檔：**
- `API-CONNECTIVITY-DIAGNOSIS.md`
- `AGENTS.md`
- `api-test-report.json`

