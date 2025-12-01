/**
 * 错误相关的类型定义
 */

/**
 * 标准错误响应接口
 */
export interface ErrorResponse {
  code: number;
  message: string;
  detail: string;
  timestamp?: string;
  path?: string;
}

/**
 * API 错误信息接口
 */
export interface ErrorInfo {
  type: string;
  severity: string;
  message: string;
  retryable: boolean;
  userMessage: string;
  timestamp: string;
  context?: string;
}

/**
 * 错误日志接口
 */
export interface ErrorLog {
  timestamp: string;
  error: ErrorInfo;
  stack?: string;
}

