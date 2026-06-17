// 加上tooltip
// 使用 astro:page-load 來支援 View Transitions 的客戶端導航
import { serviceAvailabilityManager } from '../services/core/serviceAvailabilityManager';
import { SERVICE_KEYS } from '../common/constants/serviceKeys';
import { config } from '../services/core/config';

let _leetcodeAvailabilityCleanup: (() => void) | null = null;
let _marketQuoteTimer: number | null = null;
let _portfolioTimer: number | null = null;

// 定義提示文字（全域常量）
const shadeDescriptions: Record<string, string> = {
    shade1: "Score 5 Strong",
    shade2: "Score 4 Sufficient",
    shade3: "Score 3 Understood",
    shade4: "Score 2 Applicable",
    shade5: "Score 1 Basic",
};

// 分數映射（全域常量）
const shadeScores: Record<string, number> = {
    shade1: 5,
    shade2: 4,
    shade3: 3,
    shade4: 2,
    shade5: 1,
};

// 全域 tooltip 元素（只創建一次）
let globalTooltip: HTMLElement | null = null;

function getOrCreateTooltip(): HTMLElement {
    if (globalTooltip && document.body.contains(globalTooltip)) {
        return globalTooltip;
    }
    
    globalTooltip = document.createElement("div");
    globalTooltip.id = "global-pill-tooltip";
    globalTooltip.style.position = "absolute";
    globalTooltip.style.padding = "5px 10px";
    globalTooltip.style.backgroundColor = "#333";
    globalTooltip.style.color = "#fff";
    globalTooltip.style.borderRadius = "4px";
    globalTooltip.style.fontSize = "12px";
    globalTooltip.style.display = "none";
    globalTooltip.style.zIndex = "1000";
    globalTooltip.style.pointerEvents = "none";
    document.body.appendChild(globalTooltip);
    return globalTooltip;
}

function initTooltips() {
    const tooltip = getOrCreateTooltip();

    // 計算每個類別的總分數
    function calculateCategoryScores() {
        const categories = document.querySelectorAll('.category');
        
        categories.forEach((category) => {
            const pills = category.querySelectorAll('.pill');
            let totalScore = 0;
            
            pills.forEach((pill) => {
                const shadeClass = [...pill.classList].find((cls) => cls.startsWith("shade"));
                if (shadeClass && shadeScores[shadeClass]) {
                    totalScore += shadeScores[shadeClass];
                }
            });
            
            // 找到類別標題
            const title = category.querySelector('h5');
            if (title && !title.dataset.scoreAdded) {
                // 添加總分 - 改為小字格式（標記已添加避免重複）
                title.innerHTML = `${title.textContent} <sup style="font-size: 0.65em; color: #888; margin-left: 4px;">${totalScore}</sup>`;
                title.dataset.scoreAdded = 'true';
            }
        });
    }

    // 處理 hover 事件
    const pills = document.querySelectorAll<HTMLElement>(".pill");
    pills.forEach((pill) => {
        // 避免重複綁定事件
        if (pill.dataset.tooltipBound) return;
        pill.dataset.tooltipBound = 'true';

        let tooltipTextValue: string | null = null;
        if (pill.hasAttribute('data-explanation')) {
            tooltipTextValue = pill.getAttribute('data-explanation');
        } else {
            const shadeClass = [...pill.classList].find((cls) => cls.startsWith("shade"));
            if (shadeClass && shadeDescriptions[shadeClass]) {
                tooltipTextValue = shadeDescriptions[shadeClass];
            }
        }

        if (tooltipTextValue !== null) {
            const finalTooltipText = tooltipTextValue; // Ensures non-null string for closure
            // 滑鼠進入
            pill.addEventListener("mouseenter", (e) => {
                tooltip.textContent = finalTooltipText;
                tooltip.style.display = "block";
                const target = e.target as HTMLElement;
                const rect = target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + window.scrollX}px`;
                tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
            });

            // 滑鼠移動
            pill.addEventListener("mousemove", (e) => {
                tooltip.style.left = `${e.pageX}px`;
                tooltip.style.top = `${e.pageY - tooltip.offsetHeight - 5}px`;
            });

            // 滑鼠離開
            pill.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });
        }
    });

    // 計算並顯示分數
    calculateCategoryScores();
}

// 監聽 View Transitions 事件（支援客戶端導航）
document.addEventListener('astro:page-load', initTooltips);
// 備用：首次載入時也觸發
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTooltips);
} else {
    initTooltips();
}

// HEX to RGB 顏色轉換
function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

// RGB to HSL 顏色轉換
function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) % 6;
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }
        h *= 60;
    }

    return { h, s: s * 100, l: l * 100 };
}

// HSL to HEX 顏色轉換
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0,
        g = 0,
        b = 0;

    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (h >= 300 && h < 360) {
        r = c;
        g = 0;
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// 調整顏色的函數 (從原色到黑色漸層)
function adjustColorToBlack(hex: string, shadeLevel: number): { r: number, g: number, b: number } {
    const rgb = hexToRgb(hex);
    
    // 計算漸層比例 (shade1 = 0%, shade5 = 100%)
    const factor = (shadeLevel - 1) / 4;
    
    // 將顏色向黑色漸變
    return {
        r: Math.round(rgb.r * (1 - factor)),
        g: Math.round(rgb.g * (1 - factor)),
        b: Math.round(rgb.b * (1 - factor))
    };
}

// 將 RGB 顏色轉為 HEX 的輔助函數
function rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match) throw new Error('Invalid RGB color');
    const [r, g, b] = match.map(Number);
    return (
        '#' +
        ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

// 初始化 shade 與 pill 顏色
const applyShadesToPills = () => {
    const pills = document.querySelectorAll<HTMLElement>('.pill');

    pills.forEach((pill) => {
        // 避免重複處理
        if (pill.dataset.shadeApplied) return;
        
        const baseColor = getComputedStyle(pill).backgroundColor;
        const shadeClass = [...pill.classList].find((cls) => cls.startsWith('shade'));
        if (shadeClass) {
            const shadeLevel = parseInt(shadeClass.replace('shade', ''), 10);
            const adjustedColor = adjustColorToBlack(rgbToHex(baseColor), shadeLevel);
            pill.style.backgroundColor = `rgb(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b})`;
            pill.dataset.shadeApplied = 'true';
        }
    });
}

// applyShadesToPills 已經在 initTooltips 中被間接處理，但確保也支援 View Transitions
document.addEventListener('astro:page-load', applyShadesToPills);

interface ErrorData {
    detail?: {
        message?: string;
    };
    message?: string;
}

// LeetCode API Integration
async function fetchLeetCodeStats() {
    const username = 'Vinskao';
    try {
        // 使用 Maya Sawa 代理 API 来绕过 CORS 限制
        // 生产环境：https://peoplesystem.tatdvsonorth.com/maya-sawa/proxy/leetcode-stats/{username}
        // 本地开发：http://localhost:8000/maya-sawa/proxy/leetcode-stats/{username}
        const response = await fetch(`/maya-sawa/proxy/leetcode-stats/${username}`);
        
        // Proxy/backend 5xx means the optional local Maya Sawa chain is unavailable.
        if (response.status >= 500) {
            serviceAvailabilityManager.block(SERVICE_KEYS.LEETCODE);
            return;
        }

        // 检查响应状态
        if (!response.ok) {
            const errorData: ErrorData | unknown = await response.json().catch(() => ({ detail: { message: `HTTP ${response.status}` } }));
            const msg = (errorData as ErrorData).detail?.message || (errorData as any)?.detail || `HTTP ${response.status}`;
            throw new Error(msg);
        }

        const data = await response.json();
        serviceAvailabilityManager.unblock(SERVICE_KEYS.LEETCODE);
        
        // Update the stats in the DOM with null checks
        const totalSolved = document.getElementById('total-solved');
        const easySolved = document.getElementById('easy-solved');
        const mediumSolved = document.getElementById('medium-solved');
        const hardSolved = document.getElementById('hard-solved');
        
        const totalProgress = document.getElementById('total-progress');
        const easyProgress = document.getElementById('easy-progress');
        const mediumProgress = document.getElementById('medium-progress');
        const hardProgress = document.getElementById('hard-progress');
        
        if (totalSolved) totalSolved.textContent = data.totalSolved;
        if (easySolved) easySolved.textContent = data.easySolved;
        if (mediumSolved) mediumSolved.textContent = data.mediumSolved;
        if (hardSolved) hardSolved.textContent = data.hardSolved;
        
        // Update progress bars
        if (totalProgress) totalProgress.style.width = `${(data.totalSolved / 2000) * 100}%`;
        if (easyProgress) easyProgress.style.width = `${(data.easySolved / 1000) * 100}%`;
        if (mediumProgress) mediumProgress.style.width = `${(data.mediumSolved / 800) * 100}%`;
        if (hardProgress) hardProgress.style.width = `${(data.hardSolved / 200) * 100}%`;
        
        // Add some animation
        const cards = document.querySelectorAll<HTMLElement>('.leetcode-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    } catch (error: any) {
        console.error('Error fetching LeetCode stats:', error);
        const leetcodeStats = document.getElementById('leetcode-stats');
        if (leetcodeStats) {
            // 使用后端返回的友好错误信息，或使用默认消息
            let errorMessage = error.message || 'Failed to load LeetCode stats';
            
            // 为常见错误提供更友好的消息
            if (errorMessage.includes('temporarily unavailable')) {
                errorMessage = '⏱️ ' + errorMessage;
            } else if (errorMessage.includes('timed out')) {
                errorMessage = '⏰ ' + errorMessage;
            } else if (!errorMessage.includes('LeetCode')) {
                errorMessage = 'Failed to load LeetCode stats: ' + errorMessage;
            }
            
            leetcodeStats.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: var(--gray-300); margin-bottom: 0.5rem;">${errorMessage}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-regular); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

interface TxfQuote {
    symbol: string;
    deliveryMonth?: string;
    close: number;
    open: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp?: string;
}

interface MarketUsage {
    connections: number;
    bytes: number;
    limitBytes: number;
    remainingBytes: number;
    usedMb: number;
    limitMb: number;
    remainingMb: number;
    fetchedAt: string;
    source: string;
}

interface PortfolioPosition {
    code: string;
    name?: string;
    productType: string;
    direction: string;
    quantity: number;
    signedQuantity: number;
    ydQuantity: number;
    averagePrice: number;
    lastPrice: number;
    pnl: number;
    marketValue: number;
    allocationValue?: number;
    contractSizeShares?: number;
    valuationFormula?: string;
    assetPercentage: number;
}

interface FuturesSummary {
    equity: number;
    equityAmount: number;
    availableMargin: number;
    openPositionPnl: number;
    maintenanceMargin: number;
    initialMargin: number;
    positionCount: number;
}

interface Portfolio {
    cashBalance: number | null;
    stockCashBalance?: number | null;
    futuresAvailableCash?: number;
    balanceAvailable: boolean;
    balanceError?: string;
    accountErrors?: Record<string, string>;
    balanceDate: string;
    totalAssetsEstimated: number | null;
    totalPositionExposure: number;
    stockMarketValue?: number;
    futuresContractExposure?: number;
    futuresEquity?: number;
    leverageRatio?: number | null;
    totalPnl: number;
    positionCount: number;
    cashPercentage: number;
    positions: PortfolioPosition[];
    stockPositions?: PortfolioPosition[];
    futuresPositions?: PortfolioPosition[];
    futuresSummary?: FuturesSummary;
    summaryFormulas?: {
        cashBalance?: string | null;
        totalAssetsEstimated?: string | null;
        totalPnl?: string | null;
        leverageRatio?: string | null;
    };
    fetchedAt: string;
    source: string;
    valuationNote: string;
}

const TXF_QUOTE_CACHE_KEY = 'market:txf-quote';
const QFF_QUOTE_CACHE_KEY = 'market:qff-quote';
const MARKET_USAGE_CACHE_KEY = 'market:usage';
const PORTFOLIO_CACHE_KEY = 'market:portfolio';

const astroApiPath = (path: string) => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

// Usage refreshes server-side every ~10 min; treat data older than this as stale.
const MARKET_USAGE_STALE_MS = 30 * 60 * 1000;

/**
 * Returns true only when `fetchedAt` is missing/invalid or older than maxAgeMs.
 * Used so a reachable-but-unauthorised (HTTP 401) request that falls back to a
 * recent cached snapshot is NOT mislabelled "Offline" — only genuinely old or
 * absent data is. */
function isDataStale(fetchedAt: string | undefined, maxAgeMs: number): boolean {
    if (!fetchedAt) return true;
    const ts = new Date(fetchedAt).getTime();
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > maxAgeMs;
}
const LEGACY_STOCK_NAMES: Record<string, string> = {
    '1785': '光洋科',
    '2313': '華通',
    '2327': '國巨*',
    '2344': '華邦電',
    '2368': '金像電',
    '2375': '凱美',
    '2408': '南亞科',
    '2472': '立隆電',
    '2478': '大毅',
    '2492': '華新科',
    '3008': '大立光',
    '3026': '禾伸堂',
    '3044': '健鼎',
    '3081': '聯亞',
    '3357': '臺慶科',
    '6173': '信昌電',
    '6213': '聯茂',
    '6274': '台燿',
    '6285': '啟碁',
    '6531': '愛普*',
};

function readCachedMarketData<T>(key: string): T | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw) as T;
        if (key === PORTFOLIO_CACHE_KEY) {
            const portfolio = value as Portfolio;
            let migrated = false;
            portfolio.positions?.forEach((position) => {
                if (!position.name && LEGACY_STOCK_NAMES[position.code]) {
                    position.name = LEGACY_STOCK_NAMES[position.code];
                    migrated = true;
                }
            });
            if (migrated) {
                window.localStorage.setItem(key, JSON.stringify(portfolio));
            }
        }
        return value;
    } catch (error) {
        console.warn(`Failed to read cached market data for ${key}:`, error);
        return null;
    }
}

function writeCachedMarketData<T>(key: string, value: T) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to cache market data for ${key}:`, error);
    }
}

function marketAuthHeaders(): HeadersInit {
    const token = new URLSearchParams(window.location.search).get('token')
        || window.localStorage.getItem('token')
        || window.localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function adminOnlyMessage(): string {
    return window.AppLang?.get?.() === 'zh'
        ? '此功能僅供管理員使用，請聯繫管理員。'
        : 'This feature is available to administrators. Please contact an administrator.';
}

function showAdminOnly(section: HTMLElement, statusId: string, messageId: string) {
    section.classList.remove('is-offline');
    const status = document.getElementById(statusId);
    if (status) status.textContent = '403';
    const message = document.getElementById(messageId);
    if (message) {
        message.textContent = adminOnlyMessage();
        message.hidden = false;
    }
}

function renderTxfQuote(quote: TxfQuote, offline = false) {
    const section = document.getElementById('txf-quote-section');
    if (!section) return;

    const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    section.classList.toggle('is-offline', offline);
    setText('txf-contract', `${quote.symbol}${quote.deliveryMonth ? ` · ${quote.deliveryMonth}` : ''}`);
    setText('txf-price', formatNumber(quote.close));
    setText('txf-change', `${quote.change >= 0 ? '+' : ''}${formatNumber(quote.change)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    setText('txf-open', formatNumber(quote.open));
    setText('txf-high', formatNumber(quote.high));
    setText('txf-low', formatNumber(quote.low));
    setText('txf-volume', quote.volume.toLocaleString());
    setText('txf-market-status', offline ? 'Offline' : '10m');
    setText(
        'txf-updated',
        quote.timestamp
            ? new Date(quote.timestamp).toLocaleString()
            : new Date().toLocaleString(),
    );

    const change = document.getElementById('txf-change');
    change?.classList.toggle('up', quote.change >= 0);
    change?.classList.toggle('down', quote.change < 0);
}

function renderQffQuote(quote: TxfQuote, offline = false) {
    const section = document.getElementById('qff-quote-section');
    if (!section) return;

    const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    section.classList.toggle('is-offline', offline);
    setText('qff-contract', `${quote.symbol}${quote.deliveryMonth ? ` · ${quote.deliveryMonth}` : ''}`);
    setText('qff-price', formatNumber(quote.close));
    setText('qff-change', `${quote.change >= 0 ? '+' : ''}${formatNumber(quote.change)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    setText('qff-open', formatNumber(quote.open));
    setText('qff-high', formatNumber(quote.high));
    setText('qff-low', formatNumber(quote.low));
    setText('qff-volume', quote.volume.toLocaleString());
    setText('qff-market-status', offline ? 'Offline' : '10m');
    setText('qff-updated', quote.timestamp ? new Date(quote.timestamp).toLocaleString() : new Date().toLocaleString());

    const change = document.getElementById('qff-change');
    change?.classList.toggle('up', quote.change >= 0);
    change?.classList.toggle('down', quote.change < 0);
}

function renderMarketUsage(usage: MarketUsage, offline = false) {
    const section = document.getElementById('market-usage-section');
    if (!section) return;

    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    section.classList.toggle('is-offline', offline);
    const accessMessage = document.getElementById('market-usage-access-message');
    if (accessMessage) accessMessage.hidden = true;
    setText('market-usage-used', `${usage.usedMb.toFixed(1)} MB`);
    setText('market-usage-limit', `/ ${usage.limitMb.toFixed(0)} MB`);
    setText('market-usage-remaining', `${usage.remainingMb.toFixed(1)} MB`);
    setText('market-usage-connections', usage.connections.toString());
    setText('market-usage-updated', new Date(usage.fetchedAt).toLocaleTimeString());
    // source intentionally hidden
    setText('market-usage-status', offline ? 'Offline' : '10m');

    const progress = document.getElementById('market-usage-progress-bar');
    if (progress) {
        const usedRatio = usage.limitBytes > 0 ? Math.min((usage.bytes / usage.limitBytes) * 100, 100) : 0;
        progress.style.width = `${usedRatio}%`;
    }
}

function renderPortfolio(portfolio: Portfolio, offline = false) {
    const section = document.getElementById('portfolio-section');
    if (!section) return;

    const currency = (value: number) => `NT$ ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const setSummaryTooltip = (valueId: string, tooltipId: string, formula: string | null | undefined) => {
        const valueEl = document.getElementById(valueId);
        const tooltipEl = document.getElementById(tooltipId);
        if (!valueEl || !tooltipEl) return;
        const content = formula?.trim() || 'Unavailable';
        tooltipEl.textContent = content;
        valueEl.setAttribute('aria-label', `${valueEl.textContent || ''}. Formula: ${content}`);
    };

    section.classList.toggle('is-offline', offline);
    const accessMessage = document.getElementById('portfolio-access-message');
    if (accessMessage) accessMessage.hidden = true;
    document.getElementById('portfolio-status')!.textContent = offline ? 'Offline' : '1h';
    document.getElementById('portfolio-cash')!.textContent = portfolio.cashBalance === null
        ? 'Unavailable'
        : currency(portfolio.cashBalance);
    document.getElementById('portfolio-total')!.textContent = portfolio.totalAssetsEstimated === null
        ? currency(portfolio.totalPositionExposure)
        : currency(portfolio.totalAssetsEstimated);
    document.getElementById('portfolio-updated')!.textContent = `${new Date(portfolio.fetchedAt).toLocaleString()} · ${portfolio.valuationNote}`;
    const totalPnl = portfolio.totalPnl ?? portfolio.positions.reduce((sum, position) => sum + position.pnl, 0);
    document.getElementById('portfolio-pnl')!.textContent = currency(totalPnl);
    document.getElementById('portfolio-pnl')!.className = totalPnl >= 0 ? 'up' : 'down';
    const leverage = document.getElementById('portfolio-leverage');
    if (leverage) {
        leverage.textContent = portfolio.leverageRatio === null || portfolio.leverageRatio === undefined
            ? 'Unavailable'
            : `${portfolio.leverageRatio.toFixed(2)}x`;
    }
    setSummaryTooltip('portfolio-cash', 'portfolio-cash-tooltip', portfolio.summaryFormulas?.cashBalance);
    setSummaryTooltip('portfolio-total', 'portfolio-total-tooltip', portfolio.summaryFormulas?.totalAssetsEstimated);
    const futPos = portfolio.futuresPositions ?? portfolio.positions.filter((p) => p.productType === 'futures');
    const secPos = portfolio.positions.filter((p) => p.productType !== 'futures');
    const secPnl = secPos.reduce((s, p) => s + p.pnl, 0);
    const futPnl = futPos.reduce((s, p) => s + p.pnl, 0);
    setSummaryTooltip('portfolio-pnl', 'portfolio-pnl-tooltip',
        `證券 ${secPnl >= 0 ? '+' : ''}${currency(secPnl)} / 期貨 ${futPnl >= 0 ? '+' : ''}${currency(futPnl)}`
    );
    setSummaryTooltip('portfolio-leverage', 'portfolio-leverage-tooltip', portfolio.summaryFormulas?.leverageRatio);
    renderPortfolioAllocation(portfolio);
}


type DonutSlice = { key: string; code: string; value: number; position: PortfolioPosition | null; isFutures?: boolean };

function getAllocationValue(position: PortfolioPosition): number {
    return Math.abs(position.allocationValue ?? position.marketValue);
}

function buildPnlColorFns(profitableSlices: DonutSlice[], losingSlices: DonutSlice[]) {
    const maxProfitPnl = Math.max(...profitableSlices.map((s) => Math.abs(s.position?.pnl ?? 0)), 1);
    const maxLossPnl   = Math.max(...losingSlices.map((s)   => Math.abs(s.position?.pnl ?? 0)), 1);

    // Bigger absolute P/L → darker (lower lightness); near-zero → lighter
    const absLightness = (absPnl: number, maxPnl: number) => 76 - (absPnl / maxPnl) * 42;

    return (slice: DonutSlice) => {
        const position = slice.position;
        if (!position) return '#8b95a5';
        const l = position.pnl >= 0
            ? absLightness(Math.abs(position.pnl), maxProfitPnl)
            : absLightness(Math.abs(position.pnl), maxLossPnl);
        return position.pnl >= 0
            ? `hsl(4 78% ${l.toFixed(1)}%)`
            : `hsl(154 62% ${l.toFixed(1)}%)`;
    };
}

function renderDonut(
    svgEl: HTMLElement,
    tooltipEl: HTMLElement,
    countEl: HTMLElement | null,
    slices: DonutSlice[],
    total: number,
    colorFn: (slice: DonutSlice) => string,
    currency: (v: number) => string,
    ariaLabel: string,
) {
    if (countEl) countEl.textContent = String(slices.filter((s) => s.position).length);
    svgEl.setAttribute('aria-label', ariaLabel);
    svgEl.innerHTML = '<circle class="portfolio-donut-track" cx="60" cy="60" r="46"></circle>';
    let cursor = 0;
    const circumference = 2 * Math.PI * 46;

    const showTip = (slice: DonutSlice, pct: number) => {
        const pos = slice.position;
        if (!pos) {
            tooltipEl.innerHTML = `<strong>Cash · ${pct.toFixed(2)}%</strong><span>${currency(slice.value)}</span>`;
        } else if (slice.isFutures) {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.direction} · Net ${pos.signedQuantity > 0 ? '+' : ''}${pos.signedQuantity}</span>
               <span>Cost ${pos.averagePrice.toLocaleString()} · Last ${pos.lastPrice.toLocaleString()}</span>
               <span>分子 ${currency(slice.value)} / 分母 ${currency(total)}</span>
               <b class="${pos.pnl >= 0 ? 'up' : 'down'}">P/L ${pos.pnl >= 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
        } else {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.quantity} shares · YD ${pos.ydQuantity ?? 0}</span>
               <span>Cost ${pos.averagePrice.toLocaleString()} · Last ${pos.lastPrice.toLocaleString()}</span>
               <span>Value ${currency(pos.marketValue)}</span>
               <b class="${pos.pnl >= 0 ? 'up' : 'down'}">P/L ${pos.pnl >= 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
        }
        tooltipEl.classList.add('is-visible');
    };

    slices.forEach((slice) => {
        const pct = total > 0 ? (slice.value / total) * 100 : 0;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'portfolio-donut-slice');
        circle.setAttribute('cx', '60');
        circle.setAttribute('cy', '60');
        circle.setAttribute('r', '46');
        circle.setAttribute('stroke', colorFn(slice));
        circle.setAttribute('stroke-dasharray', `${circumference * pct / 100} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', `${-circumference * cursor / 100}`);
        circle.setAttribute('tabindex', '0');
        circle.setAttribute('role', 'button');
        circle.setAttribute('aria-label', `${slice.code}, ${pct.toFixed(2)} percent`);
        circle.addEventListener('pointerenter', () => showTip(slice, pct));
        circle.addEventListener('focus', () => showTip(slice, pct));
        circle.addEventListener('click', () => showTip(slice, pct));
        circle.addEventListener('pointerleave', () => tooltipEl.classList.remove('is-visible'));
        circle.addEventListener('blur', () => tooltipEl.classList.remove('is-visible'));
        svgEl.appendChild(circle);
        cursor += pct;
    });
}

function renderPortfolioAllocation(portfolio: Portfolio) {
    const currency = (value: number) => `NT$ ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const stockPositions = portfolio.stockPositions ?? portfolio.positions.filter((p) => p.productType === 'stock');
    const futuresPositions = portfolio.futuresPositions ?? portfolio.positions.filter((p) => p.productType === 'futures');

    // Build stock slices
    const profitableStock: DonutSlice[] = stockPositions
        .filter((p) => p.pnl >= 0 && getAllocationValue(p) > 0)
        .map((p, index) => ({ key: `stock:profit:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p }))
        .sort((a, b) => Math.abs(b.position!.pnl) - Math.abs(a.position!.pnl));
    const losingStock: DonutSlice[] = stockPositions
        .filter((p) => p.pnl < 0 && getAllocationValue(p) > 0)
        .map((p, index) => ({ key: `stock:loss:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p }))
        .sort((a, b) => Math.abs(a.position!.pnl) - Math.abs(b.position!.pnl));
    const cashSlices: DonutSlice[] = portfolio.cashBalance && portfolio.cashBalance > 0
        ? [{ key: 'cash', code: 'Cash', value: portfolio.cashBalance, position: null }]
        : [];
    const stockSlices: DonutSlice[] = [...profitableStock, ...losingStock];
    const stockTotal = stockSlices.reduce((sum, slice) => sum + slice.value, 0);

    // Build futures slices
    const profitableFut: DonutSlice[] = futuresPositions
        .map((p, index) => ({ key: `futures:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p, isFutures: true }))
        .filter((slice) => slice.position!.pnl >= 0 && slice.value > 0)
        .sort((a, b) => Math.abs(b.position!.pnl) - Math.abs(a.position!.pnl));
    const losingFut: DonutSlice[] = futuresPositions
        .map((p, index) => ({ key: `futures:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p, isFutures: true }))
        .filter((slice) => slice.position!.pnl < 0 && slice.value > 0)
        .sort((a, b) => Math.abs(a.position!.pnl) - Math.abs(b.position!.pnl));
    const futuresSlices: DonutSlice[] = [...profitableFut, ...losingFut];

    // Combined slices
    const combinedSlices: DonutSlice[] = [...cashSlices, ...stockSlices, ...futuresSlices];
    const combinedTotal = combinedSlices.reduce((s, sl) => s + sl.value, 0);

    // Shared P/L color function for all donut views.
    const allProfitable = [...profitableStock, ...profitableFut];
    const allLosing = [...losingStock, ...losingFut];
    const colorFn = buildPnlColorFns(allProfitable, allLosing);

    // Securities donut
    const stockSvg = document.getElementById('portfolio-donut-svg');
    const stockTooltip = document.getElementById('portfolio-tooltip');
    const stockCount = document.getElementById('portfolio-position-count');
    if (stockSvg && stockTooltip) {
        renderDonut(stockSvg, stockTooltip, stockCount, stockSlices, stockTotal, colorFn, currency, `${stockPositions.length} stock positions`);
    }

    // Futures donut
    const futSvg = document.getElementById('portfolio-futures-donut-svg');
    const futTooltip = document.getElementById('portfolio-futures-tooltip');
    const futCount = document.getElementById('portfolio-futures-count');
    if (futSvg && futTooltip) {
        const futTotal = futuresSlices.reduce((s, sl) => s + sl.value, 0);
        renderDonut(futSvg, futTooltip, futCount, futuresSlices, futTotal, colorFn, currency, `${futuresPositions.length} futures positions`);
    }

    // Combined donut
    const combinedSvg = document.getElementById('portfolio-combined-donut-svg');
    const combinedTooltip = document.getElementById('portfolio-combined-tooltip');
    const combinedCount = document.getElementById('portfolio-combined-count');
    if (combinedSvg && combinedTooltip) {
        if (combinedCount) combinedCount.textContent = String(stockPositions.length + futuresPositions.length);
        renderDonut(combinedSvg, combinedTooltip, null, combinedSlices, combinedTotal, colorFn, currency, `${combinedSlices.length} total positions`);
    }
}

async function fetchTxfQuote() {
    const section = document.getElementById('txf-quote-section');
    if (!section) return;
    const cachedQuote = readCachedMarketData<TxfQuote>(TXF_QUOTE_CACHE_KEY);
    const showOffline = () => {
        if (cachedQuote) {
            renderTxfQuote(cachedQuote, true);
        } else {
            section.classList.add('is-offline');
            const status = document.getElementById('txf-market-status');
            if (status) status.textContent = 'Offline';
            const updated = document.getElementById('txf-updated');
            if (updated && updated.textContent === 'Loading...') {
                updated.textContent = 'Market data temporarily unavailable';
            }
        }
    };

    try {
        const response = await fetch('/maya-sawa/market/taiex-futures');
        if (!response.ok) {
            showOffline();
            return;
        }

        const quote: TxfQuote = await response.json();
        writeCachedMarketData(TXF_QUOTE_CACHE_KEY, quote);
        renderTxfQuote(quote);
    } catch (error) {
        console.error('Error fetching TXF quote:', error);
        showOffline();
    }
}

async function fetchMarketUsage() {
    const section = document.getElementById('market-usage-section');
    if (!section) return;
    const cachedUsage = readCachedMarketData<MarketUsage>(MARKET_USAGE_CACHE_KEY);
    const showOffline = () => {
        if (cachedUsage) {
            // The endpoint is reachable but this request failed. Only flag offline if the cached snapshot is actually stale.
            renderMarketUsage(cachedUsage, isDataStale(cachedUsage.fetchedAt, MARKET_USAGE_STALE_MS));
        } else {
            section.classList.add('is-offline');
            const status = document.getElementById('market-usage-status');
            if (status) status.textContent = 'Offline';
        }
    };

    try {
        const response = await fetch(astroApiPath('/api/market/usage'));
        if (!response.ok) {
            showOffline();
            return;
        }

        const usage: MarketUsage = await response.json();
        writeCachedMarketData(MARKET_USAGE_CACHE_KEY, usage);
        renderMarketUsage(usage);
    } catch (error) {
        console.error('Error fetching market usage:', error);
        showOffline();
    }
}

async function fetchQffQuote() {
    const cachedQuote = readCachedMarketData<TxfQuote>(QFF_QUOTE_CACHE_KEY);
    try {
        const response = await fetch('/maya-sawa/market/mini-tsmc-futures');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const quote: TxfQuote = await response.json();
        writeCachedMarketData(QFF_QUOTE_CACHE_KEY, quote);
        renderQffQuote(quote);
    } catch (error) {
        console.error('Error fetching QFFR1 quote:', error);
        if (cachedQuote) renderQffQuote(cachedQuote, true);
        else {
            document.getElementById('qff-quote-section')?.classList.add('is-offline');
            const status = document.getElementById('qff-market-status');
            if (status) status.textContent = 'Offline';
        }
    }
}

async function fetchPortfolio() {
    const section = document.getElementById('portfolio-section');
    if (!section) return;
    const cachedPortfolio = readCachedMarketData<Portfolio>(PORTFOLIO_CACHE_KEY);
    try {
        const response = await fetch(astroApiPath('/api/market/portfolio'));
        if (!response.ok) {
            let detail = '';
            try {
                const body = await response.json();
                detail = body?.error?.message || body?.detail?.message || body?.detail || '';
            } catch {
                // Keep the HTTP status when the response body is not JSON.
            }
            throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
        }
        const portfolio: Portfolio = await response.json();
        writeCachedMarketData(PORTFOLIO_CACHE_KEY, portfolio);
        renderPortfolio(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        if (cachedPortfolio) renderPortfolio(cachedPortfolio, true);
        else {
            section.classList.add('is-offline');
            const status = document.getElementById('portfolio-status');
            if (status) status.textContent = 'Offline';
            const updated = document.getElementById('portfolio-updated');
            if (updated) {
                const message = error instanceof Error ? error.message : 'Portfolio unavailable';
                updated.textContent = `${message} · Portfolio data unavailable`;
            }
        }
    }
}

// Visit Counter Functionality
async function updateVisitCount() {
    try {
        // Check if we have a session cookie
        const sessionCookie = getCookie('visit_session');
        
        if (!sessionCookie) {
            // If no session cookie exists, increment the counter
            await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/voyeur/increment/`, {
                method: 'POST'
            });
            
            // Set a session cookie that expires in 30 minutes
            setCookie('visit_session', 'true', 30);
        }

        // Get the current count regardless of whether we incremented
        const response = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/voyeur/count/`);
        const data = await response.json();
        
        // Update the counter in the DOM
        const visitCountElement = document.getElementById('visit-count');
        if (visitCountElement) {
            visitCountElement.textContent = data.count;
        }
    } catch (error) {
        console.error('Error updating visit count:', error);
        const visitCountElement = document.getElementById('visit-count');
        if (visitCountElement) {
            visitCountElement.textContent = '?';
        }
    }
}

// Cookie helper functions
function setCookie(name: string, value: string, minutes: number) {
    const date = new Date();
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name: string): string {
    const cookieName = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}

// Call the function when the page loads - 支援 View Transitions
function initIndexPage() {
    // 檢查是否在首頁，避免在其他頁面執行
    const isIndexPage = window.location.pathname === '/tymultiverse/' ||
                        window.location.pathname === '/tymultiverse' ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/index.html');

    if (!isIndexPage) return;

    // 登記各服務的健康檢查端點（idempotent）
    const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL || 'https://peoplesystem.tatdvsonorth.com';
    serviceAvailabilityManager.register(SERVICE_KEYS.LEETCODE,  `/maya-sawa/proxy/leetcode-stats/Vinskao`);
    serviceAvailabilityManager.register(SERVICE_KEYS.BACKEND,   `${config.api.backendUrl || apiBaseUrl + '/tymb'}/actuator/health`);
    serviceAvailabilityManager.register(SERVICE_KEYS.GATEWAY,   `${config.api.gatewayUrl || apiBaseUrl + '/tymg'}/tymg/actuator/health`);
    serviceAvailabilityManager.register(SERVICE_KEYS.MAYA_SAWA, `${config.api.mayaSawaUrl || apiBaseUrl + '/maya-sawa'}/health`);

    // LeetCode 區塊：依 flag 決定顯示/隱藏
    const leetcodeSection = document.querySelector('.leetcode-graph') as HTMLElement | null;
    const setLeetcodeVisible = (v: boolean) => { if (leetcodeSection) leetcodeSection.style.display = v ? '' : 'none'; };

    setLeetcodeVisible(true);

    // 清除上一次的監聽，避免 View Transitions 重複累積
    if (_leetcodeAvailabilityCleanup) _leetcodeAvailabilityCleanup();
    _leetcodeAvailabilityCleanup = serviceAvailabilityManager.onChange(SERVICE_KEYS.LEETCODE, setLeetcodeVisible);

    // Always retry on page load so stale local availability state cannot keep this section hidden.
    fetchLeetCodeStats();
    fetchTxfQuote();
    fetchQffQuote();
    fetchMarketUsage();
    fetchPortfolio();
    if (_marketQuoteTimer !== null) window.clearInterval(_marketQuoteTimer);
    _marketQuoteTimer = window.setInterval(() => {
        fetchTxfQuote();
        fetchQffQuote();
        fetchMarketUsage();
    }, 600_000);
    if (_portfolioTimer !== null) window.clearInterval(_portfolioTimer);
    _portfolioTimer = window.setInterval(fetchPortfolio, 3_600_000);
    updateVisitCount();
}

// 監聽 View Transitions 事件
document.addEventListener('astro:page-load', initIndexPage);
