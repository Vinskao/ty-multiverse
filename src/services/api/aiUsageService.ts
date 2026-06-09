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
  private readonly baseUrl = config.api?.backendUrl || config.api?.baseUrl || '';

  async getSummary(): Promise<AiUsageSummaryResponse> {
    const response = await apiService.makeRequest<AiUsageSummaryResponse>(
      this.baseUrl, '/ai-usage/summary', 'GET', undefined,
      { auth: false, serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }

  async getDailySummary(days = 30): Promise<AiTokenUsageSummary[]> {
    const response = await apiService.makeRequest<AiTokenUsageSummary[]>(
      this.baseUrl, `/ai-usage/daily?days=${days}`, 'GET', undefined,
      { auth: false, serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }

  async getMonthlySummary(months = 12): Promise<AiTokenUsageSummary[]> {
    const response = await apiService.makeRequest<AiTokenUsageSummary[]>(
      this.baseUrl, `/ai-usage/monthly?months=${months}`, 'GET', undefined,
      { auth: false, serviceKey: SERVICE_KEYS.BACKEND }
    );
    return response.data;
  }
}

export const aiUsageService = new AiUsageService();
