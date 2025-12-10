/*
 * Sync Service - 處理數據同步 API 調用
 */

import { apiService } from './apiService';
import type { ApiResponse } from './apiService';
import { config } from '../core/config';

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

export interface SyncArticlesResponse {
  success: boolean;
  message: string;
  result?: any;
  articleCount: number;
  vectorizedCount?: number;
  vectorResult?: any;
  purgedCount?: number;
  purgeResult?: any;
}

export interface ArticlePreview {
  file_path: string;
  title: string;
  file_date: string;
  tags: string[];
  content_length: number;
}

export interface ArticlesPreviewResponse {
  success: boolean;
  articleCount: number;
  articles: ArticlePreview[];
}

class SyncService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api?.baseUrl || '';
  }

  // 基本 API 請求方法（用於外部 API）
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    timeout?: number
  ): Promise<ApiResponse<T>> {
    return apiService.makeRequest<T>(this.baseUrl, endpoint, method, body, { 
      auth: false, // 這個 API 不需要認證
      timeout 
    });
  }

  // 本地 Astro API 請求方法（直接使用 fetch，不經過 apiService）
  private async makeLocalRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    timeout: number = 30000
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'GET' ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      const data = await res.json();

      return {
        status: res.status,
        ok: res.ok,
        data: data as T,
      };
    } catch (err) {
      clearTimeout(timer);
      throw new Error((err as Error)?.message ?? 'Network error');
    }
  }

  // Sync APIs

  /**
   * 同步角色數據到 Google Apps Script
   */
  async syncCharactersToGoogleAppsScript(characters: any[]): Promise<SyncCharactersResponse> {
    const response = await this.makeLocalRequest<SyncCharactersResponse>(
      '/api/sync-characters',
      'POST',
      characters,
      60000 // 60秒超時
    );
    return response.data;
  }

  /**
   * 同步所有 /work 下的文章到後端 batch API
   * @param targetUrl 可選的目標 API URL，預設使用環境變數配置
   */
  async syncArticlesToBackend(targetUrl?: string): Promise<SyncArticlesResponse> {
    const response = await this.makeLocalRequest<SyncArticlesResponse>(
      '/api/sync-articles',
      'POST',
      targetUrl ? { targetUrl } : {},
      120000 // 120秒超時（文章較多時需要更長時間）
    );
    return response.data;
  }

  /**
   * 預覽要同步的文章列表（不實際發送）
   */
  async previewArticles(): Promise<ArticlesPreviewResponse> {
    const response = await this.makeLocalRequest<ArticlesPreviewResponse>(
      '/api/sync-articles',
      'GET'
    );
    return response.data;
  }
}

export const syncService = new SyncService();
