import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupOperations, publicOperations } from '../../src/scripts/api/publicSpec';

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
  const ops = publicOperations(spec, 'https://peoplesystem.tatdvsonorth.com');

  it('lists each GET with its full URL, summary, parameters and a curl example using a sample code', () => {
    const history = ops.find(op => op.path === '/market/dashboard/history/{code}')!;
    expect(history).toMatchObject({ method: 'GET', summary: '個股日線', group: '行情與標的', url: 'https://peoplesystem.tatdvsonorth.com/maya-sawa/market/dashboard/history/{code}' });
    expect(history.params).toEqual([{ name: 'code', where: 'path', required: true, description: '股票代號' }, { name: 'start', where: 'query', required: false, description: '' }]);
    expect(history.curl).toBe("curl 'https://peoplesystem.tatdvsonorth.com/maya-sawa/market/dashboard/history/2330'");
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
    // a route that declares no group at all still appears, under "其他"
    const bare = { ...spec, paths: { '/market/bare': { get: { summary: '無分組', parameters: [], responses: {} } } } };
    expect(groupOperations(publicOperations(bare as any, 'https://x')).map(([title]) => title)).toEqual(['其他']);
  });
});

describe('the API tab', () => {
  it('sits to the right of 關於, and the page says where tokens come from', () => {
    const nav = read('src/components/Nav.astro');
    expect(nav.indexOf('nav.api')).toBeGreaterThan(nav.indexOf('nav.about'));
    expect(nav).toContain('/tymultiverse/api-reference/');
    const page = read('src/pages/api-reference.astro');
    expect(page).toContain('/maya-sawa/public-openapi.json');
    expect(page).toContain('SSO token');
    expect(page).toContain('聯繫');
    expect(JSON.parse(read('src/storages/i18n.json')).nav.api.zh).toBe('API');
  });
});
