/** Episode title for the homepage daily reading; null when there is nothing worth showing. */
const DATED_DEFAULT = /^每日市場精讀｜\d{4}\/\d{2}\/\d{2}$/;

export function dailyReadingTitle(item: { title?: string | null } | null | undefined): string | null {
  const title = item?.title?.trim();
  if (!title || DATED_DEFAULT.test(title)) return null;
  return title;
}
