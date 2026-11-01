// Below-the-fold sections load their data when they come near the viewport instead of all at once on page load
// (the home page used to fire 70+ requests up front, several of them 3-5 s server renders nobody had scrolled to yet).

export type LazyLoader = {
  /** Run the loader now (once), e.g. when something else needs the data. */
  run: () => void;
  isLoaded: () => boolean;
  /** Stop watching (view-transition navigation away, or re-initialisation). */
  cancel: () => void;
};

type ObserverFactory = (callback: (entries: Array<{ isIntersecting: boolean }>) => void, options: { rootMargin: string }) =>
  { observe: (target: Element) => void; disconnect: () => void };

export function lazyLoader(target: Element | null, load: () => void, options: { rootMargin?: string; observer?: ObserverFactory } = {}): LazyLoader {
  let loaded = false;
  let watcher: { disconnect: () => void } | null = null;
  const run = () => {
    if (loaded) return;
    loaded = true;
    watcher?.disconnect();
    watcher = null;
    load();
  };
  const create: ObserverFactory | null = options.observer
    ?? (typeof IntersectionObserver === 'function' ? ((callback, init) => new IntersectionObserver(callback, init)) : null);
  if (!target || !create) {
    // no element or no IntersectionObserver: behave as before and load right away
    run();
  } else {
    const observer = create((entries) => { if (entries.some((entry) => entry.isIntersecting)) run(); }, { rootMargin: options.rootMargin ?? '400px 0px' });
    observer.observe(target);
    watcher = observer;
  }
  return { run, isLoaded: () => loaded, cancel: () => { watcher?.disconnect(); watcher = null; } };
}

/** Memoises an async loader by key so repeated renders (language switch, refresh timers) reuse one request. */
export function memoizeAsync<T>(load: (key: string) => Promise<T>): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (key) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const pending = load(key).catch((error) => { cache.delete(key); throw error; }); // a failure is retried next time
    cache.set(key, pending);
    return pending;
  };
}
