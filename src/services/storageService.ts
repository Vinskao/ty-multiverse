// localStorage 管理服務
export const storageService = {
  // 存儲鍵名常量
  KEYS: {
    // 主題相關
    THEME: 'theme',
    
    // 編輯器相關
    EDITOR_CONTENT: 'editorContent',
    USERNAME: 'username',
    
    // 戰鬥相關
    FIGHTERS_LEFT: 'fightersLeft',
    FIGHTERS_RIGHT: 'fightersRight',
    CHARACTER_POWER_CACHE: 'characterPowerCache',
    TOKEN: 'token',
    REFRESH_TOKEN: 'refreshToken'
  },

  // 檢查是否在瀏覽器環境
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  },

  // 設置數據
  set(key: string, value: any): void {
    if (!this.isBrowser()) {
      // console.log('StorageService - Not in browser environment, skipping set');
      return;
    }
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  // 獲取數據
  get<T>(key: string, defaultValue: T | null = null): T | null {
    if (!this.isBrowser()) {
      // console.log('StorageService - Not in browser environment, returning default value');
      return defaultValue;
    }
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      // 嘗試解析為 JSON，如果失敗則返回原始字符串
      try {
        return JSON.parse(item) as T;
      } catch (parseError) {
        // 如果不是有效的 JSON，則返回原始字符串
        return item as unknown as T;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  // 移除數據
  remove(key: string): void {
    if (!this.isBrowser()) {
      // console.log('StorageService - Not in browser environment, skipping remove');
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  // 清除所有數據
  clear(): void {
    if (!this.isBrowser()) {
      // console.log('StorageService - Not in browser environment, skipping clear');
      return;
    }
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // 清除特定前綴的所有數據
  clearByPrefix(prefix: string): void {
    if (!this.isBrowser()) {
      // console.log('StorageService - Not in browser environment, skipping clearByPrefix');
      return;
    }
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage by prefix:', error);
    }
  },

  // 清除編輯器相關數據
  clearEditorData(): void {
    const { KEYS } = this;
    this.remove(KEYS.EDITOR_CONTENT);
    this.remove(KEYS.USERNAME);
  },

  // 清除戰鬥相關數據
  clearFightData(): void {
    const { KEYS } = this;
    this.remove(KEYS.FIGHTERS_LEFT);
    this.remove(KEYS.FIGHTERS_RIGHT);
    this.remove(KEYS.CHARACTER_POWER_CACHE);
  },

  // 清除主題相關數據
  clearThemeData(): void {
    const { KEYS } = this;
    this.remove(KEYS.THEME);
  },

  // 清除所有應用數據
  clearAllAppData(): void {
    this.clear();
  },

  // 保存戰鬥數據
  saveFightData(side: 'left' | 'right', data: any): void {
    const key = side === 'left' ? this.KEYS.FIGHTERS_LEFT : this.KEYS.FIGHTERS_RIGHT;
    this.set(key, data);
  },

  // 獲取戰鬥數據
  getFightData(side: 'left' | 'right'): any {
    const key = side === 'left' ? this.KEYS.FIGHTERS_LEFT : this.KEYS.FIGHTERS_RIGHT;
    return this.get(key, {});
  },

  // 保存角色戰力數據
  saveCharacterPower(characterName: string, data: any): void {
    const currentData = this.get(this.KEYS.CHARACTER_POWER_CACHE, {});
    currentData[characterName] = data;
    this.set(this.KEYS.CHARACTER_POWER_CACHE, currentData);
  },

  // 獲取角色戰力數據
  getCharacterPower(characterName: string): any {
    const currentData = this.get(this.KEYS.CHARACTER_POWER_CACHE, {});
    return currentData[characterName] || null;
  }
}; 