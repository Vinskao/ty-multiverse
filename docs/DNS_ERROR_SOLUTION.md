# DNS 錯誤解決方案

## 🚨 問題診斷

您遇到的錯誤：
```
DELETE 發送失敗: Exception: DNS error: http://localhost:8082/tymg/people/delete-all
```

### 根本原因

**Google Apps Script 在雲端環境運行，無法訪問您的本地 `localhost:8082`**。

- ✅ 端點配置正確
- ✅ 安全配置正確 (已放行)
- ✅ Gateway 正在運行
- ❌ **DNS 解析失敗** - `localhost` 只在本地有效

## ✅ 解決方案

### 步驟 1: 獲取您的本地 IP 地址

```bash
# macOS
ifconfig | grep inet | grep -v inet6 | grep -v 127.0.0.1 | awk '{print $2}' | head -1

# Windows (命令提示字元)
ipconfig

# Windows (PowerShell)
Get-NetIPAddress | Where-Object {$_.AddressFamily -eq "IPv4" -and $_.IPAddress -notlike "127.*"} | Select-Object IPAddress

# Linux
hostname -I | awk '{print $1}'
```

**示例輸出**: `192.168.1.100` 或 `172.20.10.5`

### 步驟 2: 配置防火牆

確保您的防火牆允許端口 8082 的入站連接：

#### macOS
1. 系統偏好設定 > 安全性與隱私 > 防火牆
2. 點擊「防火牆選項」
3. 確保未阻止入站連接

#### Windows
1. Windows Defender 防火牆 > 進階設定
2. 入站規則 > 新規則
3. 端口 > TCP > 特定端口: 8082
4. 允許連接

### 步驟 3: 更新 Google Apps Script 配置

```javascript
// 在您的 Google Apps Script 中，將：
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";

// 替換為您的 IP 地址：
const PEOPLE_DELETE_URL = "http://192.168.1.100:8082/tymg/people/delete-all";  // 您的 IP
const PEOPLE_POST_URL = "http://192.168.1.100:8082/tymg/people/update";       // 您的 IP
```

### 步驟 4: 測試連接

```bash
# 替換為您的 IP 地址
curl -X POST http://YOUR_IP:8082/tymg/people/delete-all -H "Content-Type: application/json"

# 應該返回:
# {"success":true,"code":202,"message":"角色刪除請求已提交",...}
```

## 🔧 替代方案

### 方案 A: 使用環境變數

```javascript
// 在腳本屬性中設置
PropertiesService.getScriptProperties().setProperty('GATEWAY_URL', 'http://192.168.1.100:8082/tymg');

// 在代碼中使用
const GATEWAY_URL = PropertiesService.getScriptProperties().getProperty('GATEWAY_URL');
const PEOPLE_DELETE_URL = `${GATEWAY_URL}/people/delete-all`;
```

### 方案 B: 使用生產環境 URL

如果您有生產環境的 Gateway：

```javascript
const PEOPLE_DELETE_URL = "https://your-production-domain.com/tymg/people/delete-all";
const PEOPLE_POST_URL = "https://your-production-domain.com/tymg/people/update";
```

## 📋 完整的修改代碼

```javascript
// 修改前
const PEOPLE_DELETE_URL = "http://localhost:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://localhost:8082/tymg/people/update";

// 修改後 - 替換為您的實際 IP
const PEOPLE_DELETE_URL = "http://192.168.1.100:8082/tymg/people/delete-all";
const PEOPLE_POST_URL = "http://192.168.1.100:8082/tymg/people/update";
```

## 🎯 驗證步驟

1. **檢查 IP 地址**：
   ```bash
   curl http://YOUR_IP:8082/tymg/health
   # 應該返回健康狀態
   ```

2. **測試端點**：
   ```bash
   curl -X POST http://YOUR_IP:8082/tymg/people/delete-all -H "Content-Type: application/json"
   # 應該返回 HTTP 202
   ```

3. **更新 Google Apps Script**：
   - 修改 URL 中的 `localhost` 為您的 IP 地址
   - 重新運行腳本

## 🚨 重要提醒

- **安全性**：確保您的本地網絡安全，只在需要時開放端口
- **動態 IP**：如果您的 IP 地址會變動，請使用 DDNS 或固定 IP
- **生產環境**：建議在生產環境部署時使用域名而不是 IP 地址

現在您的 Google Apps Script 應該能夠成功訪問 API 了！🎉
