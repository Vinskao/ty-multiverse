/** Episode title for the homepage daily reading; null when there is nothing worth showing. */
const DATED_DEFAULT = /^每日市場精讀｜\d{4}\/\d{2}\/\d{2}$/;

export function dailyReadingTitle(item: { title?: string | null } | null | undefined): string | null {
  const title = item?.title?.trim();
  if (!title || DATED_DEFAULT.test(title)) return null;
  return title;
}

// Mirrors maya-sawa config/market-presenters.json, Monday first. A duo day is voiced by Uiobbeci
// (the Maya half is not implemented yet), and the audio greets with that name, so the card does too.
const WEEKDAY_PRESENTERS = ['Maya', 'Uiobbeci', 'Maya', 'Uiobbeci', 'Maya', 'Uiobbeci', 'Uiobbeci'] as const;

export function dailyPresenterName(day: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? '');
  if (!match) return 'Maya';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return 'Maya';
  return WEEKDAY_PRESENTERS[(date.getUTCDay() + 6) % 7];
}
