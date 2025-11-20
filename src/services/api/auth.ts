import { storageService } from '../core/storageService';
import { config } from '../core/config';

// 為了兼容性，添加環境變量訪問
const TYMB_URL = import.meta.env.PUBLIC_TYMB_URL;
const TYMG_URL = import.meta.env.PUBLIC_TYMG_URL;

// 抽象基類 - API 請求基礎類別
abstract class BaseAPI {
  protected baseUrl: string;
  protected timeout: number;

  constructor(baseUrl: string = config.api.baseUrl, timeout: number = config.api.timeout) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  // 抽象方法 - 子類別必須實現
  protected abstract getEndpoint(): string;
  protected abstract getRequiredRole(): string | null;

  // 通用請求方法
  protected async makeRequest(method: string = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${this.getEndpoint()}`;
    const headers: Record<string, string> = {
      ...config.api.headers
    };

    // 獲取 token
    const token = storageService.get(storageService.KEYS.TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${this.getEndpoint()}:`, error);
      throw error;
    }
  }

  // 驗證用戶權限
  protected async validateAccess(): Promise<boolean> {
    const requiredRole = this.getRequiredRole();
    if (!requiredRole) {
      return true; // 公開端點，無需驗證
    }

    try {
      // 這裡可以實現更複雜的權限驗證邏輯
      // 目前簡化為檢查 token 是否存在
      const token = storageService.get(storageService.KEYS.TOKEN);
      return !!token;
    } catch (error) {
      console.error('Access validation failed:', error);
      return false;
    }
  }

  // 公共 API 方法
  public async call(): Promise<any> {
    const hasAccess = await this.validateAccess();
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return this.makeRequest();
  }
}

// 管理員端點 API
export class AdminAPI extends BaseAPI {
  protected getEndpoint(): string {
    return '/tymg/auth/admin';
  }

  protected getRequiredRole(): string {
    return 'manage-users';
  }

  // 管理員專用方法
  public async getAdminInfo(): Promise<any> {
    return this.call();
  }
}

// 用戶端點 API
export class UserAPI extends BaseAPI {
  protected getEndpoint(): string {
    return '/tymg/auth/user';
  }

  protected getRequiredRole(): string | null {
    return null; // 任何有效 token 都可以
  }

  // 用戶專用方法
  public async getUserInfo(): Promise<any> {
    return this.call();
  }
}

// 公開端點 API
export class VisitorAPI extends BaseAPI {
  protected getEndpoint(): string {
    return '/tymg/auth/visitor';
  }

  protected getRequiredRole(): string | null {
    return null; // 公開端點，無需驗證
  }

  // 公開方法
  public async getVisitorInfo(): Promise<any> {
    return this.call();
  }
}

// Auth 服務主類別
export class AuthService {
  private adminAPI: AdminAPI;
  private userAPI: UserAPI;
  private visitorAPI: VisitorAPI;

  constructor() {
    // Auth API 通過 Gateway 調用
    const gatewayUrl = config.api.gatewayUrl || config.api.baseUrl;
    this.adminAPI = new AdminAPI(gatewayUrl);
    this.userAPI = new UserAPI(gatewayUrl);
    this.visitorAPI = new VisitorAPI(gatewayUrl);
  }

  // 測試管理員端點
  public async testAdminEndpoint(): Promise<any> {
    try {
      const result = await this.adminAPI.getAdminInfo();
      return result;
    } catch (error) {
      console.error('Admin endpoint test failed:', error);
      throw error;
    }
  }

  // 測試用戶端點
  public async testUserEndpoint(): Promise<any> {
    try {
      const result = await this.userAPI.getUserInfo();
      return result;
    } catch (error) {
      console.error('User endpoint test failed:', error);
      throw error;
    }
  }

  // 測試公開端點
  public async testVisitorEndpoint(): Promise<any> {
    try {
      const result = await this.visitorAPI.getVisitorInfo();
      return result;
    } catch (error) {
      console.error('Visitor endpoint test failed:', error);
      throw error;
    }
  }

  // 測試完整的認證整合功能
  public async testAuthIntegration(refreshToken?: string): Promise<any> {
    try {
      const gatewayUrl = config.api.gatewayUrl || config.api.baseUrl;
      // gatewayUrl 已經包含 /tymg，不需要重複添加
      const url = `${gatewayUrl}/keycloak/introspect`;
      const headers: Record<string, string> = {
        ...config.api.headers
      };

      // 獲取 token
      const token = storageService.get(storageService.KEYS.TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers
      };

      if (refreshToken) {
        requestOptions.body = `token=${encodeURIComponent(String(token || ''))}&refreshToken=${encodeURIComponent(String(refreshToken))}`;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (token) {
        requestOptions.body = `token=${encodeURIComponent(String(token))}`;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Auth integration test failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Auth integration test failed:', error);
      throw error;
    }
  }

  // 測試登出功能 - 通過 Gateway 調用 Keycloak logout
  public async testLogout(refreshToken: string, idToken?: string): Promise<any> {
    try {
      const gatewayUrl = config.api.gatewayUrl || config.api.baseUrl || TYMG_URL || TYMB_URL;
      
      // 確保 gatewayUrl 格式正確（不包含結尾斜線）
      let baseUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
      
      // 確保 baseUrl 包含 /tymg 前綴（Gateway 的路徑前綴）
      // Gateway 端點是 /tymg/keycloak/logout
      if (!baseUrl.includes('/tymg')) {
        // 如果 baseUrl 是 http://localhost:8082，添加 /tymg
        baseUrl = baseUrl + '/tymg';
      }
      
      // 構建完整的 API URL - Gateway 端點: /tymg/keycloak/logout
      const url = `${baseUrl}/keycloak/logout`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };

      // 構建請求體 - 使用 form-urlencoded 格式
      const formParams = new URLSearchParams();
      formParams.append('refreshToken', refreshToken);
      // 如果有 id_token，也添加到請求中（用於清除服務器端 session）
      if (idToken) {
        formParams.append('idToken', idToken);
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formParams.toString(),
        credentials: 'include',
        mode: 'cors'
      };
      
      const response = await fetch(url, requestOptions);
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Logout test failed: ${response.status} - ${responseText}`);
      }

      return responseText;
    } catch (error) {
      console.error('❌ Logout test failed:', error);
      if (error instanceof Error) {
        console.error('錯誤詳情:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  // 健康檢查
  public async healthCheck(): Promise<any> {
    try {
      const gatewayUrl = config.api.gatewayUrl || config.api.baseUrl;
      const url = `${gatewayUrl}/tymg/actuator/health`;
      const response = await fetch(url, {
        method: 'GET',
        headers: config.api.headers
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // 批量測試所有端點
  public async testAllEndpoints(): Promise<{
    admin: any;
    user: any;
    visitor: any;
    authTest: any;
    healthCheck: any;
  }> {
    const results = {
      admin: null,
      user: null,
      visitor: null,
      authTest: null,
      healthCheck: null
    };

    try {
      results.healthCheck = await this.healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
    }

    try {
      results.visitor = await this.testVisitorEndpoint();
    } catch (error) {
      console.error('Visitor endpoint failed:', error);
    }

    try {
      results.user = await this.testUserEndpoint();
    } catch (error) {
      console.error('User endpoint failed:', error);
    }

    try {
      results.admin = await this.testAdminEndpoint();
    } catch (error) {
      console.error('Admin endpoint failed:', error);
    }

    try {
      const refreshToken = storageService.get(storageService.KEYS.REFRESH_TOKEN) as string;
      results.authTest = await this.testAuthIntegration(refreshToken || undefined);
    } catch (error) {
      console.error('Auth integration test failed:', error);
    }

    return results;
  }

  // 獲取當前用戶的 token
  public getCurrentToken(): string | null {
    return storageService.get(storageService.KEYS.TOKEN);
  }

  // 檢查是否有有效的 token
  public hasValidToken(): boolean {
    const token = this.getCurrentToken();
    return !!token;
  }

  // 執行登出操作
  public async logout(refreshToken?: string, idToken?: string): Promise<boolean> {
    try {
      // 保存當前主題設置
      const currentTheme = localStorage.getItem('theme');

      // Step 1: 如果有 refresh token，先調用 Gateway API 撤銷 token
      if (refreshToken) {
        try {
          await this.testLogout(refreshToken, idToken);
        } catch (e) {
          // 忽略錯誤，繼續執行登出流程
        }
      }

      // Step 2: 清除本地存儲（除了主題）
      Object.keys(localStorage).forEach(key => {
        if (key !== 'theme') {
          localStorage.removeItem(key);
        }
      });

      // 清除所有 sessionStorage
      sessionStorage.clear();

      // 清除所有 cookie
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        // 清除多個路徑的 cookie
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/tymultiverse`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/tymultiverse/`;
      }

      // 確保主題設置被保留
      if (currentTheme) {
        localStorage.setItem('theme', currentTheme);
      }

      // Step 3: 跳轉到 Keycloak 的 end_session_endpoint 清除服務器端 session
      // 這是關鍵步驟：Keycloak 需要瀏覽器級別的跳轉才能清除 session cookie
      const ssoUrl = import.meta.env.PUBLIC_SSO_URL || 'https://peoplesystem.tatdvsonorth.com/sso';
      const realm = import.meta.env.PUBLIC_REALM || 'PeopleSystem';
      
      // 構建登出後要跳回來的網址（前端首頁）
      const postLogoutRedirectUri = encodeURIComponent(window.location.origin + '/tymultiverse/');
      
      // 構建 Keycloak end_session_endpoint URL
      let logoutUrl = `${ssoUrl}/realms/${realm}/protocol/openid-connect/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;

      // 如果有 id_token，加上 id_token_hint 可以避免 Keycloak 詢問確認
      if (idToken) {
        logoutUrl += `&id_token_hint=${encodeURIComponent(idToken)}`;
      }
      
      // 跳轉到 Keycloak 登出頁面（這會清除服務器端 session）
      window.location.href = logoutUrl;

      // 注意：這行代碼不會執行，因為頁面會跳轉
      return true;
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      // 即使出錯，也清除本地數據
      try {
        const currentTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (currentTheme) {
          localStorage.setItem('theme', currentTheme);
        }
        sessionStorage.clear();
      } catch (cleanupError) {
        console.error('清理數據時出錯:', cleanupError);
      }
      
      // 嘗試跳轉到 Keycloak（即使出錯）
      try {
        const ssoUrl = import.meta.env.PUBLIC_SSO_URL || 'https://peoplesystem.tatdvsonorth.com/sso';
        const realm = import.meta.env.PUBLIC_REALM || 'PeopleSystem';
        const postLogoutRedirectUri = encodeURIComponent(window.location.origin + '/tymultiverse/');
        window.location.href = `${ssoUrl}/realms/${realm}/protocol/openid-connect/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;
      } catch (redirectError) {
        console.error('跳轉失敗:', redirectError);
      }
      
      return false;
    }
  }
}

// 驗證狀態追踪
let isVerifying = false;
let lastVerifyTime = 0;
const VERIFY_COOLDOWN = 7000;
let lastToken = null; // 追踪上一次驗證的 token
let verificationInterval = null; // 追踪定期驗證的 interval

/**
 * 驗證 token 是否有效
 * @param {string} token - 訪問令牌
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise<{valid: boolean, tokenRefreshed: boolean, accessToken: string|null, refreshToken: string|null}>}
 */
async function verifyToken(token: string, refreshToken: string): Promise<{
  valid: boolean;
  tokenRefreshed: boolean;
  accessToken?: string;
  refreshToken?: string;
}> {
  // 如果沒有提供 token，嘗試從 storageService 獲取
  if (!token) {
    token = storageService.get(storageService.KEYS.TOKEN);
  }

  // 如果沒有提供 refreshToken，嘗試從 storageService 獲取
  if (!refreshToken) {
    refreshToken = storageService.get(storageService.KEYS.REFRESH_TOKEN);
  }

  // 如果 token 沒有變化，跳過驗證
  if (token === lastToken) {
    return { valid: true, tokenRefreshed: false, accessToken: token, refreshToken: refreshToken };
  }

  // 檢查 token 是否為空
  if (!token || token.trim() === '') {
    console.warn('⚠️ Token 為空，跳過驗證');
    return {
      valid: false,
      tokenRefreshed: false,
      accessToken: null,
      refreshToken: null
    };
  }

  // 如果正在驗證或距離上次驗證時間太短，則跳過
  if (isVerifying || Date.now() - lastVerifyTime < VERIFY_COOLDOWN) {
    return { valid: true, tokenRefreshed: false, accessToken: token, refreshToken: refreshToken };
  }

  isVerifying = true;
  lastVerifyTime = Date.now();
  lastToken = token;

  try {
    // 構建 API URL - 通過 Gateway
    const gatewayUrl = TYMG_URL || config.api.gatewayUrl || config.api.baseUrl || TYMB_URL;
    
    // 確保 gatewayUrl 格式正確（不包含結尾斜線）
    const baseUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
    
    // 構建完整的 API URL
    const apiUrl = `${baseUrl}/keycloak/introspect`;

    // 構建請求體 - 使用 application/x-www-form-urlencoded 格式
    const formParams = new URLSearchParams();
    formParams.append('token', token);

    // 如果有 refresh token，添加到請求體中
    if (refreshToken && refreshToken.trim() !== '') {
      formParams.append('refreshToken', refreshToken);
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
      credentials: 'include',
      mode: 'cors'
    });

    // 處理錯誤響應（400, 401 等）
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token 驗證失敗: HTTP ${response.status} - ${errorText}`);
      
      // 如果是 400 或 401，token 無效
      if (response.status === 400 || response.status === 401) {
        return {
          valid: false,
          tokenRefreshed: false,
          accessToken: null,
          refreshToken: null
        };
      }
      
      // 其他錯誤也視為無效
      return {
        valid: false,
        tokenRefreshed: false,
        accessToken: null,
        refreshToken: null
      };
    }

    if (response.ok) {
      const data = await response.json();

      // 檢查 token 是否有效
      if (data.active) {
        // 如果是新的 token，就更新前端儲存的 token
        if (data.access_token) {
          // 保存新的 token 到 storageService（僅在瀏覽器環境中）
          if (typeof window !== 'undefined') {
            storageService.set(storageService.KEYS.TOKEN, data.access_token);
            if (data.refresh_token) {
              storageService.set(storageService.KEYS.REFRESH_TOKEN, data.refresh_token);
            }
          }
          return {
            valid: true,
            tokenRefreshed: true,
            accessToken: data.access_token,
            refreshToken: data.refresh_token
          };
        }

        // 保存當前的 token 到 storageService（僅在瀏覽器環境中）
        if (typeof window !== 'undefined') {
          storageService.set(storageService.KEYS.TOKEN, token);
          if (refreshToken) {
            storageService.set(storageService.KEYS.REFRESH_TOKEN, refreshToken);
          }
        }
        return {
          valid: true,
          tokenRefreshed: false,
          accessToken: token,
          refreshToken: refreshToken
        };
      }
    }
    return {
      valid: false,
      tokenRefreshed: false,
      accessToken: null,
      refreshToken: null
    };
  } catch (error) {
    return {
      valid: false,
      tokenRefreshed: false,
      accessToken: null,
      refreshToken: null
    };
  } finally {
    isVerifying = false;
  }
}

/**
 * 開始定期驗證 token
 * @param {string} token - 訪問令牌
 * @param {string} refreshToken - 刷新令牌
 * @param {Function} onTokenRefreshed - token 刷新時的回調
 * @param {Function} onTokenInvalid - token 無效時的回調
 */
function startTokenVerification(
  token: string,
  refreshToken: string,
  onTokenRefreshed: (newToken: string, newRefreshToken: string) => void,
  onTokenInvalid: () => void
): void {
  // 清除現有的 interval
  if (verificationInterval) {
    clearInterval(verificationInterval);
  }

  // 立即進行一次驗證
  verifyToken(token, refreshToken).then((result) => {
    if (!result.valid) {
      onTokenInvalid();
      return;
    }

    if (result.tokenRefreshed && result.accessToken && result.refreshToken) {
      onTokenRefreshed(result.accessToken, result.refreshToken);
    }
  });

  // 設置定期驗證（每 5 分鐘）
  verificationInterval = window.setInterval(async () => {
    const result = await verifyToken(token, refreshToken);
    if (!result.valid) {
      onTokenInvalid();
      return;
    }

    if (result.tokenRefreshed && result.accessToken && result.refreshToken) {
      onTokenRefreshed(result.accessToken, result.refreshToken);
    }
  }, 5 * 60 * 1000);
}

/**
 * 停止 token 驗證
 */
function stopTokenVerification(): void {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
  }
}

// 創建單例實例
export const authService = new AuthService();

// 導出認證相關函數以保持向後兼容性
export {
  verifyToken,
  startTokenVerification,
  stopTokenVerification,
  authService as logout
};

// 導出類型
export type { BaseAPI };