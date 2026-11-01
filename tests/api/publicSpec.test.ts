import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupExamples, groupOperations, publicOperations, schemaRows } from '../../src/scripts/api/publicSpec';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const spec = {
  servers: [{ url: '/maya-sawa' }],
  paths: {
    '/market/dashboard': { get: { summary: '儀表板標的清單', tags: ['行情與標的'], 'x-group': '行情與標的', parameters: [], responses: { '200': { description: 'OK' } } } },
    '/market/dashboard/history/{code}': { get: { summary: '個股日線', tags: ['行情與標的'], 'x-group': '行情與標的', responses: { '200': { description: 'OK' } }, parameters: [
      { name: 'code', in: 'path', required: true, description: '股票代號' }, { name: 'start', in: 'query', required: false },
    ] } },
    '/market/reports/{report_id}': { get: { summary: '單一報告', tags: ['研究報告與主張'], 'x-group': '研究報告與主張', parameters: [{ name: 'report_id', in: 'path', required: true }], responses: {} } },
    '/market/watch': { get: { summary: 'AI 觀察名單', tags: ['AI 觀察名單'], 'x-group': 'AI 觀察名單', parameters: [], responses: {} } },
  },
};

describe('public API page data', () => {
  const ops = publicOperations(spec, 'https://tymultiverse.cc');

  it('lists each GET with its full URL, summary, parameters and a curl example using a sample code', () => {
    const history = ops.find(op => op.path === '/market/dashboard/history/{code}')!;
    expect(history).toMatchObject({ method: 'GET', summary: '個股日線', group: '行情與標的', url: 'https://tymultiverse.cc/maya-sawa/market/dashboard/history/{code}' });
    expect(history.params).toEqual([{ name: 'code', where: 'path', required: true, description: '股票代號' }, { name: 'start', where: 'query', required: false, description: '' }]);
    expect(history.curl).toBe("curl 'https://tymultiverse.cc/maya-sawa/market/dashboard/history/2330'");
    expect(ops.find(op => op.path === '/market/reports/{report_id}')!.curl).toContain('/market/reports/<report_id>');
  });

  it('keeps the spec order and ignores anything that is not a GET', () => {
    const withWrite = { ...spec, paths: { ...spec.paths, '/market/notify': { post: { summary: 'send' } } } };
    expect(publicOperations(withWrite as any, 'https://x').map(op => op.path)).toEqual(Object.keys(spec.paths));
  });

  it('groups by the heading each route declares, in the order the server lists them', () => {
    const groups = groupOperations(ops);
    expect(groups.map(([title]) => title)).toEqual(['行情與標的', '研究報告與主張', 'AI 觀察名單']);
    expect(groups[0][1]).toHaveLength(2);
  });

  it('shows a brand-new API in a brand-new group without any change to this page', () => {
    const later = { ...spec, paths: { ...spec.paths, '/market/dashboard/options/{code}': { get: { summary: '選擇權籌碼', 'x-group': '衍生品', parameters: [{ name: 'code', in: 'path', required: true }], responses: {} } } } };
    const all = publicOperations(later as any, 'https://x');
    expect(groupOperations(all).map(([title]) => title)).toEqual(['行情與標的', '研究報告與主張', 'AI 觀察名單', '衍生品']);
    expect(all.at(-1)!.curl).toBe("curl 'https://x/maya-sawa/market/dashboard/options/2330'");
    // a route under the recognized market API family gets a useful fallback group
    const bare = { ...spec, paths: { '/market/bare': { get: { summary: '無分組', parameters: [], responses: {} } } } };
    expect(groupOperations(publicOperations(bare as any, 'https://x')).map(([title]) => title)).toEqual(['行情與標的']);
  });

  it('keeps recognized market APIs out of 其他 when the published group is missing or generic', () => {
    const stale = { paths: {
      '/market/dashboard/macro': { get: { summary: '總體經濟指標序列', 'x-group': '其他' } },
      '/market/reports': { get: { summary: '研究報告清單' } },
      '/market/dashboard/history/{code}': { get: { summary: '個股日線' } },
    } };
    expect(publicOperations(stale as any, 'https://x').map(op => op.group)).toEqual(['總體經濟', '研究報告與主張', '行情與標的']);
  });
});

describe('the API tab', () => {
  it('sits to the right of 關於, and the page says where tokens come from', () => {
    const nav = read('src/components/Nav.astro');
    expect(nav.indexOf('nav.api')).toBeGreaterThan(nav.indexOf('nav.about'));
    expect(nav).toContain('"/api-reference/"');
    const page = read('src/pages/api-reference.astro');
    expect(page).toContain('/maya-sawa/public-openapi.json');
    expect(page).toContain('可查詢行情、總體經濟資料、財報與研究報告');
    expect(page).not.toContain('所以不會和實際有出入');
    expect(page).toContain('個人帳戶資料不提供匿名存取');
    expect(page).toContain('資料整合需求');
    expect(JSON.parse(read('src/storages/i18n.json')).nav.api.zh).toBe('API');
  });
});

describe('response schema and per-venue examples', () => {
  const schema = { type: 'object', properties: {
    code: { type: 'string' }, collecting: { type: 'boolean', description: '尚無資料' },
    points: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, sources: { type: 'object', description: '鍵為來源' } } } },
    tags: { type: 'array', items: { type: 'string' } },
    analysis: { type: ['object', 'null'], description: '目前版本' },
  } };
  const withExtras = { servers: [{ url: '/maya-sawa' }], paths: { '/market/dashboard/overseas/{code}': { get: {
    summary: '海外', parameters: [{ name: 'code', in: 'path', required: true }, { name: 'market', in: 'query', required: true }],
    responses: { '200': { description: 'OK', content: { 'application/json': { schema } } } },
    'x-examples': [{ venue: 'Binance', title: '比特幣', path: '/market/dashboard/overseas/BTC?market=CRYPTO' },
      { venue: 'IBKR 美股', title: 'LITE', path: '/market/dashboard/overseas/LITE?market=US' }] } } } };
  const [op] = publicOperations(withExtras as any, 'https://tymultiverse.cc');

  it('turns each example into a runnable curl with the full URL', () => {
    expect(op.examples[0]).toEqual({ venue: 'Binance', title: '比特幣', url: 'https://tymultiverse.cc/maya-sawa/market/dashboard/overseas/BTC?market=CRYPTO',
      curl: "curl 'https://tymultiverse.cc/maya-sawa/market/dashboard/overseas/BTC?market=CRYPTO'" });
  });

  it('groups examples by venue in the order the server lists them', () => {
    expect(groupExamples(op.examples).map(([venue, rows]) => [venue, rows.length])).toEqual([['Binance', 1], ['IBKR 美股', 1]]);
  });

  it('flattens the response schema into rows a reader can scan, arrays marked with []', () => {
    expect(schemaRows(op.schema)).toEqual([
      { path: 'code', type: 'string', description: '' },
      { path: 'collecting', type: 'boolean', description: '尚無資料' },
      { path: 'points', type: 'array', description: '' },
      { path: 'points[].date', type: 'string', description: '' },
      { path: 'points[].sources', type: 'object', description: '鍵為來源' },
      { path: 'tags', type: 'string[]', description: '' },
      { path: 'analysis', type: 'object | null', description: '目前版本' },
    ]);
  });

  it('has no schema or examples when the route publishes none', () => {
    const [plain] = publicOperations({ paths: { '/market/watch': { get: { summary: 'x', responses: {} } } } } as any, 'https://x');
    expect(plain.schema).toBeNull();
    expect(plain.examples).toEqual([]);
    expect(schemaRows(plain.schema)).toEqual([]);
  });
});
