/**
 * TYMB API 的基礎 URL
 * 透過 Gateway (tymg context) 轉發到後端服務
 * Backend: http://localhost:8080/tymb
 * Gateway: http://localhost:8082/tymg
 */
export const TYMB_URL = import.meta.env.PUBLIC_TYMB_URL || 'http://localhost:8082/tymg'; 