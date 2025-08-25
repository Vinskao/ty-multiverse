# People Service - 角色管理系統

這是一個完整的角色管理系統，支援異步處理的 Producer APIs。

## 功能特色

- ✅ 完整的異步 API 處理
- ✅ 自動狀態輪詢
- ✅ React Hooks 支援
- ✅ TypeScript 類型安全
- ✅ 錯誤處理和重試機制
- ✅ 響應式 UI 組件

## 文件結構

```
src/services/
├── peopleService.ts          # 核心服務類
├── usePeopleService.ts       # React Hooks
└── README-PeopleService.md   # 本文件

src/components/
└── PeopleManagement.tsx      # 示例組件

src/styles/
└── people-management.css     # 樣式文件

src/pages/
└── people-management.astro   # 示例頁面
```

## 快速開始

### 1. 基本使用

```typescript
import { peopleService } from '../services/peopleService';

// 插入角色
const person = {
  name: '戰士',
  age: 30,
  level: 15,
  attributes: '力量型角色'
};

const result = await peopleService.insertPersonAndWait(person);
console.log('插入成功:', result);
```

### 2. 使用 React Hooks

```typescript
import { usePeopleManagement } from '../services/usePeopleService';

function MyComponent() {
  const {
    people,
    weapons,
    loading,
    error,
    insertPerson,
    saveWeapon,
    calculateDamage,
    refreshPeople,
    refreshWeapons,
    clearError,
  } = usePeopleManagement();

  // 組件邏輯...
}
```

## API 參考

### People 模組 APIs

#### 插入單個角色
```typescript
// 基本方法
const response = await peopleService.insertPerson(person);

// 等待完成的方法
const result = await peopleService.insertPersonAndWait(person);
```

#### 更新角色
```typescript
const response = await peopleService.updatePerson(person);
```

#### 批量插入角色
```typescript
const people = [
  { name: '戰士', age: 30, level: 15 },
  { name: '法師', age: 25, level: 12 }
];

const result = await peopleService.insertMultiplePeopleAndWait(people);
```

#### 獲取所有角色
```typescript
const people = await peopleService.getAllPeopleAndWait();
```

#### 根據名稱查詢角色
```typescript
const person = await peopleService.getPersonByNameAndWait('戰士');
```

#### 刪除所有角色
```typescript
await peopleService.deleteAllPeopleAndWait();
```

### Weapon 模組 APIs

#### 獲取所有武器
```typescript
const weapons = await peopleService.getAllWeaponsAndWait();
```

#### 保存武器
```typescript
const weapon = {
  name: '聖劍',
  owner: '戰士',
  attributes: '神聖武器',
  baseDamage: 150
};

const response = await peopleService.saveWeapon(weapon);
```

### 傷害計算 API

#### 計算角色武器傷害
```typescript
const damage = await peopleService.calculateDamageAndWait('戰士');
console.log('最終傷害:', damage.finalDamage);
```

### 狀態查詢 APIs

#### 查詢請求狀態
```typescript
const status = await peopleService.getRequestStatus(requestId);
```

#### 檢查請求是否存在
```typescript
const exists = await peopleService.checkRequestExists(requestId);
```

#### 移除請求狀態
```typescript
const removed = await peopleService.removeRequestStatus(requestId);
```

### 結果查詢 APIs

#### 查詢 People 結果
```typescript
const result = await peopleService.getPeopleResult(requestId);
```

#### 檢查結果是否存在
```typescript
const exists = await peopleService.checkResultExists(requestId);
```

#### 清理結果
```typescript
const removed = await peopleService.cleanupResult(requestId);
```

## React Hooks

### 基本 Hooks

#### useInsertPerson()
```typescript
const { insertPerson, loading, error, data } = useInsertPerson();

const handleSubmit = async () => {
  await insertPerson({ name: '戰士', age: 30, level: 15 });
};
```

#### useGetAllPeople()
```typescript
const { getAllPeople, loading, error, data: people } = useGetAllPeople();

useEffect(() => {
  getAllPeople();
}, []);
```

#### useCalculateDamage()
```typescript
const { calculateDamage, loading, error, data: damageResult } = useCalculateDamage();

const handleCalculate = async () => {
  await calculateDamage('戰士');
};
```

### 組合 Hook

#### usePeopleManagement()
```typescript
const {
  people,
  weapons,
  loading,
  error,
  insertPerson,
  saveWeapon,
  calculateDamage,
  refreshPeople,
  refreshWeapons,
  clearError,
} = usePeopleManagement();
```

## 類型定義

### Person
```typescript
interface Person {
  name: string;
  age: number;
  level: number;
  attributes?: string;
}
```

### Weapon
```typescript
interface Weapon {
  name: string;
  owner: string;
  attributes: string;
  baseDamage: number;
}
```

### DamageCalculation
```typescript
interface DamageCalculation {
  personName: string;
  weaponName: string;
  baseDamage: number;
  finalDamage: number;
  modifiers: any;
}
```

### ProducerResponse
```typescript
interface ProducerResponse {
  requestId: string;
  status: 'processing' | 'PENDING';
  message: string;
}
```

### RequestStatus
```typescript
interface RequestStatus {
  requestId: string;
  status: 'SUCCESS' | 'ERROR' | 'PROCESSING';
  message: string;
  data?: any;
  timestamp: number;
}
```

## 錯誤處理

### 基本錯誤處理
```typescript
try {
  const result = await peopleService.insertPersonAndWait(person);
} catch (error) {
  console.error('操作失敗:', error.message);
}
```

### React Hook 錯誤處理
```typescript
const { insertPerson, error, clearError } = useInsertPerson();

if (error) {
  return (
    <div className="error">
      <p>{error}</p>
      <button onClick={clearError}>清除錯誤</button>
    </div>
  );
}
```

## 配置

### API 基礎 URL
在 `src/services/config.ts` 中配置：

```typescript
export const config = {
  api: {
    baseUrl: 'https://your-api-domain.com',
    timeout: 15000,
  },
};
```

### 輪詢配置
```typescript
// 自定義輪詢參數
const status = await peopleService.pollUntilComplete(
  requestId,
  30,    // 最大嘗試次數
  2000   // 輪詢間隔 (毫秒)
);
```

## 最佳實踐

### 1. 使用等待方法
```typescript
// ✅ 推薦：使用等待方法
const result = await peopleService.insertPersonAndWait(person);

// ❌ 不推薦：手動處理輪詢
const response = await peopleService.insertPerson(person);
const status = await peopleService.pollUntilComplete(response.requestId);
const result = await peopleService.getPeopleResult(response.requestId);
```

### 2. 錯誤處理
```typescript
// ✅ 推薦：完整的錯誤處理
try {
  const result = await peopleService.insertPersonAndWait(person);
  console.log('成功:', result);
} catch (error) {
  console.error('失敗:', error.message);
  // 顯示用戶友好的錯誤訊息
}
```

### 3. 資源清理
```typescript
// ✅ 推薦：在組件卸載時清理
useEffect(() => {
  return () => {
    peopleService.cleanup();
  };
}, []);
```

### 4. 載入狀態
```typescript
// ✅ 推薦：顯示載入狀態
const { loading, data } = useGetAllPeople();

if (loading) {
  return <div>載入中...</div>;
}

return <div>{data.map(person => <PersonCard key={person.name} person={person} />)}</div>;
```

## 示例頁面

訪問 `/tymultiverse/people-management` 查看完整的示例實現。

## 故障排除

### 常見問題

1. **API 連接失敗**
   - 檢查 `config.ts` 中的 `baseUrl` 配置
   - 確認網路連接和 CORS 設置

2. **認證失敗**
   - 檢查 token 是否正確設置
   - 確認 API 端點的認證要求

3. **輪詢超時**
   - 增加 `maxAttempts` 參數
   - 檢查後端處理時間

4. **TypeScript 錯誤**
   - 確認所有必要的類型定義
   - 檢查 import 路徑

### 調試技巧

```typescript
// 啟用詳細日誌
const originalLog = console.log;
console.log = (...args) => {
  if (args[0]?.includes?.('peopleService')) {
    originalLog(...args);
  }
};
```

## 更新日誌

- **v1.0.0**: 初始版本，支援基本的 CRUD 操作
- **v1.1.0**: 新增 React Hooks 支援
- **v1.2.0**: 新增批量操作和傷害計算
- **v1.3.0**: 改進錯誤處理和載入狀態
