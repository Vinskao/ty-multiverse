/**
 * Thumbnail Service - Handles circular cropping and caching of images
 */

class ThumbnailService {
  private cache: Map<string, string> = new Map();
  private rectCache: Map<string, string> = new Map();
  private failedThumbnails: Set<string> = new Set();
  private storageKeyPrefix = 'qabot_thumb_';
  private rectStorageKeyPrefix = 'group_thumb_v2_'; // v2 = PNG contain format
  private MAX_THUMB_SIZE = 120; // 壓縮後的直徑

  constructor() {
    // Only attempt to load if window and localStorage are available
    if (typeof window !== 'undefined' && window.localStorage) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const oldRectPrefix = 'group_thumb_'; // v1 legacy (JPEG, to be purged)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        // Purge old v1 JPEG rect cache
        if (key.startsWith(oldRectPrefix) && !key.startsWith(this.rectStorageKeyPrefix)) {
          keysToRemove.push(key);
          continue;
        }
        if (key.startsWith(this.storageKeyPrefix)) {
          const name = key.replace(this.storageKeyPrefix, '');
          const dataUrl = localStorage.getItem(key);
          if (dataUrl) this.cache.set(name, dataUrl);
        }
        if (key.startsWith(this.rectStorageKeyPrefix)) {
          const name = key.replace(this.rectStorageKeyPrefix, '');
          const dataUrl = localStorage.getItem(key);
          if (dataUrl) this.rectCache.set(name, dataUrl);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to load thumbnails from localStorage', e);
    }
  }

  private saveToStorage(name: string, dataUrl: string) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${this.storageKeyPrefix}${name}`, dataUrl);
      }
    } catch (e) {
      // localStorage might be full
      console.warn('Failed to save thumbnail to localStorage', e);
    }
  }

  /**
   * Get circular thumbnail for a name and URL
   */
  async getThumbnail(name: string, url: string): Promise<string> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    if (this.failedThumbnails.has(name)) {
      return url;
    }

    try {
      const dataUrl = await this.createCircularThumbnail(url, this.MAX_THUMB_SIZE);
      this.cache.set(name, dataUrl);
      this.saveToStorage(name, dataUrl);
      return dataUrl;
    } catch (error) {
      console.warn(`Failed to create thumbnail for ${name}:`, error);
      this.failedThumbnails.add(name);
      return url; // Fallback to original URL
    }
  }

  /**
   * Pre-load multiple thumbnails, skipping those already in cache.
   * Calls onThumbnailLoaded(name) as each new thumbnail finishes loading.
   * If cache is empty (cleared), all thumbnails will be fetched.
   */
  preLoadThumbnailsProgressive(
    names: string[],
    baseUrl: string,
    onThumbnailLoaded?: (name: string) => void
  ): void {
    const uncached = names.filter(name => !this.cache.has(name));
    const cachedCount = names.length - uncached.length;

    console.log(`[Thumbnail] ${cachedCount} cached, fetching ${uncached.length} new thumbnails...`);

    uncached.forEach(name => {
      const url = `${baseUrl}/${encodeURIComponent(name)}.png`;
      this.getThumbnail(name, url)
        .then(() => {
          if (this.cache.has(name)) {
            onThumbnailLoaded?.(name);
          }
        })
        .catch(() => {
          // Already handled in getThumbnail
        });
    });
  }

  /**
   * Check if a thumbnail is successfully cached/available
   */
  isThumbnailAvailable(name: string): boolean {
    return this.cache.has(name);
  }

  /**
   * Returns names that are already cached (no fetch needed)
   */
  getCachedNames(): string[] {
    return Array.from(this.cache.keys());
  }

  private createCircularThumbnail(url: string, targetSize: number = 120): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document is not defined (not in browser)'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Support CORS
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 計算壓縮比例，保持圓形
        const originalSize = Math.min(img.width, img.height);
        const size = Math.min(originalSize, targetSize);

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality after compression
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Create circular path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image centered and cropped + scaled down
        const dx = (img.width - originalSize) / 2;
        const dy = (img.height - originalSize) / 2;
        ctx.drawImage(img, dx, dy, originalSize, originalSize, 0, 0, size, size);

        // 使用較低的質量來節省空間，但通常 png 不支援質量參數，所以我們使用 toDataURL
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
      img.src = url;
    });
  }

  /**
   * Get compressed rectangular image for a name and URL (for Group page cards).
   * Uses Canvas to scale down to targetW x targetH and exports as JPEG.
   */
  async getCompressedRect(name: string, url: string, targetW: number, targetH: number): Promise<string> {
    const cacheKey = `${name}_${targetW}x${targetH}`;
    if (this.rectCache.has(cacheKey)) {
      return this.rectCache.get(cacheKey)!;
    }
    try {
      const dataUrl = await this.createRectThumbnail(url, targetW, targetH);
      this.rectCache.set(cacheKey, dataUrl);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`${this.rectStorageKeyPrefix}${cacheKey}`, dataUrl);
        }
      } catch (e) {
        // localStorage full — skip caching
      }
      return dataUrl;
    } catch {
      return url; // fallback to original
    }
  }

  private createRectThumbnail(url: string, targetW: number, targetH: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document not available'));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Contain scaling: fit within targetW x targetH without cropping
        const scale = Math.min(targetW / img.width, targetH / img.height);
        const dw = Math.round(img.width * scale);
        const dh = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Transparent background — use PNG to preserve alpha
        ctx.clearRect(0, 0, dw, dh);
        ctx.drawImage(img, 0, 0, dw, dh);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }

  async clearCache() {
    this.cache.clear();
    this.rectCache.clear();
    this.failedThumbnails.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix) || key?.startsWith(this.rectStorageKeyPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    
    // Also clear image cache service
    try {
      const { imageCacheService } = await import('./imageCacheService');
      await imageCacheService.clearCache();
    } catch (e) {
      console.error('Failed to clear imageCacheService:', e);
    }
  }
}

export const thumbnailService = new ThumbnailService();
