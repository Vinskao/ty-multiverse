type VideoItem = {
  character: string;
  title: string;
  src: string;
};

const SLOT_COUNT = 4;
const CACHE_KEY = 'video_library_cache';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_DAYS = 7;

interface CacheData {
  version: string;
  timestamp: number;
  videos: VideoItem[];
}

let selectedSlots: Array<VideoItem | null> = Array(SLOT_COUNT).fill(null);
let videoLibrary: VideoItem[] = [];
let isProcessing = false;

document.addEventListener('DOMContentLoaded', () => {
  wireUI();
  loadLibrary();
});

function wireUI() {
  const clearBtn = document.getElementById('merge-clear-btn') as HTMLButtonElement | null;
  const startBtn = document.getElementById('merge-start-btn') as HTMLButtonElement | null;
  const refreshBtn = document.getElementById('refresh-library-btn') as HTMLButtonElement | null;

  clearBtn?.addEventListener('click', () => {
    resetSlots();
    updateStatus('已清除選擇，請重新選擇 4 支影片', 0);
  });

  startBtn?.addEventListener('click', async () => {
    if (isProcessing) return;
    if (!selectedSlots.every(Boolean)) {
      updateStatus('請先選滿 4 支影片再開始合併', undefined, true);
      return;
    }
    await processMerge();
  });

  refreshBtn?.addEventListener('click', async () => {
    clearCache();
    videoLibrary = [];
    const container = document.getElementById('video-library');
    if (container) container.innerHTML = '<div style="padding: 2rem; text-align: center;">正在重新載入...</div>';
    await loadLibrary();
  });

  renderSlots();
  updateStatus('等待選擇影片', 0);
}

async function loadLibrary() {
  const config = (window as any).TY_MULTIVERSE_CONFIG || {};
  const { peopleImageUrl } = config;

  console.log('開始載入影片庫，config:', config);

  try {
    // 先嘗試從快取載入
    const cached = loadFromCache();
    if (cached && cached.length > 0) {
      console.log('從快取載入', cached.length, '個影片');
      videoLibrary = cached;
      renderLibrary();
      updateStatus(`影片庫載入完成 (來自快取: ${videoLibrary.length} 個影片)`, 10);
      return;
    }

    updateStatus('正在載入影片庫...', 5);
    const { peopleService } = await import('../services/api/peopleService');
    const names = await peopleService.getAllPeopleNamesAndWait();

    console.log('獲取到角色名稱:', names?.length || 0, '個');

    if (!names || names.length === 0) {
      throw new Error('沒有可用的角色');
    }

    // 只載入主影片 + 少量帶序號影片，降低掃描成本
    const maxNumbered = 2;
    let processedCount = 0;
    
    for (const name of names) {
      const videos = await getCharacterVideos(peopleImageUrl, name, maxNumbered);
      if (videos.length > 0) {
        videoLibrary.push(...videos);
        processedCount++;
        updateStatus(`正在掃描影片... ${processedCount}/${names.length}`, 5 + (processedCount / names.length) * 5);
      }
    }

    console.log('載入完成，共', videoLibrary.length, '個影片');
    
    // 儲存到快取
    saveToCache(videoLibrary);
    
    renderLibrary();
    updateStatus(`影片庫載入完成 (${videoLibrary.length} 個影片)`, 10);
  } catch (err) {
    console.error('載入影片庫失敗:', err);
    updateStatus('載入影片庫失敗，請重新整理重試', undefined, true);
  }
}

function saveToCache(videos: VideoItem[]) {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      videos
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('已儲存', videos.length, '個影片到快取');
  } catch (error) {
    console.warn('儲存快取失敗:', error);
  }
}

function loadFromCache(): VideoItem[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CacheData = JSON.parse(cached);
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    if (data.version !== CACHE_VERSION || now - data.timestamp > expiryTime) {
      console.log('快取已過期，清除');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data.videos;
  } catch (error) {
    console.warn('載入快取失敗:', error);
    return null;
  }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  console.log('已清除影片庫快取');
}

function renderLibrary() {
  const container = document.getElementById('video-library');
  if (!container) return;
  container.innerHTML = '';

  if (videoLibrary.length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--gray-400);">沒有可用的影片</div>';
    return;
  }

  videoLibrary.forEach((video, index) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = video.title;
    title.style.fontSize = '14px';
    title.style.marginBottom = '8px';

    const btn = document.createElement('button');
    btn.className = 'add-btn';
    btn.textContent = '選擇';
    btn.addEventListener('click', () => addVideoToSlot(video));

    card.append(title, btn);
    container.appendChild(card);
  });

  console.log(`已渲染 ${videoLibrary.length} 個影片卡片`);
}

function renderSlots() {
  const grid = document.getElementById('selected-grid');
  if (!grid) return;
  const startBtn = document.getElementById('merge-start-btn') as HTMLButtonElement | null;

  Array.from(grid.children).forEach((slotEl, idx) => {
    const slot = selectedSlots[idx];
    const body = slotEl.querySelector('.slot-body');
    if (!body) return;

    slotEl.classList.toggle('filled', !!slot);
    const title = body.querySelector('.slot-title') as HTMLElement | null;
    const hint = body.querySelector('.slot-hint') as HTMLElement | null;

    if (slot) {
      if (title) title.textContent = slot.title;
      if (hint) hint.textContent = `來源：${slot.character}`;

      let meta = body.querySelector('.slot-video-meta') as HTMLElement | null;
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'slot-video-meta';
        body.appendChild(meta);
      }
      meta.textContent = '已選擇';

      let remove = body.querySelector('.slot-remove') as HTMLElement | null;
      if (!remove) {
        remove = document.createElement('div');
        remove.className = 'slot-remove';
        remove.textContent = '移除';
        remove.addEventListener('click', () => removeSlot(idx));
        body.appendChild(remove);
      }
    } else {
      if (title) title.textContent = '尚未選擇';
      if (hint) hint.textContent = '點擊下方影片庫以填入此插槽';
      body.querySelector('.slot-video-meta')?.remove();
      body.querySelector('.slot-remove')?.remove();
    }
  });

  if (startBtn) startBtn.disabled = !selectedSlots.every(Boolean);
}

function resetSlots() {
  selectedSlots = Array(SLOT_COUNT).fill(null);
  renderSlots();
}

function addVideoToSlot(video: VideoItem) {
  const emptyIndex = selectedSlots.findIndex((s) => !s);
  const targetIndex = emptyIndex >= 0 ? emptyIndex : SLOT_COUNT - 1;
  selectedSlots[targetIndex] = video;
  renderSlots();
}

function removeSlot(index: number) {
  selectedSlots[index] = null;
  renderSlots();
}

async function getVideoUrl(baseUrl: string, videoName: string): Promise<string | null> {
  if (!baseUrl) return null;
  let url: string;
  if (baseUrl.endsWith('/images/people')) {
    url = `${baseUrl}/${videoName}.mp4`;
  } else if (baseUrl.includes('/images/people')) {
    url = `${baseUrl}/${videoName}.mp4`;
  } else {
    const clean = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    url = `${clean}/images/people/${videoName}.mp4`;
  }

  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    return res.ok ? `${url}?t=${Date.now()}` : null;
  } catch {
    return null;
  }
}

async function getCharacterVideos(baseUrl: string, character: string, maxNumbered: number): Promise<VideoItem[]> {
  const videos: VideoItem[] = [];
  const main = await getVideoUrl(baseUrl, character);
  if (main) videos.push({ character, title: character, src: main });

  let current = 1;
  let misses = 0;
  const maxMisses = 2;
  while (current <= maxNumbered && misses < maxMisses) {
    const url = await getVideoUrl(baseUrl, `${character}${current}`);
    if (url) {
      videos.push({ character, title: `${character} ${current}`, src: url });
      misses = 0;
    } else {
      misses++;
    }
    current++;
  }
  return videos;
}

function updateStatus(message: string, progress?: number, isError = false) {
  const statusBox = document.getElementById('processing-status');
  if (!statusBox) return;
  const text = statusBox.querySelector('.status-text');
  const bar = statusBox.querySelector('.progress') as HTMLElement | null;

  if (text) text.textContent = message;
  if (typeof progress === 'number' && bar) {
    bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }
  statusBox.classList.toggle('loading-error', isError);
}

async function processMerge() {
  if (!selectedSlots.every(Boolean)) return;
  isProcessing = true;
  updateStatus('準備合併影片...', 15);

  try {
    const videoServiceUrl = import.meta.env.PUBLIC_VIDEO_SERVICE_URL || 'http://localhost:3000';
    
    const videoUrls = selectedSlots.map(slot => slot!.src);
    
    updateStatus('正在傳送請求到 Video Service...', 20);
    
    const response = await fetch(`${videoServiceUrl}/api/videos/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrls,
        outputFormat: 'webm',
        removeBackground: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Video Service 處理失敗');
    }

    updateStatus('Video Service 正在處理影片...', 50);
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || result.error || '合併失敗');
    }

    updateStatus('處理完成，準備下載...', 90);
    
    // 顯示預覽
    const fullDownloadUrl = `${videoServiceUrl}${result.outputUrl}`;
    const preview = document.getElementById('merged-preview') as HTMLVideoElement | null;
    if (preview) {
      preview.src = fullDownloadUrl;
      preview.load();
    }

    const download = document.getElementById('download-link') as HTMLAnchorElement | null;
    if (download) {
      download.href = fullDownloadUrl;
      download.setAttribute('aria-disabled', 'false');
      const filename = result.outputUrl.split('/').pop() || 'merged.webm';
      download.setAttribute('download', filename);
    }

    updateStatus(`✅ 合併完成！檔案大小: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB，長度: ${result.duration.toFixed(1)} 秒`, 100);
  } catch (err: any) {
    console.error(err);
    updateStatus('❌ 合併失敗: ' + err.message, undefined, true);
  } finally {
    isProcessing = false;
  }
}
