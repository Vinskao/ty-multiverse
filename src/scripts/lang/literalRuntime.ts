import dict from '../../storages/literalEn.json';
import { createLiteralTranslator } from './literal';

type AppLangApi = { get: () => string; onChange: (callback: (event: { code: string }) => void) => () => void };

const translator = createLiteralTranslator(dict as Record<string, string>);
let observer: MutationObserver | null = null;
let stopListening: (() => void) | null = null;
let busy = false;

const currentLanguage = (): 'zh' | 'en' => ((window as unknown as { AppLang?: AppLangApi }).AppLang?.get() === 'zh' ? 'zh' : 'en');

function run(root: Node = document.body) {
  if (busy) return;
  busy = true;
  try { translator.apply(root, currentLanguage()); } finally { busy = false; }
}

/** English layer for Chinese-written pages (Learn, API, QA bot): runs now, on language change, and on content the page adds later. */
export function startLiteralTranslation() {
  const appLang = (window as unknown as { AppLang?: AppLangApi }).AppLang;
  if (!appLang) return;
  run();
  stopListening?.();
  stopListening = appLang.onChange(() => run());
  observer?.disconnect();
  observer = new MutationObserver((records) => {
    if (busy || currentLanguage() === 'zh') return;
    for (const record of records) {
      if (record.type === 'characterData') run(record.target.parentElement ?? document.body);
      else record.addedNodes.forEach((node) => run(node));
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
