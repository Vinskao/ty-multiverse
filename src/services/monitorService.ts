// 監控服務 - 監控 Consumer 狀態和系統性能
export interface ConsumerStatus {
  isConnected: boolean;
  lastHeartbeat: number;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  uptime: number;
}

export interface APIMetrics {
  endpoint: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: number;
  statusCodes: Record<string, number>;
}

export interface SystemHealth {
  timestamp: number;
  consumerStatus: ConsumerStatus;
  apiMetrics: Map<string, APIMetrics>;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
  timestamp: number;
}

class MonitorService {
  private static instance: MonitorService;
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private metrics: Map<string, APIMetrics> = new Map();
  private consumerStatus: ConsumerStatus = {
    isConnected: false,
    lastHeartbeat: 0,
    queueSize: 0,
    processingRate: 0,
    errorRate: 0,
    uptime: 0
  };
  private monitoringInterval?: number;
  private healthCallbacks: ((health: SystemHealth) => void)[] = [];

  private constructor() {
    this.setupMonitoring();
  }

  static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  // 設置監控
  private setupMonitoring(): void {
    // 定期檢查系統健康狀況
    this.monitoringInterval = window.setInterval(() => {
      this.performHealthChecks();
    }, 30000); // 每30秒檢查一次

    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // 監聽網絡狀態變化
    window.addEventListener('online', () => {
      this.onNetworkStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.onNetworkStatusChange(false);
    });
  }

  // 執行健康檢查
  private async performHealthChecks(): Promise<void> {
    const healthResults: HealthCheckResult[] = [];

    // 執行所有註冊的健康檢查
    for (const [name, check] of this.healthChecks) {
      try {
        const result = await check();
        healthResults.push(result);
      } catch (error) {
        healthResults.push({
          component: name,
          status: 'critical',
          message: `健康檢查失敗: ${error}`,
          timestamp: Date.now()
        });
      }
    }

    // 更新 Consumer 狀態
    await this.updateConsumerStatus();

    // 計算整體健康狀況
    const overallHealth = this.calculateOverallHealth(healthResults);

    // 創建系統健康報告
    const systemHealth: SystemHealth = {
      timestamp: Date.now(),
      consumerStatus: this.consumerStatus,
      apiMetrics: new Map(this.metrics),
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.getActiveConnections(),
      errorRate: this.calculateErrorRate(),
      overallHealth
    };

    // 觸發健康回調
    this.healthCallbacks.forEach(callback => {
      try {
        callback(systemHealth);
      } catch (error) {
        console.error('健康回調執行失敗:', error);
      }
    });

    // 記錄健康狀況
    this.logHealthStatus(systemHealth, healthResults);
  }

  // 更新 Consumer 狀態
  private async updateConsumerStatus(): Promise<void> {
    try {
      const { config } = await import('./config');
      const baseUrl = config.api.baseUrl;
      
      // 檢查 Consumer 連接狀態
      const response = await fetch(`${baseUrl}/health/consumer`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.consumerStatus = {
          isConnected: data.connected || false,
          lastHeartbeat: data.lastHeartbeat || Date.now(),
          queueSize: data.queueSize || 0,
          processingRate: data.processingRate || 0,
          errorRate: data.errorRate || 0,
          uptime: data.uptime || 0
        };
      } else {
        this.consumerStatus.isConnected = false;
      }
    } catch (error) {
      console.warn('無法獲取 Consumer 狀態:', error);
      this.consumerStatus.isConnected = false;
    }
  }

  // 計算整體健康狀況
  private calculateOverallHealth(results: HealthCheckResult[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = results.filter(r => r.status === 'critical').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    // 在開發環境中，如果沒有嚴重的健康檢查結果，默認為健康
    if (criticalCount === 0 && warningCount === 0) return 'healthy';
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  }

  // 獲取內存使用情況
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  // 獲取活動連接數
  private getActiveConnections(): number {
    // 這裡可以實現獲取實際的連接數
    return this.metrics.size;
  }

  // 計算錯誤率
  private calculateErrorRate(): number {
    let totalRequests = 0;
    let totalErrors = 0;

    this.metrics.forEach(metric => {
      totalRequests += metric.requestCount;
      totalErrors += metric.errorCount;
    });

    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  // 記錄健康狀況
  private logHealthStatus(health: SystemHealth, results: HealthCheckResult[]): void {
    const status = health.overallHealth === 'healthy' ? '✅' : 
                   health.overallHealth === 'warning' ? '⚠️' : '🚨';

    console.log(`${status} 系統健康檢查 [${new Date(health.timestamp).toLocaleTimeString()}]:`, {
      overallHealth: health.overallHealth,
      consumerConnected: health.consumerStatus.isConnected,
      errorRate: `${(health.errorRate * 100).toFixed(2)}%`,
      memoryUsage: `${(health.memoryUsage * 100).toFixed(2)}%`,
      activeConnections: health.activeConnections,
      healthResults: results.map(r => ({
        component: r.component,
        status: r.status,
        message: r.message
      }))
    });
  }

  // 網絡狀態變化處理
  private onNetworkStatusChange(isOnline: boolean): void {
    console.log(`🌐 網絡狀態變化: ${isOnline ? '在線' : '離線'}`);
    
    if (!isOnline) {
      this.consumerStatus.isConnected = false;
    }
  }

  // 暫停監控
  private pauseMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  // 恢復監控
  private resumeMonitoring(): void {
    if (!this.monitoringInterval) {
      this.setupMonitoring();
    }
  }

  // 註冊健康檢查
  registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
  }

  // 移除健康檢查
  unregisterHealthCheck(name: string): boolean {
    return this.healthChecks.delete(name);
  }

  // 記錄 API 指標
  recordAPIMetric(endpoint: string, responseTime: number, statusCode: number, success: boolean): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, {
        endpoint,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        lastRequestTime: 0,
        statusCodes: {}
      });
    }

    const metric = this.metrics.get(endpoint)!;
    metric.requestCount++;
    metric.lastRequestTime = Date.now();

    if (success) {
      metric.successCount++;
    } else {
      metric.errorCount++;
    }

    // 更新平均響應時間
    const totalTime = metric.averageResponseTime * (metric.requestCount - 1) + responseTime;
    metric.averageResponseTime = totalTime / metric.requestCount;

    // 記錄狀態碼
    const statusCodeStr = statusCode.toString();
    metric.statusCodes[statusCodeStr] = (metric.statusCodes[statusCodeStr] || 0) + 1;
  }

  // 獲取 API 指標
  getAPIMetrics(endpoint?: string): APIMetrics | Map<string, APIMetrics> {
    if (endpoint) {
      return this.metrics.get(endpoint)!;
    }
    return new Map(this.metrics);
  }

  // 獲取 Consumer 狀態
  getConsumerStatus(): ConsumerStatus {
    return { ...this.consumerStatus };
  }

  // 註冊健康回調
  onHealthUpdate(callback: (health: SystemHealth) => void): void {
    this.healthCallbacks.push(callback);
  }

  // 移除健康回調
  offHealthUpdate(callback: (health: SystemHealth) => void): void {
    const index = this.healthCallbacks.indexOf(callback);
    if (index > -1) {
      this.healthCallbacks.splice(index, 1);
    }
  }

  // 手動觸發健康檢查
  async triggerHealthCheck(): Promise<SystemHealth> {
    await this.performHealthChecks();
    return {
      timestamp: Date.now(),
      consumerStatus: this.consumerStatus,
      apiMetrics: new Map(this.metrics),
      memoryUsage: this.getMemoryUsage(),
      activeConnections: this.getActiveConnections(),
      errorRate: this.calculateErrorRate(),
      overallHealth: 'healthy' // 這裡需要實際計算
    };
  }

  // 獲取監控統計
  getMonitoringStats(): {
    totalHealthChecks: number;
    activeMetrics: number;
    monitoringActive: boolean;
    lastCheckTime: number;
  } {
    return {
      totalHealthChecks: this.healthChecks.size,
      activeMetrics: this.metrics.size,
      monitoringActive: !!this.monitoringInterval,
      lastCheckTime: Date.now()
    };
  }

  // 清理資源
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.healthChecks.clear();
    this.metrics.clear();
    this.healthCallbacks = [];
  }
}

export default MonitorService;
