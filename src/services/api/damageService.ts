// 傷害計算服務
export interface DamageResponse {
  requestId: string;
  message: string;
  status: string;
}

class DamageService {
  private static instance: DamageService;
  private cacheKey = 'damage_cache';
  private cacheExpiryKey = 'damage_cache_expiry';
  private cacheDuration = 2 * 60 * 1000; // 2分鐘緩存

  private constructor() {}

  static getInstance(): DamageService {
    if (!DamageService.instance) {
      DamageService.instance = new DamageService();
    }
    return DamageService.instance;
  }

  // 獲取角色傷害值（帶緩存）
  async getCharacterDamage(characterName: string): Promise<number> {
    try {
      // 檢查緩存
      const cached = this.getCachedDamage(characterName);
      if (cached !== null) {
        return cached;
      }

      // 從 API 獲取數據
      const damage = await this.fetchDamageFromAPI(characterName);
      
      // 緩存數據
      this.cacheDamage(characterName, damage);
      
      return damage;
    } catch (error) {
      console.error(`❌ 獲取 ${characterName} 傷害值失敗:`, error);
      throw error;
    }
  }

  // 從 API 獲取傷害值（現在是同步API）
  private async fetchDamageFromAPI(characterName: string): Promise<number> {
    const serviceManager = (await import('../core/serviceManager')).default.getInstance();

    return await serviceManager.executeAPI(async () => {
      const { apiService } = await import('./apiService');
      const { config } = await import('../core/config');
      
      // 使用 Gateway URL（優先）
      const baseUrl = config.api.gatewayUrl || config.api.baseUrl;

      const response = await apiService.request({
        url: `${baseUrl}/people/damageWithWeapon?name=${encodeURIComponent(characterName)}`,
        method: 'GET',
        auth: true,
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      console.log(`📥 傷害計算響應:`, data);

      // 檢查是否為數字
      if (typeof data === 'number') {
        console.log(`✅ 收到直接傷害值: ${data}`);
        return data;
      }

      // 檢查是否為字符串數字
      const damageValue = parseInt(String(data), 10);
      if (!isNaN(damageValue)) {
        return damageValue;
      }

      // 如果是對象，嘗試提取數值
      if (typeof data === 'object' && data !== null) {
        const possibleFields = ['damage', 'value', 'result', 'totalDamage'];
        for (const field of possibleFields) {
          if (data[field] !== undefined) {
            const fieldValue = parseInt(String(data[field]), 10);
            if (!isNaN(fieldValue)) {
              console.log(`✅ 從字段 ${field} 解析傷害值: ${fieldValue}`);
              return fieldValue;
            }
          }
        }
      }

      console.error('❌ 未知的傷害數據格式:', data);
      throw new Error('傷害計算 API 返回無效數據格式');
    }, `DamageService.getCharacterDamage.${characterName}`);
  }



  // 解析傷害值
  private parseDamageValue(result: any): number {
    // 嘗試不同的數據結構
    if (typeof result === 'number') {
      return result;
    }
    
    if (typeof result === 'string') {
      const parsed = parseInt(result, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    if (result && typeof result === 'object') {
      // 檢查 data 字段
      if (result.data !== undefined) {
        const dataValue = this.parseDamageValue(result.data);
        if (dataValue !== null) {
          return dataValue;
        }
      }
      
      // 檢查 damage 字段
      if (result.damage !== undefined) {
        const damageValue = this.parseDamageValue(result.damage);
        if (damageValue !== null) {
          return damageValue;
        }
      }
      
      // 檢查 value 字段
      if (result.value !== undefined) {
        const valueValue = this.parseDamageValue(result.value);
        if (valueValue !== null) {
          return valueValue;
        }
      }
      
      // 嘗試解析 JSON 字符串
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          return this.parseDamageValue(parsed);
        } catch {
          // 忽略 JSON 解析錯誤
        }
      }
    }
    
    console.error('❌ 無法解析傷害值:', result);
    throw new Error('無法解析傷害值');
  }

  // 獲取緩存的傷害值
  private getCachedDamage(characterName: string): number | null {
    try {
      const cacheKey = `${this.cacheKey}_${characterName}`;
      const expiryKey = `${this.cacheExpiryKey}_${characterName}`;
      
      const expiry = localStorage.getItem(expiryKey);
      if (!expiry) return null;
      
      const expiryTime = parseInt(expiry);
      if (Date.now() > expiryTime) {
        this.clearDamageCache(characterName);
        return null;
      }
      
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      return parseInt(cached, 10);
    } catch (error) {
      console.error('讀取傷害緩存失敗:', error);
      return null;
    }
  }

  // 緩存傷害值
  private cacheDamage(characterName: string, damage: number): void {
    try {
      const cacheKey = `${this.cacheKey}_${characterName}`;
      const expiryKey = `${this.cacheExpiryKey}_${characterName}`;
      
      const expiry = Date.now() + this.cacheDuration;
      localStorage.setItem(cacheKey, damage.toString());
      localStorage.setItem(expiryKey, expiry.toString());
    } catch (error) {
      console.error('緩存傷害數據失敗:', error);
    }
  }

  // 清除傷害緩存
  clearDamageCache(characterName?: string): void {
    try {
      if (characterName) {
        const cacheKey = `${this.cacheKey}_${characterName}`;
        const expiryKey = `${this.cacheExpiryKey}_${characterName}`;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(expiryKey);
      } else {
        // 清除所有傷害緩存
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.cacheKey) || key.startsWith(this.cacheExpiryKey)) {
            localStorage.removeItem(key);
          }
        });
        console.log('所有傷害緩存已清除');
      }
    } catch (error) {
      console.error('清除傷害緩存失敗:', error);
    }
  }

  // 強制刷新傷害值
  async refreshDamage(characterName: string): Promise<number> {
    console.log(`🔄 強制刷新 ${characterName} 的傷害值...`);
    this.clearDamageCache(characterName);
    return await this.getCharacterDamage(characterName);
  }
}

export default DamageService;
