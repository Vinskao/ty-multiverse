/*
 * People Service - 處理 People 模組的 Producer APIs
 */

import { apiService, ApiError } from './apiService';
import type { ApiResponse, BackendApiResponse } from './apiService';
import { config } from '../core/config';

// 類型定義
export interface Person {
  // Primary key
  name: string;

  // Basic info
  nameOriginal?: string;
  codeName?: string;

  // Powers
  physicPower?: number;
  magicPower?: number;
  utilityPower?: number;

  // Personal details
  dob?: string;
  race?: string;
  attributes?: string;
  gender?: string;
  assSize?: string;
  boobsSize?: string;
  heightCm?: number;
  weightKg?: number;

  // Professional info
  profession?: string;
  combat?: string;
  favoriteFoods?: string;
  job?: string;
  physics?: string;
  knownAs?: string;
  personality?: string;

  // Interests
  interest?: string;
  likes?: string;
  dislikes?: string;
  concubine?: string;

  // Affiliations
  faction?: string;
  armyId?: number;
  armyName?: string;
  deptId?: number;
  deptName?: string;
  originArmyId?: number;
  originArmyName?: string;

  // Other
  gaveBirth?: boolean;
  email?: string;
  age?: number;
  proxy?: string;

  // Attributes (JSON strings)
  baseAttributes?: string;
  bonusAttributes?: string;
  stateAttributes?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  version?: number;

  // For compatibility
  level?: number; // Legacy field, can be derived from powers
}

export interface Weapon {
  name: string;
  owner: string;
  attributes: string;
  baseDamage: number;
}

export interface ProducerResponse {
  requestId: string;
  status: 'processing' | 'PENDING';
  message: string;
}

export interface RequestStatus {
  requestId: string;
  status: 'SUCCESS' | 'ERROR' | 'PROCESSING';
  message: string;
  data?: any;
  timestamp: number;
}

export interface ResultResponse<T = any> {
  requestId: string;
  status: string;
  data: T;
  message: string;
}

export interface DamageCalculation {
  personName: string;
  weaponName: string;
  baseDamage: number;
  finalDamage: number;
  modifiers: any;
}

class PeopleService {
  private baseUrl: string;
  private pollingTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.baseUrl = config.api?.baseUrl || '';
  }

/**
   * 使用輪詢方式等待異步處理結果
   */
  private async waitForResult(requestId: string, options?: { maxAttempts?: number; interval?: number }): Promise<RequestStatus> {
    const maxAttempts = options?.maxAttempts ?? 30;
    const interval = options?.interval ?? 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.getRequestStatus(requestId);
        if (status.status === 'SUCCESS' || status.status === 'ERROR') {
          return status;
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          throw error;
        }
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`等待結果超時，requestId=${requestId}`);
  }

  // 1. People 模組 APIs

  /**
   * 獲取所有角色名稱
   */
  async getAllPeopleNames(): Promise<string[]> {
    // 由于后端现在是异步处理，我们需要等待结果
    return this.getAllPeopleNamesAndWait();
  }

  /**
   * 獲取所有角色名稱並等待結果（異步處理）
   * 
   * 注意：如果通過 Gateway (PUBLIC_TYMG_URL)，應該使用 /people/names，
   * Gateway 的 AsyncPeopleProxyController 會自動等待異步結果並返回數據。
   * 如果直接訪問 Backend (PUBLIC_TYMB_URL)，則需要手動處理異步響應。
   */
  async getAllPeopleNamesAndWait(): Promise<string[]> {
    try {
      // 檢查是否通過 Gateway（Gateway 有專門的 /people/names 端點，會自動等待結果）
      const isGateway = this.baseUrl.includes('/tymg') || this.baseUrl.includes('8082');
      
      if (isGateway) {
        // 通過 Gateway：使用 /people/names，Gateway 會自動等待異步結果
        const response = await apiService.makeRequest<string[]>(this.baseUrl, '/people/names', 'GET');
        
        // Gateway 的 AsyncPeopleProxyController 會直接返回數據（不是 202）
        if (Array.isArray(response.data)) {
          return response.data;
        }
        
        // 如果 backendResponse 中有 data
        if (response.backendResponse?.data && Array.isArray(response.backendResponse.data)) {
          return response.backendResponse.data;
        }
        
        throw new Error('Gateway 返回的數據格式錯誤');
      } else {
        // 直接訪問 Backend：需要手動處理異步響應
        const response = await apiService.makeRequest<BackendApiResponse<any>>(this.baseUrl, '/people/names', 'GET');
        
        // 檢查是否是異步響應（202）
        if (response.backendResponse?.code === 202 && response.backendResponse?.requestId) {
          // 輪詢結果
          const requestId = response.backendResponse.requestId;
          const result = await this.waitForResult(requestId, { maxAttempts: 30, interval: 1000 });
          
          if (result.status === 'SUCCESS' && result.data) {
            return Array.isArray(result.data) ? result.data : [];
          } else {
            throw new Error(result.message || '獲取角色名稱失敗');
          }
        }
        
        // 如果是直接返回的數據
        if (Array.isArray(response.data)) {
          return response.data;
        }
        
        // 如果 backendResponse 中有 data
        if (response.backendResponse?.data && Array.isArray(response.backendResponse.data)) {
          return response.backendResponse.data;
        }
        
        throw new Error('無法解析角色名稱列表');
      }
    } catch (error) {
      console.error('獲取角色名稱失敗:', error);
      throw error;
    }
  }

  /**
   * 插入單個角色
   */
  async insertPerson(person: Person): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>(this.baseUrl, '/people/insert', 'POST', person);
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 更新角色
   */
  async updatePerson(person: Person): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>(this.baseUrl, '/people/update', 'POST', person);
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 批量插入角色
   */
  async insertMultiplePeople(people: Person[]): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>(this.baseUrl, '/people/insert-multiple', 'POST', people);
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 獲取所有角色
   */
  async getAllPeople(): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>(this.baseUrl, '/people/get-all', 'POST');
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 根據名稱查詢角色
   */
  async getPersonByName(name: string): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>('/people/get-by-name', 'POST', { name });
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 刪除所有角色
   */
  async deleteAllPeople(): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>('/people/delete-all', 'POST');
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  // 2. Weapon 模組 APIs

  /**
   * 獲取所有武器
   */
  async getAllWeapons(): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>('/weapons');
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  /**
   * 保存武器
   */
  async saveWeapon(weapon: Weapon): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>('/weapons', 'POST', weapon);
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  // 3. 傷害計算 API

  /**
   * 計算角色武器傷害
   */
  async calculateDamage(personName: string): Promise<ProducerResponse> {
    const response = await apiService.makeRequest<BackendApiResponse<any>>(`/people/damageWithWeapon?name=${encodeURIComponent(personName)}`);
    const backendResponse = response.data;
    
    // Map BackendApiResponse (202) to ProducerResponse format
    return {
      requestId: backendResponse.requestId!,
      status: 'processing',
      message: backendResponse.message
    };
  }

  // 4. 狀態查詢 APIs

  /**
   * 查詢請求狀態（使用異步結果端點）
   */
  async getRequestStatus(requestId: string): Promise<RequestStatus> {
    const response = await apiService.makeRequest<ResultResponse<any>>(this.baseUrl, `/api/async/result/${requestId}`, 'GET');
    const result = response.data;
    return {
      requestId,
      status: result.status === 'completed' ? 'SUCCESS' : result.status === 'failed' ? 'ERROR' : 'PROCESSING',
      message: result.message || '',
      data: result.data,
      timestamp: Date.now()
    };
  }

  /**
   * 檢查請求是否存在
   */
  async checkRequestExists(requestId: string): Promise<{ requestId: string; exists: boolean }> {
    const response = await apiService.makeRequest<{ requestId: string; exists: boolean; message: string }>(this.baseUrl, `/api/async/result/${requestId}/exists`);
    return {
      requestId,
      exists: response.data.exists
    };
  }

  /**
   * 移除請求狀態
   */
  async removeRequestStatus(requestId: string): Promise<{ requestId: string; removed: boolean; message: string }> {
    const response = await apiService.makeRequest<{ requestId: string; removed: boolean; message: string }>(this.baseUrl, `/api/async/result/${requestId}`, 'DELETE');
    return response.data;
  }

  // 5. 結果查詢 APIs

  /**
   * 查詢異步處理結果
   */
  async getPeopleResult<T = any>(requestId: string): Promise<ResultResponse<T>> {
    const response = await apiService.makeRequest<ResultResponse<T>>(`/async/result/${requestId}`);
    return response.data;
  }

  /**
   * 檢查結果是否存在
   */
  async checkResultExists(requestId: string): Promise<{ requestId: string; exists: boolean; message: string }> {
    const response = await apiService.makeRequest<{ requestId: string; exists: boolean; message: string }>(this.baseUrl, `/async/result/${requestId}/exists`);
    return response.data;
  }

  /**
   * 清理結果
   */
  async cleanupResult(requestId: string): Promise<{ requestId: string; removed: boolean; message: string }> {
    const response = await apiService.makeRequest<{ requestId: string; removed: boolean; message: string }>(this.baseUrl, `/async/result/${requestId}`, 'DELETE');
    return response.data;
  }

  // 6. 高級方法 - 完整的異步處理流程

  /**
   * 插入角色並等待結果
   */
  async insertPersonAndWait(person: Person): Promise<Person> {
    const response = await apiService.makeRequest<Person>(this.baseUrl, '/people/insert', 'POST', person);
    return response.data;
  }

  /**
   * 獲取所有角色並等待結果
   */
  async getAllPeopleAndWait(): Promise<Person[]> {
    const response = await apiService.makeRequest<Person[]>(this.baseUrl, '/people/get-all', 'POST');
    return response.data;
  }

  /**
   * 根據名稱查詢角色並等待結果
   */
  async getPersonByNameAndWait(name: string): Promise<Person> {
    const response = await apiService.makeRequest<Person>(this.baseUrl, '/people/get-by-name', 'POST', { name });
    return response.data;
  }

  /**
   * 獲取所有武器並等待結果
   */
  async getAllWeaponsAndWait(): Promise<Weapon[]> {
    const response = await apiService.makeRequest<Weapon[]>(this.baseUrl, '/people/weapons', 'GET');
    return response.data;
  }

  /**
   * 計算傷害並等待結果
   */
  async calculateDamageAndWait(personName: string): Promise<DamageCalculation> {
    const response = await apiService.makeRequest<DamageCalculation>(this.baseUrl, '/people/damage', 'GET', null, { name: personName });
    return response.data;
  }

  // 7. 工具方法

  /**
   * 清理所有輪詢任務
   */
  cleanup() {
    this.pollingTasks.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pollingTasks.clear();
  }

  /**
   * 批量操作：插入多個角色並等待結果
   */
  async insertMultiplePeopleAndWait(people: Person[]): Promise<Person[]> {
    const response = await apiService.makeRequest<Person[]>(this.baseUrl, '/people/insert-multiple', 'POST', people);
    return response.data;
  }

  /**
   * 刪除所有角色並等待結果
   */
  async deleteAllPeopleAndWait(): Promise<void> {
    await this.makeRequest('/people/delete-all', 'POST');
  }
}

export const peopleService = new PeopleService();
