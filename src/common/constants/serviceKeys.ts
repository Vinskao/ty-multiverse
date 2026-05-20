export const SERVICE_KEYS = {
  BACKEND:   'backend',
  GATEWAY:   'gateway',
  MAYA_SAWA: 'maya-sawa',
  LEETCODE:  'leetcode-stats',
} as const;

export type ServiceKey = typeof SERVICE_KEYS[keyof typeof SERVICE_KEYS];
