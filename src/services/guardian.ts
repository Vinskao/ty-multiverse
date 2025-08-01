import { storageService } from './storageService';
import { config } from './config';

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
    return '/guardian/admin';
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
    return '/guardian/user';
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
    return '/guardian/visitor';
  }

  protected getRequiredRole(): string | null {
    return null; // 公開端點，無需驗證
  }

  // 公開方法
  public async getVisitorInfo(): Promise<any> {
    return this.call();
  }
}

// Guardian 服務主類別
export class GuardianService {
  private adminAPI: AdminAPI;
  private userAPI: UserAPI;
  private visitorAPI: VisitorAPI;

  constructor() {
    this.adminAPI = new AdminAPI();
    this.userAPI = new UserAPI();
    this.visitorAPI = new VisitorAPI();
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

  // 批量測試所有端點
  public async testAllEndpoints(): Promise<{
    admin: any;
    user: any;
    visitor: any;
  }> {
    const results = {
      admin: null,
      user: null,
      visitor: null
    };

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
}

// 創建單例實例
export const guardianService = new GuardianService();

// 導出類型
export type { BaseAPI };
