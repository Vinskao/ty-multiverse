import { beforeEach, describe, expect, it } from 'vitest';
import { createLiteralTranslator, translateLiteral } from '../../src/scripts/lang/literal';

const dict = {
  '最近作答': 'Recent attempts',
  '基礎': 'Basic',
  '{n} 題，尚未開始': '{n} questions, not started',
  '已完成 {done} 輪｜上次 {score}/{total}': '{done} rounds done | last {score}/{total}',
  '{level}題組': '{level} set',
};

describe('translateLiteral', () => {
  it('translates exact strings and keeps surrounding whitespace', () => {
    expect(translateLiteral(' 最近作答\n', dict)).toBe(' Recent attempts\n');
  });
  it('fills templates and translates captured parts that have their own entry', () => {
    expect(translateLiteral('85 題，尚未開始', dict)).toBe('85 questions, not started');
    expect(translateLiteral('已完成 3 輪｜上次 17/20', dict)).toBe('3 rounds done | last 17/20');
    expect(translateLiteral('基礎題組', dict)).toBe('Basic set');
  });
  it('leaves unknown Chinese (user content) and non-Chinese text untouched', () => {
    expect(translateLiteral('台積電 2330 結論維持', dict)).toBe('台積電 2330 結論維持');
    expect(translateLiteral('Save', dict)).toBe('Save');
    expect(translateLiteral('constructor', dict)).toBe('constructor');
  });
});

describe('createLiteralTranslator', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><h2 aria-label="最近作答">最近作答</h2><p>85 題，尚未開始</p><script>最近作答</script><p>台積電</p></main>';
  });

  it('switches to English, restores Chinese, and skips scripts and unknown text', () => {
    const translator = createLiteralTranslator(dict);
    translator.apply(document.body, 'en');
    expect(document.querySelector('h2')?.textContent).toBe('Recent attempts');
    expect(document.querySelector('h2')?.getAttribute('aria-label')).toBe('Recent attempts');
    expect(document.querySelectorAll('p')[0].textContent).toBe('85 questions, not started');
    expect(document.querySelector('script')?.textContent).toBe('最近作答');
    expect(document.querySelectorAll('p')[1].textContent).toBe('台積電');
    translator.apply(document.body, 'zh');
    expect(document.querySelector('h2')?.textContent).toBe('最近作答');
    expect(document.querySelectorAll('p')[0].textContent).toBe('85 題，尚未開始');
    expect(document.querySelector('h2')?.getAttribute('aria-label')).toBe('最近作答');
  });

  it('treats text the page rewrites while in English as the new original', () => {
    const translator = createLiteralTranslator(dict);
    translator.apply(document.body, 'en');
    const p = document.querySelectorAll('p')[0];
    p.textContent = '已完成 2 輪｜上次 5/10';
    translator.apply(document.body, 'en');
    expect(p.textContent).toBe('2 rounds done | last 5/10');
    translator.apply(document.body, 'zh');
    expect(p.textContent).toBe('已完成 2 輪｜上次 5/10');
  });
});
