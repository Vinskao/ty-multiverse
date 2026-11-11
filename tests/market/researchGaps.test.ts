import { describe, expect, it } from 'vitest';
import { markEvidenceGaps } from '../../src/scripts/market/researchMap';

describe('evidence gaps in research diagrams', () => {
  it('styles nodes that record missing evidence apart from sourced facts', () => {
    const source = 'flowchart TB\n  R["讀圖"]\n  T0["營收 300 億（已申報）"]\n  T1["產品規格與良率｜未取得原文"]\n  T2["北美客戶｜二手報導，未核實"]\n  R -->|待核實| T1';
    const { diagram, gaps } = markEvidenceGaps(source);
    expect(gaps).toBe(2);
    expect(diagram).toContain('classDef gap');
    expect(diagram).toMatch(/class T1,T2 gap/);
    expect(diagram).not.toMatch(/class [^\n]*T0/);
  });
  it('leaves a diagram without gaps unchanged', () => {
    expect(markEvidenceGaps('flowchart LR\n  A["台積電"] --> B["NVIDIA"]')).toEqual({ diagram: 'flowchart LR\n  A["台積電"] --> B["NVIDIA"]', gaps: 0 });
  });
});
