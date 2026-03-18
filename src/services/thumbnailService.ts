/**
 * Thumbnail Service - Handles circular cropping and caching of images
 */

class ThumbnailService {
  private cache: Map<string, string> = new Map();
  private storageKeyPrefix = 'qabot_thumb_';

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

    try {
      const dataUrl = await this.createCircularThumbnail(url);
      this.cache.set(name, dataUrl);
      this.saveToStorage(name, dataUrl);
      return dataUrl;
    } catch (error) {
      console.error(`Failed to create thumbnail for ${name}:`, error);
      return url; // Fallback to original URL
    }
  }

  private createCircularThumbnail(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document is not defined (not in browser)'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Support CORS
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Create circular path
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image centered and cropped
        const dx = (img.width - size) / 2;
        const dy = (img.height - size) / 2;
        ctx.drawImage(img, dx, dy, size, size, 0, 0, size, size);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
      img.src = url;
    });
  }

  clearCache() {
    this.cache.clear();
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
