# Access Token 日誌輸出位置

## 📍 會 Log 出 Access Token 的位置

### 1. Gateway - KeycloakController.java

**文件**: `ty-multiverse-gateway/src/main/java/tw/com/tymgateway/controller/KeycloakController.java`

#### 位置 1: 第 130 行
```java
log.info("Access Token: {}", accessToken);  // ⚠️ 直接打印完整的 access token
log.info("Refresh Token: {}", refreshToken);
log.info("ID Token: {}", idToken != null ? "存在" : "不存在");  // ✅ ID Token 只顯示是否存在
```

**上下文**: 從 Keycloak 獲取 token 後立即記錄

#### 位置 2: 第 187-188 行
```java
log.info("Token長度: {}", accessToken.length());
log.info("Token前20字符: {}", accessToken.substring(0, Math.min(20, accessToken.length())));
```

**上下文**: 重定向診斷日誌，打印 token 的部分內容

---

### 2. Backend - KeycloakController.java

**文件**: `ty-multiverse-backend/src/main/java/tw/com/tymbackend/core/controller/KeycloakController.java`

#### 位置 1: 第 118 行
```java
log.info("Access Token: {}", accessToken);  // ⚠️ 直接打印完整的 access token
log.info("Refresh Token: {}", refreshToken);
```

**上下文**: 從 Keycloak 獲取 token 後立即記錄

#### 位置 2: 第 176-177 行
```java
log.info("Token長度: {}", accessToken.length());
log.info("Token前20字符: {}", accessToken.substring(0, Math.min(20, accessToken.length())));
```

**上下文**: 重定向診斷日誌，打印 token 的部分內容

---

### 3. Frontend - NavScript.ts

**文件**: `ty-multiverse-frontend/src/scripts/NavScript.ts`

#### 位置: 第 507 行
```typescript
console.log('✅ 新的 access token 已儲存到 localStorage');  // ✅ 只說明存儲了，沒有打印 token 內容
```

**上下文**: Token 刷新後，只記錄存儲操作，不打印 token 內容

---

## 🔍 對比：ID Token 的處理

### Gateway - KeycloakController.java 第 132 行
```java
log.info("ID Token: {}", idToken != null ? "存在" : "不存在");  // ✅ 只顯示是否存在，不打印內容
```

### Backend - KeycloakController.java
**沒有**專門的 ID Token 日誌輸出

---

## ⚠️ 安全考量

### 當前問題

1. **Gateway 和 Backend 直接打印完整的 Access Token**
   - 第 130 行（Gateway）和第 118 行（Backend）會將完整的 access token 輸出到日誌
   - 這可能導致安全風險，如果日誌被洩露，攻擊者可以使用這些 token

2. **ID Token 處理較安全**
   - Gateway 只顯示 ID Token 是否存在，不打印內容
   - 這是較好的做法

### 建議改進

#### 方案 1: 只打印 Token 的部分信息（推薦）
```java
// 改進前
log.info("Access Token: {}", accessToken);

// 改進後
log.info("Access Token: {}...{} (長度: {})", 
    accessToken != null && accessToken.length() > 10 ? accessToken.substring(0, 10) : "null",
    accessToken != null && accessToken.length() > 10 ? accessToken.substring(accessToken.length() - 10) : "",
    accessToken != null ? accessToken.length() : 0);
```

#### 方案 2: 使用環境變量控制詳細日誌
```java
if (log.isDebugEnabled()) {
    log.debug("Access Token: {}", accessToken);  // 只在 DEBUG 級別打印完整 token
} else {
    log.info("Access Token: 已獲取 (長度: {})", accessToken != null ? accessToken.length() : 0);
}
```

#### 方案 3: 完全移除完整 Token 日誌
```java
// 只記錄 token 的元數據
log.info("Access Token: 已獲取");
log.info("Access Token 長度: {}", accessToken != null ? accessToken.length() : 0);
log.info("Refresh Token: 已獲取");
log.info("ID Token: {}", idToken != null ? "存在" : "不存在");
```

---

## 📊 總結

### 當前狀態

| 位置 | Access Token | ID Token | 安全等級 |
|------|-------------|----------|---------|
| Gateway 第 130 行 | ✅ 完整打印 | ✅ 只顯示存在 | ⚠️ 中 |
| Gateway 第 187-188 行 | ✅ 部分打印 | - | ✅ 高 |
| Backend 第 118 行 | ✅ 完整打印 | - | ⚠️ 中 |
| Backend 第 176-177 行 | ✅ 部分打印 | - | ✅ 高 |
| Frontend 第 507 行 | ✅ 只說明存儲 | - | ✅ 高 |

### 建議

1. **立即改進**: 將 Gateway 和 Backend 的完整 token 日誌改為只打印部分信息或長度
2. **保持**: Frontend 的處理方式（只說明操作，不打印內容）
3. **參考**: ID Token 的處理方式（只顯示是否存在）

---

## 🔗 相關文件

- Gateway KeycloakController: `ty-multiverse-gateway/src/main/java/tw/com/tymgateway/controller/KeycloakController.java`
- Backend KeycloakController: `ty-multiverse-backend/src/main/java/tw/com/tymbackend/core/controller/KeycloakController.java`
- Frontend NavScript: `ty-multiverse-frontend/src/scripts/NavScript.ts`

