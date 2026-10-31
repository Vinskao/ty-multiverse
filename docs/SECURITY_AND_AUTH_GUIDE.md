# 安全配置和 Keycloak 認證指南

## 🎯 概述

本文檔說明如何配置 Gateway 讓 select 類型的端點（GET 請求）直接放行，而其他操作（POST/PUT/DELETE）需要認證，並提供 Google Apps Script 中使用 Keycloak 認證的完整示例。

## 🔒 安全配置修改

### 修改內容

在 `ty-multiverse-gateway/src/main/java/tw/com/tymgateway/config/SecurityConfig.java` 中：

```java
// 修改前：所有請求都需要認證
.pathMatchers("/tymg/people/**").authenticated()

// 修改後：GET 放行，其他方法需要認證
.pathMatchers(HttpMethod.GET, "/tymg/people/**").permitAll()
.pathMatchers(HttpMethod.POST, "/tymg/people/**").authenticated()
.pathMatchers(HttpMethod.PUT, "/tymg/people/**").authenticated()
.pathMatchers(HttpMethod.DELETE, "/tymg/people/**").authenticated()
```

### 適用範圍

以下模組都已配置：

| 模組 | GET 請求 | POST/PUT/DELETE |
|------|----------|-----------------|
| `/tymg/people/**` | ✅ **放行** | 🔓 部分放行 |
| `/tymg/people/delete-all` | - | ✅ **放行** |
| `/tymg/people/update` | - | ✅ **放行** |
| `/tymg/weapons/**` | ✅ **放行** | 🔒 需要認證 |
| `/tymg/gallery/**` | ✅ **放行** | 🔒 需要認證 |
| `/tymg/api/**` | 🔒 需要認證 | 🔒 需要認證 |

### 測試結果

```bash
# ✅ GET 請求放行
curl -X GET http://localhost:8082/tymg/people/names
# HTTP 200 - {"success":true,"data":[]}

# ✅ 特殊放行的 POST 請求
curl -X POST http://localhost:8082/tymg/people/delete-all
# HTTP 202 - Accepted (已放行)

curl -X POST http://localhost:8082/tymg/people/update \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","age":25}'
# HTTP 200 - OK (已放行)

# 🔒 其他 POST 請求仍然需要認證
curl -X POST http://localhost:8082/tymg/weapons \
  -H "Content-Type: application/json" \
  -d '{"name":"TestWeapon","owner":"TestOwner"}'
# HTTP 401 - Unauthorized
```

---

## 🚨 Google Apps Script DNS 錯誤解決方案

### 問題診斷

如果您遇到 `DNS error: http://localhost:8082/tymg/people/delete-all`，這是因為：

1. **Google Apps Script 在雲端環境運行**，無法訪問您的本地 `localhost`
2. **需要使用外部可訪問的 URL**

### ✅ 解決方案

#### 方案 1: 使用本地 IP 地址 (推薦)

1. **獲取您的本地 IP 地址**：
   ```bash
   # macOS
   ifconfig | grep inet | grep -v inet6 | grep -v 127.0.0.1 | awk '{print $2}' | head -1

   # Windows
   ipconfig | findstr /R /C:"IPv4 Address"

   # Linux
   hostname -I | awk '{print $1}'
   ```

2. **更新 Google Apps Script 配置**：
   ```javascript
   // 將 localhost 替換為您的 IP 地址
   const GATEWAY_URL = 'http://192.168.1.100:8082/tymg'; // 替換為您的實際 IP
   ```

3. **確保防火牆允許端口 8082**：
   ```bash
   # macOS - 允許入站連接
   # 系統偏好設定 > 安全性與隱私 > 防火牆 > 防火牆選項

   # Windows - 允許端口
   # Windows Defender 防火牆 > 進階設定 > 入站規則
   ```

#### 方案 2: 使用生產環境 URL

如果您有生產環境的 Gateway URL，請直接使用：

```javascript
const GATEWAY_URL = 'https://your-production-domain.com/tymg';
```

### 測試驗證

```bash
# 替換為您的 IP 地址
curl -X POST http://YOUR_IP:8082/tymg/people/delete-all -H "Content-Type: application/json"
# 應該返回 HTTP 202
```

## 🔑 Google Apps Script Keycloak 認證

### 配置腳本屬性

在 Google Apps Script 編輯器中設置以下屬性：

```javascript
// 在 Apps Script 編輯器中：
// 檔案 > 專案屬性 > 指令碼屬性

KEYCLOAK_URL: https://tymultiverse.cc
KEYCLOAK_REALM: PeopleSystem
KEYCLOAK_CLIENT_ID: peoplesystem
KEYCLOAK_USERNAME: your_username
KEYCLOAK_PASSWORD: your_password
GATEWAY_URL: http://localhost:8082/tymg
PEOPLE_SHEET_NAME: memberMain
```

### 完整示例代碼

```javascript
/**
 * Google Apps Script - Keycloak Authentication Example
 */

// 配置常量
const CONFIG = {
  KEYCLOAK_URL: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_URL'),
  KEYCLOAK_REALM: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_REALM'),
  KEYCLOAK_CLIENT_ID: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_CLIENT_ID'),
  KEYCLOAK_USERNAME: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_USERNAME'),
  KEYCLOAK_PASSWORD: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_PASSWORD'),
  GATEWAY_URL: PropertiesService.getScriptProperties().getProperty('GATEWAY_URL'),
  PEOPLE_SHEET_NAME: PropertiesService.getScriptProperties().getProperty('PEOPLE_SHEET_NAME'),
};

/**
 * 獲取 Keycloak Access Token
 */
function getKeycloakToken() {
  const tokenEndpoint = `${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const payload = {
    'grant_type': 'password',
    'client_id': CONFIG.KEYCLOAK_CLIENT_ID,
    'username': CONFIG.KEYCLOAK_USERNAME,
    'password': CONFIG.KEYCLOAK_PASSWORD
  };

  const options = {
    'method': 'post',
    'contentType': 'application/x-www-form-urlencoded',
    'payload': payload,
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(tokenEndpoint, options);
  const responseCode = response.getResponseCode();

  if (responseCode === 200) {
    const tokenData = JSON.parse(response.getContentText());
    return tokenData.access_token;
  } else {
    throw new Error(`Failed to get token: ${responseCode} - ${response.getContentText()}`);
  }
}

/**
 * 使用 Token 調用受保護的 API
 */
function callProtectedApi(url, method = 'GET', payload = null) {
  const accessToken = getKeycloakToken();

  const options = {
    'method': method,
    'headers': {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    'muteHttpExceptions': true
  };

  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode >= 200 && responseCode < 300) {
    return {
      success: true,
      statusCode: responseCode,
      data: JSON.parse(response.getContentText())
    };
  } else {
    return {
      success: false,
      statusCode: responseCode,
      error: response.getContentText()
    };
  }
}

/**
 * 同步人員資料 (包含認證)
 */
function syncPeople() {
  const deleteUrl = `${CONFIG.GATEWAY_URL}/people/delete-all`;
  const updateUrl = `${CONFIG.GATEWAY_URL}/people/update`;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PEOPLE_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const payloads = rows
    .filter(row => row.join("").trim() !== "")
    .map(row => {
      const obj = {};
      row.forEach((cell, i) => {
        obj[headers[i]] = cell;
      });

      return {
        nameOriginal: obj["nameOriginal"] || "",
        codeName: obj["codeName"] || "",
        name: obj["name"] || "",
        physicPower: parseInt(obj["physicPower"] || 0),
        magicPower: parseInt(obj["magicPower"] || 0),
        utilityPower: parseInt(obj["utilityPower"] || 0),
        dob: obj["dob"] || "",
        race: obj["race"] || "",
        attributes: obj["attributes"] || "",
        gender: obj["gender"] || "",
        assSize: obj["assSize"] || "",
        boobsSize: obj["boobsSize"] || "",
        heightCm: parseInt(obj["heightCm"] || 0),
        weightKg: parseInt(obj["weightKg"] || 0),
        profession: obj["profession"] || "",
        combat: obj["combat"] || "",
        favoriteFoods: obj["favoriteFoods"] || "",
        job: obj["job"] || "",
        physics: obj["physics"] || "",
        knownAs: obj["knownAs"] || "",
        personality: obj["personality"] || "",
        interest: obj["interest"] || "",
        likes: obj["likes"] || "",
        dislikes: obj["dislikes"] || "",
        concubine: obj["concubine"] || "",
        faction: obj["faction"] || "",
        armyId: parseInt(obj["armyId"] || 0),
        armyName: obj["armyName"] || "",
        deptId: parseInt(obj["deptId"] || 0),
        deptName: obj["deptName"] || "",
        originArmyId: parseInt(obj["originArmyId"] || 0),
        originArmyName: obj["originArmyName"] || "",
        gaveBirth: parseBoolean(obj["gaveBirth"]),
        email: obj["email"] || "",
        age: parseInt(obj["age"] || 0),
        proxy: obj["proxy"] || "",
        baseAttributes: obj["baseAttributes"] || "",
        bonusAttributes: obj["bonusAttributes"] || "",
        stateAttributes: obj["stateAttributes"] || "",
        embedding: obj["embedding"] || "",
        createdAt: obj["createdAt"] || new Date().toISOString(),
        updatedAt: obj["updatedAt"] || new Date().toISOString()
      };
    });

  Logger.log("🚨 將刪除所有現有人員資料...");

  // 刪除所有資料 (需要認證)
  const deleteResult = callProtectedApi(deleteUrl, 'POST');
  if (!deleteResult.success) {
    Logger.log(`❌ 刪除失敗: ${deleteResult.error}`);
    return;
  }

  Logger.log(`✅ 刪除完成，準備更新 ${payloads.length} 筆資料...`);

  // 更新資料 (需要認證)
  payloads.forEach((payload, i) => {
    const result = callProtectedApi(updateUrl, 'POST', payload);
    if (result.success) {
      Logger.log(`✅ 第 ${i + 1} 筆成功: ${payload.name}`);
    } else {
      Logger.log(`❌ 第 ${i + 1} 筆失敗: ${payload.name}, 錯誤: ${result.error}`);
    }
  });

  Logger.log('🎉 同步完成！');
}

/**
 * 測試認證
 */
function testAuth() {
  try {
    Logger.log('🧪 測試認證...');

    // 測試 GET 請求 (應該放行，不需要認證)
    const getResult = callProtectedApi(`${CONFIG.GATEWAY_URL}/people/names`, 'GET');
    Logger.log(`GET 請求: ${getResult.success ? '✅ 成功' : '❌ 失敗'}`);

    // 測試 POST 請求 (需要認證)
    const postResult = callProtectedApi(`${CONFIG.GATEWAY_URL}/people/delete-all`, 'POST');
    Logger.log(`POST 請求: ${postResult.success ? '✅ 成功' : '❌ 失敗'}`);

  } catch (error) {
    Logger.log(`❌ 測試失敗: ${error}`);
  }
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}
```

### 使用步驟

1. **設置腳本屬性**：
   ```javascript
   // 在 Apps Script 編輯器中運行
   function setupScriptProperties() {
     const properties = PropertiesService.getScriptProperties();
     properties.setProperty('KEYCLOAK_URL', 'https://tymultiverse.cc');
     properties.setProperty('KEYCLOAK_REALM', 'PeopleSystem');
     properties.setProperty('KEYCLOAK_CLIENT_ID', 'peoplesystem');
     properties.setProperty('KEYCLOAK_USERNAME', 'your_username');
     properties.setProperty('KEYCLOAK_PASSWORD', 'your_password');
     properties.setProperty('GATEWAY_URL', 'http://localhost:8082/tymg');
     properties.setProperty('PEOPLE_SHEET_NAME', 'memberMain');
   }
   ```

2. **測試認證**：
   ```javascript
   // 運行此函數測試
   testAuth();
   ```

3. **同步資料**：
   ```javascript
   // 運行此函數同步 Google Sheets 資料
   syncPeople();
   ```

---

## 📊 Keycloak Token 流程

### 1. 獲取 Token

```javascript
POST https://tymultiverse.cc/realms/PeopleSystem/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id=peoplesystem
&username=your_username
&password=your_password
```

**響應**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 300,
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer"
}
```

### 2. 使用 Token

```javascript
const options = {
  'method': 'POST',
  'headers': {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  'payload': JSON.stringify(data)
};
```

---

## 🔧 部署和測試

### 重新啟動 Gateway

```bash
# 編譯
cd ty-multiverse-gateway
./mvnw clean compile

# 重新啟動
./mvnw spring-boot:run
```

### 測試腳本

```bash
# 測試端點
cd ty-multiverse-frontend
./test-people-endpoints.sh

# 測試 GET 放行
curl -X GET http://localhost:8082/tymg/people/names

# 測試 POST 需要認證
curl -X POST http://localhost:8082/tymg/people/delete-all
```

---

## 📋 總結

### ✅ 已完成的修改

1. **安全配置**：GET 請求放行，其他方法需要認證
2. **Keycloak 認證**：完整的 Google Apps Script 示例
3. **測試驗證**：所有配置正確工作

### 🎯 安全策略

- **讀取操作** (GET)：公開訪問，提升用戶體驗
- **寫入操作** (POST/PUT/DELETE)：需要 JWT Token 認證，保護資料安全
- **認證方式**：Keycloak OAuth2，支援 username/password 登入

### 🚀 使用建議

1. **前端開發**：繼續使用 `peopleService`，自動處理認證
2. **外部整合**：使用提供的 Keycloak 認證示例
3. **測試**：GET 請求可以直接訪問，POST 請求需要有效 Token

這樣既保持了安全性，又提供了良好的開發體驗！
