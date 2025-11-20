import { storageService } from '../services/core/storageService';
import { verifyToken, startTokenVerification, stopTokenVerification, logout } from '../services/api/auth';

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
    // 延遲驗證，確保 DOM 已加載
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.validateAccess();
      });
    } else {
      this.validateAccess();
    }
  }

  private getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 優先從 URL 參數讀取（登入後的重定向會帶這些參數）
    this.username = urlParams.get('username');
    this.token = urlParams.get('token');
    // 支援兩種參數名：refreshToken 和 refresh_token
    this.refreshToken = urlParams.get('refreshToken') || urlParams.get('refresh_token');
    // 獲取 id_token（用於登出時清除服務器端 session）
    const idToken = urlParams.get('id_token');
    
    // 如果 URL 中沒有參數，嘗試從 localStorage 讀取（處理頁面刷新或導航的情況）
    if (!this.username) {
      this.username = localStorage.getItem('username');
    }
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('refreshToken');
    }
    
    // 保存 id_token 到 localStorage（如果 URL 中有）
    if (idToken) {
      localStorage.setItem('id_token', idToken);
    } else {
      // 如果 URL 中沒有，嘗試從 localStorage 讀取
      const storedIdToken = localStorage.getItem('id_token');
      if (storedIdToken) {
        // id_token 已存在於 localStorage
      }
    }
    
    // 判斷是否登入：有 username 和 token 就認為已登入
    this.isLoggedIn = !!(this.username && this.token);
    
    // 將 token 儲存到 localStorage 中，供其他組件使用（如果 URL 中有新值，更新 localStorage）
    if (urlParams.get('token')) {
      localStorage.setItem('token', urlParams.get('token')!);
    }
    if (urlParams.get('refreshToken') || urlParams.get('refresh_token')) {
      localStorage.setItem('refreshToken', urlParams.get('refreshToken') || urlParams.get('refresh_token')!);
    }
    if (urlParams.get('username')) {
      localStorage.setItem('username', urlParams.get('username')!);
    }
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
    // 使用事件委派，因為按鈕可能會動態更新
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;
      
      if (link && (link.href === '#' || link.href.endsWith('#')) && 
          (link.textContent?.trim() === 'Logout' || link.textContent?.trim() === '登出')) {
        e.preventDefault();
        await this.handleLogout();
      }
    });
  }

  private async handleLogout() {
    try {
      // 停止 token 驗證（如果正在運行）
      stopTokenVerification();
      
      // 優先從 localStorage 獲取 refreshToken 和 id_token（更可靠）
      let refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
      let idToken = localStorage.getItem('id_token');
      
      // 如果 localStorage 沒有，嘗試從 URL 參數獲取
      if (!refreshToken) {
        const urlParams = new URLSearchParams(window.location.search);
        refreshToken = urlParams.get('refreshToken') || urlParams.get('refresh_token');
      }
      if (!idToken) {
        const urlParams = new URLSearchParams(window.location.search);
        idToken = urlParams.get('id_token');
      }
      
      // 如果有 refreshToken，調用後端登出 API
      if (refreshToken) {
        try {
          // 調用 logout API，傳遞 refreshToken 和 idToken
          await logout.logout(refreshToken, idToken || undefined);
          
          // 等待一小段時間確保 Keycloak 處理完成
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          // 忽略錯誤，繼續執行登出流程
        }
      }
      
      // 清除所有 localStorage（除了主題）
      const currentTheme = localStorage.getItem('theme');
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem('theme', currentTheme);
      }
      
      // 清除所有 sessionStorage
      sessionStorage.clear();
      
      // 清除所有 cookies
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
      
      // 清除登入狀態
      this.isLoggedIn = false;
      this.token = null;
      this.refreshToken = null;
      this.username = null;
      this.hasUserAccess = false;
      this.isAdmin = false;
      
      // 更新導航鏈接
      this.updateNavLinks();
      
      // 清除 URL 參數並重定向到首頁
      const cleanUrl = new URL(window.location.origin + '/tymultiverse/');
      window.history.replaceState({}, '', cleanUrl);
      
      // 延遲一小段時間後重定向，確保所有清理操作完成
      setTimeout(() => {
        window.location.href = '/tymultiverse/';
      }, 100);
      
    } catch (error) {
      console.error('❌ 登出過程中發生錯誤:', error);
      
      // 即使出錯，也盡可能清除數據
      try {
        const currentTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (currentTheme) {
          localStorage.setItem('theme', currentTheme);
        }
        sessionStorage.clear();
        
        // 清除登入狀態
        this.isLoggedIn = false;
        this.token = null;
        this.refreshToken = null;
        this.username = null;
        this.hasUserAccess = false;
        this.isAdmin = false;
        
        // 更新導航鏈接
        this.updateNavLinks();
        
        // 重定向到首頁
        window.location.href = '/tymultiverse/';
      } catch (cleanupError) {
        console.error('❌ 清理數據時發生錯誤:', cleanupError);
        // 最後的手段：強制重定向
        window.location.href = '/tymultiverse/';
      }
    }
  }

  /**
   * 解析 JWT Token 並檢查是否有 manage-users 角色
   * @param token JWT Token 字符串
   * @returns 是否包含 manage-users 角色
   */
  private checkManageUsersRoleFromToken(token: string): boolean {
    try {
      // JWT Token 格式: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT token format');
        return false;
      }

      // 解碼 payload (第二部分)
      const payload = parts[1];
      
      // Base64URL 解碼
      // 將 Base64URL 轉換為 Base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      
      // 解碼為 JSON
      const decodedPayload = JSON.parse(atob(padded));

      // 檢查 realm_access.roles 中是否有 manage-users
      if (decodedPayload.realm_access?.roles) {
        const realmRoles = decodedPayload.realm_access.roles;
        if (Array.isArray(realmRoles) && realmRoles.includes('manage-users')) {
          return true;
        }
      }

      // 檢查 resource_access 中是否有 manage-users
      if (decodedPayload.resource_access) {
        // 遍歷所有 resource_access 的客戶端
        for (const clientName in decodedPayload.resource_access) {
          const clientAccess = decodedPayload.resource_access[clientName];
          if (clientAccess?.roles && Array.isArray(clientAccess.roles)) {
            if (clientAccess.roles.includes('manage-users')) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('❌ 解析 JWT Token 失敗:', error);
      return false;
    }
  }

  private async validateAdminAccess() {
    try {
      if (this.isLoggedIn && this.token) {
        // 首先從 Token 中檢查是否有 manage-users 角色
        const hasManageUsersRole = this.checkManageUsersRoleFromToken(this.token);
        
        if (hasManageUsersRole) {
          this.isAdmin = true;
          this.updateNavLinks();
          return; // 如果從 Token 中確認有角色，就不需要調用 API 了
        }

        // 如果 Token 中沒有找到，仍然調用後端 API 進行驗證（作為備份）
        const gatewayUrl = import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg';
        const apiUrl = `${gatewayUrl}/auth/admin`;
        
        // 使用 fetch 通過 Gateway 調用管理員端點來驗證權限
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          this.isAdmin = true;
          // 權限驗證成功後，更新導航鏈接以顯示 admin 專用鏈接
          this.updateNavLinks();
        } else if (response.status === 403) {
          // 用戶已登入但沒有管理員權限
          this.isAdmin = false;
        } else if (response.status === 401) {
          // Token 無效
          this.isAdmin = false;
        } else if (response.status === 404) {
          // 端點不存在或路由問題，但 Token 解析已經檢查過了
          // 如果 Token 解析已經確認有 manage-users，保持 isAdmin = true
          // 否則設置為 false
          if (!hasManageUsersRole) {
            this.isAdmin = false;
          }
        } else {
          // 其他錯誤
          // 如果 Token 解析已經確認有 manage-users，保持 isAdmin = true
          if (!hasManageUsersRole) {
            this.isAdmin = false;
          }
        }
      }
    } catch (error) {
      console.error('❌ Admin validation failed with exception:', error);
      // 如果 Token 解析已經確認有 manage-users，保持 isAdmin = true
      if (this.token) {
        const hasManageUsersRole = this.checkManageUsersRoleFromToken(this.token);
        this.isAdmin = hasManageUsersRole;
      } else {
        this.isAdmin = false;
      }
    }
  }

  private async validateUserAccess() {
    try {
      if (this.isLoggedIn && this.token) {
        const gatewayUrl = import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg';
        const apiUrl = `${gatewayUrl}/auth/user`;
        
        // 使用 fetch 通過 Gateway 調用用戶端點來驗證權限
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          this.hasUserAccess = true;
        } else if (response.status === 401) {
          // Token 無效
          this.hasUserAccess = false;
        } else if (response.status === 404) {
          // 端點不存在或路由問題
          this.hasUserAccess = false;
        } else {
          // 其他錯誤
          this.hasUserAccess = false;
        }
      }
    } catch (error) {
      console.error('❌ User validation failed with exception:', error);
      this.hasUserAccess = false;
    }
  }

  private async validateAccess() {
    // 三層權限驗證系統
    await this.validateAccessWithFallback();
    
    // 更新導航鏈接（包括 admin 權限驗證後的更新）
    this.updateNavLinks();
    
    // 啟動 token 驗證
    this.startTokenVerification();
  }

  private async validateAccessWithFallback() {
    // 首先確保基本登入狀態：如果有 username 和 token，就認為已登入
    if (this.username && this.token) {
      this.isLoggedIn = true;
      // 默認給予基本用戶權限，後續驗證可能會提升權限
      this.hasUserAccess = true;
      
      // 立即從 Token 中檢查是否有 manage-users 角色
      const hasManageUsersRole = this.checkManageUsersRoleFromToken(this.token);
      if (hasManageUsersRole) {
        this.isAdmin = true;
        this.hasUserAccess = true; // 管理員也有用戶權限
      }
    }

    try {
      await this.validateAdminAccess();
      if (this.isAdmin) {
        this.hasUserAccess = true; // 管理員也有用戶權限
        return;
      }
    } catch (error) {
      // 即使 API 調用失敗，如果 Token 解析確認有 manage-users，保持 isAdmin = true
      if (this.token) {
        const hasManageUsersRole = this.checkManageUsersRoleFromToken(this.token);
        if (hasManageUsersRole) {
          this.isAdmin = true;
          this.hasUserAccess = true;
        }
      }
    }

    // 第二層：嘗試用戶權限
    try {
      await this.validateUserAccess();
      if (this.hasUserAccess) {
        return;
      }
    } catch (error) {
      // 忽略錯誤
    }

    // 第三層：基本權限檢查
    // 如果驗證失敗（404, 401 等），但仍有 token，保留基本權限
    if (this.isLoggedIn && this.token) {
      // 即使權限驗證失敗（404），只要有 token 就保留基本權限
      // 404 可能是因為端點不存在或 Gateway 路由問題，但不代表 token 無效
      this.hasUserAccess = true;
      this.isAdmin = false;
    } else {
      this.hasUserAccess = false;
      this.isAdmin = false;
      // 清除登入狀態
      this.isLoggedIn = false;
      this.token = null;
      this.refreshToken = null;
      this.username = null;
    }
  }

  private startTokenVerification() {
    if (this.isLoggedIn && this.token) {
      startTokenVerification(this.token, this.refreshToken || '',
        // token 刷新時的回調
        (newToken, newRefreshToken) => {
          // 更新 localStorage
          if (newToken) {
            localStorage.setItem('token', newToken);
          }
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
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
          // 清除登入狀態
          this.isLoggedIn = false;
          this.token = null;
          this.refreshToken = null;
          this.username = null;
          this.hasUserAccess = false;
          this.isAdmin = false;
          
          // 清除 localStorage 中的 token
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('username');
          
          // 清除保存的頁面路徑，防止重定向循環
          localStorage.removeItem('lastVisitedPath');
          sessionStorage.removeItem('lastVisitedPath_redirecting');
          
          // 清除 URL 參數中的 token（如果存在）
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          url.searchParams.delete('refreshToken');
          url.searchParams.delete('refresh_token');
          url.searchParams.delete('username');
          window.history.replaceState({}, '', url);
          
          // 更新導航鏈接，顯示登入按鈕
          this.updateNavLinks();
          
          // 禁用重定向，防止循環
          // window.location.href = '/tymultiverse/';
        }
      );
    }
  }

  private updateNavLinks() {
    // 更新登入/登出按鈕
    // Nav.astro 中 Login/Logout 是同一個鏈接，根據 isLoggedIn 狀態顯示不同文本
    const allLinks = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
    
    // 查找 Login/Logout 鏈接：可能是 /tymultiverse/login 或 href="#"
    const loginLogoutLink = allLinks.find(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';
      return href.includes('/tymultiverse/login') || 
             href === '#' || 
             href.endsWith('#') ||
             text === 'Login' || 
             text === 'Logout' ||
             text === '登入' ||
             text === '登出';
    }) as HTMLAnchorElement;
    
    const workLink = document.querySelector('a[href^="/tymultiverse/work"]') as HTMLAnchorElement;
    const aboutLink = document.querySelector('a[href^="/tymultiverse/about"]') as HTMLAnchorElement;
    const controlLink = document.querySelector('a[href^="/tymultiverse/control"]') as HTMLElement;
    const wildlandLink = document.querySelector('a[href*="/tymultiverse/wildland"]') as HTMLAnchorElement;
    const palaisLink = document.querySelector('a[href*="/tymultiverse/palais"]') as HTMLAnchorElement;

    // 在登入頁面上始終顯示登入鏈接，不隱藏
    const isOnLoginPage = window.location.pathname === '/tymultiverse/login';

    if (loginLogoutLink) {
      if (this.isLoggedIn && !isOnLoginPage) {
        // 已登入：顯示為 Logout，href 設為 #
        loginLogoutLink.href = '#';
        loginLogoutLink.textContent = 'Logout';
        loginLogoutLink.style.display = 'block';
        loginLogoutLink.style.visibility = 'visible';
        loginLogoutLink.style.opacity = '1';
      } else {
        // 未登入：顯示為 Login，href 設為登入頁面
        const currentPath = window.location.pathname + window.location.search;
        loginLogoutLink.href = `/tymultiverse/login?redirect=${encodeURIComponent(currentPath)}`;
        loginLogoutLink.textContent = 'Login';
        loginLogoutLink.style.display = 'block';
        loginLogoutLink.style.visibility = 'visible';
        loginLogoutLink.style.opacity = '1';
      }
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
    // 查找所有可能的 Wildland 鏈接（包括 admin-only class 的）
    const wildlandLinks = Array.from(document.querySelectorAll('a')).filter(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';
      return href.includes('/tymultiverse/wildland') || text === 'Wildland';
    }) as HTMLAnchorElement[];
    
    wildlandLinks.forEach(wildlandLink => {
      const shouldShowWildland = this.isLoggedIn && this.isAdmin;
      wildlandLink.style.display = shouldShowWildland ? 'block' : 'none';
      
      // 同時隱藏父元素（li）如果存在
      const parentLi = wildlandLink.closest('li');
      if (parentLi) {
        (parentLi as HTMLElement).style.display = shouldShowWildland ? 'block' : 'none';
      }
      
      if (shouldShowWildland && this.token) {
        wildlandLink.href = `/tymultiverse/wildland/?username=${this.username}&token=${this.token}&refresh_token=${this.refreshToken || ''}`;
      }
    });
    
    // Palais 需要管理員權限
    // 查找所有可能的 Palais 鏈接（包括 admin-only class 的）
    const palaisLinks = Array.from(document.querySelectorAll('a')).filter(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';
      return href.includes('/tymultiverse/palais') || text === 'Palais';
    }) as HTMLAnchorElement[];
    
    palaisLinks.forEach(palaisLink => {
      const shouldShowPalais = this.isLoggedIn && this.isAdmin;
      palaisLink.style.display = shouldShowPalais ? 'block' : 'none';
      
      // 同時隱藏父元素（li）如果存在
      const parentLi = palaisLink.closest('li');
      if (parentLi) {
        (parentLi as HTMLElement).style.display = shouldShowPalais ? 'block' : 'none';
      }
      
      if (shouldShowPalais && this.token) {
        palaisLink.href = `/tymultiverse/palais/?username=${this.username}&token=${this.token}&refresh_token=${this.refreshToken || ''}`;
      }
    });
  }
}

// 初始化 Nav 控制器
export function initNav() {
  new NavController();
} 