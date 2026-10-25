import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PowerRackDiagram from '../../src/components/PowerRackDiagram';

const parts = [{ id: 'dc-pdu', name: { en: 'PDU', zh: '配電' },
  summary: { en: 'Distribution', zh: '配電用途' }, products: [{ company: 'Example', product: 'PDU' }] }];

describe('power architecture evidence boundary', () => {
  it('keeps keyboard access to the supplied part information', () => {
    render(<PowerRackDiagram parts={parts} lang="zh" />);
    fireEvent.focus(screen.getByRole('button', { name: '直流配電單元' }));
    expect(screen.getByRole('status').textContent).toContain('配電用途');
  });

  it.each(['zh', 'en'] as const)('qualifies this reference architecture and supplier evidence in %s', (lang) => {
    render(<PowerRackDiagram parts={parts} lang={lang} />);
    const note = screen.getByTestId('power-rack-evidence-note');
    expect(note.textContent).toContain('800V');
    expect(note.textContent).toContain('12V');
    expect(note.textContent).toMatch(lang === 'zh' ? /不代表.*驗證/ : /does not establish.*qualification/);
    expect(note.querySelector('a')?.href).toBe('https://developer.nvidia.com/blog/building-the-800-vdc-ecosystem-for-efficient-scalable-ai-factories/');
  });
});
