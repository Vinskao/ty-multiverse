
import { escapeHtml, getPeopleImage, getDefaultAvatar } from '../qabotShared';

export interface ChatModeHandler {
  name: string;
  init(): void;
  onShow(): void;
  onHide(): void;
  handleMessage(text: string): Promise<void>;
  cleanup(): void;
}

export class QABotController {
  // Singleton instance
  private static instance: QABotController;

  // DOM Elements
  public container: HTMLElement;
  public toggleBtn: HTMLElement;
  public messagesEl: HTMLElement;
  public inputEl: HTMLInputElement;
  public sendBtn: HTMLButtonElement;
  public closeBtn: HTMLElement;
  public headerNameEl: HTMLElement;
  public headerAvatarEl: HTMLImageElement;

  // State
  private currentMode: 'v1' | 'v2' = 'v1';
  private handlers: Map<string, ChatModeHandler> = new Map();
  private isOpen: boolean = false;

  private constructor() {
    this.container = document.getElementById('qaBotContainer') as HTMLElement;
    this.toggleBtn = document.getElementById('qaBotToggle') as HTMLElement;
    this.messagesEl = document.getElementById('chatMessages') as HTMLElement;
    this.inputEl = document.getElementById('userInput') as HTMLInputElement;
    this.sendBtn = document.getElementById('sendButton') as HTMLButtonElement;
    this.closeBtn = document.getElementById('closeButton') as HTMLElement;
    
    // Header elements
    this.headerNameEl = this.container?.querySelector('.header-text h3') as HTMLElement;
    this.headerAvatarEl = this.container?.querySelector('.header-avatar') as HTMLImageElement;

    this.initGlobalEvents();
  }

  public static getInstance(): QABotController {
    if (!QABotController.instance) {
      QABotController.instance = new QABotController();
    }
    return QABotController.instance;
  }

  public registerHandler(mode: string, handler: ChatModeHandler) {
    this.handlers.set(mode, handler);
    handler.init();
  }

  private initGlobalEvents() {
    // Toggle Button
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleChat();
      });
    }

    // Close Button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeChat();
      });
    }

    // Send Button & Input
    if (this.sendBtn && this.inputEl) {
      const sendMessage = () => {
        const text = this.inputEl.value.trim();
        if (!text) return;
        
        const handler = this.handlers.get(this.currentMode);
        if (handler) {
          handler.handleMessage(text);
          this.inputEl.value = '';
        }
      };

      this.sendBtn.addEventListener('click', sendMessage);
      this.inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      
      this.inputEl.addEventListener('input', () => {
         this.sendBtn.disabled = !this.inputEl.value.trim();
      });
    }

    // Mode Switching Event
    window.addEventListener('qabot:switch', (e: any) => {
      const newMode = e.detail?.mode;
      if (newMode && this.handlers.has(newMode)) {
        this.switchMode(newMode);
      }
    });
  }

  public toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  public openChat() {
    if (!this.container) return;
    this.container.classList.add('show');
    this.toggleBtn?.classList.add('active'); // Optional: hide toggle or animate it
    this.isOpen = true;
    setTimeout(() => this.inputEl?.focus(), 100);
    
    // Notify current handler
    this.handlers.get(this.currentMode)?.onShow();
  }

  public closeChat() {
    if (!this.container) return;
    this.container.classList.remove('show');
    this.toggleBtn?.classList.remove('active');
    this.isOpen = false;
    
    this.handlers.get(this.currentMode)?.onHide();
  }

  public switchMode(mode: 'v1' | 'v2') {
    if (this.currentMode === mode) return;

    // Hide old handler
    this.handlers.get(this.currentMode)?.onHide();

    // Switch
    this.currentMode = mode;
    (window as any).qabotMode = mode;

    // Show new handler
    this.handlers.get(mode)?.onShow();

    // Update UI if needed (e.g., input placeholder)
    if (mode === 'v2') {
      this.inputEl.placeholder = '問 Maya v2...';
      if(this.headerNameEl) this.headerNameEl.textContent = 'Maya v2';
    } else {
      this.inputEl.placeholder = '問我任何問題...';
      // Header name reset logic might be in V1 handler
    }
    
    // Ensure chat is open
    if (!this.isOpen) {
        this.openChat();
    }
  }

  // Helper: Append Message
  public appendMessage(type: 'user' | 'bot' | 'system', contentHTML: string, avatarUrl?: string, name?: string) {
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    
    let html = '';
    
    if (type !== 'system') {
        const avatarSrc = avatarUrl || (type === 'bot' ? getDefaultAvatar() : '');
        const displayName = name || (type === 'bot' ? 'Maya' : 'You');
        
        if (type === 'bot') {
             html += `
                <div class="message-avatar">
                    <img src="${avatarSrc}" alt="${displayName}" class="bot-avatar" onerror="this.src='${getDefaultAvatar()}'" />
                </div>
            `;
        }
        
        html += `<div class="message-content-wrapper">`;
        if (type === 'bot') {
            html += `<div class="message-header"><span class="ai-name">${displayName}</span></div>`;
        }
        html += `<div class="message-content">${contentHTML}</div>`;
        html += `</div>`;
    } else {
        html = `<div class="message-content system-msg">${contentHTML}</div>`;
    }

    div.innerHTML = html;
    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  
  public showLoading(text: string = '正在思考中...') {
      const id = 'global-loading-msg';
      const existing = document.getElementById(id);
      if(existing) return;
      
      const div = document.createElement('div');
      div.id = id;
      div.className = 'message bot-message loading-message';
      div.innerHTML = `
        <div class="message-avatar">
            <img src="${getDefaultAvatar()}" class="bot-avatar" />
        </div>
        <div class="message-content-wrapper">
             <div class="message-content">
                <div class="loading"><div class="spinner"></div><span>${text}</span></div>
             </div>
        </div>
      `;
      this.messagesEl.appendChild(div);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  
  public hideLoading() {
      const el = document.getElementById('global-loading-msg');
      if(el) el.remove();
  }
}
