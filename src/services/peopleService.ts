/*
 * People Service - 處理 People 模組的 Producer APIs
 */

import { apiService } from './apiService';
import type { ApiResponse, BackendApiResponse } from './apiService';
import { config } from './config';

// 類型定義
export interface Person {
  name: string;
  age: number;
  level: number;
  attributes?: string;
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

  // 基本 API 請求方法
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
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

  // 輪詢狀態直到完成
  private async pollUntilComplete(
    requestId: string,
    maxAttempts: number = 30,
    interval: number = 2000
  ): Promise<RequestStatus> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          attempts++;
          const response = await this.makeRequest<RequestStatus>(`/tymg/api/request-status/${requestId}`);

          if (response.data.status === 'SUCCESS' || response.data.status === 'ERROR') {
            resolve(response.data);
          } else if (attempts >= maxAttempts) {
            reject(new Error(`輪詢超時，請求ID: ${requestId}`));
          } else {
            // 繼續輪詢
            setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
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
   */
  async getAllPeopleNamesAndWait(): Promise<string[]> {
    try {
      // 1. 发起异步请求获取所有角色
      const producerResponse = await this.getAllPeople();

      // 2. 轮询等待处理完成
      const status = await this.pollUntilComplete(producerResponse.requestId);

      if (status.status === 'ERROR') {
        throw new Error(status.message);
      }

      // 3. 获取最终结果
      const result = await this.getPeopleResult<Person[]>(producerResponse.requestId);

      // 4. 提取角色名称
      return result.data.map(person => person.name);
    } catch (error) {
      console.error('獲取角色名稱失敗:', error);
      throw error;
    }
  }

  /**
   * 插入單個角色
   */
  async insertPerson(person: Person): Promise<ProducerResponse> {
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/insert', 'POST', person);
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/update', 'POST', person);
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/insert-multiple', 'POST', people);
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/get-all', 'POST');
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/get-by-name', 'POST', { name });
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/people/delete-all', 'POST');
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/weapons');
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
    const response = await this.makeRequest<BackendApiResponse<any>>('/weapons', 'POST', weapon);
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
    const response = await this.makeRequest<BackendApiResponse<any>>(`/people/damageWithWeapon?name=${encodeURIComponent(personName)}`);
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
   * 查詢請求狀態
   */
  async getRequestStatus(requestId: string): Promise<RequestStatus> {
    const response = await this.makeRequest<RequestStatus>(`/api/request-status/${requestId}`);
    return response.data;
  }

  /**
   * 檢查請求是否存在
   */
  async checkRequestExists(requestId: string): Promise<{ requestId: string; exists: boolean }> {
    const response = await this.makeRequest<{ requestId: string; exists: boolean }>(`/api/request-status/${requestId}/exists`);
    return response.data;
  }

  /**
   * 移除請求狀態
   */
  async removeRequestStatus(requestId: string): Promise<{ requestId: string; removed: boolean; message: string }> {
    const response = await this.makeRequest<{ requestId: string; removed: boolean; message: string }>(`/api/request-status/${requestId}`, 'DELETE');
    return response.data;
  }

  // 5. 結果查詢 APIs

  /**
   * 查詢異步處理結果
   */
  async getPeopleResult<T = any>(requestId: string): Promise<ResultResponse<T>> {
    const response = await this.makeRequest<ResultResponse<T>>(`/async/result/${requestId}`);
    return response.data;
  }

  /**
   * 檢查結果是否存在
   */
  async checkResultExists(requestId: string): Promise<{ requestId: string; exists: boolean; message: string }> {
    const response = await this.makeRequest<{ requestId: string; exists: boolean; message: string }>(`/async/result/${requestId}/exists`);
    return response.data;
  }

  /**
   * 清理結果
   */
  async cleanupResult(requestId: string): Promise<{ requestId: string; removed: boolean; message: string }> {
    const response = await this.makeRequest<{ requestId: string; removed: boolean; message: string }>(`/async/result/${requestId}`, 'DELETE');
    return response.data;
  }

  // 6. 高級方法 - 完整的異步處理流程

  /**
   * 插入角色並等待結果
   */
  async insertPersonAndWait(person: Person): Promise<Person> {
    const producerResponse = await this.insertPerson(person);
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<Person>(producerResponse.requestId);
    return result.data;
  }

  /**
   * 獲取所有角色並等待結果
   */
  async getAllPeopleAndWait(): Promise<Person[]> {
    const producerResponse = await this.getAllPeople();
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<Person[]>(producerResponse.requestId);
    return result.data;
  }

  /**
   * 根據名稱查詢角色並等待結果
   */
  async getPersonByNameAndWait(name: string): Promise<Person> {
    const producerResponse = await this.getPersonByName(name);
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<Person>(producerResponse.requestId);
    return result.data;
  }

  /**
   * 獲取所有武器並等待結果
   */
  async getAllWeaponsAndWait(): Promise<Weapon[]> {
    const producerResponse = await this.getAllWeapons();
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<Weapon[]>(producerResponse.requestId);
    return result.data;
  }

  /**
   * 計算傷害並等待結果
   */
  async calculateDamageAndWait(personName: string): Promise<DamageCalculation> {
    const producerResponse = await this.calculateDamage(personName);
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<DamageCalculation>(producerResponse.requestId);
    return result.data;
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
    const producerResponse = await this.insertMultiplePeople(people);
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
    
    const result = await this.getPeopleResult<Person[]>(producerResponse.requestId);
    return result.data;
  }

  /**
   * 刪除所有角色並等待結果
   */
  async deleteAllPeopleAndWait(): Promise<void> {
    const producerResponse = await this.deleteAllPeople();
    const status = await this.pollUntilComplete(producerResponse.requestId);
    
    if (status.status === 'ERROR') {
      throw new Error(status.message);
    }
  }
}

export const peopleService = new PeopleService();
