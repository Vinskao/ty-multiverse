/*
 * Weapon Service - 處理 Weapon 模組的 API 調用
 */

import { apiService } from './apiService';
import type { ApiResponse, BackendApiResponse } from './apiService';
import { config } from '../core/config';

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

// Weapon APIs

  /**
   * 獲取所有武器
   */
  async getAllWeapons(): Promise<Weapon[]> {
    const response = await apiService.makeRequest<Weapon[]>(config.api?.baseUrl || '', '/weapons');
    return response.data;
  }

  /**
   * 根據名稱獲取武器
   */
  async getWeaponByName(name: string): Promise<Weapon> {
    const response = await apiService.makeRequest<Weapon>(config.api?.baseUrl || '', `/weapons/${encodeURIComponent(name)}`);
    return response.data;
  }

  /**
   * 根據所有者獲取武器
   */
  async getWeaponsByOwner(ownerName: string): Promise<Weapon[]> {
    const response = await apiService.makeRequest<Weapon[]>(config.api?.baseUrl || '', `/weapons/owner/${encodeURIComponent(ownerName)}`);
    return response.data;
  }

  /**
   * 保存武器
   */
  async saveWeapon(weapon: WeaponSaveRequest): Promise<Weapon> {
    const response = await apiService.makeRequest<Weapon>(config.api?.baseUrl || '', '/weapons', 'POST', weapon);
    return response.data;
  }
}

export const weaponService = new WeaponService();
