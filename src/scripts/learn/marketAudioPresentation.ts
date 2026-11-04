export function marketAudioDateTime(createdAt: string | undefined, language: 'zh' | 'en'): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei', year: 'numeric', month: language === 'zh' ? 'numeric' : 'short',
    day: 'numeric', hour: 'numeric', minute: '2-digit', ...(language === 'zh' ? { hourCycle: 'h23' as const } : { hour12: true })
  };
  const formatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', options);
  if (language === 'zh') {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}（台北時間）`;
  }
  return `${formatter.format(date)} (Taipei time)`;
}
