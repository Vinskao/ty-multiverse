// QA 服務
import { apiService } from './apiService';
import { config } from './config';

export interface QARequest {
  text: string;
  user_id: string;
  language: string;
  name: string;
}

export interface QAResponse {
  answer: string;
  confidence?: number;
  sources?: string[];
  [key: string]: any;
}

class QAService {
  private baseUrl: string;

  constructor() {
    // 使用 Gateway URL（優先）
    this.baseUrl = config.api.gatewayUrl || config.api.baseUrl || '';
  }

  /**
   * 查詢 QA 系統
   * @param request QA 請求參數
   * @returns QA 響應
   */
  async query(request: QARequest): Promise<QAResponse> {
    const response = await apiService.request<QAResponse>({
      url: `${this.baseUrl}/maya-sawa/qa/query`,
      method: 'POST',
      body: request,
      auth: true
    });

    return response.data;
  }
}

export const qaService = new QAService();

