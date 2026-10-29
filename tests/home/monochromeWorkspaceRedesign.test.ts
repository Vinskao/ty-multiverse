import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const home = read('src/pages/index.astro');
const indexCss = read('src/styles/index.css');
const about = read('src/pages/about.astro');
const aboutCss = read('src/styles/about.css');
const globalCss = read('src/styles/global.css');
const briefing = read('src/components/Briefing.astro');
const resumePreview = read('src/components/ResumePreview.astro');

describe('monochrome investor workspace redesign', () => {
  it('keeps the quote and chart panes in a balanced wide layout', () => {
    expect(indexCss).toMatch(/\.home-page \.market-overview-grid\s*\{[^}]*minmax\(0,\s*2fr\)/s);
    expect(indexCss).toMatch(/\.home-page \.market-chart-placeholder\s*\{[^}]*min-height:/s);
  });

  it('places the detailed holdings summary after the main dashboard and folds it by default', () => {
    const summary = home.indexOf('<details class="market-brief-disclosure">');
    const dashboard = home.indexOf('id="market-overview"');
    expect(summary).toBeGreaterThan(dashboard);
    expect(home).toContain('<summary>持股籌碼摘要');
    expect(home).not.toMatch(/<details class="market-brief-disclosure"[^>]*open/);
  });

  it('makes PDF metadata optional and collapsed while preserving batch upload and visibility', () => {
    expect(home).toContain('multiple required');
    expect(home).toContain('<details class="market-report-metadata">');
    expect(home).toContain('檔名會自動作為報告標題');
    expect(home).toContain('name="visibility"');
    expect(home).toContain('name="published_at"');
  });

  it('introduces a team parent and founder profile while keeping downloadable resume tools', () => {
    expect(about).toContain('class="team-section"');
    expect(about).toContain('class="team-member"');
    expect(about).toContain('Personality & Career Overview');
    expect(about).toContain('<ResumePreview lang={lang} />');
    expect(about).not.toContain('<ContactCTA />');
    expect(about).toContain('class="founder-overview"');
  });

  it('uses neutral grayscale surfaces and controls across home and about', () => {
    expect(indexCss).toContain('--home-accent: #f5f5f7');
    expect(globalCss).toContain('--accent-regular: #ffffff');
    expect(aboutCss).toContain('.about-mono');
    expect(aboutCss).not.toMatch(/#(?:514695|3a2f6b|e1bee7|6a1b9a|7c6fd4|a06bff|b26bff|b36bff|3b0f5a|2a1f44|27103a)/i);
  });

  it('reinitializes interactive About widgets after an in-place language swap', () => {
    expect(briefing).toContain("document.addEventListener('about:content-updated', setupHoverEffects)");
    expect(resumePreview).toContain("document.addEventListener('about:content-updated', fillInlineBriefing)");
  });
});

