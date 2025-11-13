/*
 * Sync Service - 處理數據同步 API 調用
 */

import { apiService } from './apiService';
import type { ApiResponse, BackendApiResponse } from './apiService';
import { config } from './config';

// 類型定義
export interface SyncCharactersRequest {
  [key: string]: any; // 角色數據數組
}

export interface SyncCharactersResponse {
  success: boolean;
  message: string;
  result?: any;
  characterCount: number;
}

class SyncService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api?.baseUrl || '';
  }

  // 基本 API 請求方法
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    timeout?: number
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    return apiService.request({
      url,
      method,
      body,
      auth: false, // 這個 API 不需要認證
      timeout,
    });
  }

  // Sync APIs

  /**
   * 同步角色數據到 Google Apps Script
   */
  async syncCharactersToGoogleAppsScript(characters: any[]): Promise<SyncCharactersResponse> {
    const response = await this.makeRequest<SyncCharactersResponse>(
      '/api/sync-characters',
      'POST',
      characters,
      60000 // 60秒超時
    );
    return response.data;
  }
}

export const syncService = new SyncService();
