import { useEffect, useState } from 'react';
import PowerRackDiagram, { type RackPart } from './PowerRackDiagram';

interface MappingData {
  version?: string;
  updatedAt?: string;
  rackParts: RackPart[];
}

interface Props {
  mappingData: MappingData;
}

// Registry of research items. Add a new entry here to add a new accordion section.
// `titleKey` resolves through i18n; `render` returns the expanded content.
const RESEARCH_ITEMS: Array<{
  id: string;
  title: { en: string; zh: string };
  render: (ctx: { mapping: MappingData; lang: 'en' | 'zh' }) => JSX.Element;
}> = [
  {
    id: 'power-rack',
    title: { en: 'Datacenter DC Power Rack', zh: '機房級直流電機櫃' },
    render: ({ mapping, lang }) => <PowerRackDiagram parts={mapping.rackParts} lang={lang} />,
  },
];

function getLang(): 'en' | 'zh' {
  if (typeof window !== 'undefined' && (window as any).AppLang) {
    return (window as any).AppLang.get() === 'zh' ? 'zh' : 'en';
  }
  return 'en';
}

export default function ResearchZone({ mappingData }: Props) {
  const [openId, setOpenId] = useState<string>(RESEARCH_ITEMS[0]?.id ?? '');
  const [lang, setLang] = useState<'en' | 'zh'>('en');

  // Track current site language and re-render on change.
  useEffect(() => {
    setLang(getLang());
    const AppLang = (window as any).AppLang;
    if (!AppLang?.onChange) return;
    const cleanup = AppLang.onChange(() => setLang(getLang()));
    return cleanup;
  }, []);

  return (
    <div className="research-zone">
      {RESEARCH_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className={`research-item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="research-item-header"
              aria-expanded={isOpen}
              aria-controls={`research-panel-${item.id}`}
              onClick={() => setOpenId(item.id)}
            >
              <span className="research-item-title">{item.title[lang]}</span>
              <span className="research-item-chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="research-item-panel" id={`research-panel-${item.id}`} role="region">
                {item.render({ mapping: mappingData, lang })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
