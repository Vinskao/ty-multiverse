export function prepareResumeContent(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const doc = clone.ownerDocument;
  const totals = Array.from(clone.querySelectorAll('.exp-badge')).map(badge => {
    const label = badge.querySelector('.exp-badge-label')?.textContent?.trim();
    const value = badge.querySelector('strong')?.textContent?.trim();
    return label && value ? `${label}: ${value}` : '';
  }).filter(Boolean);
  clone.querySelectorAll('button, script, style, nav, [data-admin-git-commit], .hero-section, .briefing-section, .briefing-inline, .pdf-export-section').forEach(node => node.remove());
  const headings = new Set(['Background', '背景', 'Expertise', '專長', 'Project Experience', '專案經歷', 'Education', '教育']);
  clone.querySelectorAll('section').forEach(section => {
    if (!headings.has(section.querySelector('h2')?.textContent?.trim() || '')) section.remove();
  });
  clone.querySelectorAll('details').forEach(details => {
    const article = doc.createElement('article');
    article.className = details.className;
    article.append(...Array.from(details.childNodes));
    const summary = article.querySelector('summary');
    if (summary) {
      const header = doc.createElement('header');
      header.className = summary.className;
      header.append(...Array.from(summary.childNodes));
      summary.replaceWith(header);
    }
    details.replaceWith(article);
  });
  clone.querySelector('.name-section')?.closest('section')?.querySelector('h2')?.remove();
  if (totals.length) {
    const summary = doc.createElement('p');
    summary.className = 'resume-experience-summary';
    summary.textContent = totals.join(' · ');
    clone.querySelector('.name-section')?.after(summary);
  }
  clone.querySelectorAll('[data-copy], [style]').forEach(node => {
    node.removeAttribute('data-copy');
    node.removeAttribute('style');
  });
  clone.className = 'resume-document';
  return clone;
}

export function installResumePrinting(win: Window, doc: Document, css: string): () => void {
  let host: HTMLElement | undefined;
  let pageStyle: HTMLStyleElement | undefined;
  const after = () => {
    host?.remove();
    pageStyle?.remove();
    host = undefined;
    pageStyle = undefined;
    doc.body.classList.remove('resume-printing');
  };
  const before = () => {
    const source = doc.querySelector<HTMLElement>('.about');
    if (!source || host) return;
    host = doc.createElement('div');
    host.className = 'resume-print-host';
    // Shadow styles prevent the site's responsive rules, heading pseudo-elements
    // and !important print declarations from leaking into the paper document.
    const shadow = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = css;
    shadow.append(style, prepareResumeContent(source));
    pageStyle = doc.createElement('style');
    pageStyle.textContent = '@page { size: A4; margin: 14mm 15mm; } @media print { body.resume-printing > :not(.resume-print-host) { display:none !important; } body.resume-printing > .resume-print-host { display:block !important; } }';
    doc.head.append(pageStyle);
    doc.body.append(host);
    doc.body.classList.add('resume-printing');
  };
  win.addEventListener('beforeprint', before);
  win.addEventListener('afterprint', after);
  return () => {
    after();
    win.removeEventListener('beforeprint', before);
    win.removeEventListener('afterprint', after);
  };
}
