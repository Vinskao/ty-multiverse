// Pages whose copy is written in Chinese (Learn, API, QA bot chrome, …) get an English layer from a reviewed dictionary
// instead of per-string data-i18n attributes: exact strings, plus templates with {name} placeholders for built-up text.
// Unknown text is left alone, so user content (reports, analyses, notifications) is never rewritten.
export type LiteralDict = Record<string, string>;
type Template = { pattern: RegExp; names: string[]; english: string };

const CJK = /[一-鿿]/;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function compileTemplates(dict: LiteralDict): Template[] {
  return Object.entries(dict).filter(([zh]) => /\{\w+\}/.test(zh)).map(([zh, english]) => {
    const names: string[] = [];
    const source = zh.split(/(\{\w+\})/).map((part) => {
      const slot = part.match(/^\{(\w+)\}$/);
      if (slot) { names.push(slot[1]); return '(.+?)'; }
      return escapeRegExp(part);
    }).join('');
    return { pattern: new RegExp(`^${source}$`, 's'), names, english };
  });
}

export function translateLiteral(text: string, dict: LiteralDict, templates: Template[] = compileTemplates(dict)): string {
  const trimmed = text.trim();
  if (!trimmed || !CJK.test(trimmed)) return text;
  const start = text.indexOf(trimmed);
  const lead = text.slice(0, start), tail = text.slice(start + trimmed.length);
  const exact = Object.prototype.hasOwnProperty.call(dict, trimmed) ? dict[trimmed] : undefined;
  if (exact !== undefined && !/\{\w+\}/.test(trimmed)) return lead + exact + tail;
  for (const template of templates) {
    const match = trimmed.match(template.pattern);
    if (!match) continue;
    // a captured value may itself be Chinese that has an entry (e.g. a difficulty label)
    const values = Object.fromEntries(template.names.map((name, index) => [name, translateLiteral(match[index + 1], dict, templates)]));
    return lead + template.english.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '') + tail;
  }
  // built-up text such as "已完成 3 輪｜上次 17/20": translate each ｜ part on its own
  if (trimmed.includes('｜')) {
    const parts = trimmed.split('｜').map((part) => translateLiteral(part, dict, templates));
    if (parts.join('｜') !== trimmed) return lead + parts.join(' | ') + tail;
  }
  return text;
}

const ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

/** Translates a subtree in place and keeps the original Chinese so switching back restores it exactly. */
export function createLiteralTranslator(dict: LiteralDict) {
  const templates = compileTemplates(dict);
  const originals = new WeakMap<Node, string>();
  const shown = new WeakMap<Node, string>();
  const attributeOriginals = new WeakMap<Element, Record<string, string>>();

  function text(node: Text, lang: 'zh' | 'en') {
    const current = node.textContent ?? '';
    if (shown.get(node) !== current) originals.set(node, current); // the page wrote new text: that is the new original
    const original = originals.get(node) ?? current;
    const next = lang === 'en' ? translateLiteral(original, dict, templates) : original;
    if (next !== current) node.textContent = next;
    shown.set(node, next);
  }

  function attributes(element: Element, lang: 'zh' | 'en') {
    const saved = attributeOriginals.get(element) ?? {};
    for (const name of ATTRIBUTES) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      if (saved[`shown:${name}`] !== current) saved[name] = current;
      const next = lang === 'en' ? translateLiteral(saved[name], dict, templates) : saved[name];
      if (next !== current) element.setAttribute(name, next);
      saved[`shown:${name}`] = next;
    }
    attributeOriginals.set(element, saved);
  }

  function apply(root: Node, lang: 'zh' | 'en') {
    const visit = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (SKIP.has(element.tagName)) return;
        attributes(element, lang);
        node.childNodes.forEach(visit);
      } else if (node.nodeType === Node.TEXT_NODE) {
        text(node as Text, lang);
      }
    };
    visit(root);
  }

  return { apply };
}
