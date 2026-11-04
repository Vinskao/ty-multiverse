export type MarketPresenter = {
  id: 'maya' | 'uiobbeci';
  displayName: string;
  videoFile: string;
  voice: string;
};

export type MarketPresenterSettings = {
  maya: { id: 'maya'; name: string; videoFile: string; voice: string };
  uiobbeci: { id: 'uiobbeci'; name: string; videoFile: string; voice: string };
  weeklyPresenterIds: string[];
};

export const MARKET_PRESENTER_CONFIG: Record<'maya' | 'uiobbeci', MarketPresenter> = {
  maya: { id: 'maya', displayName: 'Maya', videoFile: '', voice: '' },
  uiobbeci: { id: 'uiobbeci', displayName: 'Uiobbeci', videoFile: '', voice: '' },
};
export const WEEKLY_PRESENTER_IDS: string[] = [];

export function applyMarketPresenterSettings(settings?: MarketPresenterSettings): void {
  if (!settings || settings.weeklyPresenterIds.length !== 7
      || !settings.weeklyPresenterIds.every(id => id in MARKET_PRESENTER_CONFIG)) return;
  for (const id of ['maya', 'uiobbeci'] as const) {
    Object.assign(MARKET_PRESENTER_CONFIG[id], { displayName: settings[id].name, videoFile: settings[id].videoFile, voice: settings[id].voice });
  }
  WEEKLY_PRESENTER_IDS.splice(0, WEEKLY_PRESENTER_IDS.length, ...settings.weeklyPresenterIds);
}

export function marketPresenterForDate(date: Date): MarketPresenter {
  const day = date.getDay();
  const id = WEEKLY_PRESENTER_IDS[day];
  return MARKET_PRESENTER_CONFIG[id as keyof typeof MARKET_PRESENTER_CONFIG];
}

export function marketPresenterForVoice(voice: string | undefined): MarketPresenter {
  return voice === MARKET_PRESENTER_CONFIG.uiobbeci.voice ? MARKET_PRESENTER_CONFIG.uiobbeci : MARKET_PRESENTER_CONFIG.maya;
}
