/**
 * Thumbnail Service - Handles circular cropping and caching of images
 */

class ThumbnailService {
  private cache: Map<string, string> = new Map();
  private failedThumbnails: Set<string> = new Set();
  private storageKeyPrefix = 'qabot_thumb_';
  private MAX_THUMB_SIZE = 120; // 壓縮後的直徑

  constructor() {
    // Only attempt to load if window and sessionStorage are available
    if (typeof window !== 'undefined' && window.sessionStorage) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix)) {
          const name = key.replace(this.storageKeyPrefix, '');
          const dataUrl = sessionStorage.getItem(key);
          if (dataUrl) {
            this.cache.set(name, dataUrl);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load thumbnails from sessionStorage', e);
    }
  }

  private saveToStorage(name: string, dataUrl: string) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`${this.storageKeyPrefix}${name}`, dataUrl);
      }
    } catch (e) {
      // SessionStorage might be full
      console.warn('Failed to save thumbnail to sessionStorage', e);
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
   * Pre-load multiple thumbnails at once
   */
  async preLoadThumbnails(names: string[], baseUrl: string): Promise<void> {
    console.log(`[Thumbnail] Start pre-loading ${names.length} thumbnails...`);
    const promises = names.map(name => {
      const url = `${baseUrl}/${encodeURIComponent(name)}.png`;
      return this.getThumbnail(name, url).catch(() => {
        // Already handled in getThumbnail
      });
    });

    await Promise.all(promises);
    console.log(`[Thumbnail] Pre-loading completed. (Cached: ${this.cache.size}, Failed: ${this.failedThumbnails.size})`);
  }

  /**
   * Check if a thumbnail is successfully cached/available
   */
  isThumbnailAvailable(name: string): boolean {
    // Only show if it's explicitly in the cache (meaning it was successfully loaded and processed)
    return this.cache.has(name);
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

  clearCache() {
    this.cache.clear();
    this.failedThumbnails.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(this.storageKeyPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    }
  }
}

export const thumbnailService = new ThumbnailService();
