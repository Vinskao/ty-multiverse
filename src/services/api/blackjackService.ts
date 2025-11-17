// Blackjack 遊戲服務
import { apiService } from './apiService';
import { config } from '../core/config';

export interface GameState {
  playerCards: string[];
  dealerCards: string[];
  playerScore: number;
  dealerScore: number;
  gameOver: boolean;
  winner: string | null;
  [key: string]: any;
}

export interface GameStatus {
  available: boolean;
  message?: string;
}

class BlackjackService {
  private baseUrl: string;

  constructor() {
    // 使用 Gateway URL（優先）
    this.baseUrl = `${config.api.gatewayUrl || config.api.baseUrl}/blackjack`;
  }
  /**
   * 統一的 API 請求方法
   */
  private async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    options?: { auth?: boolean; headers?: Record<string, string> }
  ): Promise<T> {
    const { auth = true, headers = {} } = options || {};
    
    return apiService.makeRequestData<T>(this.baseUrl, endpoint, method, body, {
      auth,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }



  /**
   * 檢查遊戲服務狀態
   */
  async checkStatus(): Promise<GameStatus> {
    try {
      return await this.makeRequest<GameStatus>('/status', 'GET', undefined, { auth: false });
    } catch (error) {
      return { available: false, message: 'Service unavailable' };
    }
  }

  /**
   * 開始新遊戲
   */
  async startGame(): Promise<GameState> {
    return await this.makeRequest<GameState>('/start', 'POST');
  }

  /**
   * 玩家要牌
   */
  async hit(): Promise<GameState> {
    return await this.makeRequest<GameState>('/hit', 'POST');
  }

  /**
   * 玩家停牌
   */
  async stand(): Promise<GameState> {
    return await this.makeRequest<GameState>('/stand', 'POST');
  }

  /**
   * 獲取遊戲狀態
   */
  async getGameState(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${this.baseUrl}/state`,
      method: 'GET',
      auth: true
    });
    return response.data;
  }

  /**
   * 結束遊戲
   */
  async endGame(): Promise<void> {
    await apiService.request({
      url: `${this.baseUrl}/end`,
      method: 'POST',
      auth: true
    });
  }
}

export const blackjackService = new BlackjackService();

