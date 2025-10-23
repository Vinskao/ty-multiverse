// 角色數據服務
export interface Character {
  id: number;
  name: string;
  nameOriginal?: string;
  physicPower?: number;
  magicPower?: number;
  utilityPower?: number;
  attributes?: string;
  faction?: string;
  armyName?: string;
  totalPower?: number;
  weaponBonus?: number;
  hasBonus?: boolean;
  weaponData?: any;
  originalUtilityPower?: number;
}

class CharacterService {
  private static instance: CharacterService;
  private cacheKey = 'character_list_cache';
  private cacheExpiryKey = 'character_list_cache_expiry';
  private cacheDuration = 5 * 60 * 1000; // 5分鐘緩存

  private constructor() {}

  static getInstance(): CharacterService {
    if (!CharacterService.instance) {
      CharacterService.instance = new CharacterService();
    }
    return CharacterService.instance;
  }

  // 獲取角色列表（帶緩存）
  async getCharacters(): Promise<Character[]> {
    try {
      // 檢查緩存
      const cached = this.getCachedCharacters();
      if (cached) {
        return cached;
      }

      // 從 API 獲取數據
      const characters = await this.fetchCharactersFromAPI();
      
      // 緩存數據
      this.cacheCharacters(characters);
      
      return characters;
    } catch (error) {
      console.error('❌ 獲取角色數據失敗:', error);
      throw error;
    }
  }

  // 強制刷新角色數據
  async refreshCharacters(): Promise<Character[]> {
    console.log('🔄 強制刷新角色數據...');
    this.clearCache();
    return await this.getCharacters();
  }

  // 從 API 獲取角色數據
  private async fetchCharactersFromAPI(): Promise<Character[]> {
    const serviceManager = (await import('./serviceManager')).default.getInstance();
    
    return await serviceManager.executeAPI(async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 通過 Gateway API 調用
      const { config } = await import('./config');
      const baseUrl = config.api.baseUrl;
      console.log('🌐 使用 Gateway URL:', baseUrl);
      console.log('📤 發送請求到:', `${baseUrl}/people/get-all`);
      console.log('📋 請求頭:', headers);
      
      const response = await fetch(`${baseUrl}/people/get-all`, {
        method: "POST",
        headers,
        body: '{}', // 根據API規範，body可以是空JSON或省略
        credentials: 'include'
      });
      
      console.log('📡 API 響應狀態:', response.status, response.statusText);
      console.log('📡 響應頭:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 錯誤詳情:', errorText);
        throw new Error(`API 返回錯誤: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📥 收到數據:', data);
      
      // 檢查是否為異步處理響應
      if (data.status === 'processing' || data.requestId) {
        console.log('⏳ 檢測到異步處理，開始輪詢結果...');
        console.log('🆔 RequestId:', data.requestId);
        return await this.pollForResult(data.requestId, baseUrl);
      }
      
      // 檢查是否為陣列（直接響應）
      if (Array.isArray(data)) {
        console.log('✅ 收到直接響應數據');
        return data;
      }
      
      console.error('❌ 未知的數據格式:', data);
      throw new Error('API 返回無效數據格式');
    }, 'CharacterService.getCharacters');
  }

  // 輪詢結果直到完成
  private async pollForResult(requestId: string, baseUrl: string, maxAttempts: number = 8, interval: number = 5000): Promise<Character[]> {
    // 調整輪詢參數以在 40 秒內完成 (8 次 * 5 秒 = 40 秒)
    maxAttempts = Math.min(maxAttempts, 8);
    interval = Math.max(interval, 5000);
    console.log('🔄 開始輪詢，RequestId:', requestId, 'BaseUrl:', baseUrl);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 輪詢嘗試 ${attempt}/${maxAttempts}...`);
        
        // 檢查結果是否存在
        const existsUrl = `${baseUrl}/api/request-status/${requestId}/exists`;
        console.log('🔍 檢查結果存在:', existsUrl);
        
        const existsResponse = await fetch(existsUrl, {
          credentials: 'include'
        });
        
        console.log('📡 存在檢查響應:', existsResponse.status, existsResponse.statusText);
        
        if (existsResponse.ok) {
          const existsData = await existsResponse.json();
          console.log('📊 結果存在檢查:', existsData);

          // 如果 exists 為 false，等待更長時間後再檢查
          if (!existsData.exists) {
            console.log('📊 結果存在檢查:', existsData);
            console.log('⏳ 結果不存在，等待9秒鐘後再檢查...');

            // 等待9秒鐘，讓後端有時間處理
            await new Promise(resolve => setTimeout(resolve, 9000));

            // 等待9秒後再次檢查一次
            console.log('🔄 9秒後重新檢查 exists...');
            let retryExistsData = null;

            try {
              const retryExistsResponse = await fetch(existsUrl, {
                credentials: 'include'
              });

              if (retryExistsResponse.ok) {
                retryExistsData = await retryExistsResponse.json();
                console.log('📊 9秒後重新檢查結果:', retryExistsData);

                if (retryExistsData.exists) {
                  console.log('✅ 9秒後檢查發現結果已存在，繼續處理...');
                  // 結果現在存在了，繼續正常流程
                  const resultUrl = `${baseUrl}/api/request-status/${requestId}`;
                  const resultResponse = await fetch(resultUrl, {
                    credentials: 'include'
                  });

                  if (!resultResponse.ok) {
                    const errorText = await resultResponse.text();
                    console.error('❌ 獲取結果失敗:', errorText);
                    throw new Error(`獲取結果失敗: ${resultResponse.status} - ${errorText}`);
                  }

                  const result = await resultResponse.json();
                  console.log('✅ 獲取結果成功:', result);

                  // 檢查數據格式
                  if (result.data && Array.isArray(result.data)) {
                    console.log('✅ 收到有效的角色數據');
                    return result.data;
                  } else {
                    console.error('❌ 結果數據格式不正確:', result);
                    throw new Error('API 返回的角色數據格式不正確');
                  }
                } else {
                  console.log('❌ 9秒後檢查仍然不存在');
                }
              } else {
                console.log('❌ 9秒後檢查請求失敗');
              }
            } catch (retryError) {
              console.error('❌ 9秒後重新檢查失敗:', retryError);
              retryExistsData = '檢查失敗';
            }

            // 如果還是找不到，提供更詳細的診斷信息
            const errorMessage = `
🔍 診斷信息:
   • Request ID: ${requestId}
   • API 端點: ${baseUrl}/api/request-status/${requestId}/exists
   • 第一次檢查 Exists 響應: ${JSON.stringify(existsData)}
   • 9秒後檢查 Exists 響應: ${JSON.stringify(retryExistsData || '檢查失敗')}
   • 可能原因:
     - 後端隊列系統未啟動或處理緩慢
     - 請求未正確進入隊列
     - 後端服務異常
     - 建議檢查後端日誌

💡 解決建議:
   • 檢查 RabbitMQ 或隊列服務狀態
   • 查看後端應用日誌
   • 確認 /people/get-all API 是否正常工作
   • 考慮重啟後端服務
            `.trim();

            console.error('❌ 輪詢診斷:', errorMessage);
            throw new Error(`角色數據請求失敗: 等待9秒後結果仍不存在\n\n${errorMessage}`);
          }

          if (existsData.exists) {
            // 獲取結果
            const resultUrl = `${baseUrl}/api/request-status/${requestId}`;
            console.log('📥 獲取結果:', resultUrl);
            
            const resultResponse = await fetch(resultUrl, {
              credentials: 'include'
            });
            
            console.log('📡 結果響應:', resultResponse.status, resultResponse.statusText);
            
            if (!resultResponse.ok) {
              const errorText = await resultResponse.text();
              console.error('❌ 結果獲取失敗:', errorText);
              throw new Error(`結果獲取失敗: ${resultResponse.status} - ${errorText}`);
            }
            
            const result = await resultResponse.json();
            console.log('✅ 獲取結果成功:', result);
            
            // 檢查是否還在處理中
            if (result.status === 'processing' || result.data === null) {
              console.log('⏳ 結果仍在處理中，繼續等待...');
              // 不要立即 continue，而是等待後再繼續
              if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval));
                continue;
              } else {
                throw new Error('輪詢超時');
              }
            }
            
            // 檢查是否有錯誤
            if (result.error) {
              console.error('❌ 處理結果有錯誤:', result.error);
              throw new Error(`處理錯誤: ${result.error}`);
            }
            
            // 檢查 data 字段
            if (result.data && Array.isArray(result.data)) {
              console.log('✅ 收到有效的角色數據');
              return result.data;
            } else {
              console.error('❌ 結果數據格式不正確:', result);
              throw new Error('API 返回的角色數據格式不正確');
            }
          }
        } else {
          console.log('⚠️ 存在檢查失敗:', existsResponse.status, existsResponse.statusText);
        }
        
        // 結果還不存在，繼續等待
        console.log('⏳ 結果還不存在，繼續等待...');
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        } else {
          throw new Error('輪詢超時');
        }
        
      } catch (error) {
        console.error(`❌ 輪詢嘗試 ${attempt} 失敗:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error('輪詢超時');
  }

  // 獲取緩存的角色數據
  private getCachedCharacters(): Character[] | null {
    try {
      const expiry = localStorage.getItem(this.cacheExpiryKey);
      if (!expiry) return null;
      
      const expiryTime = parseInt(expiry);
      if (Date.now() > expiryTime) {
        console.log('⏰ 緩存已過期');
        this.clearCache();
        return null;
      }
      
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('讀取緩存失敗:', error);
      return null;
    }
  }

  // 緩存角色數據
  private cacheCharacters(characters: Character[]): void {
    try {
      const expiry = Date.now() + this.cacheDuration;
      localStorage.setItem(this.cacheKey, JSON.stringify(characters));
      localStorage.setItem(this.cacheExpiryKey, expiry.toString());
      console.log('💾 角色數據已緩存');
    } catch (error) {
      console.error('緩存數據失敗:', error);
    }
  }

  // 清除緩存
  clearCache(): void {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.cacheExpiryKey);
    console.log('🗑️ 角色數據緩存已清除');
  }

  // 根據名稱查找角色
  async getCharacterByName(name: string): Promise<Character | null> {
    const characters = await this.getCharacters();
    return characters.find(char => char.name === name) || null;
  }

  // 獲取有圖片的角色
  async getCharactersWithImages(): Promise<Character[]> {
    const characters = await this.getCharacters();
    
    // 確保 characters 是數組
    if (!Array.isArray(characters)) {
      console.error('❌ getCharacters 返回的不是數組:', characters);
      return [];
    }
    
    const PEOPLE_IMAGE_URL = import.meta.env.PUBLIC_PEOPLE_IMAGE_URL;
    
    // 檢查每個角色是否有對應的圖片
    const validCharacters = await Promise.all(
      characters.map(async char => {
        const imagePath = `${PEOPLE_IMAGE_URL}/${char.name}.png`;
        try {
          const response = await fetch(imagePath, { method: 'HEAD' });
          return response.ok ? char : null;
        } catch {
          return null;
        }
      })
    );
    
    return validCharacters.filter(char => char !== null) as Character[];
  }

  // 更新角色數據（會清除緩存）
  async updateCharacter(character: Character): Promise<void> {
    // 這裡可以添加更新角色的 API 調用
    // 更新成功後清除緩存
    this.clearCache();
  }

  // 獲取緩存狀態
  getCacheStatus(): { hasCache: boolean; expiryTime: number | null } {
    try {
      const expiry = localStorage.getItem(this.cacheExpiryKey);
      return {
        hasCache: !!localStorage.getItem(this.cacheKey),
        expiryTime: expiry ? parseInt(expiry) : null
      };
    } catch {
      return { hasCache: false, expiryTime: null };
    }
  }
}

export default CharacterService;
