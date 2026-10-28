export type ResearchTagId = 'cpo' | 'semiconductor' | 'pcb-electronics' | 'ai-models' | 'ai-server-cloud' | 'cooling' | 'optical' | 'other';
export type ResearchLanguage = 'zh' | 'en';

type ResearchTag = {
  id: ResearchTagId;
  label: Record<ResearchLanguage, string>;
  segments: string[];
  pattern: RegExp;
  groups?: string[];
};

/** Shared labels and aliases for report browsing, stock research groups, and AI claim lookup. */
export const RESEARCH_TAGS: ResearchTag[] = [
  { id: 'cpo', label: { zh: 'CPO／中介層光學', en: 'CPO / Interposer Optics' }, segments: ['cpo'], pattern: /\bcpo\b|co[ -]?packaged optics|interposer optics|中介層光學|共封裝光學|共同封裝光學/, groups: ['cpo', 'cpo-optics', 'co-packaged-optics'] },
  { id: 'semiconductor', label: { zh: '半導體', en: 'Semiconductors' }, segments: ['foundry', 'memory', 'packaging', 'abf'], pattern: /foundry|wafer|semiconductor|dram|nand|memory|hbm|packaging|advanced package|abf|半導體|晶圓|封裝|記憶體/ , groups: ['advanced-packaging', 'semiconductor'] },
  { id: 'pcb-electronics', label: { zh: 'PCB 與電子材料', en: 'PCB & Electronic Materials' }, segments: ['ccl_pcb'], pattern: /\bccl\b|\bpcb\b|copper clad|printed circuit|pcb|銅箔基板|印刷電路板/, groups: ['pcb', 'ccl-pcb'] },
  { id: 'ai-models', label: { zh: 'AI 模型與軟體', en: 'AI Models & Software' }, segments: ['ai_software'], pattern: /\banthropic\b|\bopenai\b|\bclaude\b|\bchatgpt\b|foundation model|large language model|\bllm\b|生成式\s*ai|大語言模型|基礎模型/i, groups: ['ai-models', 'ai-software', 'foundation-models'] },
  { id: 'ai-server-cloud', label: { zh: 'AI 伺服器與雲端', en: 'AI Servers & Cloud' }, segments: ['odm', 'csp'], pattern: /\bodm\b|\bcsp\b|cloud service|hyperscaler|server|rack|ai server|組裝|伺服器|雲端/, groups: ['dc-power-rack', 'ai-server', 'cloud'] },
  { id: 'cooling', label: { zh: '散熱', en: 'Thermal & Cooling' }, segments: ['thermal'], pattern: /thermal|cooling|liquid cooling|散熱|液冷/, groups: ['liquid-cooling', 'thermal'] },
  { id: 'optical', label: { zh: '光通訊', en: 'Optical Communications' }, segments: ['optical'], pattern: /optical|photonics|transceiver|光通訊|光模組|光收發/, groups: ['optical', 'optical-communications'] },
  { id: 'other', label: { zh: '其他產業', en: 'Other Industries' }, segments: [], pattern: /$^/ },
];

const knownSegments = ['foundry', 'memory', 'packaging', 'abf', 'ccl_pcb', 'ai_software', 'thermal', 'optical', 'odm', 'csp', 'cpo'] as const;
const segmentRules: Array<[typeof knownSegments[number], RegExp]> = [
  ['cpo', /\bcpo\b|co[ -]?packaged optics|interposer optics|中介層光學|共封裝光學|共同封裝光學/],
  ['foundry', /foundry|wafer|晶圓代工|晶圓廠/], ['memory', /memory|dram|nand|hbm|記憶體/],
  ['packaging', /packaging|advanced package|封裝|測試/], ['abf', /\babf\b/],
  ['ccl_pcb', /\bccl\b|\bpcb\b|copper clad|printed circuit|銅箔基板|印刷電路板/],
  ['ai_software', /\banthropic\b|\bopenai\b|\bclaude\b|\bchatgpt\b|foundation model|large language model|\bllm\b|生成式\s*ai|大語言模型|基礎模型/i],
  ['thermal', /thermal|cooling|散熱|液冷/], ['optical', /optical|photonics|transceiver|光通訊|光模組|光收發/],
  ['odm', /\bodm\b|assembly|組裝/], ['csp', /\bcsp\b|cloud service|hyperscaler|雲端服務|雲端業者/],
];
const groupTagIds = new Map(RESEARCH_TAGS.flatMap((tag) => (tag.groups ?? []).map((group) => [group, tag.id] as const)));

export function researchTagLabel(id: string, language: ResearchLanguage = 'zh'): string {
  return RESEARCH_TAGS.find((tag) => tag.id === id)?.label[language] ?? RESEARCH_TAGS.find((tag) => tag.id === 'other')!.label[language];
}

export function researchTagIdsForText(value: string): ResearchTagId[] {
  const text = value.toLocaleLowerCase();
  const matched = RESEARCH_TAGS.filter((tag) => tag.id !== 'other' && tag.pattern.test(text));
  return matched.length ? matched.map(({ id }) => id) : ['other'];
}

export function researchSegmentForText(value: string): string | null {
  const text = value.toLocaleLowerCase();
  return segmentRules.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export function researchTagIdsForSegments(segments: string[]): ResearchTagId[] {
  const normalized = new Set(segments.map((segment) => segment.trim().toLowerCase()));
  return RESEARCH_TAGS.filter((tag) => tag.id !== 'other' && tag.segments.some((segment) => normalized.has(segment)))
    .map(({ id }) => id);
}

export function researchTagIdsForIndustryGroup(group: { id: string; name?: { zh?: string; en?: string } }): ResearchTagId[] {
  const explicit = groupTagIds.get(group.id.toLowerCase());
  return explicit ? [explicit] : researchTagIdsForText(`${group.name?.zh ?? ''} ${group.name?.en ?? ''}`);
}

export const industryTagsForGroup = researchTagIdsForIndustryGroup;

export function segmentsForResearchTags(ids: string[]): string[] {
  const segments = new Set<string>();
  for (const id of ids) {
    const related = id === 'cpo' ? ['cpo', 'optical'] : RESEARCH_TAGS.find((tag) => tag.id === id)?.segments ?? [];
    for (const segment of related) segments.add(segment);
  }
  return [...segments];
}

export function researchTagIdForSegments(segments: string[]): ResearchTagId {
  return researchTagIdsForSegments(segments)[0] ?? 'other';
}
