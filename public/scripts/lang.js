(function () {
  const STORAGE_KEY = 'site_language'; // canonical: 'en' | 'zh'
  const EVENT_NAME = 'site:language-change';

  function normalize(input) {
    if (!input) return 'en';
    const val = String(input).toLowerCase();
    if (val === 'zh' || val === 'chinese' || val.startsWith('zh')) return 'zh';
    return 'en';
  }

  function get() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return normalize(saved || document.documentElement.dataset.defaultLanguage || 'en');
    } catch (_) {
      return 'en';
    }
  }

  function set(code) {
    const lang = normalize(code);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
    const detail = {
      code: lang, // 'en' | 'zh'
      qaLang: lang === 'zh' ? 'chinese' : 'english'
    };
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  }

  function onChange(callback) {
    function handler(ev) {
      if (ev && ev.detail) callback(ev.detail);
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }

  function getQALang() {
    return get() === 'zh' ? 'chinese' : 'english';
  }

  // The server is slow, so a language switch that refetches data shows the page spinner (global.css html.page-loading)
  // until every job registered here has finished, failed or not.
  let pending = 0;
  function busy(work) {
    pending += 1;
    document.documentElement.classList.add('page-loading');
    const done = () => {
      pending = Math.max(0, pending - 1);
      if (pending === 0) document.documentElement.classList.remove('page-loading');
    };
    Promise.resolve(work).then(done, done);
    return Promise.resolve(work);
  }

  // expose global
  window.AppLang = window.AppLang || { get, set, onChange, getQALang, busy };
})();


