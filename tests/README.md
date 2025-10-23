# Auth Service Tests

這個目錄包含 Auth 服務的單元測試和集成測試。

## 測試結構

```
tests/
├── setup.ts              # 測試環境設置
├── README.md            # 測試文檔
└── services/
    ├── auth.test.ts     # AuthService 單元測試
    └── authApi.test.ts  # Auth API 集成測試
```

## 測試覆蓋範圍

### AuthService 單元測試 (`auth.test.ts`)

- **Token 管理**：Token 獲取、驗證和存儲
- **API 端點測試**：Admin、User、Visitor 端點的響應測試
- **認證流程測試**：Token 驗證、刷新和登出流程
- **錯誤處理**：網絡錯誤、HTTP 錯誤和認證錯誤
- **批量測試**：所有端點的綜合測試

### Auth API 集成測試 (`authApi.test.ts`)

- **API 響應驗證**：檢查 API 響應的結構和數據類型
- **認證流程驗證**：端到端認證流程測試
- **錯誤場景測試**：各種錯誤情況的處理
- **Header 驗證**：Authorization header 的正確設置

## 運行測試

### 基本測試命令

```bash
# 運行所有測試
npm run test

# 監視模式運行測試
npm run test:watch

# UI 模式運行測試（可視化界面）
npm run test:ui
```

### 運行特定測試

```bash
# 運行 AuthService 單元測試
npx vitest run tests/services/auth.test.ts

# 運行 Auth API 集成測試
npx vitest run tests/services/authApi.test.ts

# 運行並監視特定測試文件
npx vitest tests/services/auth.test.ts
```

## 測試環境

- **測試框架**：Vitest
- **測試工具**：React Testing Library
- **DOM 環境**：jsdom
- **Mock 工具**：Vitest mocks

## Mock 設置

測試環境中會自動 mock 以下依賴：

- `storageService`：模擬 localStorage 操作
- `config`：模擬配置對象
- `fetch`：模擬 HTTP 請求

## 測試說明

所有測試邏輯位於 `tests/` 目錄中，建議使用命令行運行測試：

- **交互式測試**：在開發環境中可以通過 API 調用測試認證功能
- **測試結果**：通過命令行或測試報告查看
- **認證狀態**：通過後端 API 端點 `/auth/health` 檢查

## 測試最佳實踐

1. **隔離測試**：每個測試應該是獨立的，不依賴其他測試的狀態
2. **Mock 外部依賴**：使用 mocks 來隔離外部服務和數據庫
3. **清晰的斷言**：使用描述性的斷言信息
4. **錯誤場景覆蓋**：測試正常流程和異常流程
5. **數據結構驗證**：驗證 API 響應的數據結構

## 故障排除

如果測試失敗：

1. 檢查 mock 設置是否正確
2. 確認測試數據的格式
3. 查看測試環境的配置
4. 檢查依賴的版本兼容性

## 擴展測試

要添加新的測試：

1. 在 `tests/services/` 目錄下創建新的測試文件
2. 遵循現有的命名規範：`{serviceName}.test.ts`
3. 使用 Vitest 和 React Testing Library 的 API
4. 更新此 README 文檔
