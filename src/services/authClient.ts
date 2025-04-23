import * as authService from './auth';

// 定義全局類型
declare global {
  interface Window {
    auth: typeof authService;
  }
}

// 將 auth 服務掛載到 window 對象上
window.auth = authService;

export default authService; 