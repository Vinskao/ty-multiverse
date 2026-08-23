const CACHE_NAME = 'ty-people-images-v1';
const NEG_CACHE_PREFIX = 'img_404_';

class ImageCacheService {
  private objectUrlMap = new Map<string, string>();          // url → object URL
  // 網路錯誤只警告一次，避免幾百張圖同時失敗時洗版 console。
  private static networkErrorWarned = false;
  private negativeCache = new Set<string>();                 // 404 URLs (in-memory + localStorage)

  constructor() {
    if (typeof window !== 'undefined') this.loadNegativeCache();
  }

  private loadNegativeCache() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(NEG_CACHE_PREFIX)) {
          try {
            const originalUrl = atob(key.substring(NEG_CACHE_PREFIX.length));
            this.negativeCache.add(originalUrl);
          } catch (e) {
            console.error('Failed to decode negative cache key:', key, e);
          }
        }
      }
    } catch (e) {
      console.error('Error loading negative cache from localStorage:', e);
    }
  }

  // Main entry: returns an object URL (from cache) or null on 404/error
  async getImageObjectUrl(url: string): Promise<string | null> {
    if (!url) return null;
    
    const key = this.normalizeUrl(url);
    if (this.negativeCache.has(key)) return null;
    if (this.objectUrlMap.has(key)) return this.objectUrlMap.get(key)!;

    if (typeof caches === 'undefined') return url; // Fallback for environments without Cache API

    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(key);
      
      if (cached) {
        const blob = await cached.blob();
        if (blob.size === 0) {
          // Stale/corrupt cache entry — delete and re-fetch
          await cache.delete(key);
        } else {
          const objUrl = URL.createObjectURL(blob);
          this.objectUrlMap.set(key, objUrl);
          return objUrl;
        }
      }

      // Fetch from server (only on cache miss)
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 404) {
            this.markFailed(key);
          }
          return null;
        }
        
        // Store in Cache API
        await cache.put(key, res.clone());
        
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        this.objectUrlMap.set(key, objUrl);
        return objUrl;
      } catch (err) {
        // 網路錯誤（主機連不上）與 404（圖片不存在）在呼叫端都是 null，兩者無法分辨；
        // 圖片主機整個掛掉時，每個角色都會被判定成「沒有圖片」，頁面就變成空的而且
        // 完全沒有線索。這裡不標記 negative cache（可能只是暫時性），但要留下一次警告。
        if (!ImageCacheService.networkErrorWarned) {
          ImageCacheService.networkErrorWarned = true;
          console.warn(
            '⚠️ 圖片請求發生網路錯誤（不是 404），圖片主機可能連不上：', url, err
          );
        }
        return null;
      }
    } catch (e) {
      console.error('Cache API error:', e);
      return url;
    }
  }

  async preloadImages(names: string[], baseUrl: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const promises = names.map(name => {
      const url = `${baseUrl.replace(/\/$/, '')}/${name}.png`;
      return this.getImageObjectUrl(url);
    });
    
    await Promise.allSettled(promises);
  }

  async clearCache(): Promise<void> {
    if (typeof caches !== 'undefined') {
      await caches.delete(CACHE_NAME);
    }
    
    // Revoke all created object URLs to free memory
    this.objectUrlMap.forEach(url => URL.revokeObjectURL(url));
    this.objectUrlMap.clear();
    
    // Clear negative cache
    this.negativeCache.clear();
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(NEG_CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }

  private normalizeUrl(url: string): string {
    return url.split('?')[0];  // strip timestamp query
  }

  private markFailed(key: string) {
    this.negativeCache.add(key);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(NEG_CACHE_PREFIX + btoa(key), '1');
      } catch (e) {
        // LocalStorage might be full or private mode
      }
    }
  }
}

export const imageCacheService = new ImageCacheService();
