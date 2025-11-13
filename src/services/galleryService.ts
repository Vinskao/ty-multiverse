/*
 * Gallery Service - 處理 Gallery 模組的 API 調用
 */

import { apiService } from './apiService';
import type { ApiResponse } from './apiService';
import { config } from './config';

// 類型定義
export interface GalleryImage {
  id: number;
  imageBase64: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GallerySaveRequest {
  imageBase64: string;
}

export interface GalleryUpdateRequest {
  id: number;
  imageBase64?: string;
}

export interface GalleryDeleteRequest {
  id: number;
}

class GalleryService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api?.baseUrl || '';
  }

  // 基本 API 請求方法
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return apiService.request({
      url,
      method,
      body,
      auth: true,
    });
  }

  // Gallery APIs

  /**
   * 保存圖片
   */
  async saveImage(request: GallerySaveRequest): Promise<GalleryImage> {
    const response = await this.makeRequest<GalleryImage>('/gallery/save', 'POST', request);
    return response.data;
  }

  /**
   * 獲取所有圖片
   */
  async getAllImages(): Promise<GalleryImage[]> {
    const response = await this.makeRequest<GalleryImage[]>('/gallery/getAll', 'POST');
    return response.data;
  }

  /**
   * 根據ID獲取圖片
   */
  async getImageById(id: number): Promise<GalleryImage> {
    const response = await this.makeRequest<GalleryImage>(`/gallery/getById?id=${id}`);
    return response.data;
  }

  /**
   * 更新圖片
   */
  async updateImage(request: GalleryUpdateRequest): Promise<GalleryImage> {
    const response = await this.makeRequest<GalleryImage>('/gallery/update', 'POST', request);
    return response.data;
  }

  /**
   * 刪除圖片
   */
  async deleteImage(request: GalleryDeleteRequest): Promise<void> {
    await this.makeRequest('/gallery/delete', 'POST', request);
  }
}

export const galleryService = new GalleryService();
