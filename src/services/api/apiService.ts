/*
 * Generic API Service
 */

import { storageService } from '../core/storageService';
import { serviceAvailabilityManager } from '../core/serviceAvailabilityManager';
import { config } from '../core/config';
import type { 
  ApiRequestOptions, 
  BackendApiResponse, 
  ApiResponse 
} from '../../common/types';
import { 
  parseResponseText, 
  shouldParseAsJson,
  safeJsonStringify 
} from '../../common/utils';
import { isObject, isString } from '../../common/helpers';
import { CONTENT_TYPE, DEFAULT_API_TIMEOUT } from '../../common/constants';

// Re-export types for backward compatibility
export type { ApiRequestOptions, BackendApiResponse, ApiResponse };

// Core implementation – no framework/runtime specifics so it can be reused in workers etc.
async function apiRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    body,
    headers: customHeaders = {},
    auth = true,
    timeout = config.api?.timeout ?? DEFAULT_API_TIMEOUT,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPE.JSON,
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
      body: method === 'GET' || method === 'HEAD' ? undefined : safeJsonStringify(body, '{}'),
      signal: controller.signal,
    });

    clearTimeout(timer);

    let responseData: any;
    let backendResponse: BackendApiResponse<T> | undefined;
    const contentType = res.headers.get('content-type');
    
    // Read response body once - we'll parse it based on content-type
    const responseText = await res.text();
    
    // Parse response text using common utility (handles JSON/text automatically)
    responseData = parseResponseText(responseText, contentType);

    // Only process as BackendApiResponse if we successfully parsed JSON and it's an object
    if (isObject(responseData) && 
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
        const errorMessage = isString(backendResponse.message)
            ? backendResponse.message 
            : (backendResponse.error || `Backend error (code: ${backendResponse.code})`);
          throw new ApiError(backendResponse.code, errorMessage);
        }
    }

    if (res.status === 503 && options.serviceKey) {
      serviceAvailabilityManager.block(options.serviceKey);
    }

    if (!res.ok) {
      // Throw a typed error so callers can handle based on status
      // 確保 responseData 是字符串格式
      let errorMessage: string;
      if (isString(responseData)) {
        errorMessage = responseData;
      } else if (isObject(responseData)) {
        // 嘗試提取錯誤消息
        if (isString(responseData.message)) {
          errorMessage = responseData.message;
        } else if (isString(responseData.error)) {
          errorMessage = responseData.error;
        } else {
          errorMessage = safeJsonStringify(responseData, `HTTP ${res.status} Error`);
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
  options?: { auth?: boolean; headers?: Record<string, string>; timeout?: number; serviceKey?: string }
): Promise<ApiResponse<T>> {
  const { auth = true, headers = {}, timeout, serviceKey } = options || {};

  return apiRequest({
    url: `${baseUrl}${endpoint}`,
    method,
    body,
    auth,
    headers: {
      'Content-Type': CONTENT_TYPE.JSON,
      ...headers
    },
    timeout,
    serviceKey
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
  options?: { auth?: boolean; headers?: Record<string, string>; timeout?: number; serviceKey?: string }
): Promise<T> {
  const response = await makeRequest<T>(baseUrl, endpoint, method, body, options);
  return response.data;
}

export const apiService = {
  request: apiRequest,
  makeRequest,
  makeRequestData,
};
