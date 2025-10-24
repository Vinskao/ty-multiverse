/*
 * Weapon Service - 處理 Weapon 模組的 API 調用
 */

import { apiService, ApiResponse } from './apiService';
import { config } from './config';

// 類型定義
export interface Weapon {
  id?: number;
  name: string;
  owner: string;
  attributes: string;
  baseDamage: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeaponSaveRequest {
  name: string;
  owner: string;
  attributes: string;
  baseDamage: number;
}

class WeaponService {
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

  // Weapon APIs

  /**
   * 獲取所有武器
   */
  async getAllWeapons(): Promise<Weapon[]> {
    const response = await this.makeRequest<Weapon[]>('/api/weapons/index');
    return response.data;
  }

  /**
   * 根據名稱獲取武器
   */
  async getWeaponByName(name: string): Promise<Weapon> {
    const response = await this.makeRequest<Weapon>(`/api/weapons/${encodeURIComponent(name)}`);
    return response.data;
  }

  /**
   * 根據所有者獲取武器
   */
  async getWeaponsByOwner(ownerName: string): Promise<Weapon[]> {
    const response = await this.makeRequest<Weapon[]>(`/api/weapons/owner/${encodeURIComponent(ownerName)}`);
    return response.data;
  }

  /**
   * 保存武器
   */
  async saveWeapon(weapon: WeaponSaveRequest): Promise<Weapon> {
    const response = await this.makeRequest<Weapon>('/tymg/weapons', 'POST', weapon);
    return response.data;
  }
}

export const weaponService = new WeaponService();
