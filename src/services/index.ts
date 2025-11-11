// 統一服務導出文件
// 使用此文件統一導入所有服務

// 核心服務
export { apiService, type ApiRequestOptions, type ApiResponse, ApiError } from './apiService';
export { config, getUrlParams, updateUrlParams } from './config';
export { storageService } from './storageService';

// 管理服務
export { default as ServiceManager } from './serviceManager';
export { default as ErrorService } from './errorService';
export { default as RetryService } from './retryService';
export { default as MonitorService } from './monitorService';

// 業務服務
export { default as CharacterService } from './characterService';
export { default as DamageService } from './damageService';
export { default as PeopleService } from './peopleService';
export { default as WeaponService } from './weaponService';
export { default as GalleryService } from './galleryService';
export { default as SyncService } from './syncService';

// 新增服務
export { qaService, type QARequest, type QAResponse } from './qaService';
export { blackjackService, type GameState, type GameStatus } from './blackjackService';

// 認證服務
export { verifyToken, type AuthResult } from './auth';

// 類型導出
export type { Person, Weapon, ProducerResponse, RequestStatus } from './peopleService';
export type { Weapon as WeaponType, WeaponSaveRequest } from './weaponService';
export type { GalleryImage, GallerySaveRequest, GalleryUpdateRequest } from './galleryService';
export type { SyncCharactersResponse } from './syncService';

