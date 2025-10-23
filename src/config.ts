/**
 * API URLs 配置
 * Backend: http://localhost:8080/tymb (直接連後端 - 認證)
 * Gateway: http://localhost:8082/tymg (API 調用)
 */

// 開發環境
const isDevelopment = import.meta.env.DEV;

// 環境變數配置
export const BACKEND_URL = import.meta.env.PUBLIC_TYMB_URL || 'http://localhost:8080/tymb';
export const GATEWAY_URL = import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg';
export const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:8000';
export const SSO_URL = import.meta.env.PUBLIC_SSO_URL || 'https://peoplesystem.tatdvsonorth.com/sso';
export const CLIENT_ID = import.meta.env.PUBLIC_CLIENT_ID || 'peoplesystem';
export const REALM = import.meta.env.PUBLIC_REALM || 'PeopleSystem';

// 保持向後兼容
export const TYMB_URL = API_BASE_URL;

// 環境信息
export const ENVIRONMENT = {
  isDevelopment,
  isProduction: import.meta.env.PROD,
  backendUrl: BACKEND_URL,
  gatewayUrl: GATEWAY_URL,
  apiBaseUrl: API_BASE_URL
}; 