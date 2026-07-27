/**
 * 互動影片索引（pair video index）
 *
 * 問題：group 頁 hover 一個角色時，原本要對「其他每一個角色」各發一次 HEAD
 * 去猜 `self_other.mp4` 存不存在 —— 單次 hover O(N) 次網路探測，
 * 全部人都 hover 過就是 O(N²)（N≈角色數）。而且重整後全部重來。
 *
 * 解法：把「線性掃描」換成「預先建好的索引」。
 *   - 資料結構：有向圖的鄰接表 adjacency list，`self -> [other, ...]`，
 *     只存實際存在的邊（E 條，E << N²），用 Record 當雜湊表 → 查詢 O(1)。
 *   - 建索引的來源優先序：
 *       1. manifest：靜態主機上的 `pair-videos.json`（一次 GET 拿到全部檔名）→ 建表成本 O(E)
 *       2. probe：沒有 manifest 時才退回 HEAD 全掃 O(N²)，但「只做一次」，
 *          結果（含「整張表已建完」這個事實＝完整的 negative cache）寫進 localStorage。
 *   - 之後 hover 完全不碰網路。
 */

const STORAGE_KEY = 'palais-pair-video-index-v1';
const MANIFEST_FILENAME = 'pair-videos.json';
const INDEX_VERSION = 1;

export type PairIndexSource = 'manifest' | 'probe';

export interface PairVideoIndex {
  version: number;
  /** 建索引當下的媒體時間戳；與現值不同代表可能已過期（仍可用，只是建議重建）。 */
  mediaTimestamp: string;
  builtAt: number;
  source: PairIndexSource;
  /** 建索引時掃過的角色名單，用來判斷有沒有新角色加入。 */
  names: string[];
  /** 鄰接表：self -> [other, ...]，順序即播放順序。只列出存在的影片。 */
  pairs: Record<string, string[]>;
}

export interface BuildProgress {
  done: number;
  total: number;
  found: number;
}

// --- 儲存 ---

let memoryIndex: PairVideoIndex | null | undefined;

export function loadIndex(): PairVideoIndex | null {
  if (memoryIndex !== undefined) return memoryIndex;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return (memoryIndex = null);
    const parsed = JSON.parse(raw) as PairVideoIndex;
    if (parsed?.version !== INDEX_VERSION || !parsed.pairs) {
      localStorage.removeItem(STORAGE_KEY);
      return (memoryIndex = null);
    }
    return (memoryIndex = parsed);
  } catch {
    return (memoryIndex = null);
  }
}

export function saveIndex(index: PairVideoIndex): void {
  memoryIndex = index;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch (error) {
    // 配額爆掉時只留記憶體版本，不讓整個流程失敗
    console.warn('[pairVideoIndex] 無法寫入 localStorage:', error);
  }
}

export function clearIndex(): void {
  memoryIndex = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** O(1) 查詢。回傳 null 代表索引裡沒有這個人的資料（尚未建索引）。 */
export function getPairNames(selfName: string): string[] | null {
  const index = loadIndex();
  if (!index) return null;
  return index.pairs[selfName] ?? null;
}

/** 索引是否涵蓋這批角色、且時間戳仍相符。 */
export function getIndexStatus(names: string[], mediaTimestamp: string) {
  const index = loadIndex();
  if (!index) return { exists: false, stale: false, missingNames: names, index: null as PairVideoIndex | null };
  const known = new Set(index.names);
  const missingNames = names.filter((name) => !known.has(name));
  return {
    exists: true,
    stale: index.mediaTimestamp !== mediaTimestamp || missingNames.length > 0,
    missingNames,
    index,
  };
}

export function getIndexStats() {
  const index = loadIndex();
  if (!index) return null;
  const edges = Object.values(index.pairs).reduce((sum, list) => sum + list.length, 0);
  return {
    source: index.source,
    builtAt: index.builtAt,
    characters: index.names.length,
    edges,
  };
}

// --- 來源 1：manifest（一次 GET） ---

/**
 * 把 `A_B.mp4` 這種檔名切回 (A, B)。
 * 名字本身可能含底線，所以不能直接 split('_')；改成掃描每一個可能的切點，
 * 兩邊都必須落在已知名單內（O(名字長度) 次雜湊查詢）。
 */
function splitPairFilename(base: string, nameSet: Set<string>): [string, string] | null {
  let cursor = base.indexOf('_');
  while (cursor !== -1) {
    const left = base.slice(0, cursor);
    const right = base.slice(cursor + 1);
    if (nameSet.has(left) && nameSet.has(right)) return [left, right];
    cursor = base.indexOf('_', cursor + 1);
  }
  return null;
}

function buildPairsFromFilenames(files: string[], names: string[]): Record<string, string[]> {
  const nameSet = new Set(names);
  const order = new Map(names.map((name, i) => [name, i]));
  const pairs: Record<string, string[]> = {};
  for (const name of names) pairs[name] = [];

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.mp4')) continue;
    const parsed = splitPairFilename(file.slice(0, -4), nameSet);
    if (!parsed) continue;
    const [self, other] = parsed;
    if (self === other) continue;
    pairs[self]!.push(other);
  }

  // 讓播放順序穩定：依對方在角色名單中的順序排（與原本探測順序一致）
  for (const list of Object.values(pairs)) {
    list.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }
  return pairs;
}

/**
 * 嘗試從靜態主機抓 manifest。抓不到（404 / 格式不符）就回 null，由呼叫端退回 probe。
 * 支援三種格式：
 *   ["A_B.mp4", ...]
 *   { "files": ["A_B.mp4", ...] }
 *   { "pairs": { "A": ["B", "C"] } }   ← 已經建好的鄰接表
 */
export async function fetchRemoteManifest(
  baseUrl: string,
  names: string[],
  mediaTimestamp: string,
): Promise<PairVideoIndex | null> {
  try {
    const response = await fetch(
      `${baseUrl}/${MANIFEST_FILENAME}?t=${encodeURIComponent(mediaTimestamp)}`,
      { cache: 'no-cache' },
    );
    if (!response.ok) return null;
    const payload = await response.json();

    let pairs: Record<string, string[]> | null = null;
    if (Array.isArray(payload)) {
      pairs = buildPairsFromFilenames(payload, names);
    } else if (Array.isArray(payload?.files)) {
      pairs = buildPairsFromFilenames(payload.files, names);
    } else if (payload?.pairs && typeof payload.pairs === 'object') {
      pairs = payload.pairs;
    }
    if (!pairs) return null;

    return {
      version: INDEX_VERSION,
      mediaTimestamp,
      builtAt: Date.now(),
      source: 'manifest',
      names: [...names],
      pairs,
    };
  } catch {
    return null;
  }
}

// --- 來源 2：probe（HEAD 全掃，只做一次） ---

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  signal?: AbortSignal,
) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      if (signal?.aborted) return;
      await worker(items[index++]!);
    }
  });
  await Promise.all(runners);
}

export interface BuildOptions {
  baseUrl: string;
  names: string[];
  mediaTimestamp: string;
  concurrency?: number;
  onProgress?: (progress: BuildProgress) => void;
  signal?: AbortSignal;
  /** 略過 manifest、直接 HEAD 全掃。 */
  forceProbe?: boolean;
}

/**
 * 建立（或重建）整張索引。
 * 先試 manifest（1 次請求）；失敗才 HEAD 全掃 N*(N-1) 次，掃完存檔。
 */
export async function buildIndex(options: BuildOptions): Promise<PairVideoIndex> {
  const { baseUrl, names, mediaTimestamp, concurrency = 8, onProgress, signal, forceProbe } = options;

  if (!forceProbe) {
    const remote = await fetchRemoteManifest(baseUrl, names, mediaTimestamp);
    if (remote) {
      const found = Object.values(remote.pairs).reduce((sum, list) => sum + list.length, 0);
      onProgress?.({ done: names.length, total: names.length, found });
      saveIndex(remote);
      return remote;
    }
  }

  const pairs: Record<string, string[]> = {};
  for (const name of names) pairs[name] = [];

  // 展開成一維工作清單，讓併發池吃滿；`slot` 保留順序，避免結果次序隨機。
  const jobs: Array<{ self: string; other: string; slot: number }> = [];
  names.forEach((self) => {
    names.forEach((other, slot) => {
      if (self !== other) jobs.push({ self, other, slot });
    });
  });

  const hits = new Map<string, Array<{ other: string; slot: number }>>();
  let done = 0;
  let found = 0;

  await mapWithConcurrency(
    jobs,
    concurrency,
    async ({ self, other, slot }) => {
      const url = `${baseUrl}/${encodeURIComponent(`${self}_${other}`)}.mp4?t=${encodeURIComponent(mediaTimestamp)}`;
      try {
        const response = await fetch(url, { method: 'HEAD', signal });
        if (response.ok) {
          if (!hits.has(self)) hits.set(self, []);
          hits.get(self)!.push({ other, slot });
          found += 1;
        }
      } catch { /* 不存在 / 被中斷就當作沒有 */ }
      done += 1;
      if (done % 10 === 0 || done === jobs.length) {
        onProgress?.({ done, total: jobs.length, found });
      }
    },
    signal,
  );

  hits.forEach((list, self) => {
    pairs[self] = list.sort((a, b) => a.slot - b.slot).map((entry) => entry.other);
  });

  const index: PairVideoIndex = {
    version: INDEX_VERSION,
    mediaTimestamp,
    builtAt: Date.now(),
    source: 'probe',
    names: [...names],
    pairs,
  };

  // 中斷的話不要把半成品當成完整索引存起來
  if (!signal?.aborted) saveIndex(index);
  return index;
}

/**
 * 只補掃單一角色（沒有整張索引時的降級路徑，維持原本 hover 行為但結果會被記住）。
 */
export async function probeCharacter(
  selfName: string,
  options: { baseUrl: string; names: string[]; mediaTimestamp: string; concurrency?: number },
): Promise<string[]> {
  const { baseUrl, names, mediaTimestamp, concurrency = 8 } = options;
  const others = names.filter((name) => name && name !== selfName);
  const found: Array<string | null> = new Array(others.length).fill(null);

  await mapWithConcurrency(
    others.map((other, slot) => ({ other, slot })),
    concurrency,
    async ({ other, slot }) => {
      const url = `${baseUrl}/${encodeURIComponent(`${selfName}_${other}`)}.mp4?t=${encodeURIComponent(mediaTimestamp)}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) found[slot] = other;
      } catch { /* noop */ }
    },
  );

  const result = found.filter((name): name is string => !!name);

  // 併回索引，下次就不用再掃這個人
  const existing = loadIndex();
  const index: PairVideoIndex = existing ?? {
    version: INDEX_VERSION,
    mediaTimestamp,
    builtAt: Date.now(),
    source: 'probe',
    names: [],
    pairs: {},
  };
  index.pairs[selfName] = result;
  if (!index.names.includes(selfName)) index.names = [...index.names, selfName];
  saveIndex(index);

  return result;
}

/** 由鄰接表組出可播放的影片 URL（不含時間戳，播放時再加）。 */
export function toVideoUrls(baseUrl: string, selfName: string, others: string[]): string[] {
  return others.map((other) => `${baseUrl}/${encodeURIComponent(`${selfName}_${other}`)}.mp4`);
}
