/**
 * 互動影片索引（video index）
 *
 * 檔名規則：`A_B.mp4`、`A_B_C.mp4`… 成員以底線相接。角色名不含底線，所以 split('_')
 * 就能還原成員清單，任意人數都通用。
 *
 * 問題：group 頁 hover 一個角色時，原本要對「其他每一個角色」各發一次 HEAD
 * 去猜檔名存不存在 —— 單次 hover O(N) 次網路探測，全部人 hover 過就是 O(N²)。
 * 而且只存記憶體，重整全部重來。
 *
 * 解法：把「線性掃描」換成「預先建好的索引」。
 *   - 資料結構：`groups: string[][]`（每組成員）＋ `byName: name -> groups 的索引`。
 *     只存實際存在的組合（E 組，E << Nᵏ），查詢是 O(1) 雜湊查表。
 *     成員只存一份、byName 存整數索引，所以三人組不會被複製三次。
 *   - 建索引的來源優先序：
 *       1. manifest：靜態主機上的 `pair-videos.json`，一次 GET 拿到全部檔名。
 *          成本 O(E)，與 N 和「幾人一組」完全無關 —— 三人以上只能靠這條。
 *       2. probe：沒有 manifest 才退回 HEAD 全掃，但只掃「兩人組」N(N-1) 次，
 *          因為三人組是 O(N³)（N=50 約 12 萬次請求）現實上不可行。
 *   - 之後 hover 完全不碰網路。
 */

const STORAGE_KEY = 'palais-video-index-v2';
const MANIFEST_FILENAME = 'pair-videos.json';
const INDEX_VERSION = 2;

export type IndexSource = 'manifest' | 'probe';

/** 存進 localStorage 的形狀（byName 是衍生資料，不落地，載入時重算）。 */
interface StoredIndex {
  version: number;
  mediaTimestamp: string;
  builtAt: number;
  source: IndexSource;
  /** 建索引時掃過的角色名單，用來判斷有沒有新角色加入。 */
  names: string[];
  /** 每組的成員，順序即檔名順序。 */
  groups: string[][];
  /** moov atom 不在檔頭的檔案（非 faststart，會讓 hover 卡住）。 */
  slowStartFiles?: string[];
}

export interface VideoIndex extends StoredIndex {
  /** 反向索引：角色名 -> 他參與的 groups 索引。 */
  byName: Record<string, number[]>;
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

/** `A_B_C` -> ['A','B','C']；任一段不是已知角色、或有重複、或不足兩人就回 null。 */
function parseGroupFromBase(base: string, nameSet: Set<string>): string[] | null {
  const parts = base.split('_');
  if (parts.length < 2) return null;
  const seen = new Set<string>();
  for (const part of parts) {
    if (!nameSet.has(part) || seen.has(part)) return null;
    seen.add(part);
  }
  return parts;
}

function buildByName(groups: string[][]): Record<string, number[]> {
  const byName: Record<string, number[]> = {};
  groups.forEach((group, index) => {
    for (const member of group) {
      (byName[member] ??= []).push(index);
    }
  });
  return byName;
}

function hydrate(stored: StoredIndex): VideoIndex {
  return { ...stored, byName: buildByName(stored.groups) };
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
  const { byName: _byName, ...stored } = index;
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
    localStorage.removeItem('palais-pair-video-index-v1'); // 舊版索引
  } catch { /* noop */ }
}

// --- 查詢（O(1)）---

export interface LookupOptions {
  /** 只回傳「這個人排在檔名第一位」的組（舊行為）。預設 false：任一成員都能觸發。 */
  ownerOnly?: boolean;
}

/**
 * 取得某角色參與的所有影片組合。
 * 回傳 null 代表索引裡沒有這個人的資料（尚未建索引），空陣列代表「確定沒有」。
 */
export function getGroupsFor(name: string, options: LookupOptions = {}): string[][] | null {
  const index = loadIndex();
  if (!index) return null;
  if (!index.names.includes(name)) return null;
  const ids = index.byName[name] ?? [];
  const groups = ids.map((id) => index.groups[id]!).filter(Boolean);
  return options.ownerOnly ? groups.filter((group) => group[0] === name) : groups;
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
    byArity,
    slowStartFiles: index.slowStartFiles ?? [],
  };
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
        // 64-bit largesize：只取低 32 位元，這種尺寸一定超出 1KB，直接判定看不到
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
  await mapWithConcurrency(sample, 4, async (group) => {
    const ok = await checkFastStart(groupUrl(baseUrl, group));
    if (ok === false) bad.push(`${groupFileBase(group)}.mp4`);
  });
  return bad;
}

// --- 來源 1：manifest（一次 GET，任意人數） ---

function groupsFromFilenames(files: string[], names: string[]): string[][] {
  const nameSet = new Set(names);
  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const trimmed = file.split('/').pop() ?? file;
    if (!trimmed.toLowerCase().endsWith('.mp4')) continue;
    const parsed = parseGroupFromBase(trimmed.slice(0, -4), nameSet);
    if (!parsed) continue;
    const key = groupFileBase(parsed);
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(parsed);
  }
  return groups;
}

/**
 * 嘗試從靜態主機抓 manifest。抓不到（404 / 格式不符）就回 null，由呼叫端退回 probe。
 * 支援：
 *   ["A_B.mp4", "A_B_C.mp4", ...]
 *   { "files": [...] }
 *   { "groups": [["A","B"], ["A","B","C"]] }   ← 已經建好的成員清單
 */
export async function fetchRemoteManifest(
  baseUrl: string,
  names: string[],
  mediaTimestamp: string,
): Promise<VideoIndex | null> {
  try {
    const response = await fetch(
      `${baseUrl}/${MANIFEST_FILENAME}?t=${encodeURIComponent(mediaTimestamp)}`,
      { cache: 'no-cache' },
    );
    if (!response.ok) return null;
    const payload = await response.json();

    let groups: string[][] | null = null;
    if (Array.isArray(payload)) {
      groups = groupsFromFilenames(payload, names);
    } else if (Array.isArray(payload?.files)) {
      groups = groupsFromFilenames(payload.files, names);
    } else if (Array.isArray(payload?.groups)) {
      groups = (payload.groups as string[][]).filter(
        (group) => Array.isArray(group) && group.length >= 2,
      );
    }
    if (!groups) return null;

    return hydrate({
      version: INDEX_VERSION,
      mediaTimestamp,
      builtAt: Date.now(),
      source: 'manifest',
      names: [...names],
      groups,
    });
  } catch {
    return null;
  }
}

// --- 來源 2：probe（HEAD 全掃兩人組，只做一次） ---

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
  /** 略過 manifest、直接 HEAD 全掃兩人組。 */
  forceProbe?: boolean;
  /** 建完後抽樣檢查 faststart（預設開啟）。 */
  checkFastStart?: boolean;
}

/**
 * 建立（或重建）整張索引。
 * 先試 manifest（1 次請求、任意人數）；失敗才 HEAD 全掃兩人組 N(N-1) 次。
 */
export async function buildIndex(options: BuildOptions): Promise<VideoIndex> {
  const {
    baseUrl,
    names,
    mediaTimestamp,
    concurrency = 6, // HTTP/1.1 對同一 origin 本來就只有 6 條連線，開更大沒意義
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
        if (done % 10 === 0 || done === jobs.length) {
          onProgress?.({ done, total: jobs.length, found: hits.length });
        }
      },
      signal,
    );

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

  // 中斷的話不要把半成品當成完整索引存起來
  if (!signal?.aborted) saveIndex(index);
  return index;
}

/**
 * 只補掃單一角色的兩人組（沒有整張索引時的降級路徑，維持原本 hover 行為但結果會被記住）。
 */
export async function probeCharacter(
  selfName: string,
  options: { baseUrl: string; names: string[]; mediaTimestamp: string; concurrency?: number },
): Promise<string[][]> {
  const { baseUrl, names, mediaTimestamp, concurrency = 6 } = options;
  const others = names.filter((name) => name && name !== selfName);
  const found: Array<string[] | null> = new Array(others.length).fill(null);

  await mapWithConcurrency(
    others.map((other, slot) => ({ other, slot })),
    concurrency,
    async ({ other, slot }) => {
      const url = `${groupUrl(baseUrl, [selfName, other])}?t=${encodeURIComponent(mediaTimestamp)}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) found[slot] = [selfName, other];
      } catch { /* noop */ }
    },
  );

  const result = found.filter((group): group is string[] => !!group);

  // 併回索引，下次就不用再掃這個人
  const existing = loadIndex();
  const stored: StoredIndex = existing
    ? { ...existing, groups: [...existing.groups] }
    : {
        version: INDEX_VERSION,
        mediaTimestamp,
        builtAt: Date.now(),
        source: 'probe',
        names: [],
        groups: [],
      };

  const seen = new Set(stored.groups.map(groupFileBase));
  for (const group of result) {
    const key = groupFileBase(group);
    if (!seen.has(key)) {
      seen.add(key);
      stored.groups.push(group);
    }
  }
  if (!stored.names.includes(selfName)) stored.names = [...stored.names, selfName];
  saveIndex(hydrate(stored));

  return result;
}
