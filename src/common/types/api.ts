/**
 * API 相关的类型定义
 */

/**
 * 后端 API 响应接口
 */
export interface BackendApiResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  timestamp: string;
  data: T;
  requestId?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
  stackTrace?: string;
}

/**
 * API 响应接口
 */
export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  /** Parsed JSON body when possible, otherwise raw text */
  data: T;
  /** Backend API response wrapper (if present) */
  backendResponse?: BackendApiResponse<T>;
}

/**
 * API 请求选项接口
 */
export interface ApiRequestOptions {
  /** Absolute or relative URL of the API endpoint */
  url: string;
  /** HTTP method – default 'GET' */
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Optional request payload – automatically stringified for non-GET verbs */
  body?: any;
  /** Extra headers supplied by the caller */
  headers?: Record<string, string>;
  /** Whether to attach Bearer token – defaults to true */
  auth?: boolean;
  /** Per-request timeout (ms) – falls back to global config */
  timeout?: number;
}

