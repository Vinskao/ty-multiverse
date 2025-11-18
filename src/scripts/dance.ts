document.addEventListener("DOMContentLoaded", async function () {
  const MAX_NUMBERED_INDEX = 50;
  let videoGroups: Array<{character: string, videos: Array<{src: string, title: string}>}> = [];
  let characterStates = new Map();
  let viewportObserver: IntersectionObserver | null = null;

  // 工具函數：構建影片URL並檢查存在性
  async function getVideoUrl(baseUrl: string, videoName: string): Promise<string | null> {
    // 確保 baseUrl 以 /images/people 結尾，或添加該路徑
    let url: string;
    if (baseUrl.endsWith('/images/people')) {
      url = `${baseUrl}/${videoName}.mp4`;
    } else if (baseUrl.includes('/images/people')) {
      url = `${baseUrl}/${videoName}.mp4`;
    } else {
      // 如果 baseUrl 不包含 /images/people，添加該路徑
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      url = `${cleanBaseUrl}/images/people/${videoName}.mp4`;
    }

    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      return response.ok ? `${url}?t=${Date.now()}` : null;
    } catch {
      return null;
    }
  }

  // 載入角色和影片內容
  async function loadDanceContent() {
    const config = (window as any).TY_MULTIVERSE_CONFIG || {};
    const { tymbUrl, peopleImageUrl } = config;

    try {
      updateLoadingStatus('loading', '正在獲取角色列表...');

      // 使用 peopleService 獲取角色名稱列表（處理異步響應）
      const { peopleService } = await import('../services/api/peopleService');
      const characterNames = await peopleService.getAllPeopleNamesAndWait();
      
      if (!Array.isArray(characterNames) || characterNames.length === 0) {
        throw new Error('角色列表為空或格式錯誤');
      }

      // 智能過濾角色
      const charactersToCheck = videoResourceManager.videoCache.size === 0
        ? characterNames
        : characterNames.filter(name => {
            const cached = videoResourceManager.getCachedVideoExists(name);
            return cached === undefined || cached === true || (cached === false && Math.random() < 0.2);
          });

      updateLoadingStatus('loading', `檢查 ${charactersToCheck.length} 個角色的影片狀態...`);

      // Streaming render：邊查邊顯示
      const CONCURRENCY = 6;
      let processed = 0;
      const grid = document.getElementById('videos-grid');
      if (grid) grid.innerHTML = '';

      async function processOne(character: string) {
        const videos = await getCharacterVideos(peopleImageUrl!, character);
        if (videos.length > 0) {
          const group = { character, videos };
          videoGroups.push(group);
          appendCharacterGroup(group); // 立即渲染這個角色
        } else {
          videoResourceManager.cacheVideoExists(character, false);
        }
        processed++;
        updateLoadingStatus('loading', `已處理 ${processed}/${charactersToCheck.length} 個角色...`);
      }

      let nextIndex = 0;
      const runners = Array.from({ length: Math.min(CONCURRENCY, charactersToCheck.length) }, async () => {
        while (nextIndex < charactersToCheck.length) {
          const idx = nextIndex++;
          const character = charactersToCheck[idx];
          if (!character) continue;
          await processOne(character);
        }
      });

      await Promise.all(runners);

      // 所有角色處理完畢後，初始化事件和觀察器
      initializeVideos();
      setupVideoEvents();
      setupViewportObserver();

      updateLoadingStatus('complete', `✅ 成功載入 ${videoGroups.length} 個角色的影片資料`);

    } catch (error) {
      console.error('載入失敗:', error);
      updateLoadingStatus('error', '❌ 載入失敗，請重新整理頁面');
    }
  }

  // 獲取角色的所有影片（優化版：分批併發檢查）
  async function getCharacterVideos(baseUrl: string, character: string): Promise<Array<{src: string, title: string}>> {
    const videos = [];

    // 檢查主要影片
    const mainUrl = await getVideoUrl(baseUrl, character);
    if (mainUrl) {
      videos.push({ src: mainUrl, title: character });
    }

    // 分批併發檢查編號影片（每批 5 個）
    const BATCH_SIZE = 5;
    const MAX_CONSECUTIVE_MISSING = 3; // 允許最多 3 個連續缺失
    let currentIndex = 1;
    let consecutiveMissing = 0;

    while (currentIndex <= MAX_NUMBERED_INDEX && consecutiveMissing < MAX_CONSECUTIVE_MISSING) {
      const batchPromises = [];
      const batchEndIndex = Math.min(currentIndex + BATCH_SIZE - 1, MAX_NUMBERED_INDEX);

      // 準備這一批的請求
      for (let i = currentIndex; i <= batchEndIndex; i++) {
        batchPromises.push(getVideoUrl(baseUrl, `${character}${i}`));
      }

      // 併發執行這一批請求
      const batchResults = await Promise.all(batchPromises);

      // 處理結果：只添加存在的影片，記錄連續缺失
      let batchHasVideo = false;
      for (let i = 0; i < batchResults.length; i++) {
        const url = batchResults[i];
        const videoIndex = currentIndex + i;

        if (url) {
          videos.push({ src: url, title: `${character} ${videoIndex}` });
          consecutiveMissing = 0; // 重置連續缺失計數
          batchHasVideo = true;
        } else {
          consecutiveMissing++;
        }
      }

      // 如果這一批完全沒有影片，增加連續缺失計數
      if (!batchHasVideo) {
        consecutiveMissing += batchResults.length;
      }

      currentIndex += BATCH_SIZE;
    }

    return videos;
  }

  // 創建影片元素
  function createVideoElement(character: string, video: {src: string, title: string}, index: number, isMain: boolean = false) {
        const item = document.createElement('div');
        item.className = 'video-item';
    item.setAttribute('data-character', character);

        const container = document.createElement('div');
        container.className = 'video-container';

        const videoElement = document.createElement('video');
    videoElement.id = `video-${character}-${index}`;
    videoElement.className = `dance-video ${isMain ? 'active' : 'always-visible'}`;
        videoElement.muted = true;
    videoElement.preload = isMain || index <= 1 ? 'auto' : 'metadata';
        videoElement.playsInline = true;
    videoElement.setAttribute('data-character', character);
    videoElement.setAttribute('data-video-index', index.toString());
        (videoElement as any).dataset.visible = 'false';
    if (!isMain) (videoElement as any).dataset.standalone = 'true';

        const source = document.createElement('source');
        source.src = video.src;
        source.type = 'video/mp4';
        videoElement.appendChild(source);
        container.appendChild(videoElement);

        const overlay = document.createElement('div');
        overlay.className = 'video-overlay';
        const title = document.createElement('div');
        title.className = 'video-title';
    title.textContent = video.title;
        overlay.appendChild(title);
        container.appendChild(overlay);

        item.appendChild(container);
    return item;
  }

  // 追加渲染單一角色
  function appendCharacterGroup(group: { character: string, videos: Array<{src: string, title: string}> }) {
    const grid = document.getElementById('videos-grid');
    if (!grid || group.videos.length === 0) return;

    // 創建單一角色卡片，包含所有影片
    const characterItem = document.createElement('div');
    characterItem.className = 'video-item';
    characterItem.setAttribute('data-character', group.character);

    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';

    // 將所有影片都放在同一個容器內
    group.videos.forEach((video, index) => {
      const videoElement = document.createElement('video');
      videoElement.id = `video-${group.character}-${index}`;
      videoElement.className = `dance-video ${index === 0 ? 'active' : ''}`;
      videoElement.muted = true;
      videoElement.preload = index <= 1 ? 'auto' : 'metadata';
      videoElement.playsInline = true;
      videoElement.setAttribute('data-character', group.character);
      videoElement.setAttribute('data-video-index', index.toString());
      (videoElement as any).dataset.visible = 'false';

      const source = document.createElement('source');
      source.src = video.src;
      source.type = 'video/mp4';
      videoElement.appendChild(source);
      videoContainer.appendChild(videoElement);
    });

    // 影片標題
    const videoOverlay = document.createElement('div');
    videoOverlay.className = 'video-overlay';
    const videoTitle = document.createElement('div');
    videoTitle.className = 'video-title';
    videoTitle.textContent = group.character;
    videoOverlay.appendChild(videoTitle);
    videoContainer.appendChild(videoOverlay);

    characterItem.appendChild(videoContainer);
    grid.appendChild(characterItem);
  }

  // 渲染所有影片（用於一次性渲染）
  function renderVideos() {
    const videosGrid = document.getElementById('videos-grid');
    if (!videosGrid) return;

    videosGrid.innerHTML = '';

    videoGroups.forEach((group) => {
      appendCharacterGroup(group);
    });
  }

  function updateLoadingStatus(status: string, message: string) {
    const loadingStatus = document.getElementById('loading-status');
    if (!loadingStatus) return;

      const text = loadingStatus.querySelector('span');
    if (text) text.textContent = message;

      loadingStatus.classList.remove('loading-complete', 'loading-error', 'hidden');

      if (status === 'complete') {
        loadingStatus.classList.add('loading-complete');
      setTimeout(() => loadingStatus.classList.add('hidden'), 3000);
      } else if (status === 'error') {
        loadingStatus.classList.add('loading-error');
    }
  }

  // 影片資源管理器
  const videoResourceManager = {
    maxConcurrentLoads: 3,
    loadingVideos: new Set<HTMLVideoElement>(),
    preloadQueue: [] as HTMLVideoElement[],
    preloadedVideos: new Set<HTMLVideoElement>(),
    videoCache: new Map<string, boolean>(),
    cacheExpiryDays: 7,

    canLoadVideo() {
      return this.loadingVideos.size < this.maxConcurrentLoads;
    },

    startLoading(video: HTMLVideoElement) {
      this.loadingVideos.add(video);
    },

    finishLoading(video: HTMLVideoElement) {
      this.loadingVideos.delete(video);
      this.preloadedVideos.add(video);
      this.processPreloadQueue();
    },

    queuePreload(video: HTMLVideoElement) {
      if (!this.preloadedVideos.has(video) && !this.loadingVideos.has(video)) {
        this.preloadQueue.push(video);
        this.processPreloadQueue();
      }
    },

    processPreloadQueue() {
      while (this.preloadQueue.length > 0 && this.canLoadVideo()) {
        const video = this.preloadQueue.shift();
        if (video && !this.preloadedVideos.has(video) && !this.loadingVideos.has(video)) {
          video.preload = 'auto';
          video.load();
        }
      }
    },

    saveCacheToStorage() {
      try {
        const cacheData = {
          timestamp: Date.now(),
          data: Array.from(this.videoCache.entries()),
          version: '1.0'
        };
        localStorage.setItem('dance_video_cache', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('無法保存影片緩存:', error);
      }
    },

    loadCacheFromStorage() {
      try {
        const stored = localStorage.getItem('dance_video_cache');
        if (!stored) return;

        const cacheData = JSON.parse(stored);
        const now = Date.now();
        const expiryTime = this.cacheExpiryDays * 24 * 60 * 60 * 1000;

        if (cacheData.version !== '1.0' || now - cacheData.timestamp > expiryTime) {
          localStorage.removeItem('dance_video_cache');
          return;
        }

        cacheData.data.forEach(([key, value]: [string, boolean]) => {
          this.videoCache.set(key, value);
        });
      } catch (error) {
        localStorage.removeItem('dance_video_cache');
      }
    },

    clearCache() {
      this.videoCache.clear();
      localStorage.removeItem('dance_video_cache');
    },

    cacheVideoExists(videoName: string, exists: boolean) {
      const previousValue = this.videoCache.get(videoName);
      this.videoCache.set(videoName, exists);

      if (previousValue !== exists || this.videoCache.size <= 20 || this.videoCache.size % 5 === 0) {
        this.saveCacheToStorage();
      }
    },

    getCachedVideoExists(videoName: string) {
      return this.videoCache.get(videoName);
    }
  };

  function initializeVideos() {
    const items = document.querySelectorAll('.video-item');
    items.forEach(item => {
      const character = item.getAttribute('data-character');
      if (character) {
        characterStates.set(character, {
          currentIndex: 0,
          playDirection: 'forward',
          hasPlayedForward: false,
          hasPlayedBackward: false
        });
      }
    });
  }

  function setupVideoEvents() {
    const videos = Array.from(document.querySelectorAll('.dance-video')) as HTMLVideoElement[];
    videos.forEach(video => {
      // 檢查是否已經綁定過事件，避免重複綁定
      if (video.dataset.eventsBound === 'true') return;

      const character = video.getAttribute('data-character')!;
    const videoIndex = parseInt(video.getAttribute('data-video-index') || '0');

      video.addEventListener('loadstart', () => {
      videoResourceManager.startLoading(video);
      video.classList.add('loading');
    });

      video.addEventListener('canplay', () => {
      videoResourceManager.finishLoading(video);
      video.classList.remove('loading');

        if (shouldTryPlay(video, character, videoIndex)) {
          tryPlayVideo(video, character, videoIndex);
        }

        setTimeout(() => preloadNextVideo(character, videoIndex), 100);
      });

      video.addEventListener('error', () => {
      videoResourceManager.finishLoading(video);
      video.classList.remove('loading');
      delete video.dataset.playAttempted;
    });

      video.addEventListener('play', () => {
      video.classList.add('is-playing');
    });

      video.addEventListener('pause', () => {
      video.classList.remove('is-playing');
    });

      video.addEventListener('ended', () => {
      delete video.dataset.playAttempted;

        if (!video.classList.contains('active')) return;
        if (video.dataset.processingEnded) return;

        video.dataset.processingEnded = 'true';
        handleVideoEnded(video, character, videoIndex);
      });

      // 標記已綁定事件
      video.dataset.eventsBound = 'true';
    });
  }

  function shouldTryPlay(video: HTMLVideoElement, character: string, videoIndex: number): boolean {
    if (video.dataset.visible !== 'true' || video.dataset.playAttempted) return false;

    const characterVideos = document.querySelectorAll(`.dance-video[data-character="${character}"]`);
    return video.classList.contains('active') ||
           (video as any).dataset.pendingActive ||
           characterVideos.length === 1 ||
           videoIndex === 0;
  }

  function tryPlayVideo(video: HTMLVideoElement, character: string, videoIndex: number) {
    if (video.dataset.playAttempted) return;

    video.dataset.playAttempted = 'true';

    const attemptPlay = () => {
      if (video.dataset.visible !== 'true') {
        setTimeout(attemptPlay, 200);
        return;
      }

      if (video.readyState >= 3) {
        video.play().then(() => {
          delete (video as any).dataset.pendingActive;
        }).catch(e => {
          if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            console.log(`播放失敗 ${character}:`, e);
          }
          delete video.dataset.playAttempted;
          delete (video as any).dataset.pendingActive;
        });
      } else if (video.readyState >= 2) {
        setTimeout(attemptPlay, 100);
      } else {
        setTimeout(attemptPlay, 200);
      }
    };

    attemptPlay();
  }

  function handleVideoEnded(video: HTMLVideoElement, character: string, videoIndex: number) {
      const state = characterStates.get(character);
      if (!state) {
        delete video.dataset.processingEnded;
        return;
      }

        if (state.playDirection === 'forward') {
          state.playDirection = 'backward';
          state.hasPlayedForward = true;
          delete video.dataset.processingEnded;
          manualReversePlayback(video, character);
    } else {
          state.playDirection = 'forward';
          state.hasPlayedBackward = true;

          const characterVideos = document.querySelectorAll(`.dance-video[data-character="${character}"]`);
      state.currentIndex = (videoIndex + 1) % characterVideos.length;

      if (videoIndex === characterVideos.length - 1) {
            state.hasPlayedForward = false;
            state.hasPlayedBackward = false;
          }

          delete video.dataset.processingEnded;
      setTimeout(() => switchToNextVideo(character, video), 10);
    }
  }

  function preloadNextVideo(character: string, currentVideoIndex: number) {
    const characterVideos = document.querySelectorAll(`.dance-video[data-character="${character}"]`);
    if (characterVideos.length <= 1) return;

    const nextIndex = (currentVideoIndex + 1) % characterVideos.length;
    const nextVideo = characterVideos[nextIndex] as HTMLVideoElement;

    if (nextVideo && !videoResourceManager.preloadedVideos.has(nextVideo)) {
      videoResourceManager.queuePreload(nextVideo);
    }
  }

  function manualReversePlayback(video: HTMLVideoElement, character: string) {
    if (video.dataset.reverseAnimationId) {
      cancelAnimationFrame(parseInt(video.dataset.reverseAnimationId));
    }

    video.playbackRate = 1;
    video.currentTime = video.duration;
    video.pause();

    const reverseSpeed = 1/30;
    let isReversing = true;

    const reverseFrame = () => {
      if (!video.classList.contains('active') || !isReversing) {
          video.dataset.reverseAnimationId = '';
        return;
      }

      if (video.currentTime <= 0.1) {
        isReversing = false;
        video.dataset.reverseAnimationId = '';

        if (!video.classList.contains('active')) return;

        const state = characterStates.get(character);
        if (state) {
          setTimeout(() => switchToNextVideo(character, video), 10);
        }
        return;
      }

      video.currentTime = Math.max(0, video.currentTime - reverseSpeed);
      video.dataset.reverseAnimationId = requestAnimationFrame(reverseFrame).toString();
    };

    video.dataset.reverseAnimationId = requestAnimationFrame(reverseFrame).toString();
  }

  function switchToNextVideo(character: string, fromVideo?: HTMLVideoElement) {
    const characterVideos = document.querySelectorAll(`.dance-video[data-character="${character}"]`);
    const state = characterStates.get(character);

    if (!characterVideos.length || !state) return;

    // 單一影片處理
    if (characterVideos.length === 1) {
      const singleVideo = characterVideos[0] as HTMLVideoElement;
      singleVideo.currentTime = 0;
      singleVideo.playbackRate = 1;
      delete singleVideo.dataset.processingEnded;
      delete singleVideo.dataset.playAttempted;

      if (singleVideo.readyState >= 3) {
        singleVideo.dataset.playAttempted = 'true';
        singleVideo.play().catch(() => {
          delete singleVideo.dataset.playAttempted;
        });
      }

      state.playDirection = 'forward';
      state.hasPlayedForward = false;
      state.hasPlayedBackward = false;
      return;
    }

    // 多影片處理
    const nextIndex = state.currentIndex;
    const currentVideo = characterVideos[(nextIndex - 1 + characterVideos.length) % characterVideos.length] as HTMLVideoElement;
    const nextVideo = characterVideos[nextIndex] as HTMLVideoElement;

    if (!nextVideo) return;

    // 停止當前影片
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
      currentVideo.playbackRate = 1;
      if (currentVideo.dataset.reverseAnimationId) {
        cancelAnimationFrame(parseInt(currentVideo.dataset.reverseAnimationId));
        currentVideo.dataset.reverseAnimationId = '';
      }
      delete currentVideo.dataset.processingEnded;
      delete currentVideo.dataset.playAttempted;
      if (currentVideo.readyState < 2) currentVideo.preload = 'none';
      currentVideo.classList.remove('active');
    }

    // 啟動下一個影片
    delete nextVideo.dataset.playAttempted;
    delete nextVideo.dataset.processingEnded;

    if (nextVideo.readyState < 3) {
      (nextVideo as any).dataset.pendingActive = 'true';
    }

    nextVideo.classList.add('active');
    nextVideo.currentTime = 0;
    nextVideo.playbackRate = 1;

    // 嘗試播放
    const tryPlay = () => {
      if (!nextVideo.classList.contains('active') || nextVideo.dataset.visible !== 'true') {
        setTimeout(tryPlay, 100);
        return;
      }

      if (nextVideo.readyState >= 3 && !nextVideo.dataset.playAttempted) {
          nextVideo.dataset.playAttempted = 'true';
        nextVideo.play().catch(() => {
              delete nextVideo.dataset.playAttempted;
          if (nextVideo.readyState < 3) setTimeout(tryPlay, 100);
        });
      } else if (nextVideo.readyState < 3) {
        setTimeout(tryPlay, 50);
      }
    };

    tryPlay();

    // 更新狀態
    state.currentIndex = nextIndex;
    if (!state.hasPlayedForward && !state.hasPlayedBackward) {
      state.playDirection = 'forward';
      state.hasPlayedForward = false;
      state.hasPlayedBackward = false;
    }

    // 預載下一個影片
    const preloadIndex = (nextIndex + 1) % characterVideos.length;
      const preloadVideo = characterVideos[preloadIndex] as HTMLVideoElement;
    if (preloadVideo && preloadVideo.readyState < 2 && videoResourceManager.canLoadVideo()) {
          preloadVideo.preload = 'metadata';
    }
  }

  function setupBackupTimer(character: string) {
    const characterVideos = document.querySelectorAll(`.dance-video[data-character="${character}"]`);
    if (characterVideos.length <= 1) return;

    setInterval(() => {
      const state = characterStates.get(character);
      if (!state) return;

        const currentVideo = characterVideos[state.currentIndex] as HTMLVideoElement;
      if (!currentVideo?.classList.contains('active') || currentVideo.dataset.visible !== 'true') return;

          if (currentVideo.paused && !currentVideo.seeking) {
            const now = Date.now();
        const lastTime = currentVideo.dataset.lastActiveTime;
        if (!lastTime || now - parseInt(lastTime) > 10000) {
                switchToNextVideo(character);
            }
          } else {
            currentVideo.dataset.lastActiveTime = Date.now().toString();
      }
    }, 5000);
  }

  // 視窗觀察器設置
  function setupViewportObserver() {
    const videos = Array.from(document.querySelectorAll('.dance-video')) as HTMLVideoElement[];
    if (!('IntersectionObserver' in window)) {
      videos.forEach(v => (v as any).dataset.visible = 'true');
      return;
    }

    if (!viewportObserver) {
      viewportObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
          const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.3;

          video.dataset.visible = isVisible ? 'true' : 'false';

          if (isVisible && (video.classList.contains('active') || (video as any).dataset.pendingActive) && video.readyState >= 2) {
            setTimeout(() => {
              if (video.dataset.visible === 'true' && (video.classList.contains('active') || (video as any).dataset.pendingActive)) {
                video.play().catch(() => {});
              }
            }, 50);
          } else if (!isVisible && !video.paused) {
            try { video.pause(); } catch {}
        }
      });
    }, { threshold: [0, 0.3, 0.6, 1] });
    }

    videos.forEach(v => {
      if ((v as any).dataset.observed === 'true') return;
      (v as any).dataset.observed = 'true';
      viewportObserver!.observe(v);
    });
  }

  // 初始化所有功能
  function initializeAll() {
    // 載入緩存
    videoResourceManager.loadCacheFromStorage();

    // 設置事件監聽器
    document.querySelectorAll('.video-item').forEach(item => {
    const character = item.getAttribute('data-character');
      if (character) setupBackupTimer(character);
    });

    // 設置鍵盤快捷鍵
    document.addEventListener('keydown', handleKeyDown);

    // 設置清除緩存按鈕
    setupCacheClearButton();

    // 頁面事件
    window.addEventListener('beforeunload', () => videoResourceManager.saveCacheToStorage());

    // 開始載入內容
    setTimeout(loadDanceContent, 100);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'F5' || event.key === 'r') || event.key === 'F5') {
      event.preventDefault();
      clearCacheAndReload();
    }
  }

  function setupCacheClearButton() {
    const btn = document.getElementById('cache-clear-btn') as HTMLButtonElement;
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!confirm('確定要清除所有影片緩存並重新載入嗎？')) return;

      btn.classList.add('processing');
      btn.textContent = '正在清除緩存並重新載入...';
      btn.disabled = true;

      try {
        await clearCacheAndReload();
        updateLoadingStatus('complete', '✅ 緩存已清除，所有影片已重新載入');
    } catch (error) {
        updateLoadingStatus('error', '❌ 清除緩存時發生錯誤');
      } finally {
        btn.classList.remove('processing');
        btn.textContent = '清除緩存並重新載入';
        btn.disabled = false;
      }
    });
  }

  async function clearCacheAndReload() {
    videoResourceManager.clearCache();

    // 清除所有影片元素
    document.querySelectorAll('.dance-video').forEach(video => {
      const el = video as HTMLVideoElement;
      el.src = '';
      el.load();
      el.remove();
    });

    // 清除DOM
    const grid = document.getElementById('videos-grid');
    if (grid) grid.innerHTML = '';

    // 清除瀏覽器緩存
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

    // 重置狀態
    videoGroups = [];
    characterStates.clear();
    videoResourceManager.preloadedVideos.clear();
    videoResourceManager.loadingVideos.clear();
    videoResourceManager.preloadQueue.length = 0;

    await loadDanceContent();
  }

  // 全域工具函數
  (window as any).clearDanceCache = () => {
    videoResourceManager.clearCache();
    alert('已清除所有影片存在性緩存');
  };

  (window as any).reloadAllCharacters = () => {
    clearCacheAndReload();
  };

  (window as any).forceRefreshAllCharacters = () => {
    clearCacheAndReload();
  };

  (window as any).getDanceCacheStats = () => {
    const cache = videoResourceManager.videoCache;
    return {
      total: cache.size,
      withVideos: Array.from(cache.entries()).filter(([_, has]) => has).length,
      withoutVideos: Array.from(cache.entries()).filter(([_, has]) => !has).length,
      entries: Array.from(cache.entries())
    };
  };

  (window as any).saveDanceCache = () => {
    videoResourceManager.saveCacheToStorage();
  };

  // 開始初始化
  initializeAll();
});

