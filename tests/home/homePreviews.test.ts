import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('caps the home report preview and links to the full macro chain', () => {
    const page = readFileSync('src/pages/index.astro', 'utf8');
    expect(page).toContain('data-report-preview={view ? undefined : 6}');
    expect(page).toContain('/macro/#macro-chains');
    expect(page).toContain('data-macro-preview={view ? undefined : true}');
});
