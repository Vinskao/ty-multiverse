/**
 * Google Apps Script - Keycloak Authentication Example
 *
 * 這個腳本演示如何在 Google Apps Script 中使用 Keycloak 認證來訪問受保護的 API
 *
 * 配置說明：
 * 1. 在 Google Apps Script 中設置以下腳本屬性：
 *    - KEYCLOAK_URL: Keycloak 服務器 URL (例如: https://peoplesystem.tatdvsonorth.com)
 *    - KEYCLOAK_REALM: Realm 名稱 (例如: PeopleSystem)
 *    - KEYCLOAK_CLIENT_ID: Client ID (例如: peoplesystem)
 *    - KEYCLOAK_USERNAME: 用戶名
 *    - KEYCLOAK_PASSWORD: 密碼
 */

// Declare Google Apps Script globals
declare const PropertiesService: any;
declare const Logger: any;
declare const UrlFetchApp: any;
declare const SpreadsheetApp: any;

interface ApiConfig {
    KEYCLOAK_URL: string;
    KEYCLOAK_REALM: string;
    KEYCLOAK_CLIENT_ID: string;
    KEYCLOAK_USERNAME: string;
    KEYCLOAK_PASSWORD: string;
    GATEWAY_URL: string;
    PEOPLE_DELETE_URL: string | null;
    PEOPLE_UPDATE_URL: string | null;
    PEOPLE_SHEET_NAME?: string;
}

// 配置常量
const CONFIG: ApiConfig = {
  KEYCLOAK_URL: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_URL') || 'https://peoplesystem.tatdvsonorth.com',
  KEYCLOAK_REALM: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_REALM') || 'PeopleSystem',
  KEYCLOAK_CLIENT_ID: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_CLIENT_ID') || 'peoplesystem',
  KEYCLOAK_USERNAME: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_USERNAME'),
  KEYCLOAK_PASSWORD: PropertiesService.getScriptProperties().getProperty('KEYCLOAK_PASSWORD'),

  // API 端點 - ⚠️ 如果使用 localhost，請替換為您的本地 IP 地址
  // 例如: 'http://192.168.1.100:8082/tymg'
  // 獲取 IP 地址方法: macOS - ifconfig | grep inet | grep -v inet6 | grep -v 127.0.0.1 | awk '{print $2}' | head -1
  GATEWAY_URL: PropertiesService.getScriptProperties().getProperty('GATEWAY_URL') || 'http://localhost:8082/tymg',
  PEOPLE_DELETE_URL: null, // 會在初始化時設置
  PEOPLE_UPDATE_URL: null, // 會在初始化時設置
};

// 初始化 URL
function initializeUrls() {
  CONFIG.PEOPLE_DELETE_URL = `${CONFIG.GATEWAY_URL}/people/delete-all`;
  CONFIG.PEOPLE_UPDATE_URL = `${CONFIG.GATEWAY_URL}/people/update`;
}

/**
 * 獲取 Keycloak Access Token
 *
 * @returns {string} JWT Access Token
 */
function getKeycloakToken(): string {
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

  try {
    Logger.log('🔐 嘗試獲取 Keycloak Token...');
    Logger.log(`📍 Token Endpoint: ${tokenEndpoint}`);
    Logger.log(`👤 Username: ${CONFIG.KEYCLOAK_USERNAME}`);
    Logger.log(`🏢 Client ID: ${CONFIG.KEYCLOAK_CLIENT_ID}`);

    const response = UrlFetchApp.fetch(tokenEndpoint, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`📊 Token Response Code: ${responseCode}`);

    if (responseCode === 200) {
      const tokenData = JSON.parse(responseText);
      const accessToken = tokenData.access_token;

      Logger.log('✅ Token 獲取成功');
      Logger.log(`⏰ Token 過期時間: ${tokenData.expires_in} 秒`);

      return accessToken;
    } else {
      Logger.log(`❌ Token 獲取失敗: ${responseText}`);
      throw new Error(`Failed to get token: ${responseCode} - ${responseText}`);
    }
  } catch (error) {
    Logger.log(`💥 Token 獲取異常: ${error}`);
    throw error;
  }
}

interface ApiResponse {
    success: boolean;
    statusCode?: number;
    data?: any;
    error?: string;
}

/**
 * 使用 Token 調用受保護的 API
 *
 * @param {string} url - API URL
 * @param {string} method - HTTP 方法
 * @param {Object} payload - 請求負載 (可選)
 * @returns {Object} API 響應
 */
function callProtectedApi(url: string, method: string = 'GET', payload: any = null): ApiResponse {
  const accessToken = getKeycloakToken();

  const options: any = {
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

  try {
    Logger.log(`🚀 調用 API: ${method} ${url}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`📊 API Response Code: ${responseCode}`);

    if (responseCode >= 200 && responseCode < 300) {
      Logger.log('✅ API 調用成功');
      return {
        success: true,
        statusCode: responseCode,
        data: JSON.parse(responseText)
      };
    } else {
      Logger.log(`❌ API 調用失敗: ${responseText}`);
      return {
        success: false,
        statusCode: responseCode,
        error: responseText
      };
    }
  } catch (error: any) {
    Logger.log(`💥 API 調用異常: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 刪除所有人員資料
 *
 * @returns {Object} API 響應
 */
function deleteAllPeople(): ApiResponse {
  initializeUrls();
  Logger.log('🗑️ 開始刪除所有人員資料...');
  if (!CONFIG.PEOPLE_DELETE_URL) throw new Error("PEOPLE_DELETE_URL not set");
  return callProtectedApi(CONFIG.PEOPLE_DELETE_URL, 'POST');
}

/**
 * 更新人員資料
 *
 * @param {Object} personData - 人員資料
 * @returns {Object} API 響應
 */
function updatePerson(personData: any): ApiResponse {
  initializeUrls();
  Logger.log(`📝 更新人員資料: ${personData.name || 'Unknown'}`);
  if (!CONFIG.PEOPLE_UPDATE_URL) throw new Error("PEOPLE_UPDATE_URL not set");
  return callProtectedApi(CONFIG.PEOPLE_UPDATE_URL, 'POST', personData);
}

/**
 * 工具函數：解析布林值
 */
function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}

/**
 * 同步人員資料 (修改版本的 syncPeople)
 */
function syncPeopleWithAuth() {
  initializeUrls();

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PEOPLE_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const payloads = rows
    .filter((row: any[]) => row.join("").trim() !== "")
    .map((row: any[]) => {
      const obj: any = {};
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

  // 刪除所有資料
  const deleteResult = deleteAllPeople();
  if (!deleteResult.success) {
    Logger.log(`❌ 刪除失敗: ${deleteResult.error || deleteResult.statusCode}`);
    return;
  }

  Logger.log(`✅ 刪除完成，準備更新 ${payloads.length} 筆資料...`);

  // 更新資料
  payloads.forEach((payload: any, i: number) => {
    const result = updatePerson(payload);
    if (result.success) {
      Logger.log(`✅ 第 ${i + 1} 筆成功: ${payload.name}`);
    } else {
      Logger.log(`❌ 第 ${i + 1} 筆失敗: ${payload.name}, 錯誤: ${result.error || result.statusCode}`);
    }
  });

  Logger.log('🎉 同步完成！');
}

/**
 * 測試 Keycloak 認證
 */
function testKeycloakAuth() {
  try {
    Logger.log('🧪 測試 Keycloak 認證...');

    const token = getKeycloakToken();
    Logger.log('✅ Token 獲取成功');
    Logger.log(`🔑 Token 長度: ${token.length} 字符`);

    // 測試 GET 請求 (應該不需要認證)
    initializeUrls();
    Logger.log('📖 測試 GET 請求 (應該放行)...');
    const getTest = callProtectedApi(`${CONFIG.GATEWAY_URL}/people/names`, 'GET');
    Logger.log(`GET 結果: ${getTest.success ? '✅ 成功' : '❌ 失敗'} - ${getTest.statusCode || getTest.error}`);

    Logger.log('🎯 認證測試完成');

  } catch (error) {
    Logger.log(`❌ 認證測試失敗: ${error}`);
  }
}

/**
 * 設置腳本屬性 (需要在 Apps Script 編輯器中運行)
 */
function setupScriptProperties() {
  const properties = PropertiesService.getScriptProperties();

  // 設置 Keycloak 配置
  properties.setProperty('KEYCLOAK_URL', 'https://peoplesystem.tatdvsonorth.com');
  properties.setProperty('KEYCLOAK_REALM', 'PeopleSystem');
  properties.setProperty('KEYCLOAK_CLIENT_ID', 'peoplesystem');
  properties.setProperty('KEYCLOAK_USERNAME', 'your_username');
  properties.setProperty('KEYCLOAK_PASSWORD', 'your_password');

  // 設置 API 配置 - ⚠️ 重要：如果使用 localhost，請替換為您的本地 IP 地址
  // 例如: 'http://192.168.1.100:8082/tymg'
  // Google Apps Script 無法訪問 localhost，需要使用外部可訪問的 IP
  properties.setProperty('GATEWAY_URL', 'http://localhost:8082/tymg'); // 替換為您的 IP
  properties.setProperty('PEOPLE_SHEET_NAME', 'memberMain');

  Logger.log('✅ 腳本屬性設置完成');
  Logger.log('⚠️ 請記得修改以下配置:');
  Logger.log('   - KEYCLOAK_USERNAME 和 KEYCLOAK_PASSWORD 為您的實際憑證');
  Logger.log('   - GATEWAY_URL 為您的本地 IP 地址 (如果使用 localhost)');
  Logger.log('   - 確保防火牆允許端口 8082 的入站連接');
}

/**
 * 主函數 - 替換原來的 syncPeople
 */
function syncPeople() {
  return syncPeopleWithAuth();
}
