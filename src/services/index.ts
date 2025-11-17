// 統一服務導出文件
// 使用此文件統一導入所有服務

// API 基礎設施
export { apiService, type ApiRequestOptions, type ApiResponse, ApiError } from './api/apiService';

// 核心基礎設施
export { config, getUrlParams, updateUrlParams } from './core/config';
export { storageService } from './core/storageService';

// 管理服務
export { default as ServiceManager } from './core/serviceManager';
export { default as ErrorService } from './core/errorService';
export { default as RetryService } from './core/retryService';
export { default as MonitorService } from './monitoring/monitorService';

// API 業務服務
export { default as CharacterService } from './api/characterService';
export { default as DamageService } from './api/damageService';
export { default as PeopleService } from './api/peopleService';
export { default as WeaponService } from './api/weaponService';
export { default as GalleryService } from './api/galleryService';
export { default as SyncService } from './api/syncService';

// 新增服務
export { qaService, type QARequest, type QAResponse } from './api/qaService';
export { blackjackService, type GameState, type GameStatus } from './api/blackjackService';

// 認證服務
export { verifyToken, type AuthResult } from './api/auth';

// React Hooks
export { default as usePeopleService } from './hooks/usePeopleService';

// 類型導出
export type { Person, Weapon, ProducerResponse, RequestStatus } from './api/peopleService';
export type { Weapon as WeaponType, WeaponSaveRequest } from './api/weaponService';
export type { GalleryImage, GallerySaveRequest, GalleryUpdateRequest } from './api/galleryService';
export type { SyncCharactersResponse } from './api/syncService';
