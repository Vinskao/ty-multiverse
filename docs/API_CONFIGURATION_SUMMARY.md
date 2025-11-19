# API 配置總結

## ✅ 當前配置狀態

### 環境變數配置 (.env.development)
```env
PUBLIC_TYMB_URL=http://localhost:8080/tymb  # Backend 直接連接
PUBLIC_TYMG_URL=http://localhost:8082/tymg  # Gateway API 調用
```

### 前端服務層配置

所有 API 調用都已經**正確配置**使用環境變數，**不需要硬編碼 URL**。

#### 1. `src/services/config.ts`
```typescript
export const config = {
  api: {
    baseUrl: import.meta.env.PUBLIC_TYMG_URL || import.meta.env.PUBLIC_TYMB_URL,
    backendUrl: import.meta.env.PUBLIC_TYMB_URL,
    gatewayUrl: import.meta.env.PUBLIC_TYMG_URL,
  }
};
```

#### 2. `src/services/peopleService.ts`
```typescript
class PeopleService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api?.baseUrl || '';  // ✅ 使用環境變數
  }

  async deleteAllPeople(): Promise<ProducerResponse> {
    // ✅ 自動使用 baseUrl + endpoint
    const response = await this.makeRequest<ProducerResponse>('/people/delete-all', 'POST');
    return response.data;
  }

  async updatePerson(person: Person): Promise<ProducerResponse> {
    // ✅ 自動使用 baseUrl + endpoint
    const response = await this.makeRequest<ProducerResponse>('/people/update', 'POST', person);
    return response.data;
  }
}
```

## 🔧 正確的使用方式

### ❌ 錯誤：硬編碼 URL
```javascript
// 不要這樣做！
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";

fetch(PEOPLE_DELETE_URL, { method: 'POST' });
```

### ✅ 正確：使用服務層
```javascript
import { peopleService } from '../services/peopleService';

// 刪除所有角色
await peopleService.deleteAllPeople();

// 更新角色
await peopleService.updatePerson({
  name: "角色名稱",
  age: 25,
  level: 10
});
```

### ✅ 使用 React Hooks
```typescript
import { useDeleteAllPeople } from '../services/usePeopleService';

function MyComponent() {
  const { deleteAllPeople, loading, error } = useDeleteAllPeople();

  const handleDelete = async () => {
    try {
      await deleteAllPeople();
      console.log('刪除成功');
    } catch (err) {
      console.error('刪除失敗:', err);
    }
  };

  return <button onClick={handleDelete}>刪除所有角色</button>;
}
```

## 🔍 API 端點測試結果

### 1. DELETE ALL 端點
```bash
curl -X POST http://localhost:8082/tymg/people/delete-all
# 返回: 401 Unauthorized (需要認證)
```

### 2. UPDATE 端點
```bash
curl -X POST http://localhost:8082/tymg/people/update \
  -H "Content-Type: application/json" \
  -d '{"name":"test","age":25,"level":1}'
# 返回: 401 Unauthorized (需要認證)
```

## ⚠️ 常見問題

### 問題 1: DNS Error
**錯誤訊息**: `DNS error: http://localhost:8082/tymg/people/delete-all`

**可能原因**:
1. 硬編碼了完整 URL 而不是使用服務層
2. Gateway 服務未啟動
3. 網絡配置問題

**解決方案**:
1. ✅ 使用 `peopleService` 而不是硬編碼 URL
2. ✅ 確認 Gateway 正在運行: `ps aux | grep gateway`
3. ✅ 確認端口 8082 可訪問: `curl http://localhost:8082/actuator/health`

### 問題 2: 401 Unauthorized
**原因**: 端點需要認證，但沒有提供有效的 Bearer token

**解決方案**:
1. 確保用戶已登入並獲取 token
2. `peopleService` 會自動從 localStorage 讀取 token 並附加到請求
3. 檢查 token 是否有效: `storageService.get(storageService.KEYS.TOKEN)`

## 📝 環境變數優先級

```typescript
baseUrl 優先級:
1. PUBLIC_TYMG_URL (Gateway - 推薦)
2. PUBLIC_TYMB_URL (Backend - 備用)
3. PUBLIC_API_BASE_URL (舊版兼容)
```

## 🎯 最佳實踐

1. **✅ 永遠使用服務層** - 不要硬編碼 URL
2. **✅ 使用環境變數** - 在 `.env.development` 中配置
3. **✅ 使用 React Hooks** - 獲得更好的狀態管理
4. **✅ 錯誤處理** - 使用 try-catch 捕獲錯誤
5. **✅ 認證管理** - 確保用戶已登入

## 🔗 相關文件

- `src/services/peopleService.ts` - People 服務實現
- `src/services/usePeopleService.ts` - React Hooks
- `src/services/config.ts` - 配置管理
- `src/services/apiService.ts` - 通用 API 服務
- `.env.development` - 開發環境配置

