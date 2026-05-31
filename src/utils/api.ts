import { parseJsonOrThrow } from "../services/core/apiError";

// API 配置和工具函數
const isDev = import.meta.env.DEV;

export const API_CONFIG = {
  // 開發環境用代理，生產環境用完整 URL
  baseURL: isDev
    ? '' // 開發環境：相對路徑，走代理
    : 'https://peoplesystem.tatdvsonorth.com', // 生產環境：完整 URL

  endpoints: {
    // Maya Sawa API (本地後端)
    chatHistory: (userId: string) => `/maya-sawa/qa/chat-history/${userId}`,
    qaQuery: '/maya-sawa/qa/query',
    // Maya Sawa Voyeur API (訪客統計)
    voyeurCount: '/maya-sawa/voyeur/count/',
    voyeurIncrement: '/maya-sawa/voyeur/increment/',
    voyeurPush: '/maya-sawa/voyeur/increment/',
    // Maya V2 API (遠端 API)
    availableModels: '/maya-v2/available-models/',
    askWithModel: '/maya-v2/ask-with-model/',
    taskStatus: (taskId: string) => `/maya-v2/task-status/${taskId}`,
  }
};

// 封裝 fetch 函數
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // ❌ 移除 credentials，因為我們使用 token 認證，不需要 cookies
    // credentials: 'include',
    ...options,
  };

  return fetch(url, defaultOptions);
}

// 常用 API 方法
export const api = {
  // 獲取可用模型
  async getAvailableModels() {
    const cacheKey = 'maya_available_models_cache_v1';
    const cacheTtlMs = 5 * 60 * 1000;

    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - Number(cached.timestamp || 0) < cacheTtlMs) {
          return cached.data;
        }
      }
    } catch (_) {}

    const response = await apiFetch(API_CONFIG.endpoints.availableModels);
    const data = await parseJsonOrThrow(response);

    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        }),
      );
    } catch (_) {}

    return data;
  },

  // 發送問題給 AI 模型
  async askWithModel(payload: {
    question: string;
    model_name: string;
    sync?: boolean;
    use_knowledge_base?: boolean;
  }) {
    const response = await apiFetch(API_CONFIG.endpoints.askWithModel, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return parseJsonOrThrow(response);
  },

  // 檢查任務狀態
  async getTaskStatus(taskId: string) {
    const response = await apiFetch(API_CONFIG.endpoints.taskStatus(taskId));
    return parseJsonOrThrow(response);
  },
};
