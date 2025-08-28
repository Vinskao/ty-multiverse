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
    const serviceManager = (await import('./serviceManager')).default.getInstance();

    return await serviceManager.executeAPI(async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        "Accept": "application/json"
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = import.meta.env.PUBLIC_TYMB_URL || 'http://localhost:8080/tymb';
      // 傷害計算 URL

      const response = await fetch(`${baseUrl}/people/damageWithWeapon?name=${encodeURIComponent(characterName)}`, {
        method: "GET",
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 傷害計算 API 錯誤:', errorText);
        throw new Error(`傷害計算 API 錯誤: ${response.status} - ${errorText}`);
      }

      // 根據用戶說明，這現在是同步API，直接返回數值
      const textData = await response.text();
      console.log(`📥 傷害計算原始響應:`, textData);

      // 嘗試解析為JSON
      let data;
      try {
        data = JSON.parse(textData);
        console.log(`📥 傷害計算JSON數據:`, data);
      } catch {
        // 如果不是JSON，直接當作數字字符串處理
        data = textData;
        console.log(`📥 傷害計算文本數據:`, data);
      }

      // 檢查是否為數字
      if (typeof data === 'number') {
        console.log(`✅ 收到直接傷害值: ${data}`);
        return data;
      }

      // 檢查是否為字符串數字
      const damageValue = parseInt(String(data), 10);
      if (!isNaN(damageValue)) {
        // 解析傷害值
        return damageValue;
      }

      // 如果是對象，嘗試提取數值
      if (typeof data === 'object' && data !== null) {
        // 檢查常見的數值字段
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

  // 輪詢傷害計算結果
  private async pollForDamageResult(requestId: string, baseUrl: string, maxAttempts: number = 8, interval: number = 5000): Promise<number> {
    // 調整輪詢參數以在 40 秒內完成 (8 次 * 5 秒 = 40 秒)
    maxAttempts = Math.min(maxAttempts, 8);
    interval = Math.max(interval, 5000);
    // 開始輪詢傷害結果
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 傷害輪詢嘗試
        
        // 檢查結果是否存在
        const existsUrl = `${baseUrl}/api/request-status/${requestId}/exists`;
        // 檢查傷害結果存在
        
        const existsResponse = await fetch(existsUrl, {
          credentials: 'include'
        });
        
        
        if (existsResponse.ok) {
          const existsData = await existsResponse.json();
          // 傷害結果存在檢查

          // 如果 exists 為 false，等待3秒後停止輪詢
          if (!existsData.exists) {
            // 結果不存在，3秒後停止輪詢
            await new Promise(resolve => setTimeout(resolve, 3000));
            // 結果不存在，肯定沒到隊列裡面，停止輪詢
            throw new Error('結果不存在，肯定沒到隊列裡面');
          }

          if (existsData.exists) {
            // 獲取結果
            const resultUrl = `${baseUrl}/api/request-status/${requestId}`;
            // 獲取傷害結果
            
            const resultResponse = await fetch(resultUrl, {
              credentials: 'include'
            });
            
            // 傷害結果響應
            
            if (!resultResponse.ok) {
              const errorText = await resultResponse.text();
              console.error('❌ 傷害結果獲取失敗:', errorText);
              throw new Error(`傷害結果獲取失敗: ${resultResponse.status} - ${errorText}`);
            }
            
            const result = await resultResponse.json();
            // 獲取傷害結果成功
            
            // 檢查是否還在處理中
            if (result.status === 'processing' || result.data === null) {
              // 傷害結果仍在處理中，繼續等待
              // 不要立即 continue，而是等待後再繼續
              if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval));
                continue;
              } else {
                throw new Error('傷害計算輪詢超時');
              }
            }
            
            // 檢查是否有錯誤
            if (result.error) {
              console.error('❌ 傷害處理結果有錯誤:', result.error);
              throw new Error(`傷害處理錯誤: ${result.error}`);
            }
            
            // 解析傷害值
            const damageValue = this.parseDamageValue(result);
            return damageValue;
          }
        } else {
          // 傷害存在檢查失敗
        }
        
        // 結果還不存在，繼續等待
        // 傷害結果還不存在，繼續等待
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        } else {
          throw new Error('傷害計算輪詢超時');
        }
        
      } catch (error) {
        console.error(`❌ 傷害輪詢嘗試 ${attempt} 失敗:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error('傷害計算輪詢超時');
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
