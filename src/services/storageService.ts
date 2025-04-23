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
    FIGHTERS_LEFT: 'fighters_left',
    FIGHTERS_RIGHT: 'fighters_right',
    CHARACTER_POWER_CACHE: 'character_power_cache',
  },

  // 設置數據
  set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  // 獲取數據
  get<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  // 移除數據
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  // 清除所有數據
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // 清除特定前綴的所有數據
  clearByPrefix(prefix: string): void {
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