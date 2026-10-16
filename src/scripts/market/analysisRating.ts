// Rating of a saved AI analysis, read from its conclusion line; covered by tests/market/analysisRating.test.ts.

export type AnalysisRating = 'buy' | 'neutral' | 'sell';

const CONCLUSION = /(結論|Conclusion|Rating)/i;
// The research prompt's own template text "買／中立／賣" is not a rating.
const TEMPLATE = /買\s*[／/]\s*中立\s*[／/]\s*賣/g;
const RATING = /(中立|買|賣|Neutral|Hold|Buy|Sell)/i;

// The first rating word after the conclusion marker wins; later mentions are conditions ("…即轉賣").
export function analysisRating(content: string | null | undefined): AnalysisRating | null {
    const text = String(content || '');
    const marker = CONCLUSION.exec(text);
    if (!marker) return null;
    const line = text.slice(marker.index + marker[0].length).split('\n')[0].replace(TEMPLATE, '');
    const word = RATING.exec(line)?.[1].toLowerCase();
    if (!word) return null;
    return word === '買' || word === 'buy' ? 'buy' : word === '賣' || word === 'sell' ? 'sell' : 'neutral';
}
