import { describe, expect, it } from 'vitest';
import { industryTagsForGroup, researchTagIdsForText, researchTagLabel, segmentsForResearchTags } from '../../src/scripts/market/researchTaxonomy';

describe('shared stock research and report tags', () => {
  it('maps stock research industry groups to the same stable report tags', () => {
    expect(industryTagsForGroup({ id: 'advanced-packaging', name: { zh: '先進封裝與測試', en: 'Advanced packaging and test' } })).toContain('semiconductor');
    expect(industryTagsForGroup({ id: 'liquid-cooling', name: { zh: 'AI 液冷散熱', en: 'AI liquid cooling' } })).toContain('cooling');
    expect(industryTagsForGroup({ id: 'cpo-optics', name: { zh: 'CPO 光學', en: 'CPO optics' } })).toContain('cpo');
  });

  it('uses CPO as a specific tag and also searches existing optical claims for AI context', () => {
    expect(researchTagIdsForText('NVIDIA CPO 中介層光學')).toEqual(['cpo']);
    expect(segmentsForResearchTags(['cpo'])).toEqual(['cpo', 'optical']);
  });

  it('provides the same visible label for report and stock research tags', () => {
    expect(researchTagLabel('cpo', 'zh')).toContain('CPO');
    expect(researchTagLabel('cpo', 'en')).toMatch(/CPO/i);
  });
});
