// 角色數據服務 - 直接使用 Person 數據結構，無需轉換
import type { Person } from './peopleService';

class CharacterService {
  private static instance: CharacterService;
  private cacheKey = 'character_list_cache';
  private cacheExpiryKey = 'character_list_cache_expiry';
  private mediaTimestampKey = 'media_cache_timestamp';
  private cacheDuration = 5 * 60 * 1000; // 5分鐘緩存

  private constructor() {}

  static getInstance(): CharacterService {
    if (!CharacterService.instance) {
      CharacterService.instance = new CharacterService();
    }
    return CharacterService.instance;
  }

  // 獲取媒體版本時間戳（共用於圖片/影片緩存控制）
  getMediaTimestamp(): string {
    let timestamp = localStorage.getItem(this.mediaTimestampKey);
    if (!timestamp) {
      timestamp = Date.now().toString();
      localStorage.setItem(this.mediaTimestampKey, timestamp);
    }
    return timestamp;
  }

  // 強制更新媒體版本時間戳
  refreshMediaTimestamp(): string {
    const newTimestamp = Date.now().toString();
    localStorage.setItem(this.mediaTimestampKey, newTimestamp);
    console.log('🔄 媒體快取時間戳已更新:', newTimestamp);
    return newTimestamp;
  }

  // 獲取角色列表（帶緩存）- 直接返回 Person 對象
  async getCharacters(): Promise<Person[]> {
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
  async refreshCharacters(): Promise<Person[]> {
    console.log('🔄 強制刷新角色數據...');
    this.clearCache();
    this.refreshMediaTimestamp(); // 同時刷新媒體時間戳
    return await this.getCharacters();
  }

  // 從 API 獲取角色數據 - 直接使用 peopleService 的完整數據
  private async fetchCharactersFromAPI(): Promise<Person[]> {
    const { peopleService } = await import('./peopleService');
    return await peopleService.getAllPeopleAndWait();
  }



  // 獲取緩存的角色數據
  private getCachedCharacters(): Person[] | null {
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
  private cacheCharacters(characters: Person[]): void {
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
  async getCharacterByName(name: string): Promise<Person | null> {
    const characters = await this.getCharacters();
    return characters.find(char => char.name === name) || null;
  }

  // 獲取有圖片的角色
  async getCharactersWithImages(): Promise<Person[]> {
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
    
    return validCharacters.filter(char => char !== null) as Person[];
  }

  // 更新角色數據（會清除緩存）
  async updateCharacter(character: Person): Promise<void> {
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
