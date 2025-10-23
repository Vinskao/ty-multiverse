// 配置服務 - 統一管理環境變量
export const config = {
  // API 配置
  api: {
    baseUrl: import.meta.env.PUBLIC_TYMG_URL || import.meta.env.PUBLIC_TYMB_URL || import.meta.env.PUBLIC_API_BASE_URL,
    backendUrl: import.meta.env.PUBLIC_TYMB_URL,
    gatewayUrl: import.meta.env.PUBLIC_TYMG_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },

  // 資源配置
  resources: {
    peopleImageUrl: import.meta.env.PUBLIC_PEOPLE_IMAGE_URL,
  },

  // 路由配置
  routes: {
    login: '/tymultiverse/login',
  }
};

// 獲取當前 URL 參數
export const getUrlParams = () => {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
};

// 更新 URL 參數
export const updateUrlParams = (params: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  
  const currentUrl = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    currentUrl.searchParams.set(key, value);
  });
  window.history.replaceState({}, '', currentUrl.toString());
}; 