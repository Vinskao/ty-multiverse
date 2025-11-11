// Blackjack 遊戲服務
import { apiService } from './apiService';
import { config } from './config';

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
   * 檢查遊戲服務狀態
   */
  async checkStatus(): Promise<GameStatus> {
    try {
      const response = await apiService.request<GameStatus>({
        url: `${this.baseUrl}/status`,
        method: 'GET',
        auth: false
      });
      return response.data;
    } catch (error) {
      return { available: false, message: 'Service unavailable' };
    }
  }

  /**
   * 開始新遊戲
   */
  async startGame(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${this.baseUrl}/start`,
      method: 'POST',
      auth: true
    });
    return response.data;
  }

  /**
   * 玩家要牌
   */
  async hit(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${this.baseUrl}/hit`,
      method: 'POST',
      auth: true
    });
    return response.data;
  }

  /**
   * 玩家停牌
   */
  async stand(): Promise<GameState> {
    const response = await apiService.request<GameState>({
      url: `${this.baseUrl}/stand`,
      method: 'POST',
      auth: true
    });
    return response.data;
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

