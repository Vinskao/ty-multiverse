/**
 * 統一的 API 基礎 URL
 * 開發環境：指向後端 http://localhost:8080/tymb
 * 生產環境：使用相對路徑 /tymb
 */
export const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8080/tymb'
  : (import.meta.env.PUBLIC_TYMB_URL || '/tymb'); 