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
      console.log('Admin endpoint test result:', result);
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
      console.log('User endpoint test result:', result);
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
      console.log('Visitor endpoint test result:', result);
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
      const url = `${gatewayUrl}/tymg/keycloak/introspect`;
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
        requestOptions.body = `token=${encodeURIComponent(token || '')}&refreshToken=${encodeURIComponent(refreshToken)}`;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (token) {
        requestOptions.body = `token=${encodeURIComponent(token)}`;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Auth integration test failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Auth integration test result:', result);
      return result;
    } catch (error) {
      console.error('Auth integration test failed:', error);
      throw error;
    }
  }

  // 測試登出功能 - 通過 Gateway 調用 Keycloak logout
  public async testLogout(refreshToken: string): Promise<any> {
    try {
      const gatewayUrl = config.api.gatewayUrl || config.api.baseUrl;
      const url = `${gatewayUrl}/tymg/keycloak/logout`;
      const headers: Record<string, string> = {
        ...config.api.headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      // 獲取 token
      const token = storageService.get(storageService.KEYS.TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: `refreshToken=${encodeURIComponent(refreshToken)}`
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Logout test failed: ${response.status}`);
      }

      const result = await response.text(); // Gateway logout 返回字符串
      console.log('Logout test result:', result);
      return result;
    } catch (error) {
      console.error('Logout test failed:', error);
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
      console.log('Auth health check result:', result);
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
  public async logout(refreshToken?: string): Promise<boolean> {
    try {
      // 保存當前主題設置
      const currentTheme = localStorage.getItem('theme');

      // 如果有 refresh token，調用後端登出 API
      if (refreshToken) {
        await this.testLogout(refreshToken);
      }

      // 清除除了主題以外的所有數據
      Object.keys(localStorage).forEach(key => {
        if (key !== 'theme') {
          localStorage.removeItem(key);
        }
      });

      // 清除所有 cookie
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }

      // 確保主題設置被保留（如果原本有的話）
      if (currentTheme) {
        localStorage.setItem('theme', currentTheme);
      }

      return true;
    } catch (error) {
      console.error('Error during logout:', error);
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
    const apiUrl = new URL(`${gatewayUrl}/tymg/keycloak/introspect`);

    // 構建請求體
    const formData = new FormData();
    formData.append('token', token);

    // 如果有 refresh token，添加到請求體中
    if (refreshToken && refreshToken.trim() !== '') {
      formData.append('refreshToken', refreshToken);
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
      credentials: 'include',
      mode: 'cors'
    });

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