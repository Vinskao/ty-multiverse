// 重試服務 - 提供通用的重試機制
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (result: any) => void;
  onFinalFailure?: (error: Error) => void;
}

export interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageResponseTime: number;
  lastError?: Error;
  lastSuccessTime?: number;
}

class RetryService {
  private static instance: RetryService;
  private stats: Map<string, RetryStats> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();

  private constructor() {}

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  // 默認重試配置
  private getDefaultConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'NETWORK_ERROR',
        'TIMEOUT',
        '429',
        '502',
        '503',
        '504'
      ]
    };
  }

  // 執行帶重試的異步操作
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const fullConfig = { ...this.getDefaultConfig(), ...config };
    const requestId = `${operationName}_${Date.now()}_${Math.random()}`;
    const abortController = new AbortController();
    
    this.activeRequests.set(requestId, abortController);
    
    try {
      const result = await this.executeWithRetryInternal(operation, operationName, fullConfig, requestId);
      this.recordSuccess(operationName);
      fullConfig.onSuccess?.(result);
      return result;
    } catch (error) {
      this.recordFailure(operationName, error as Error);
      fullConfig.onFinalFailure?.(error as Error);
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  // 內部重試邏輯
  private async executeWithRetryInternal<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig,
    requestId: string
  ): Promise<T> {
    let lastError: Error;
    let delay = config.baseDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        // 檢查是否被取消
        if (this.activeRequests.get(requestId)?.signal.aborted) {
          throw new Error('Request cancelled');
        }

        const result = await operation();
        this.recordResponseTime(operationName, Date.now() - startTime);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.recordResponseTime(operationName, Date.now() - startTime);
        
        // 檢查是否為可重試錯誤
        if (!this.isRetryableError(error as Error, config.retryableErrors)) {
          throw error;
        }

        // 最後一次嘗試失敗
        if (attempt === config.maxAttempts) {
          throw error;
        }

        // 調用重試回調
        config.onRetry?.(attempt, error as Error);
        
        // 等待後重試
        await this.delay(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError!;
  }

  // 判斷是否為可重試錯誤
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorName.includes(retryableError.toLowerCase()) ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    );
  }

  // 延遲函數
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 記錄成功
  private recordSuccess(operationName: string): void {
    const stats = this.getOrCreateStats(operationName);
    stats.successfulAttempts++;
    stats.lastSuccessTime = Date.now();
    stats.lastError = undefined;
  }

  // 記錄失敗
  private recordFailure(operationName: string, error: Error): void {
    const stats = this.getOrCreateStats(operationName);
    stats.failedAttempts++;
    stats.lastError = error;
  }

  // 記錄響應時間
  private recordResponseTime(operationName: string, responseTime: number): void {
    const stats = this.getOrCreateStats(operationName);
    stats.totalAttempts++;
    
    // 計算平均響應時間
    const totalTime = stats.averageResponseTime * (stats.totalAttempts - 1) + responseTime;
    stats.averageResponseTime = totalTime / stats.totalAttempts;
  }

  // 獲取或創建統計數據
  private getOrCreateStats(operationName: string): RetryStats {
    if (!this.stats.has(operationName)) {
      this.stats.set(operationName, {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        averageResponseTime: 0
      });
    }
    return this.stats.get(operationName)!;
  }

  // 獲取統計數據
  getStats(operationName?: string): RetryStats | Map<string, RetryStats> {
    if (operationName) {
      return this.stats.get(operationName) || this.getOrCreateStats(operationName);
    }
    return this.stats;
  }

  // 清除統計數據
  clearStats(operationName?: string): void {
    if (operationName) {
      this.stats.delete(operationName);
    } else {
      this.stats.clear();
    }
  }

  // 取消所有活動請求
  cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }

  // 取消特定請求
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  // 獲取活動請求數量
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

export default RetryService;
