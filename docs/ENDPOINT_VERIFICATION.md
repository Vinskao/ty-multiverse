# 端點驗證結果

## 問題

用戶詢問以下端點是否正確：

```javascript
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";
```

並報告錯誤：
```
DELETE 發送失敗: Exception: DNS error: http://localhost:8082/tymg/people/delete-all
```

## ✅ 驗證結果

### 端點是正確的！

經過測試驗證，這兩個端點配置完全正確：

| 端點 | URL | 方法 | 狀態 |
|------|-----|------|------|
| Delete All | `http://localhost:8082/tymg/people/delete-all` | POST | ✅ 正確 |
| Update | `http://localhost:8082/tymg/people/update` | POST | ✅ 正確 |

### 測試結果

```bash
# 測試 1: DELETE ALL
curl -X POST http://localhost:8082/tymg/people/delete-all
# 返回: HTTP 401 Unauthorized (端點存在，需要認證)

# 測試 2: UPDATE
curl -X POST http://localhost:8082/tymg/people/update \
  -H "Content-Type: application/json" \
  -d '{"name":"test","age":25,"level":1}'
# 返回: HTTP 401 Unauthorized (端點存在，需要認證)

# 測試 3: Gateway 健康檢查
curl http://localhost:8082/tymg/health
# 返回: {"status":"UP",...} (Gateway 正常運行)
```

## 🔍 Gateway 路由配置

在 `ty-multiverse-gateway/src/main/resources/application.yml` 中：

```yaml
routes:
  - id: people-routes
    uri: 'http://localhost:8080'
    predicates:
      - Path=/tymg/people/**
    filters:
      - RewritePath=/tymg/people/(?<segment>.*), /tymb/people/$\{segment}
```

**路由轉發**:
- `POST /tymg/people/delete-all` → `POST /tymb/people/delete-all` (Backend)
- `POST /tymg/people/update` → `POST /tymb/people/update` (Backend)

## 🔧 Backend Controller 確認

在 `ty-multiverse-backend/.../PeopleController.java` 中：

```java
@PostMapping("/delete-all")  // Line 162
public ResponseEntity<?> deleteAllPeople() { ... }

@PostMapping("/update")      // Line 52
public ResponseEntity<?> updatePeople(@RequestBody People people) { ... }
```

✅ Backend 端點存在且正確配置

## ⚠️ 問題分析

### 1. DNS Error 的可能原因

**DNS error** 通常不是真正的 DNS 問題，而是：

#### A. 硬編碼 URL 的問題
```javascript
// ❌ 不要這樣做
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
fetch(PEOPLE_DELETE_URL, { method: 'POST' });
```

**問題**:
- 沒有使用前端的服務層
- 可能缺少必要的 headers (Content-Type, Authorization)
- 沒有正確的錯誤處理

#### B. 認證問題
端點返回 `401 Unauthorized`，表示：
- ✅ 端點存在並可訪問
- ❌ 缺少有效的 JWT Token

### 2. 正確的解決方案

#### ✅ 方案 1: 使用服務層 (推薦)

```javascript
import { peopleService } from '../services/peopleService';

// 刪除所有角色
try {
  await peopleService.deleteAllPeople();
  console.log('刪除成功');
} catch (error) {
  console.error('刪除失敗:', error);
}

// 更新角色
try {
  await peopleService.updatePerson({
    name: "角色名稱",
    age: 25,
    level: 10
  });
  console.log('更新成功');
} catch (error) {
  console.error('更新失敗:', error);
}
```

**優點**:
- ✅ 自動從環境變數讀取 URL
- ✅ 自動附加 JWT Token
- ✅ 統一的錯誤處理
- ✅ TypeScript 類型檢查

#### ✅ 方案 2: 使用 React Hooks

```typescript
import { useDeleteAllPeople } from '../services/usePeopleService';

function MyComponent() {
  const { deleteAllPeople, loading, error } = useDeleteAllPeople();

  const handleDelete = async () => {
    try {
      await deleteAllPeople();
      alert('刪除成功');
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading}>
      {loading ? '刪除中...' : '刪除所有角色'}
    </button>
  );
}
```

#### ✅ 方案 3: 使用環境變數 (如果必須手動調用)

**不要硬編碼 URL！** 應該放入 `.env.development`:

```env
# .env.development
PUBLIC_TYMG_URL=http://localhost:8082/tymg
```

然後在代碼中使用：

```javascript
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
```

## 🎯 最終答案

### 端點正確嗎？

**✅ 是的，端點完全正確！**

```javascript
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";  // ✅ 正確
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";        // ✅ 正確
```

### 為什麼會失敗？

**原因**: 這些端點需要 JWT Token 認證

**解決方案**:
1. ✅ **推薦**: 使用 `peopleService` 或 React Hooks (自動處理認證)
2. ✅ 確保用戶已登入並獲取有效的 Token
3. ✅ 不要硬編碼 URL，使用環境變數 (`PUBLIC_TYMG_URL`)

### DNS Error 是什麼？

**DNS error** 可能是：
1. Gateway 服務未啟動 (但測試顯示正在運行)
2. 網絡配置問題
3. 瀏覽器 CORS 問題
4. **最可能**: 錯誤的請求方式導致的誤導性錯誤訊息

**驗證 Gateway 狀態**:
```bash
# 檢查 Gateway 是否運行
ps aux | grep gateway

# 測試健康狀態
curl http://localhost:8082/tymg/health
```

## 📚 相關文檔

- [API_CONFIGURATION_SUMMARY.md](./API_CONFIGURATION_SUMMARY.md) - API 配置總結
- [test-people-endpoints.sh](./test-people-endpoints.sh) - 端點測試腳本
- [src/services/peopleService.ts](./src/services/peopleService.ts) - People 服務實現
- [src/services/usePeopleService.ts](./src/services/usePeopleService.ts) - React Hooks

## 🚀 快速測試

運行測試腳本：
```bash
cd ty-multiverse-frontend
./test-people-endpoints.sh

# 或者帶 Token 測試
./test-people-endpoints.sh "YOUR_JWT_TOKEN_HERE"
```

