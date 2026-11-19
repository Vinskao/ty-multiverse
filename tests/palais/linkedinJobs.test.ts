import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('places the job review directly under social metrics', () => {
  const panel = readFileSync('src/components/AiVisibilityPanel.astro', 'utf8');
  expect(panel).toMatch(/id="ai-visibility-social-note"[^]*?<\/div>\s*<LinkedInJobsPanel \/>/);
});
