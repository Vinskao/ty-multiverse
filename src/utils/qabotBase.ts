// Base class for QA Bot components with shared functionality
import { getOrCreateUserId, escapeHtml } from '../scripts/qabotShared';
import { getErrorMessage } from '../services/core/apiError';

export interface MessageData {
  type: 'user' | 'bot';
  content: string;
  html?: string;
  timestamp?: number;
}

export abstract class QABotBase {
  protected messagesEl: HTMLElement;
  protected userId: string;
  protected pollingTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor(messagesContainerId: string = 'chatMessages') {
    this.messagesEl = document.getElementById(messagesContainerId) as HTMLElement;
    this.userId = getOrCreateUserId('qabot_user_id');
  }

  // ========== Message Handling ==========

  protected appendMessage(content: string | MessageData): void {
    let html: string;

    if (typeof content === 'string') {
      html = content;
    } else {
      const { type, content: messageContent, html: customHtml } = content;
      if (customHtml) {
        html = customHtml;
      } else {
        const escapedContent = this.escapeHtml(messageContent);
        const cssClass = type === 'user' ? 'user-message' : 'bot-message';
        html = `<div class="message ${cssClass}"><div class="message-content"><p>${escapedContent}</p></div></div>`;
      }
    }

    const div = document.createElement('div');
    div.innerHTML = html;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  protected escapeHtml(text: string): string {
    return escapeHtml(text);
  }

  // ========== Loading State Management ==========

  protected showLoadingMessage(customMessage?: string): void {
    const loadingEl = document.getElementById('loadingMessage') as HTMLElement;
    if (!loadingEl) return;

    // Remove any existing loading message
    this.hideLoadingMessage();

    const clone = loadingEl.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.id = 'currentLoadingMessage';

    // Update message if provided
    if (customMessage) {
      const messageEl = clone.querySelector('.loading-text');
      if (messageEl) {
        messageEl.textContent = customMessage;
      }
    }

    this.messagesEl.appendChild(clone);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  protected updateLoadingMessage(message: string): void {
    const loadingEl = document.getElementById('currentLoadingMessage');
    if (!loadingEl) return;

    const messageEl = loadingEl.querySelector('.loading-text');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }

  protected hideLoadingMessage(): void {
    const loadingEl = document.getElementById('currentLoadingMessage');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  // ========== Error Handling ==========

  protected showErrorMessage(message: string): void {
    const errorHtml = `<div class="message bot-message"><div class="message-content"><p style="color:#b91c1c">❌ ${this.escapeHtml(message)}</p></div></div>`;
    this.appendMessage(errorHtml);
  }

  // ========== Polling Management ==========

  protected startPollingTask(taskId: string, callback: () => Promise<void>, interval: number = 2000): void {
    // Clear existing polling for this task
    this.stopPollingTask(taskId);

    const pollTask = async () => {
      try {
        await callback();
        // Continue polling
        this.pollingTasks.set(taskId, setTimeout(pollTask, interval));
      } catch (error) {
        console.error('Polling error:', error);
        this.stopPollingTask(taskId);
        this.showErrorMessage(`輪詢任務失敗: ${getErrorMessage(error)}`);
      }
    };

    // Start polling after initial delay
    this.pollingTasks.set(taskId, setTimeout(pollTask, 1000));
  }

  protected stopPollingTask(taskId: string): void {
    const timeout = this.pollingTasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.pollingTasks.delete(taskId);
    }
  }

  // ========== Cleanup ==========

  public cleanup(): void {
    // Stop all polling tasks
    this.pollingTasks.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.pollingTasks.clear();

    // Hide loading messages
    this.hideLoadingMessage();
  }

  // ========== Abstract Methods (to be implemented by subclasses) ==========

  abstract initialize(): void;
  abstract bindEvents(): void;
}



