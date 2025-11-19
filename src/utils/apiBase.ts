/**
 * 統一的 API 基礎 URL
 * 開發環境：使用環境變數 PUBLIC_TYMB_URL 或默認 http://localhost:8080/tymb
 * 生產環境：使用環境變數 PUBLIC_TYMB_URL
 */
export const API_BASE = import.meta.env.PUBLIC_TYMB_URL || 
  (import.meta.env.DEV ? 'http://localhost:8080/tymb' : '/tymb'); 