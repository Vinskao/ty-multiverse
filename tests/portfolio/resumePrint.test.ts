import { beforeEach, describe, expect, it } from 'vitest';
import { prepareResumeContent, installResumePrinting } from '../../src/scripts/portfolio/resumePrint';

describe('resume print content', () => {
  let source: HTMLElement;
  beforeEach(() => {
    source = document.createElement('main');
    source.className = 'about';
    source.innerHTML = `<div class="hero-section"><h1 class="title">About</h1>
      <div class="exp-badges"><span class="exp-badge"><span class="exp-badge-label">Finance Experience</span><strong>0.9 yrs (11 months)</strong></span></div></div>
      <section><h2>Background</h2><div class="name-section"><h1>KAO TIAN YI</h1><p>tianyikao@gmail.com</p></div><p>Enterprise backend engineer.</p></section>
      <section><h2>Expertise</h2><p>Python, Spring Boot, PostgreSQL</p></section>
      <section><h2>Project Experience</h2><details class="experience-item" data-copy="private clipboard text"><summary class="job-header"><div><h3>Software Engineer</h3><span>Tata Consultancy Services</span></div><button class="copy-resume-btn">Copy</button></summary><ul><li>2026/08 ~ 2026/10 - Payment Review &amp; Confirmation Reprinting</li></ul></details></section>
      <section><h2>Education</h2><h3>Hong Kong Polytechnic University</h3></section>
      <section><h2>Tech Experience</h2><p>Duplicate skill diagrams</p></section>
      <section class="briefing-section"><h2>Career Briefing</h2><p>Long narrative</p></section>
      <div data-admin-git-commit>Admin controls</div><button id="preview-pdf-btn">Preview Resume</button>`;
  });

  it('removes Copy and all interactive/admin controls from the exported resume', () => {
    const result = prepareResumeContent(source);
    expect(result.querySelector('button, [data-admin-git-commit], [data-copy]')).toBeNull();
    expect(result.textContent).not.toContain('Copy');
    expect(source.querySelector('button')).not.toBeNull();
  });

  it('expands employment into static content without losing project dates or names', () => {
    const result = prepareResumeContent(source);
    expect(result.querySelector('details, summary')).toBeNull();
    expect(result.querySelector('article.experience-item')).not.toBeNull();
    expect(result.textContent).toContain('2026/08 ~ 2026/10 - Payment Review');
    expect(result.textContent).toContain('Tata Consultancy Services');
  });

  it('retains expertise and education while removing duplicate diagrams and narrative', () => {
    const result = prepareResumeContent(source);
    expect(result.textContent).toContain('Python, Spring Boot, PostgreSQL');
    expect(result.textContent).toContain('Hong Kong Polytechnic University');
    expect(result.textContent).not.toContain('Duplicate skill diagrams');
    expect(result.textContent).not.toContain('Long narrative');
  });

  it('moves exact experience totals into a compact line below the name', () => {
    const result = prepareResumeContent(source);
    expect(result.querySelector('.hero-section, .exp-badge')).toBeNull();
    expect(result.querySelector('.resume-experience-summary')?.textContent).toContain('Finance Experience: 0.9 yrs (11 months)');
    expect(result.classList.contains('resume-document')).toBe(true);
  });

  it('isolates native print content from website CSS and restores the live page afterwards', () => {
    document.body.append(source);
    const dispose = installResumePrinting(window, document, 'h1 { font-size: 23pt; }');
    window.dispatchEvent(new Event('beforeprint'));
    window.dispatchEvent(new Event('beforeprint'));
    expect(document.querySelectorAll('.resume-print-host')).toHaveLength(1);
    const host = document.querySelector('.resume-print-host');
    expect(host?.shadowRoot?.querySelector('.resume-document h1')?.textContent).toBe('KAO TIAN YI');
    expect(host?.shadowRoot?.querySelector('button')).toBeNull();
    window.dispatchEvent(new Event('afterprint'));
    expect(document.querySelector('.resume-print-host')).toBeNull();
    expect(document.body.classList.contains('resume-printing')).toBe(false);
    expect(source.querySelector('button')).not.toBeNull();
    dispose();
    source.remove();
  });
});
