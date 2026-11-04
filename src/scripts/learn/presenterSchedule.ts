export type PresenterId = 'maya' | 'uiobbeci' | 'duo';

// Date is the audio record creation time, interpreted in Taipei.
export function presenterForAudio(createdAt?: string, voice?: string): PresenterId {
  if (voice === 'duo:maya+uiobbeci' || voice === 'test:duo') return 'duo';
  if (voice === 'zh-CN-Xiaoxiao2:DragonHDFlashLatestNeural' || voice === 'test:uiobbeci') return 'uiobbeci';
  if (typeof voice === 'string' && voice) return 'maya';
  const date = createdAt ? new Date(createdAt) : new Date(NaN);
  if (Number.isNaN(date.getTime())) return 'maya';
  const day = new Date(date.getTime() + 8 * 60 * 60 * 1000).getUTCDay();
  return (['duo', 'maya', 'duo', 'maya', 'uiobbeci', 'maya', 'uiobbeci'] as const)[day];
}
