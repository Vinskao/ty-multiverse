/**
 * 互動影片索引（video index）
 *
 * 檔名規則：`A_B.mp4`、`A_B_C.mp4`… 成員以底線相接，角色名不含底線。
 * **影片只屬於第一個名字（name1）**，只在 name1 的位置播放；第一個底線之後的成員
 * 只是內容的一部分，不影響「誰能觸發」。所以索引就是 `name1 -> 他的影片清單`。
 *
 * 查詢：O(1) 雜湊查表，且 **hover 路徑完全不連線**。
 * 索引沒有的人就是沒有影片 —— 不會臨時去探測（那正是以前 hover 會卡住的原因）。
 *
 * 建索引只在使用者按「建立影片快取」時發生，來源優先序：
 *   1. manifest：靜態主機上的 `pair-videos.json`，一次 GET 拿到全部檔名。
 *      成本 O(E)，與 N 和「幾人一組」無關 —— 三人以上只能靠這條。
 *   2. probe：沒有 manifest 才退回 HEAD 掃兩人組 N(N-1) 次。
 *      三人組是 O(N³)（N=50 約 12 萬次請求）現實上不可行，不掃。
 */

const STORAGE_KEY = 'palais-video-index-v3';
const LEGACY_KEYS = ['palais-pair-video-index-v1', 'palais-video-index-v2'];
const MANIFEST_FILENAME = 'pair-videos.json';
const INDEX_VERSION = 3;

/**
 * 掃描併發數。HTTP/1.1 對同一 origin 只有 6 條連線，但影像主機走 HTTP/2 的話
 * 可以同時開很多串流 —— 這是掃描速度唯一的實質槓桿（掃描次數 N(N-1) 是固定的）。
 * 設高一點在 HTTP/1.1 下也只是排隊，不會更慢。
 */
const DEFAULT_CONCURRENCY = 32;

export type IndexSource = 'manifest' | 'probe';

/** 存進 localStorage 的形狀（byOwner 是衍生資料，不落地，載入時重算）。 */
interface StoredIndex {
  version: number;
  mediaTimestamp: string;
  builtAt: number;
  source: IndexSource;
  /** 建索引時掃過的角色名單，用來判斷有沒有新角色加入。 */
  names: string[];
  /** 每支影片的成員，順序即檔名順序；group[0] 就是擁有者。 */
  groups: string[][];
  /** moov atom 不在檔頭的檔案（非 faststart，會讓 hover 卡住）。 */
  slowStartFiles?: string[];
}

export interface VideoIndex extends StoredIndex {
  /** 反向索引：name1 -> 他擁有的 groups 索引。 */
  byOwner: Record<string, number[]>;
}

export interface BuildProgress {
  done: number;
  total: number;
  found: number;
}

// --- 檔名 <-> 成員 ---

export function groupFileBase(group: string[]): string {
  return group.join('_');
}

export function groupUrl(baseUrl: string, group: string[]): string {
  return `${baseUrl}/${encodeURIComponent(groupFileBase(group))}.mp4`;
}

/** `A_B_C` -> ['A','B','C']；第一段必須是已知角色，不足兩段就回 null。 */
function parseGroupFromBase(base: string, nameSet: Set<string>): string[] | null {
  const parts = base.split('_');
  if (parts.length < 2) return null;
  if (!nameSet.has(parts[0]!)) return null;
  return parts;
}

/** 只索引 group[0]：影片屬於 name1。 */
function buildByOwner(groups: string[][]): Record<string, number[]> {
  const byOwner: Record<string, number[]> = {};
  groups.forEach((group, index) => {
    const owner = group[0];
    if (!owner) return;
    (byOwner[owner] ??= []).push(index);
  });
  return byOwner;
}

function hydrate(stored: StoredIndex): VideoIndex {
  return { ...stored, byOwner: buildByOwner(stored.groups) };
}

// --- 儲存 ---

let memoryIndex: VideoIndex | null | undefined;

export function loadIndex(): VideoIndex | null {
  if (memoryIndex !== undefined) return memoryIndex;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return (memoryIndex = null);
    const parsed = JSON.parse(raw) as StoredIndex;
    if (parsed?.version !== INDEX_VERSION || !Array.isArray(parsed.groups)) {
      localStorage.removeItem(STORAGE_KEY);
      return (memoryIndex = null);
    }
    return (memoryIndex = hydrate(parsed));
  } catch {
    return (memoryIndex = null);
  }
}

export function saveIndex(index: VideoIndex): void {
  memoryIndex = index;
  const { byOwner: _byOwner, ...stored } = index;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    // 配額爆掉時只留記憶體版本，不讓整個流程失敗
    console.warn('[videoIndex] 無法寫入 localStorage:', error);
  }
}

export function clearIndex(): void {
  memoryIndex = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch { /* noop */ }
}

// --- 查詢（O(1)，永不連線）---

/**
 * 取得某角色「擁有」的影片組合（他排在檔名第一位的那些）。
 * 沒建索引或這個人沒有影片，一律回空陣列 —— 呼叫端不需要處理非同步。
 */
export function getGroupsFor(name: string): string[][] {
  const index = loadIndex();
  if (!index) return [];
  const ids = index.byOwner[name] ?? [];
  return ids.map((id) => index.groups[id]!).filter(Boolean);
}

export function hasIndex(): boolean {
  return loadIndex() !== null;
}

/** 索引是否涵蓋這批角色、且時間戳仍相符。 */
export function getIndexStatus(names: string[], mediaTimestamp: string) {
  const index = loadIndex();
  if (!index) {
    return { exists: false, stale: false, missingNames: names, index: null as VideoIndex | null };
  }
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
  const byArity: Record<number, number> = {};
  for (const group of index.groups) {
    byArity[group.length] = (byArity[group.length] ?? 0) + 1;
  }
  return {
    source: index.source,
    builtAt: index.builtAt,
    characters: index.names.length,
    videos: index.groups.length,
    owners: Object.keys(index.byOwner).length,
    byArity,
    slowStartFiles: index.slowStartFiles ?? [],
  };
}

// --- 併發工具 ---

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

// --- faststart 檢查 ---

function readBoxType(view: DataView, offset: number): string {
  let type = '';
  for (let i = 0; i < 4; i += 1) type += String.fromCharCode(view.getUint8(offset + i));
  return type;
}

/**
 * 抓檔案前 1KB，走一遍 MP4 的頂層 box，看 `moov` 有沒有排在 `mdat` 前面。
 * moov 在檔尾（非 faststart）的話，瀏覽器必須把整支下載完才能播第一格 ——
 * 這是 hover 卡頓最常見、也是前端救不回來的原因。
 * 回傳 true = faststart OK，false = 有問題，null = 判斷不出來（不計入）。
 */
export async function checkFastStart(url: string): Promise<boolean | null> {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    let pos = 0;
    while (pos + 8 <= view.byteLength) {
      let size = view.getUint32(pos);
      const type = readBoxType(view, pos + 4);
      if (type === 'moov') return true;
      if (type === 'mdat') return false;
      if (size === 1) {
        if (pos + 16 > view.byteLength) return null;
        // 64-bit largesize：只取低 32 位元，這種尺寸一定超出 1KB
        size = view.getUint32(pos + 12);
      }
      if (size <= 0) return null;
      pos += size;
    }
    return null; // 前 1KB 之內看不到 moov/mdat
  } catch {
    return null;
  }
}

/** 抽樣檢查，回傳非 faststart 的檔名。 */
export async function sampleFastStart(
  baseUrl: string,
  groups: string[][],
  sampleSize = 12,
): Promise<string[]> {
  if (groups.length === 0) return [];
  const step = Math.max(1, Math.floor(groups.length / sampleSize));
  const sample: string[][] = [];
  for (let i = 0; i < groups.length && sample.length < sampleSize; i += step) {
    sample.push(groups[i]!);
  }

  const bad: string[] = [];
  await mapWithConcurrency(sample, 6, async (group) => {
    const ok = await checkFastStart(groupUrl(baseUrl, group));
    if (ok === false) bad.push(`${groupFileBase(group)}.mp4`);
  });
  return bad;
}

// --- 來源 1：manifest（一次 GET，任意人數） ---

export interface ParseReport {
  groups: string[][];
  /** 被略過的檔名與原因，用來診斷「清單有東西但一支都沒收錄」。 */
  rejected: Array<{ file: string; reason: string }>;
}

function parseFilenames(files: string[], names: string[]): ParseReport {
  const nameSet = new Set(names);
  const groups: string[][] = [];
  const rejected: Array<{ file: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const file of files) {
    const trimmed = (file.split('/').pop() ?? file).trim();
    if (!trimmed) continue;
    if (!trimmed.toLowerCase().endsWith('.mp4')) {
      rejected.push({ file: trimmed, reason: '不是 .mp4' });
      continue;
    }
    const base = trimmed.slice(0, -4);
    const parts = base.split('_');
    if (parts.length < 2) {
      rejected.push({ file: trimmed, reason: '沒有底線，不是組合影片' });
      continue;
    }
    if (!nameSet.has(parts[0]!)) {
      rejected.push({ file: trimmed, reason: `第一個名字「${parts[0]}」不在角色名單裡` });
      continue;
    }
    const key = groupFileBase(parts);
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(parts);
  }
  return { groups, rejected };
}

function groupsFromFilenames(files: string[], names: string[]): string[][] {
  return parseFilenames(files, names).groups;
}

/**
 * 直接用一份檔名清單建索引（不連線）。
 * 給「manifest 還沒部署，但想立刻驗證」用：把資料夾裡的 mp4 檔名貼進來即可。
 */
export function buildIndexFromFiles(
  files: string[],
  names: string[],
  mediaTimestamp: string,
): { index: VideoIndex; rejected: Array<{ file: string; reason: string }> } {
  const { groups, rejected } = parseFilenames(files, names);
  const index = hydrate({
    version: INDEX_VERSION,
    mediaTimestamp,
    builtAt: Date.now(),
    source: 'manifest',
    names: [...names],
    groups,
  });
  saveIndex(index);
  return { index, rejected };
}

/**
 * 嘗試從靜態主機抓 manifest。抓不到（404 / 格式不符）就回 null，由呼叫端退回 probe。
 * 支援：
 *   ["A_B.mp4", "A_B_C.mp4", ...]
 *   { "files": [...] }
 *   { "groups": [["A","B"], ["A","B","C"]] }
 */
export function manifestUrl(baseUrl: string): string {
  return `${baseUrl}/${MANIFEST_FILENAME}`;
}

/** 上一次嘗試讀 manifest 的結果，讓 UI 能說清楚「為什麼退回 probe」。 */
export let lastManifestError = '';

export async function fetchRemoteManifest(
  baseUrl: string,
  names: string[],
  mediaTimestamp: string,
): Promise<VideoIndex | null> {
  const url = `${manifestUrl(baseUrl)}?t=${encodeURIComponent(mediaTimestamp)}`;
  lastManifestError = '';
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      lastManifestError = `HTTP ${response.status}（檔案不存在或無法讀取）`;
      console.warn(`[videoIndex] 讀不到 manifest: ${url} -> ${lastManifestError}`);
      return null;
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch {
      lastManifestError = '回應不是合法 JSON（可能被導到 HTML 錯誤頁）';
      console.warn(`[videoIndex] manifest 解析失敗: ${url} -> ${lastManifestError}`);
      return null;
    }

    let groups: string[][] | null = null;
    let rawCount = 0;
    if (Array.isArray(payload)) {
      rawCount = payload.length;
      groups = groupsFromFilenames(payload, names);
    } else if (Array.isArray(payload?.files)) {
      rawCount = payload.files.length;
      groups = groupsFromFilenames(payload.files, names);
    } else if (Array.isArray(payload?.groups)) {
      rawCount = payload.groups.length;
      groups = (payload.groups as string[][]).filter(
        (group) => Array.isArray(group) && group.length >= 2,
      );
    }

    if (!groups) {
      lastManifestError = 'JSON 格式不認得（需要 files 陣列或 groups 陣列）';
      console.warn(`[videoIndex] ${lastManifestError}`, payload);
      return null;
    }

    if (groups.length === 0 && rawCount > 0) {
      // 清單有東西但一個都對不上 —— 幾乎都是「檔名的第一個名字不是角色名」
      lastManifestError =
        `清單有 ${rawCount} 筆，但沒有一筆的第一個名字對得上角色名單`;
      console.warn(`[videoIndex] ${lastManifestError}`);
    } else {
      console.info(
        `[videoIndex] manifest OK：${rawCount} 筆檔名 -> 收錄 ${groups.length} 支影片`,
      );
    }

    return hydrate({
      version: INDEX_VERSION,
      mediaTimestamp,
      builtAt: Date.now(),
      source: 'manifest',
      names: [...names],
      groups,
    });
  } catch (error) {
    lastManifestError =
      error instanceof TypeError
        ? '網路或 CORS 錯誤（跨網域讀取被擋）'
        : String(error);
    console.warn(`[videoIndex] 讀 manifest 失敗: ${url} -> ${lastManifestError}`);
    return null;
  }
}

// --- 來源 2：probe（HEAD 掃兩人組） ---

export interface BuildOptions {
  baseUrl: string;
  names: string[];
  mediaTimestamp: string;
  concurrency?: number;
  onProgress?: (progress: BuildProgress) => void;
  signal?: AbortSignal;
  /** 略過 manifest、直接 HEAD 全掃。 */
  forceProbe?: boolean;
  /** 建完後抽樣檢查 faststart（預設開啟）。 */
  checkFastStart?: boolean;
}

/**
 * 建立（或重建）整張索引。只由「建立影片快取」按鈕觸發。
 * 先試 manifest（1 次請求、任意人數）；失敗才 HEAD 掃兩人組 N(N-1) 次。
 */
export async function buildIndex(options: BuildOptions): Promise<VideoIndex> {
  const {
    baseUrl,
    names,
    mediaTimestamp,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    signal,
    forceProbe,
    checkFastStart: wantFastStartCheck = true,
  } = options;

  let index: VideoIndex | null = null;

  if (!forceProbe) {
    index = await fetchRemoteManifest(baseUrl, names, mediaTimestamp);
    if (index) onProgress?.({ done: 1, total: 1, found: index.groups.length });
  }

  if (!index) {
    // 展開成一維工作清單讓併發池吃滿；slot 保留順序，避免結果次序隨機。
    const jobs: Array<{ self: string; other: string; slot: number }> = [];
    names.forEach((self, selfSlot) => {
      names.forEach((other, otherSlot) => {
        if (self !== other) jobs.push({ self, other, slot: selfSlot * names.length + otherSlot });
      });
    });

    const hits: Array<{ group: string[]; slot: number }> = [];
    let done = 0;

    await mapWithConcurrency(
      jobs,
      concurrency,
      async ({ self, other, slot }) => {
        const url = `${groupUrl(baseUrl, [self, other])}?t=${encodeURIComponent(mediaTimestamp)}`;
        try {
          const response = await fetch(url, { method: 'HEAD', signal });
          if (response.ok) hits.push({ group: [self, other], slot });
        } catch { /* 不存在 / 被中斷就當作沒有 */ }
        done += 1;
        if (done % 25 === 0 || done === jobs.length) {
          onProgress?.({ done, total: jobs.length, found: hits.length });
        }
      },
      signal,
    );

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    index = hydrate({
      version: INDEX_VERSION,
      mediaTimestamp,
      builtAt: Date.now(),
      source: 'probe',
      names: [...names],
      groups: hits.sort((a, b) => a.slot - b.slot).map((hit) => hit.group),
    });
  }

  if (wantFastStartCheck && !signal?.aborted) {
    const bad = await sampleFastStart(baseUrl, index.groups);
    index.slowStartFiles = bad;
    if (bad.length > 0) {
      console.warn(
        `[videoIndex] 有 ${bad.length} 支影片的 moov atom 不在檔頭（非 faststart），` +
        'hover 時瀏覽器必須下載完整支才能播第一格。請用 ' +
        '`ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4` 重新輸出：',
        bad,
      );
    }
  }

  saveIndex(index);
  return index;
}
