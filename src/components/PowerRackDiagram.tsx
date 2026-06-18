import { useRef, useState } from 'react';

export interface RackPart {
  id: string;
  name: { en: string; zh: string };
  summary: { en: string; zh: string };
  products: Array<{ company: string; product: string; note?: string }>;
}

interface Props {
  parts: RackPart[];
  lang: 'en' | 'zh';
}

// Geometry for each hoverable rack region (in SVG user units, viewBox 0 0 520 600).
// `id` matches rackParts[].id from companyProductMapping.json.
const REGIONS: Array<{ id: string; x: number; y: number; w: number; h: number; labelEn: string; labelZh: string }> = [
  { id: 'dc-pdu', x: 150, y: 40, w: 220, h: 34, labelEn: 'DC PDU', labelZh: '直流配電單元' },
  { id: 'power-shelf', x: 150, y: 80, w: 220, h: 34, labelEn: 'Power Shelf', labelZh: '電源架' },
  { id: 'gpu-server', x: 150, y: 150, w: 200, h: 40, labelEn: 'GPU Server', labelZh: 'GPU 伺服器' },
  { id: 'gpu-server', x: 150, y: 196, w: 200, h: 40, labelEn: 'GPU Server', labelZh: 'GPU 伺服器' },
  { id: 'cpu-server', x: 150, y: 254, w: 200, h: 40, labelEn: 'CPU Server', labelZh: 'CPU 伺服器' },
  { id: 'cpu-server', x: 150, y: 300, w: 200, h: 40, labelEn: 'CPU Server', labelZh: 'CPU 伺服器' },
];

export default function PowerRackDiagram({ parts, lang }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activePart = parts.find((p) => p.id === activeId) ?? null;

  const show = (id: string, evt: { clientX: number; clientY: number }) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    }
    setActiveId(id);
  };

  const hide = () => setActiveId(null);

  return (
    <div ref={wrapperRef} className="power-rack" onMouseLeave={hide}>
      <svg viewBox="0 0 520 600" role="img" aria-label="Datacenter 800VDC to 48VDC power rack diagram" className="power-rack-svg">
        {/* Rack frame */}
        <rect x="120" y="20" width="280" height="540" rx="10" className="rack-frame" />
        <text x="260" y="14" className="rack-caption">800 VDC &#8594; 48 VDC</text>

        {/* 800V input arrow into the top */}
        <line x1="260" y1="20" x2="260" y2="40" className="rack-flow rack-flow--hv" markerEnd="url(#arrowHv)" />
        <text x="270" y="34" className="rack-flow-label">800V in</text>

        {/* 48V vertical busbar on the right */}
        <rect x="372" y="80" width="16" height="400" rx="4" className="rack-busbar"
          tabIndex={0}
          role="button"
          aria-label="48VDC busbar"
          onMouseEnter={(e) => show('busbar-48v', e)}
          onMouseMove={(e) => show('busbar-48v', e)}
          onFocus={() => setActiveId('busbar-48v')}
          onBlur={hide}
        />
        <text x="380" y="498" className="rack-busbar-label" textAnchor="middle">48V</text>

        {/* Region blocks */}
        {REGIONS.map((r, i) => (
          <g
            key={`${r.id}-${i}`}
            className={`rack-region${activeId === r.id ? ' is-active' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={lang === 'zh' ? r.labelZh : r.labelEn}
            onMouseEnter={(e) => show(r.id, e)}
            onMouseMove={(e) => show(r.id, e)}
            onFocus={() => setActiveId(r.id)}
            onBlur={hide}
          >
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="5" className="rack-region-box" />
            <text x={r.x + 12} y={r.y + r.h / 2 + 4} className="rack-region-label">
              {lang === 'zh' ? r.labelZh : r.labelEn}
            </text>
            {/* 48V feed line from busbar to each server PSU */}
            {(r.id === 'gpu-server' || r.id === 'cpu-server') && (
              <line x1={r.x + r.w} y1={r.y + r.h / 2} x2="372" y2={r.y + r.h / 2} className="rack-flow rack-flow--lv" />
            )}
          </g>
        ))}

        {/* In-server PSU markers (small badge on each server, shares psu-48v info) */}
        {REGIONS.filter((r) => r.id === 'gpu-server' || r.id === 'cpu-server').map((r, i) => (
          <rect
            key={`psu-${i}`}
            x={r.x + r.w - 30} y={r.y + 8} width="22" height={r.h - 16} rx="3"
            className={`rack-psu${activeId === 'psu-48v' ? ' is-active' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={lang === 'zh' ? '伺服器內部 48V PSU' : 'In-server 48VDC PSU'}
            onMouseEnter={(e) => show('psu-48v', e)}
            onMouseMove={(e) => show('psu-48v', e)}
            onFocus={() => setActiveId('psu-48v')}
            onBlur={hide}
          />
        ))}

        <defs>
          <marker id="arrowHv" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="rack-arrow-hv" />
          </marker>
        </defs>
      </svg>

      {activePart && (
        <div
          className="power-rack-tooltip"
          role="status"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <strong className="power-rack-tooltip-title">{activePart.name[lang]}</strong>
          <p className="power-rack-tooltip-summary">{activePart.summary[lang]}</p>
          <span className="power-rack-tooltip-heading">{lang === 'zh' ? '相關公司／產品' : 'Companies / products'}</span>
          <ul className="power-rack-tooltip-list">
            {activePart.products.map((prod, idx) => (
              <li key={idx}>
                <span className="power-rack-company">{prod.company}</span>
                <span className="power-rack-product"> — {prod.product}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="power-rack-hint">
        {lang === 'zh' ? 'Hover、聚焦或點按部位以查看哪些公司在做。' : 'Hover, focus, or tap a part to see which companies make it.'}
      </p>
    </div>
  );
}
