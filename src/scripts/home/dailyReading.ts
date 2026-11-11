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

export type DailyReadingBlock = { kind: 'heading' | 'paragraph'; text: string };

const SENTENCES_PER_PARAGRAPH = 3;

/**
 * Body of the homepage daily reading. The approved piece has two versions: `reading` is laid out for readers
 * (blank-line paragraphs, one-line `## ` headings) and `content` is the speech script (commas and full stops only,
 * no paragraphs). Older pieces have no reading version, so their script is cut every few sentences.
 */
export function dailyReadingBlocks(item: { reading?: string | null; content?: string | null } | null | undefined): DailyReadingBlock[] {
  const reading = item?.reading?.replace(/\r\n/g, '\n').trim();
  if (reading) {
    return reading.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean).map(block =>
      block.startsWith('## ') && !block.includes('\n')
        ? { kind: 'heading' as const, text: block.slice(3).trim() }
        : { kind: 'paragraph' as const, text: block });
  }
  const content = item?.content?.trim();
  if (!content) return [];
  const sentences = content.match(/[^。]+。?/g) ?? [content];
  const blocks: DailyReadingBlock[] = [];
  for (let index = 0; index < sentences.length; index += SENTENCES_PER_PARAGRAPH) {
    blocks.push({ kind: 'paragraph', text: sentences.slice(index, index + SENTENCES_PER_PARAGRAPH).join('') });
  }
  return blocks;
}
