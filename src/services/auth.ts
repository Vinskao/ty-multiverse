import { TYMB_URL } from '../config';
import { storageService } from './storageService';

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
export async function verifyToken(token: string, refreshToken: string): Promise<{
  valid: boolean;
  tokenRefreshed: boolean;
  accessToken?: string;
  refreshToken?: string;
}> {
  // console.log('verifyToken - Starting token verification');
  // console.log('verifyToken - Token exists:', !!token);
  // console.log('verifyToken - Refresh Token exists:', !!refreshToken);
  // console.log('verifyToken - TYMB_URL:', TYMB_URL);
  
  // 如果沒有提供 token，嘗試從 storageService 獲取
  if (!token) {
    token = storageService.get(storageService.KEYS.TOKEN);
    // console.log('verifyToken - Retrieved token from storage:', !!token);
  }
  
  // 如果沒有提供 refreshToken，嘗試從 storageService 獲取
  if (!refreshToken) {
    refreshToken = storageService.get(storageService.KEYS.REFRESH_TOKEN);
    // console.log('verifyToken - Retrieved refresh token from storage:', !!refreshToken);
  }
  
  // 如果 token 沒有變化，跳過驗證
  if (token === lastToken) {
    // console.log('verifyToken - Token unchanged, skipping verification');
    return { valid: true, tokenRefreshed: false, accessToken: token, refreshToken: refreshToken };
  }

  // 如果正在驗證或距離上次驗證時間太短，則跳過
  if (isVerifying || Date.now() - lastVerifyTime < VERIFY_COOLDOWN) {
    // console.log('verifyToken - Skipping token verification - too soon or already verifying');
    return { valid: true, tokenRefreshed: false, accessToken: token, refreshToken: refreshToken };
  }

  isVerifying = true;
  lastVerifyTime = Date.now();
  lastToken = token;

  try {
    // 構建 API URL
    const apiUrl = new URL(`${TYMB_URL}/keycloak/introspect`);
    // console.log('verifyToken - API URL:', apiUrl.toString());

    // 構建請求體
    const formData = new FormData();
    formData.append('token', token);
    
    // 如果有 refresh token，添加到請求體中
    if (refreshToken && refreshToken.trim() !== '') {
      formData.append('refreshToken', refreshToken);
    }

    // console.log('verifyToken - Sending request to introspect endpoint');
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
      credentials: 'include',
      mode: 'cors'
    });

    // console.log('verifyToken - Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      // console.log('verifyToken - Token introspection data:', data);

      // 檢查 token 是否有效
      if (data.active) {
        // console.log('verifyToken - Token is active');
        // 如果是新的 token，就更新前端儲存的 token
        if (data.access_token) {
          // console.log('verifyToken - New access token received');
          // 保存新的 token 到 storageService（僅在瀏覽器環境中）
          if (storageService.isBrowser()) {
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
        
        // console.log('verifyToken - Token is valid but not refreshed');
        // 保存當前的 token 到 storageService（僅在瀏覽器環境中）
        if (storageService.isBrowser()) {
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
      } else {
        // console.log('verifyToken - Token is not active');
      }
    } else {
      // console.log('verifyToken - Response not OK');
      try {
        const errorData = await response.json();
        // console.log('verifyToken - Error data:', errorData);
      } catch (e) {
        // console.log('verifyToken - Could not parse error response');
      }
    }
    // console.log('verifyToken - Token validation failed');
    return {
      valid: false,
      tokenRefreshed: false,
      accessToken: null,
      refreshToken: null
    };
  } catch (error) {
    // console.error('verifyToken - Token verification failed:', error);
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
export function startTokenVerification(
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
export function stopTokenVerification(): void {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
  }
}

/**
 * 驗證 refresh token 是否有效
 * @param refreshToken - 要驗證的 refresh token
 * @returns Promise<boolean> - token 是否有效
 */
export async function validateRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${TYMB_URL}/keycloak/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('Token validation failed:', response.status);
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

/**
 * 執行登出操作
 * @param refreshToken - 要註銷的 refresh token
 * @returns Promise<boolean> - 登出是否成功
 */
export async function logout(refreshToken: string): Promise<boolean> {
  try {
    // 保存當前主題設置
    const currentTheme = storageService.get(storageService.KEYS.THEME);

    // 構建登出 URL
    const logoutUrl = new URL(`${TYMB_URL}/keycloak/logout`);
    
    // 構建請求體
    const formData = new FormData();
    formData.append('refreshToken', refreshToken);

    // 發送登出請求
    const response = await fetch(logoutUrl.toString(), {
      method: 'POST',
      body: formData,
      credentials: 'include',
      mode: 'cors'
    });

    if (!response.ok) {
      console.error('Logout failed:', response.status);
      return false;
    }

    // 清除除了主題以外的所有數據
    Object.keys(localStorage).forEach(key => {
      if (key !== storageService.KEYS.THEME) {
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

    // 恢復主題設置
    if (currentTheme) {
      storageService.set(storageService.KEYS.THEME, currentTheme);
    }

    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
}

/**
 * 執行登入操作
 * @param {string} clientId - 客戶端 ID
 * @param {string} realm - 領域名稱
 * @param {string} redirectUri - 重定向 URI
 * @param {string} ssoUrl - SSO 服務器 URL
 */
export function login(clientId: string, realm: string, redirectUri: string, ssoUrl: string): void {
  // 構建授權 URL
  const authorizationUrl = `${ssoUrl}/realms/${realm}/protocol/openid-connect/auth?response_type=code&scope=openid&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  // 重定向到授權頁面
  window.location.href = authorizationUrl;
} 