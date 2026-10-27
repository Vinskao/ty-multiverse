import type { ResearchEconomicsPoint } from './researchEconomics';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Round a positive maximum up to 1, 2, 5 or 10 times a power of ten so the right-hand axis gets round tick values. */
function niceCeil(value: number) {
  if (!(value > 0)) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => value <= m * base) ?? 10;
  return step * base;
}

export function renderResearchReturnChart(
  svg: SVGSVGElement,
  readout: HTMLOutputElement,
  points: ResearchEconomicsPoint[],
  language = 'en',
) {
  const zh = language.toLowerCase().startsWith('zh');
  svg.replaceChildren();
  svg.onpointermove = null;
  svg.onpointerdown = null;
  const width = 900;
  const height = 260;
  const hasCost = points.some((point) => point.cumulativeCostUsd > 0);
  const pad = { top: 18, right: hasCost ? 66 : 24, bottom: 42, left: 74 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const make = (tag: string, attrs: Record<string, string>) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'group');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  if (points.length === 0) {
    svg.setAttribute('aria-label', zh ? '投資組合報酬率歷史資料尚無法使用' : 'Portfolio return history unavailable');
    readout.textContent = zh ? '目前沒有每日投資組合歷史資料。' : 'No daily portfolio history is available yet.';
    return;
  }

  svg.setAttribute('aria-label', zh ? '投資組合報酬率，自最早一筆快照累積計算' : 'Portfolio return, cumulative since the first recorded snapshot');
  const firstMs = Date.parse(`${points[0].date}T00:00:00Z`);
  const lastMs = Date.parse(`${points[points.length - 1].date}T00:00:00Z`);
  const x = (index: number) => points.length === 1 || firstMs === lastMs
    ? pad.left + innerW / 2
    : pad.left + ((Date.parse(`${points[index].date}T00:00:00Z`) - firstMs) / (lastMs - firstMs)) * innerW;
  const values = points.map((point) => point.returnPercent);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 2;
  const low = min - span * 0.12;
  const high = max + span * 0.12;
  const y = (value: number) => pad.top + ((high - value) / (high - low)) * innerH;
  const costMax = niceCeil(Math.max(...points.map((point) => point.cumulativeCostUsd)));
  const yCost = (value: number) => pad.top + (1 - value / costMax) * innerH;
  const money = (value: number) => `$${value === 0 ? '0' : value < 10 ? String(Number(value.toFixed(1))) : String(Math.round(value))}`;
  const pct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = low + ((high - low) * tick) / 4;
    const tickY = y(value);
    svg.append(make('line', {
      x1: String(pad.left), x2: String(width - pad.right), y1: String(tickY), y2: String(tickY),
      class: 'research-economics-gridline',
    }));
    const label = make('text', {
      x: String(pad.left - 10), y: String(tickY + 4), 'text-anchor': 'end',
      class: 'research-economics-axis-label',
    });
    label.textContent = `${value.toFixed(1)}%`;
    svg.append(label);
    if (hasCost) {
      const right = make('text', {
        x: String(width - pad.right + 10), y: String(tickY + 4), 'text-anchor': 'start',
        class: 'research-economics-axis-label research-economics-axis-label--cost',
      });
      right.textContent = money((costMax * tick) / 4);
      svg.append(right);
    }
  }

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.returnPercent)}`).join(' ');
  svg.append(make('path', { d: path, class: 'research-economics-return-line' }));
  if (hasCost) {
    const costPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${yCost(point.cumulativeCostUsd)}`).join(' ');
    svg.append(make('path', { d: costPath, class: 'research-economics-cost-line' }));
  }

  const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  for (const index of labelIndexes) {
    const label = make('text', {
      x: String(x(index)), y: String(height - 12),
      'text-anchor': index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle',
      class: 'research-economics-axis-label',
    });
    label.textContent = dateLabel(points[index].date);
    svg.append(label);
  }

  let active = points.length - 1;
  const show = (index: number) => {
    active = Math.max(0, Math.min(points.length - 1, index));
    const point = points[active];
    const cost = hasCost ? (zh ? ` · 累積 token 費用 $${point.cumulativeCostUsd.toFixed(2)}` : ` · Cumulative token cost $${point.cumulativeCostUsd.toFixed(2)}`) : '';
    readout.textContent = (zh
      ? `${point.date} · 投資組合報酬率 ${pct(point.returnPercent)}`
      : `${point.date} · Portfolio return ${pct(point.returnPercent)}`) + cost;
  };
  points.forEach((point, index) => {
    const circle = make('circle', {
      cx: String(x(index)), cy: String(y(point.returnPercent)), r: '4',
      class: 'research-economics-return-point', 'data-return-point': String(index),
      tabindex: '0', role: 'button', 'aria-label': `${point.date}, ${zh ? '投資組合報酬率' : 'portfolio return'} ${pct(point.returnPercent)}`,
    });
    const title = make('title', {});
    title.textContent = `${point.date} · ${pct(point.returnPercent)}`;
    circle.append(title);
    circle.addEventListener('focus', () => show(index));
    circle.addEventListener('pointerenter', () => show(index));
    circle.addEventListener('click', () => show(index));
    circle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1
        : Math.max(0, Math.min(points.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)));
      (svg.querySelector(`[data-return-point="${target}"]`) as SVGCircleElement | null)?.focus();
    });
    svg.append(circle);
  });
  svg.onpointermove = (event) => {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(rect.width, 1) * width;
    const index = points.reduce((nearest, _point, i) => Math.abs(x(i) - px) < Math.abs(x(nearest) - px) ? i : nearest, 0);
    show(index);
  };
  svg.onpointerdown = svg.onpointermove;
  show(active);
}
