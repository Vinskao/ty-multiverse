// 錯誤處理服務 - 統一的錯誤處理和分類
import { safeJsonStringify } from '../../common/utils';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  retryable: boolean;
  code?: string;
  details?: any;
  timestamp: number;
  context?: string;
}

export interface ErrorLog {
  error: ErrorInfo;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 1000;
  private errorCallbacks: Map<ErrorType, ((error: ErrorInfo) => void)[]> = new Map();

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // 設置全局錯誤處理
  private setupGlobalErrorHandling(): void {
    // 捕獲未處理的 Promise 錯誤
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'Unhandled Promise Rejection');
    });

    // 捕獲全局錯誤
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'Global Error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  // 處理錯誤
  handleError(
    error: Error | string | any,
    context?: string,
    additionalInfo?: any
  ): ErrorInfo {
    const errorInfo = this.classifyError(error, context, additionalInfo);
    
    // 記錄錯誤
    this.logError(errorInfo, error);
    
    // 觸發錯誤回調
    this.triggerErrorCallbacks(errorInfo);
    
    // 顯示用戶友好的錯誤信息
    this.showUserError(errorInfo);
    
    return errorInfo;
  }

  // 分類錯誤
  private classifyError(
    error: Error | string | any,
    context?: string,
    additionalInfo?: any
  ): ErrorInfo {
    // 安全地提取錯誤消息，確保始終是字符串
    let errorMessage: string;
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error';
    } else if (error && typeof error === 'object') {
      // 如果 error.message 是對象，嘗試序列化
      if (error.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error.message === 'object') {
          errorMessage = safeJsonStringify(error.message, String(error.message));
        } else {
          errorMessage = String(error.message);
        }
      } else if (error.toString && typeof error.toString === 'function' && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        errorMessage = safeJsonStringify(error, 'Unknown error');
      }
    } else {
      errorMessage = String(error) || 'Unknown error';
    }
    
    const errorName = error?.name || (error instanceof Error ? error.name : 'UnknownError');
    
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    let userMessage = '發生未知錯誤，請稍後再試';

    // 網絡錯誤
    if (this.isNetworkError(error, errorMessage)) {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
      userMessage = '網絡連接失敗，請檢查網絡連接後重試';
    }
    // 認證錯誤
    else if (this.isAuthenticationError(error, errorMessage)) {
      type = ErrorType.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      retryable = false;
      userMessage = '登錄已過期，請重新登錄';
    }
    // 授權錯誤
    else if (this.isAuthorizationError(error, errorMessage)) {
      type = ErrorType.AUTHORIZATION;
      severity = ErrorSeverity.HIGH;
      retryable = false;
      userMessage = '沒有權限執行此操作';
    }
    // 驗證錯誤
    else if (this.isValidationError(error, errorMessage)) {
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
      retryable = false;
      userMessage = '輸入數據格式不正確，請檢查後重試';
    }
    // 服務器錯誤
    else if (this.isServerError(error, errorMessage)) {
      type = ErrorType.SERVER;
      severity = ErrorSeverity.HIGH;
      retryable = true;
      userMessage = '服務器暫時無法處理請求，請稍後重試';
    }
    // 超時錯誤
    else if (this.isTimeoutError(error, errorMessage)) {
      type = ErrorType.TIMEOUT;
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
      userMessage = '請求超時，請稍後重試';
    }
    // 速率限制錯誤
    else if (this.isRateLimitError(error, errorMessage)) {
      type = ErrorType.RATE_LIMIT;
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
      userMessage = '請求過於頻繁，請稍後再試';
    }

    return {
      type,
      severity,
      message: errorMessage,
      userMessage,
      retryable,
      code: error.code || error.status || errorName,
      details: additionalInfo,
      timestamp: Date.now(),
      context
    };
  }

  // 判斷是否為網絡錯誤
  private isNetworkError(error: any, message: string): boolean {
    const networkKeywords = [
      'network', 'connection', 'fetch', 'econnreset', 'enetunreach',
      'enotfound', 'econnrefused', 'net::err_connection_refused',
      'net::err_connection_timed_out', 'net::err_network_changed'
    ];
    
    return networkKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為認證錯誤
  private isAuthenticationError(error: any, message: string): boolean {
    const authKeywords = ['unauthorized', '401', 'token', 'authentication', 'login'];
    return authKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為授權錯誤
  private isAuthorizationError(error: any, message: string): boolean {
    const authKeywords = ['forbidden', '403', 'permission', 'authorization'];
    return authKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為驗證錯誤
  private isValidationError(error: any, message: string): boolean {
    const validationKeywords = ['validation', 'invalid', '400', 'bad request'];
    return validationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為服務器錯誤
  private isServerError(error: any, message: string): boolean {
    const serverKeywords = ['500', '502', '503', '504', 'internal server error'];
    return serverKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為超時錯誤
  private isTimeoutError(error: any, message: string): boolean {
    const timeoutKeywords = ['timeout', 'timed out', '408'];
    return timeoutKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 判斷是否為速率限制錯誤
  private isRateLimitError(error: any, message: string): boolean {
    const rateLimitKeywords = ['rate limit', '429', 'too many requests'];
    return rateLimitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  // 記錄錯誤
  private logError(errorInfo: ErrorInfo, originalError: any): void {
    const errorLog: ErrorLog = {
      error: errorInfo,
      stack: originalError.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId()
    };

    this.errorLogs.push(errorLog);
    
    // 限制日誌數量
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogs);
    }

    // 輸出到控制台
    console.error('🚨 錯誤處理:', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      retryable: errorInfo.retryable,
      context: errorInfo.context,
      timestamp: new Date(errorInfo.timestamp).toISOString()
    });
  }

  // 獲取當前用戶ID
  private getCurrentUserId(): string | undefined {
    // 從 localStorage 或其他地方獲取用戶ID
    return localStorage.getItem('userId') || undefined;
  }

  // 觸發錯誤回調
  private triggerErrorCallbacks(errorInfo: ErrorInfo): void {
    const callbacks = this.errorCallbacks.get(errorInfo.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (callbackError) {
        console.error('錯誤回調執行失敗:', callbackError);
      }
    });
  }

  // 顯示用戶友好的錯誤信息
  private showUserError(errorInfo: ErrorInfo): void {
    // 根據嚴重程度決定是否顯示通知
    if (errorInfo.severity === ErrorSeverity.CRITICAL || 
        errorInfo.severity === ErrorSeverity.HIGH) {
      this.showNotification(errorInfo.userMessage, 'error');
    }
  }

  // 顯示通知
  private showNotification(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `error-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // 添加樣式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4757' : type === 'warning' ? '#ffa502' : '#2ed573'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    // 添加動畫樣式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // 添加到頁面
    document.body.appendChild(notification);

    // 關閉按鈕事件
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.remove();
      });
    }

    // 自動關閉
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // 註冊錯誤回調
  onError(type: ErrorType, callback: (error: ErrorInfo) => void): void {
    if (!this.errorCallbacks.has(type)) {
      this.errorCallbacks.set(type, []);
    }
    this.errorCallbacks.get(type)!.push(callback);
  }

  // 移除錯誤回調
  offError(type: ErrorType, callback: (error: ErrorInfo) => void): void {
    const callbacks = this.errorCallbacks.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 獲取錯誤日誌
  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  // 清除錯誤日誌
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  // 導出錯誤日誌
  exportErrorLogs(): string {
    return safeJsonStringify(this.errorLogs, '[]');
  }

  // 獲取錯誤統計
  getErrorStats(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {} as any;
    
    Object.values(ErrorType).forEach(type => {
      stats[type] = this.errorLogs.filter(log => log.error.type === type).length;
    });
    
    return stats;
  }
}

export default ErrorHandler;
