import { storageService } from '../services/storageService';
import { verifyToken, startTokenVerification, stopTokenVerification, logout } from '../services/auth';

// Nav 組件的 JavaScript 邏輯
export class NavController {
  private isLoggedIn: boolean = false;
  private isAdmin: boolean = false;
  private hasUserAccess: boolean = false;
  private username: string | null = null;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.getUrlParams();
    this.setupEventListeners();
    this.validateAccess();
  }

  private getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.username = urlParams.get('username');
    this.token = urlParams.get('token');
    // 支援兩種參數名：refreshToken 和 refresh_token
    this.refreshToken = urlParams.get('refreshToken') || urlParams.get('refresh_token');
    this.isLoggedIn = !!this.username;
  }

  private setupEventListeners() {
    // 移除 lastVisitedPath 以避免回首頁後再次跳轉
    this.setupHomeLinkListeners();
    
    // 監聽登出按鈕點擊
    this.setupLogoutListener();
    
    // 在頁面加載時更新鏈接
    document.addEventListener('DOMContentLoaded', () => {
      this.updateNavLinks();
    });
  }

  private setupHomeLinkListeners() {
    try {
      const STORAGE_KEY = 'lastVisitedPath';
      const selector = 'a[href="/tymultiverse"], a[href="/tymultiverse/"], a[href="/"]';
      document.querySelectorAll(selector).forEach((link) => {
        link.addEventListener('click', () => {
          localStorage.removeItem(STORAGE_KEY);
        });
      });
    } catch (e) {
      console.warn('初始化 Home 連結 click 監聽失敗', e);
    }
  }

  private setupLogoutListener() {
    const logoutLink = document.querySelector('a[href="#"]');
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleLogout();
      });
    }
  }

  private async handleLogout() {
    try {
              // 從 URL 參數中獲取 refreshToken
        const urlParams = new URLSearchParams(window.location.search);
        const refreshToken = urlParams.get('refreshToken') || urlParams.get('refresh_token');
      
      if (!refreshToken) {
        console.error('No refresh token available');
        // 清除除了主題以外的所有數據
        Object.keys(localStorage).forEach(key => {
          if (key !== storageService.KEYS.THEME) {
            localStorage.removeItem(key);
          }
        });
        window.location.href = '/tymultiverse/';
        return;
      }

      // 使用 auth 服務執行登出
      const success = await logout(refreshToken);
      if (success) {
        window.location.href = '/tymultiverse/';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/tymultiverse/';
    }
  }

  private async validateAdminAccess() {
    try {
      if (this.isLoggedIn && this.token) {
        const apiUrl = `${import.meta.env.PUBLIC_TYMB_URL}/guardian/admin`;        
        // 使用 fetch 直接調用管理員端點來驗證權限
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          this.isAdmin = true;
        } else if (response.status === 403) {
          // 用戶已登入但沒有管理員權限
          this.isAdmin = false;
          console.log('❌ User is authenticated but does not have admin role');
        } else if (response.status === 401) {
          // Token 無效
          this.isAdmin = false;
          console.log('❌ Token is invalid for admin access');
        } else {
          // 其他錯誤
          this.isAdmin = false;
          console.log('❌ Admin validation failed with status:', response.status);
        }
      }
    } catch (error) {
      console.log('Admin validation failed:', error);
      this.isAdmin = false;
    }
  }

  private async validateUserAccess() {
    try {
      if (this.isLoggedIn && this.token) {
        const apiUrl = `${import.meta.env.PUBLIC_TYMB_URL}/guardian/user`;
        
        // 使用 fetch 直接調用用戶端點來驗證權限
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        
        if (response.ok) {
          this.hasUserAccess = true;
        } else if (response.status === 401) {
          // Token 無效
          this.hasUserAccess = false;
          console.log('Token is invalid for user access');
        } else {
          // 其他錯誤
          this.hasUserAccess = false;
          console.log('User validation failed with status:', response.status);
        }
      }
    } catch (error) {
      console.log('User validation failed:', error);
      this.hasUserAccess = false;
    }
  }

  private async validateAccess() {
    // 三層權限驗證系統
    await this.validateAccessWithFallback();
    
    this.updateNavLinks();
    this.startTokenVerification();
  }

  private async validateAccessWithFallback() {

    try {
      await this.validateAdminAccess();
      if (this.isAdmin) {
        this.hasUserAccess = true; // 管理員也有用戶權限
        return;
      }
    } catch (error) {
      console.log('❌ 管理員權限驗證失敗:', error);
    }

    // 第二層：嘗試用戶權限
    try {
      await this.validateUserAccess();
      if (this.hasUserAccess) {
        // console.log('✅ 用戶權限驗證成功');
        return;
      }
    } catch (error) {
      console.log('❌ 用戶權限驗證失敗:', error);
    }

    // 第三層：基本權限檢查
    if (this.isLoggedIn && this.token) {
      // console.log('✅ 基本權限檢查通過（有 token）');
      this.hasUserAccess = true;
      this.isAdmin = false;
    } else {
      console.log('❌ 基本權限檢查失敗（無 token）');
      this.hasUserAccess = false;
      this.isAdmin = false;
    }

    console.log('isLoggedIn:', this.isLoggedIn);
    console.log('isAdmin:', this.isAdmin);
    console.log('hasUserAccess:', this.hasUserAccess);
  }

  private startTokenVerification() {
    if (this.isLoggedIn && this.token) {
      startTokenVerification(this.token, this.refreshToken || '',
        // token 刷新時的回調
        (newToken, newRefreshToken) => {
          console.log('Token refreshed');
          // 更新 URL 參數
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('token', newToken);
          if (newRefreshToken) {
            newUrl.searchParams.set('refresh_token', newRefreshToken);
          }
          window.history.replaceState({}, '', newUrl);
        },
        // token 無效時的回調
        () => {
          console.log('Token invalid');
          // 清除登入狀態
          window.location.href = '/tymultiverse/';
        }
      );
    }
  }

  private updateNavLinks() {
    console.log('當前權限狀態:', {
      isLoggedIn: this.isLoggedIn,
      isAdmin: this.isAdmin,
      hasUserAccess: this.hasUserAccess,
      username: this.username
    });
    // 更新登入/登出按鈕
    const loginLink = document.querySelector('a[href^="/tymultiverse/login"]') as HTMLElement;
    const logoutLink = document.querySelector('a[href="#"]') as HTMLElement;
    const workLink = document.querySelector('a[href^="/tymultiverse/work"]') as HTMLAnchorElement;
    const aboutLink = document.querySelector('a[href^="/tymultiverse/about"]') as HTMLAnchorElement;
    const controlLink = document.querySelector('a[href^="/tymultiverse/control"]') as HTMLElement;
    const wildlandLink = document.querySelector('a[href*="/tymultiverse/wildland"]') as HTMLAnchorElement;
    const palaisLink = document.querySelector('a[href*="/tymultiverse/palais"]') as HTMLAnchorElement;

    if (loginLink) {
      loginLink.style.display = this.isLoggedIn ? 'none' : 'block';
    }
    if (logoutLink) {
      logoutLink.style.display = this.isLoggedIn ? 'block' : 'none';
    }
    if (workLink && this.isLoggedIn) {
      workLink.href = `/tymultiverse/work/?username=${this.username}&token=${this.token}`;
    }
    if (aboutLink && this.isLoggedIn) {
      aboutLink.href = `/tymultiverse/about/?username=${this.username}&token=${this.token}`;
    }
    
    // Control 需要用戶登入權限
    if (controlLink) {
      controlLink.style.display = (this.isLoggedIn && this.hasUserAccess) ? 'block' : 'none';
      if (controlLink && this.isLoggedIn && this.hasUserAccess) {
        (controlLink as HTMLAnchorElement).href = `/tymultiverse/control/?username=${this.username}&token=${this.token}`;
      }
    }
    
    // Wildland 需要管理員權限
    if (wildlandLink) {
      const shouldShowWildland = this.isAdmin;
      wildlandLink.style.display = shouldShowWildland ? 'block' : 'none';
      if (wildlandLink.parentElement) {
        (wildlandLink.parentElement as HTMLElement).style.display = shouldShowWildland ? 'block' : 'none';
      }
      if (wildlandLink && this.isLoggedIn && this.isAdmin) {
        wildlandLink.href = `/tymultiverse/wildland/?username=${this.username}&token=${this.token}&refresh_token=${this.refreshToken}`;
      }
    } else {
      // 嘗試其他選擇器
      const allLinks = document.querySelectorAll('a');
    }
    
    // Palais 需要管理員權限
    if (palaisLink) {
      const shouldShowPalais = this.isAdmin;
      palaisLink.style.display = shouldShowPalais ? 'block' : 'none';
      if (palaisLink.parentElement) {
        (palaisLink.parentElement as HTMLElement).style.display = shouldShowPalais ? 'block' : 'none';
      }
      if (palaisLink && this.isLoggedIn && this.isAdmin) {
        palaisLink.href = `/tymultiverse/palais/?username=${this.username}&token=${this.token}&refresh_token=${this.refreshToken}`;
      }
    } else {
      // 嘗試其他選擇器
      const allLinks = document.querySelectorAll('a');
    }
  }
}

// 初始化 Nav 控制器
export function initNav() {
  new NavController();
} 