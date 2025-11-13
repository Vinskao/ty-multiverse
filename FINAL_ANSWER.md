# 端點驗證 - 最終答案

## 📋 問題

```javascript
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";
```

**問題 1**: 這端點正確嗎？  
**問題 2**: 如果錯誤，正確是啥？

**錯誤訊息**:
```
DELETE 發送失敗: Exception: DNS error: http://localhost:8082/tymg/people/delete-all
```

---

## ✅ 答案 1: 端點是正確的

### 驗證結果

| 端點 | URL | 方法 | 狀態 | 測試結果 |
|------|-----|------|------|----------|
| Delete All | `http://localhost:8082/tymg/people/delete-all` | POST | ✅ **正確** | HTTP 401 (端點存在，需認證) |
| Update | `http://localhost:8082/tymg/people/update` | POST | ✅ **正確** | HTTP 401 (端點存在，需認證) |

### 證據

#### 1. Gateway 路由配置 ✅
```yaml
# ty-multiverse-gateway/src/main/resources/application.yml
routes:
  - id: people-routes
    uri: 'http://localhost:8080'
    predicates:
      - Path=/tymg/people/**
    filters:
      - RewritePath=/tymg/people/(?<segment>.*), /tymb/people/$\{segment}
```

#### 2. Backend Controller ✅
```java
// ty-multiverse-backend/.../PeopleController.java
@PostMapping("/delete-all")  // Line 162
public ResponseEntity<?> deleteAllPeople() { ... }

@PostMapping("/update")      // Line 52
public ResponseEntity<?> updatePeople(@RequestBody People people) { ... }
```

#### 3. 實際測試 ✅
```bash
$ curl -X POST http://localhost:8082/tymg/people/delete-all
# HTTP/1.1 401 Unauthorized
# WWW-Authenticate: Bearer

$ curl -X POST http://localhost:8082/tymg/people/update
# HTTP/1.1 401 Unauthorized
# WWW-Authenticate: Bearer
```

**結論**: 端點存在且可訪問，返回 401 表示需要認證。

---

## 🔧 答案 2: 正確的使用方式

雖然端點 URL 本身是正確的，但**不應該硬編碼 URL**。以下是正確的做法：

### ❌ 錯誤做法

```javascript
// 不要這樣做！
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";

fetch(PEOPLE_DELETE_URL, { method: 'POST' });
```

**問題**:
1. 硬編碼 URL，難以維護
2. 沒有自動附加認證 Token
3. 沒有統一的錯誤處理
4. 環境切換時需要手動修改

### ✅ 正確做法 1: 使用服務層 (最推薦)

```javascript
import { peopleService } from '../services/peopleService';

// 刪除所有角色
try {
  await peopleService.deleteAllPeople();
  console.log('✅ 刪除成功');
} catch (error) {
  console.error('❌ 刪除失敗:', error);
}

// 更新角色
try {
  await peopleService.updatePerson({
    name: "角色名稱",
    age: 25,
    level: 10,
    attributes: "屬性描述"
  });
  console.log('✅ 更新成功');
} catch (error) {
  console.error('❌ 更新失敗:', error);
}
```

**優點**:
- ✅ 自動從 `.env.development` 讀取 `PUBLIC_TYMG_URL`
- ✅ 自動附加 JWT Token (`Authorization: Bearer <token>`)
- ✅ 統一的錯誤處理
- ✅ TypeScript 類型檢查
- ✅ 支持異步處理和輪詢

### ✅ 正確做法 2: 使用 React Hooks

```typescript
import { useDeleteAllPeople, useUpdatePerson } from '../services/usePeopleService';

function MyComponent() {
  const { deleteAllPeople, loading: deleteLoading, error: deleteError } = useDeleteAllPeople();
  const { updatePerson, loading: updateLoading, error: updateError } = useUpdatePerson();

  const handleDelete = async () => {
    if (!confirm('確定要刪除所有角色嗎？')) return;
    
    try {
      await deleteAllPeople();
      alert('✅ 刪除成功');
    } catch (err) {
      alert('❌ 刪除失敗: ' + err.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await updatePerson({
        name: "新角色",
        age: 30,
        level: 15
      });
      alert('✅ 更新成功');
    } catch (err) {
      alert('❌ 更新失敗: ' + err.message);
    }
  };

  return (
    <div>
      <button onClick={handleDelete} disabled={deleteLoading}>
        {deleteLoading ? '刪除中...' : '刪除所有角色'}
      </button>
      <button onClick={handleUpdate} disabled={updateLoading}>
        {updateLoading ? '更新中...' : '更新角色'}
      </button>
    </div>
  );
}
```

### ✅ 正確做法 3: 使用環境變數 (如果必須手動調用)

**步驟 1**: 確保 `.env.development` 配置正確

```env
# ty-multiverse-frontend/.env.development
PUBLIC_TYMG_URL=http://localhost:8082/tymg
```

**步驟 2**: 在代碼中使用環境變數

```javascript
// ✅ 使用環境變數
const GATEWAY_URL = import.meta.env.PUBLIC_TYMG_URL;
const PEOPLE_DELETE_URL = `${GATEWAY_URL}/people/delete-all`;
const PEOPLE_UPDATE_URL = `${GATEWAY_URL}/people/update`;

// 獲取 Token
const token = localStorage.getItem('token');

// 發送請求
const response = await fetch(PEOPLE_DELETE_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}
```

---

## 🔍 為什麼會出現 DNS Error？

### 可能原因

#### 1. 缺少認證 Token
端點返回 `401 Unauthorized`，表示需要有效的 JWT Token。

**解決方案**:
```javascript
// 確保用戶已登入並獲取 Token
const token = localStorage.getItem('token');
if (!token) {
  throw new Error('未登入，請先登入');
}
```

#### 2. Gateway 未啟動
**檢查方法**:
```bash
# 檢查 Gateway 進程
ps aux | grep gateway

# 測試健康狀態
curl http://localhost:8082/tymg/health
```

#### 3. CORS 問題
如果從瀏覽器發送請求，可能遇到 CORS 問題。

**解決方案**: 使用前端服務層，它會自動處理 CORS。

#### 4. 網絡配置問題
**檢查方法**:
```bash
# 測試端口是否可訪問
curl http://localhost:8082/tymg/health

# 檢查防火牆設置
```

---

## 📝 環境變數配置

### 當前配置

```env
# .env.development
PUBLIC_TYMB_URL=http://localhost:8080/tymb  # Backend 直接連接
PUBLIC_TYMG_URL=http://localhost:8082/tymg  # Gateway API 調用 (推薦)
```

### 優先級

```typescript
baseUrl 優先級:
1. PUBLIC_TYMG_URL (Gateway - 推薦使用)
2. PUBLIC_TYMB_URL (Backend - 備用)
3. PUBLIC_API_BASE_URL (舊版兼容)
```

### 服務層自動配置

```typescript
// src/services/config.ts
export const config = {
  api: {
    baseUrl: import.meta.env.PUBLIC_TYMG_URL || 
             import.meta.env.PUBLIC_TYMB_URL || 
             import.meta.env.PUBLIC_API_BASE_URL,
    gatewayUrl: import.meta.env.PUBLIC_TYMG_URL,
  }
};

// src/services/peopleService.ts
class PeopleService {
  constructor() {
    this.baseUrl = config.api?.baseUrl || '';  // ✅ 自動使用環境變數
  }
}
```

---

## 🎯 最終結論

### 端點正確嗎？

**✅ 是的，端點完全正確！**

```javascript
✅ http://localhost:8082/tymg/people/delete-all  (POST)
✅ http://localhost:8082/tymg/people/update      (POST)
```

### 正確的使用方式是什麼？

**推薦順序**:

1. **最佳**: 使用 `peopleService` 或 React Hooks
   ```javascript
   import { peopleService } from '../services/peopleService';
   await peopleService.deleteAllPeople();
   ```

2. **次佳**: 使用環境變數 + 手動 fetch
   ```javascript
   const url = `${import.meta.env.PUBLIC_TYMG_URL}/people/delete-all`;
   ```

3. **不推薦**: 硬編碼 URL
   ```javascript
   // ❌ 不要這樣做
   const url = "http://localhost:8082/tymg/people/delete-all";
   ```

### DNS Error 如何解決？

1. ✅ 使用 `peopleService` (自動處理認證)
2. ✅ 確保用戶已登入並獲取有效 Token
3. ✅ 確認 Gateway 正在運行
4. ✅ 檢查網絡連接

---

## 📚 相關資源

### 文檔
- [API_CONFIGURATION_SUMMARY.md](./API_CONFIGURATION_SUMMARY.md) - API 配置詳解
- [ENDPOINT_VERIFICATION.md](./ENDPOINT_VERIFICATION.md) - 端點驗證詳情

### 測試工具
- [test-people-endpoints.sh](./test-people-endpoints.sh) - 端點測試腳本

### 源碼
- `src/services/peopleService.ts` - People 服務實現
- `src/services/usePeopleService.ts` - React Hooks
- `src/services/config.ts` - 配置管理
- `src/services/apiService.ts` - 通用 API 服務

### 測試命令

```bash
# 測試端點 (無認證)
cd ty-multiverse-frontend
./test-people-endpoints.sh

# 測試端點 (帶認證)
./test-people-endpoints.sh "YOUR_JWT_TOKEN"

# 檢查 Gateway 健康
curl http://localhost:8082/tymg/health
```

---

## 💡 快速參考

```javascript
// ✅ 推薦: 使用服務層
import { peopleService } from '../services/peopleService';

// 刪除所有
await peopleService.deleteAllPeople();

// 更新角色
await peopleService.updatePerson(personData);

// ❌ 不推薦: 硬編碼 URL
const url = "http://localhost:8082/tymg/people/delete-all";
```

**記住**: 永遠使用服務層，不要硬編碼 URL！

