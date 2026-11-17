export function marketHeat(values: number[]): string {
  if (values.length < 2 || values.some(v => !Number.isFinite(v) || v <= 0)) return '';
  let streak = 0;
  for (let i = values.length - 1; i > 0 && values[i] < values[i - 1]; i--) streak++;
  if (streak >= 3) return `加權指數連跌 ${streak} 個交易日`;
  const change = (values.at(-1)! / values.at(-2)! - 1) * 100;
  if (change <= -3) return '加權指數單日急跌超過 3%';
  if (change >= 3) return '加權指數強勢反彈超過 3%';
  return '';
}
