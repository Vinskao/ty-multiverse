/*
 * Generic API Service
 */

import { storageService } from '../core/storageService';
import { config } from '../core/config';

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

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  /** Parsed JSON body when possible, otherwise raw text */
  data: T;
  /** Backend API response wrapper (if present) */
  backendResponse?: BackendApiResponse<T>;
}

// Core implementation – no framework/runtime specifics so it can be reused in workers etc.
async function apiRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    body,
    headers: customHeaders = {},
    auth = true,
    timeout = config.api?.timeout ?? 15_000,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Attach Bearer token if requested and present in storage
  if (auth) {
    const token = storageService.get<string>(storageService.KEYS.TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    let responseData: any;
    let backendResponse: BackendApiResponse<T> | undefined;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await res.json();

      // Check if this is a BackendApiResponse format
      if (responseData && typeof responseData === 'object' &&
          'success' in responseData && 'code' in responseData && 'message' in responseData) {
        backendResponse = responseData as BackendApiResponse<T>;

        // For 202 Accepted (async) responses, keep the full response (includes requestId)
        if (backendResponse.code === 202 && backendResponse.success) {
          // Return the full response for async operations
          responseData = backendResponse as any;
        }
        // For successful responses, extract the actual data
        else if (backendResponse.success && backendResponse.data !== undefined) {
          responseData = backendResponse.data;
        } else {
          // For error responses, throw an error with the backend message
          // 確保 message 是字符串
          const errorMessage = typeof backendResponse.message === 'string' 
            ? backendResponse.message 
            : (backendResponse.error || `Backend error (code: ${backendResponse.code})`);
          throw new ApiError(backendResponse.code, errorMessage);
        }
      }
    } else {
      responseData = await res.text();
    }

    if (!res.ok) {
      // Throw a typed error so callers can handle based on status
      // 確保 responseData 是字符串格式
      let errorMessage: string;
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // 嘗試提取錯誤消息
        if (responseData.message && typeof responseData.message === 'string') {
          errorMessage = responseData.message;
        } else if (responseData.error && typeof responseData.error === 'string') {
          errorMessage = responseData.error;
        } else {
          try {
            errorMessage = JSON.stringify(responseData);
          } catch {
            errorMessage = `HTTP ${res.status} Error`;
          }
        }
      } else {
        errorMessage = `HTTP ${res.status} Error`;
      }
      throw new ApiError(res.status, errorMessage);
    }

    return {
      status: res.status,
      ok: true,
      data: responseData as T,
      backendResponse
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / timeout / abort errors – wrap so callers have uniform interface
    throw new ApiError(0, (err as Error)?.message ?? 'Network error');
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 通用 API 請求方法 - 返回完整響應
 */
async function makeRequest<T = any>(
  baseUrl: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options?: { auth?: boolean; headers?: Record<string, string>; timeout?: number }
): Promise<ApiResponse<T>> {
  const { auth = true, headers = {}, timeout } = options || {};
  
  return apiRequest({
    url: `${baseUrl}${endpoint}`,
    method,
    body,
    auth,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    timeout
  });
}

/**
 * 通用 API 請求方法 - 只返回數據
 */
async function makeRequestData<T = any>(
  baseUrl: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options?: { auth?: boolean; headers?: Record<string, string>; timeout?: number }
): Promise<T> {
  const response = await makeRequest<T>(baseUrl, endpoint, method, body, options);
  return response.data;
}

export const apiService = {
  request: apiRequest,
  makeRequest,
  makeRequestData,
};
