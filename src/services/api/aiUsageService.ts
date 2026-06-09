import { apiService } from './apiService';
import { config } from '../core/config';
import { SERVICE_KEYS } from '../../common/constants/serviceKeys';

export interface AiTokenUsageSummary {
  period: string;
  aiProvider: string;
  modelName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  callCount: number;
}

export interface AiUsageSummaryResponse {
  today: AiTokenUsageSummary[];
  thisMonth: AiTokenUsageSummary[];
}

class AiUsageService {
  async getSummary(): Promise<AiUsageSummaryResponse> {
    const response = await apiService.makeRequest<AiUsageSummaryResponse>(
      config.api?.baseUrl || '', '/ai-usage/summary', 'GET', undefined,
      { serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }

  async getDailySummary(days = 30): Promise<AiTokenUsageSummary[]> {
    const response = await apiService.makeRequest<AiTokenUsageSummary[]>(
      config.api?.baseUrl || '', `/ai-usage/daily?days=${days}`, 'GET', undefined,
      { serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }

  async getMonthlySummary(months = 12): Promise<AiTokenUsageSummary[]> {
    const response = await apiService.makeRequest<AiTokenUsageSummary[]>(
      config.api?.baseUrl || '', `/ai-usage/monthly?months=${months}`, 'GET', undefined,
      { serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }
}

export const aiUsageService = new AiUsageService();
