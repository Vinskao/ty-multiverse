# API 連接性診斷報告

生成時間：2025-11-10

## 🔍 問題摘要

**測試結果：成功率 41.38% (12/29)**

### ❌ 主要問題

所有失敗的端點都返回 **404 "No static resource tymg/xxx"**，這表示：

1. **Gateway 路由配置不完整**
2. **gRPC Controllers 未啟用** (`@ConditionalOnProperty` 條件未滿足)

---

## 📊 詳細分析

### ✅ 成功的端點 (12個)

#### Authentication APIs (5個)
- ✅ `GET /auth/admin` - 401 (預期)
- ✅ `GET /auth/user` - 401 (預期)
- ✅ `GET /auth/visitor` - 200
- ✅ `GET /auth/health` - 200
- ✅ `POST /keycloak/introspect` - 400 (預期)

#### Consumer APIs (部分成功 - 4個)
- ✅ `GET /api/request-status/{requestId}` - 404 (預期：資料不存在)
- ✅ `DELETE /api/request-status/{requestId}` - 404 (預期)
- ✅ `GET /api/async/result/{requestId}` - 404 (預期)
- ✅ `DELETE /api/async/result/{requestId}` - 404 (預期)

#### 其他 (3個)
- ✅ `GET /weapons/{name}` - 404 (預期：資料不存在)
- ✅ `GET /gallery/getById` - 404 (預期：資料不存在)
- ✅ `GET /people/damageWithWeapon` - 404 (預期：資料不存在)

---

### ❌ 失敗的端點 (17個)

#### People Producer APIs (5個失敗)
| 端點 | 狀態 | 錯誤訊息 |
|------|------|----------|
| `POST /people/insert` | 404 | No static resource tymg/people/insert |
| `POST /people/update` | 404 | No static resource tymg/people/update |
| `POST /people/get-all` | 404 | No static resource tymg/people/get-all |
| `POST /people/get-by-name` | 404 | No static resource tymg/people/get-by-name |
| `POST /people/delete-all` | 404 | No static resource tymg/people/delete-all |

#### Weapon APIs (3個失敗)
| 端點 | 狀態 | 錯誤訊息 |
|------|------|----------|
| `GET /weapons` | 404 | No static resource tymg/weapons |
| `GET /weapons/owner/{ownerName}` | 404 | No static resource tymg/weapons/owner/TestOwner |
| `POST /weapons` | 404 | No static resource tymg/weapons |

#### Gallery APIs (5個失敗)
| 端點 | 狀態 | 錯誤訊息 |
|------|------|----------|
| `POST /gallery/save` | 404 | No static resource tymg/gallery/save |
| `POST /gallery/getAll` | 404 | No static resource tymg/gallery/getAll |
| `POST /gallery/update` | 404 | No static resource tymg/gallery/update |
| `POST /gallery/delete` | 404 | No static resource tymg/gallery/delete |

#### Consumer APIs - exists 端點 (2個失敗)
| 端點 | 狀態 | 錯誤訊息 |
|------|------|----------|
| `GET /api/request-status/{requestId}/exists` | 404 | No static resource tymg/api/request-status/.../exists |
| `GET /api/async/result/{requestId}/exists` | 404 | No static resource tymg/api/async/result/.../exists |

#### Monitor & Sync APIs (3個失敗)
| 端點 | 狀態 | 錯誤訊息 |
|------|------|----------|
| `GET /health` | 404 | No static resource tymg/health |
| `GET /health/consumer` | 404 | No static resource tymg/health/consumer |
| `POST /api/sync-characters` | 404 | No static resource tymg/api/sync-characters |

---

## 🔍 根本原因分析

### 1. gRPC Controllers 未啟用

**問題代碼：**
```java
@RestController
@RequestMapping("/people")
@ConditionalOnProperty(name = "grpc.client.enabled", havingValue = "true")  // ⚠️ 關鍵條件
public class PeopleController {
    // ... 端點定義
}
```

**配置檢查：**
- `application.yml`: `grpc.client.enabled: ${GRPC_CLIENT_ENABLED:false}` ❌ **默認為 false**
- `application-local.yml`: `grpc.client.enabled: true` ✅

**結論：**
- 如果 Gateway 沒有正確加載 `local` profile，所有 gRPC Controllers 都不會被註冊
- 這會導致 `/people/*`, `/weapons/*`, `/gallery/*` 等端點不存在

### 2. Spring Cloud Gateway 路由配置缺失

**當前配置：**
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: health-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/health/**
        
        - id: async-request-status-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/api/request-status/**
            - Method=GET,DELETE  # ⚠️ 缺少 GET /{id}/exists 的配置
        
        # ❌ 缺失的路由：
        # - /api/sync-characters
        # - /health/consumer
        # - /api/request-status/{id}/exists
        # - /api/async/result/{id}/exists
```

**缺失的端點：**
1. `/api/sync-characters` - 同步服務
2. `/health/consumer` - Consumer 健康檢查
3. `/api/request-status/{requestId}/exists` - 請求狀態存在性檢查
4. `/api/async/result/{requestId}/exists` - 異步結果存在性檢查

### 3. 架構混合導致複雜性

**當前架構：**
```
Frontend Request
    ↓
Gateway (Port 8082, context-path: /tymg)
    ├─→ Spring Cloud Gateway Routes (簡單 HTTP 轉發)
    │   - /api/request-status/**
    │   - /api/async/result/**
    │   - /health/**
    │   - /auth/**
    │
    └─→ Manual Controllers with gRPC (複雜路由)
        - /people/** → PeopleController → gRPC → Backend
        - /weapons/** → WeaponController → gRPC → Backend
        - /gallery/** → GalleryController → gRPC → Backend
        ↓
Backend (Port 8080, context-path: /tymb)
```

**問題：**
- 兩種路由機制混合使用，增加配置複雜度
- 條件性加載 (`@ConditionalOnProperty`) 導致配置依賴不明確
- 缺乏統一的路由管理

---

## 🛠️ 修復方案

### 方案 A：確保 gRPC Controllers 啟用（推薦）

#### 1. 檢查 Gateway 啟動 Profile

**檢查啟動命令：**
```bash
# 確認是否包含 --spring.profiles.active=local
ps aux | grep ty-multiverse-gateway
```

**如果缺少，重新啟動：**
```bash
cd ty-multiverse-gateway
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

#### 2. 或者修改默認配置

**修改 `application.yml`：**
```yaml
grpc:
  client:
    enabled: ${GRPC_CLIENT_ENABLED:true}  # 改為 true
```

#### 3. 補充缺失的 Spring Cloud Gateway 路由

**添加到 `application.yml`：**
```yaml
spring:
  cloud:
    gateway:
      routes:
        # 補充 exists 端點路由
        - id: request-status-exists-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/api/request-status/*/exists
            - Method=GET
          filters:
            - StripPrefix=0

        - id: async-result-exists-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/api/async/result/*/exists
            - Method=GET
          filters:
            - StripPrefix=0

        # 同步服務路由
        - id: sync-characters-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/api/sync-characters
            - Method=POST
          filters:
            - StripPrefix=0

        # Consumer 健康檢查
        - id: health-consumer-route
          uri: '@BACKEND_SERVICE_URL@'
          predicates:
            - Path=/health/consumer
            - Method=GET
          filters:
            - StripPrefix=0
```

---

### 方案 B：統一使用 Spring Cloud Gateway 路由（長期方案）

**優點：**
- 配置集中管理
- 減少條件性依賴
- 更易維護

**缺點：**
- 需要重構現有 gRPC Controllers
- 工作量較大

**建議：**
- 短期使用方案 A 修復問題
- 長期考慮重構為統一架構

---

## 📝 驗證步驟

### 1. 修復後重啟 Gateway

```bash
cd ty-multiverse-gateway

# 方式 1：使用 Maven
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 方式 2：使用 JAR
java -jar target/ty-multiverse-gateway.jar --spring.profiles.active=local
```

### 2. 驗證 gRPC Controllers 是否加載

```bash
# 檢查 Gateway 日誌
tail -f ty-multiverse-gateway/logs/application.log | grep "ConditionalOnProperty"

# 測試 People 端點
curl -X POST http://localhost:8082/tymg/people/insert \
  -H "Content-Type: application/json" \
  -d '{"name": "TestPerson", "age": 25, "level": 5}'
```

### 3. 重新運行測試腳本

```bash
node test-all-endpoints.js
```

**預期結果：**
- 成功率應該提升到 > 80%
- 所有 People/Weapons/Gallery 端點應返回 200/201/202 或業務邏輯錯誤（非 404）

---

## 🎯 後續優化建議

### 1. 前端 Services 結構優化
- ✅ 已有 `apiService.ts` 作為共用 API caller
- ✅ 已有 `config.ts` 統一配置管理
- ⚠️ 需確認所有 API 調用都通過 `apiService.ts`

### 2. 統一錯誤處理
- 建議在 `apiService.ts` 中增強錯誤處理
- 區分 404 (資源不存在) 和 404 (路由不存在)

### 3. 監控和告警
- 添加 Gateway 路由健康檢查
- 監控 gRPC Controllers 是否正確加載
- 設置 404 錯誤告警閾值

### 4. 文檔更新
- 更新 AGENTS.md 中的測試狀態
- 添加 Gateway Profile 配置說明
- 記錄路由架構決策

---

## 📌 立即行動項目

1. ⚡ **立即執行**：檢查並確保 Gateway 使用 `local` profile 啟動
2. ⚡ **立即執行**：補充缺失的 Spring Cloud Gateway 路由配置
3. ⚡ **立即執行**：重啟 Gateway 並驗證
4. 📝 **短期**：重新運行測試並更新文檔
5. 🔄 **長期**：考慮統一路由架構重構

---

**報告生成者：** AI Assistant  
**測試腳本：** `test-all-endpoints.js`  
**測試報告：** `api-test-report.json`

