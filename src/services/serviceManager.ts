// 服務管理器 - 整合所有服務的統一入口
import RetryService from './retryService';
import ErrorHandler, { ErrorType } from './errorHandler';
import MonitorService from './monitorService';

export interface ServiceConfig {
  retry: Partial<any>;
  monitoring: {
    enabled: boolean;
    interval: number;
  };
  errorHandling: {
    showNotifications: boolean;
    logToConsole: boolean;
  };
}

class ServiceManager {
  private static instance: ServiceManager;
  private retryService: RetryService;
  private errorHandler: ErrorHandler;
  private monitorService: MonitorService;
  private config: ServiceConfig;

  private constructor() {
    this.retryService = RetryService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.monitorService = MonitorService.getInstance();
    
    this.config = {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      monitoring: {
        enabled: true,
        interval: 30000
      },
      errorHandling: {
        showNotifications: true,
        logToConsole: true
      }
    };

    this.setupServices();
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  // 設置服務
  private setupServices(): void {
    // 設置錯誤處理回調
    this.errorHandler.onError(ErrorType.NETWORK, (error) => {
      console.warn('🌐 網絡錯誤:', error.message);
    });

    this.errorHandler.onError(ErrorType.AUTHENTICATION, (error) => {
      console.error('🔐 認證錯誤:', error.message);
      // 可以重定向到登錄頁面
    });

    this.errorHandler.onError(ErrorType.RATE_LIMIT, (error) => {
      console.warn('⏱️ 速率限制:', error.message);
    });

    // 設置監控回調
    this.monitorService.onHealthUpdate((health) => {
      if (health.overallHealth === 'critical') {
        console.warn('⚠️ 系統健康狀況需要關注:', health);
      } else if (health.overallHealth === 'warning') {
        console.info('ℹ️ 系統健康狀況警告:', health);
      } else {
        console.log('✅ 系統健康狀況良好');
      }
    });

    // 註冊健康檢查
    this.registerHealthChecks();
  }

  // 註冊健康檢查
  private registerHealthChecks(): void {
    // API 連接健康檢查
    this.monitorService.registerHealthCheck('API Connection', async () => {
      try {
        const baseUrl = import.meta.env.PUBLIC_TYMB_URL || 'http://localhost:8080/tymb';
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (response.ok) {
          return {
            component: 'API Connection',
            status: 'healthy',
            message: 'API 連接正常',
            timestamp: Date.now()
          };
        } else {
          return {
            component: 'API Connection',
            status: 'warning',
            message: `API 響應異常: ${response.status}`,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        return {
          component: 'API Connection',
          status: 'critical',
          message: `API 連接失敗: ${error}`,
          timestamp: Date.now()
        };
      }
    });

    // Consumer 健康檢查
    this.monitorService.registerHealthCheck('Consumer Status', async () => {
      const consumerStatus = this.monitorService.getConsumerStatus();
      
      if (consumerStatus.isConnected) {
        return {
          component: 'Consumer Status',
          status: 'healthy',
          message: 'Consumer 連接正常',
          details: consumerStatus,
          timestamp: Date.now()
        };
      } else {
        return {
          component: 'Consumer Status',
          status: 'critical',
          message: 'Consumer 連接失敗',
          details: consumerStatus,
          timestamp: Date.now()
        };
      }
    });

    // 內存使用健康檢查
    this.monitorService.registerHealthCheck('Memory Usage', async () => {
      const memoryUsage = this.getMemoryUsage();
      
      if (memoryUsage < 0.7) {
        return {
          component: 'Memory Usage',
          status: 'healthy',
          message: `內存使用正常: ${(memoryUsage * 100).toFixed(1)}%`,
          timestamp: Date.now()
        };
      } else if (memoryUsage < 0.9) {
        return {
          component: 'Memory Usage',
          status: 'warning',
          message: `內存使用較高: ${(memoryUsage * 100).toFixed(1)}%`,
          timestamp: Date.now()
        };
      } else {
        return {
          component: 'Memory Usage',
          status: 'critical',
          message: `內存使用過高: ${(memoryUsage * 100).toFixed(1)}%`,
          timestamp: Date.now()
        };
      }
    });
  }

  // 執行帶重試和錯誤處理的 API 調用
  async executeAPI<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.retryService.executeWithRetry(
        operation,
        operationName,
        {
          ...this.config.retry,
          ...config,
          onRetry: (attempt, error) => {
            console.warn(`🔄 ${operationName} 重試 ${attempt}:`, error.message);
          },
          onSuccess: (result) => {
            const responseTime = Date.now() - startTime;
            console.log(`✅ ${operationName} 成功 (${responseTime}ms)`);
          },
          onFinalFailure: (error) => {
            const responseTime = Date.now() - startTime;
            console.error(`❌ ${operationName} 最終失敗 (${responseTime}ms):`, error.message);
            this.errorHandler.handleError(error, operationName);
          }
        }
      );

      // 記錄成功的 API 指標
      const responseTime = Date.now() - startTime;
      this.monitorService.recordAPIMetric(operationName, responseTime, 200, true);

      return result;
    } catch (error) {
      // 記錄失敗的 API 指標
      const responseTime = Date.now() - startTime;
      const statusCode = this.extractStatusCode(error);
      this.monitorService.recordAPIMetric(operationName, responseTime, statusCode, false);

      // 處理錯誤
      this.errorHandler.handleError(error, operationName);
      throw error;
    }
  }

  // 從錯誤中提取狀態碼
  private extractStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.code) return parseInt(error.code);
    if (error.message) {
      const match = error.message.match(/(\d{3})/);
      if (match) return parseInt(match[1]);
    }
    return 500;
  }

  // 獲取內存使用情況
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  // 配置服務
  configure(config: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 獲取配置
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  // 獲取重試統計
  getRetryStats(operationName?: string): any | Map<string, any> {
    return this.retryService.getStats(operationName);
  }

  // 獲取錯誤統計
  getErrorStats(): Record<ErrorType, number> {
    return this.errorHandler.getErrorStats();
  }

  // 獲取系統健康狀況
  async getSystemHealth(): Promise<any> {
    return await this.monitorService.triggerHealthCheck();
  }

  // 獲取 Consumer 狀態
  getConsumerStatus() {
    return this.monitorService.getConsumerStatus();
  }

  // 獲取 API 指標
  getAPIMetrics(endpoint?: string) {
    return this.monitorService.getAPIMetrics(endpoint);
  }

  // 獲取監控統計
  getMonitoringStats() {
    return this.monitorService.getMonitoringStats();
  }

  // 清除所有統計數據
  clearAllStats(): void {
    this.retryService.clearStats();
    this.errorHandler.clearErrorLogs();
  }

  // 導出診斷信息
  exportDiagnostics(): string {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      config: this.config,
      retryStats: this.retryService.getStats(),
      errorStats: this.errorHandler.getErrorStats(),
      monitoringStats: this.monitorService.getMonitoringStats(),
      consumerStatus: this.monitorService.getConsumerStatus(),
      apiMetrics: Object.fromEntries(this.monitorService.getAPIMetrics() as Map<string, any>),
      memoryUsage: this.getMemoryUsage(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    return JSON.stringify(diagnostics, null, 2);
  }

  // 手動觸發健康檢查
  async triggerHealthCheck(): Promise<any> {
    return await this.monitorService.triggerHealthCheck();
  }

  // 註冊健康更新回調
  onHealthUpdate(callback: (health: any) => void): void {
    this.monitorService.onHealthUpdate(callback);
  }

  // 註冊錯誤回調
  onError(type: ErrorType, callback: (error: any) => void): void {
    this.errorHandler.onError(type, callback);
  }

  // 取消所有活動請求
  cancelAllRequests(): void {
    this.retryService.cancelAllRequests();
  }

  // 清理資源
  destroy(): void {
    this.monitorService.destroy();
    this.cancelAllRequests();
  }
}

export default ServiceManager;
