export type LearnCourse = { id: string; title: string; status: 'available' | 'planned'; topics: string[]; source: string; outline?: { title: string; titles: string[] }[] };
export type LearnSubject = { id: string; title: string; subtitle: string; courses: LearnCourse[] };

const semiconductorOutline = [
  { title: '產業與晶圓製造', titles: ['日常生活中的晶片與 IC 設計', '晶片製造與晶圓代工', '8 吋與 12 吋矽晶圓', '前段、中段與後段', '晶圓廠與廠務'] },
  { title: '製程、設備與零件', titles: ['薄膜沉積與 PVD、CVD、ALD', '乾蝕刻與濕蝕刻', '晶圓清洗與半導體設備商', '設備真空腔體與精密零件', '離子植入與摻雜', 'CMP 化學機械平坦化'] },
  { title: '材料、潔淨與良率', titles: ['靶材、特氣與化學品', '石英、陶瓷與 O-Ring', '無塵室與微粒控制', '晶圓檢測與良率', '材料分析與可靠度驗證'] },
  { title: '封裝與應用', titles: ['封裝與測試', 'AI 晶片、HBM 與 CoWoS'] },
  { title: '半導體職場', titles: ['工程與業務常用英文'] },
];

/** Planned subjects describe future exams only; they never create quiz records. */
export const learnCatalog: LearnSubject[] = [
  { id: 'english', title: '英文', subtitle: '閱讀、語法與職場溝通', courses: [
    { id: 'toeic', title: '多益 TOEIC', status: 'available', topics: ['句子文法', '短文填空', '閱讀理解'], source: '#learn-topics' },
  ] },
  { id: 'macroeconomics', title: '總體經濟', subtitle: '從數據理解經濟循環', courses: [
    { id: 'inflation', title: '通膨與物價', status: 'planned', topics: ['CPI、PPI', '年增率與月增率'], source: '/#zone-macro' },
    { id: 'rates', title: '利率與貨幣政策', status: 'planned', topics: ['政策利率', '債券殖利率'], source: '/#zone-macro' },
    { id: 'employment', title: '就業與消費', status: 'planned', topics: ['就業與失業', '零售與消費'], source: '/#zone-macro' },
    { id: 'trade', title: '貿易與匯率', status: 'planned', topics: ['進出口', '匯率與美元'], source: '/#zone-macro' },
  ] },
  { id: 'microeconomics', title: '個體經濟', subtitle: '企業、產業與市場決策', courses: [
    { id: 'semiconductor', title: '半導體', status: 'planned', topics: [], source: '/reports#benchmark', outline: semiconductorOutline },
    { id: 'supply-demand', title: '供需與價格', status: 'planned', topics: ['供需變動', '價格彈性'], source: '/#zone-stocks' },
    { id: 'firm', title: '企業營運與財報', status: 'planned', topics: ['營收與獲利', '成本與毛利'], source: '/#zone-stocks' },
    { id: 'industry', title: '產業與競爭', status: 'planned', topics: ['供應鏈', '市場競爭'], source: '/#zone-reports' },
  ] },
  { id: 'object-oriented', title: '物件導向', subtitle: '以工程知識庫建立程式設計基礎', courses: [
    { id: 'inheritance', title: '繼承與多型', status: 'planned', topics: ['繼承', '多型'], source: '/work/inheritance-polymorphism' },
    { id: 'abstraction', title: '抽象類別與介面', status: 'planned', topics: ['抽象類別', '介面'], source: '/work/abstract-class-interface' },
    { id: 'solid', title: 'SOLID 設計原則', status: 'planned', topics: ['職責分離', '依賴反轉'], source: '/work/solid-principles' },
    { id: 'java-access', title: 'Java 存取修飾詞', status: 'planned', topics: ['封裝', '存取範圍'], source: '/work/java-access-modifiers' },
  ] },
];

export function groupLearnTopics<T extends { id: string }>(topics: T[]): { toeic: T[]; other: T[] } {
  return { toeic: topics.filter(topic => /^toeic-/i.test(topic.id)), other: topics.filter(topic => !/^toeic-/i.test(topic.id)) };
}
