import { storageService } from './storageService';

interface ServiceBlockState {
  blockedAt: number;
  lastChecked: number;
}

const STORAGE_PREFIX = 'svc_block_';
const RECOVERY_INTERVAL_MS = 24 * 60 * 60 * 1000;

class ServiceAvailabilityManager {
  private static instance: ServiceAvailabilityManager;
  private registry = new Map<string, string>();
  private listeners = new Map<string, ((available: boolean) => void)[]>();

  static getInstance(): ServiceAvailabilityManager {
    if (!ServiceAvailabilityManager.instance) {
      ServiceAvailabilityManager.instance = new ServiceAvailabilityManager();
    }
    return ServiceAvailabilityManager.instance;
  }

  register(key: string, healthEndpoint: string): void {
    this.registry.set(key, healthEndpoint);
  }

  block(key: string): void {
    const existing = this.getState(key);
    const state: ServiceBlockState = {
      blockedAt: existing?.blockedAt ?? Date.now(),
      lastChecked: Date.now(),
    };
    storageService.set(STORAGE_PREFIX + key, state);
    this.emit(key, false);
  }

  isBlocked(key: string): boolean {
    return storageService.get(STORAGE_PREFIX + key) !== null;
  }

  unblock(key: string): void {
    storageService.remove(STORAGE_PREFIX + key);
    this.emit(key, true);
  }

  async checkRecovery(key: string): Promise<void> {
    const state = this.getState(key);
    if (!state) return;
    if (Date.now() - state.lastChecked < RECOVERY_INTERVAL_MS) return;

    const endpoint = this.registry.get(key);
    if (!endpoint) return;

    const updated: ServiceBlockState = { ...state, lastChecked: Date.now() };
    storageService.set(STORAGE_PREFIX + key, updated);

    try {
      const res = await fetch(endpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (res.status !== 503) this.unblock(key);
    } catch {
      // 仍然不可達，維持 block
    }
  }

  onChange(key: string, cb: (available: boolean) => void): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(cb);
    return () => {
      const list = this.listeners.get(key);
      if (list) {
        const idx = list.indexOf(cb);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  private getState(key: string): ServiceBlockState | null {
    return storageService.get<ServiceBlockState>(STORAGE_PREFIX + key);
  }

  private emit(key: string, available: boolean): void {
    this.listeners.get(key)?.forEach(cb => cb(available));
  }
}

export const serviceAvailabilityManager = ServiceAvailabilityManager.getInstance();
