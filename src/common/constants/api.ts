/**
 * API 相关常量
 */

/**
 * 統一的 API 基礎 URL
 * 開發環境：使用環境變數 PUBLIC_TYMB_URL 或默認 http://localhost:8080/tymb
 * 生產環境：使用環境變數 PUBLIC_TYMB_URL
 */
export const API_BASE = import.meta.env.PUBLIC_TYMB_URL || 
  (import.meta.env.DEV ? 'http://localhost:8080/tymb' : '/tymb');

/**
 * Gateway API 基礎 URL
 */
export const GATEWAY_API_BASE = import.meta.env.PUBLIC_TYMG_URL || 
  (import.meta.env.DEV ? 'http://localhost:8082/tymg' : '/tymg');

/**
 * 默认 API 超时时间（毫秒）
 */
export const DEFAULT_API_TIMEOUT = 15_000;

/**
 * HTTP 状态码常量
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Content-Type 常量
 */
export const CONTENT_TYPE = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
} as const;

