import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupOperations, publicOperations } from '../../src/scripts/api/publicSpec';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const spec = {
  servers: [{ url: '/maya-sawa' }],
  paths: {
    '/market/dashboard': { get: { summary: '儀表板標的清單', tags: ['dashboard'], parameters: [], responses: { '200': { description: 'OK' } } } },
    '/market/dashboard/history/{code}': { get: { summary: '個股日線', tags: ['dashboard'], responses: { '200': { description: 'OK' } }, parameters: [
      { name: 'code', in: 'path', required: true, description: '股票代號' }, { name: 'start', in: 'query', required: false },
    ] } },
    '/market/reports/{report_id}': { get: { summary: '單一報告', tags: ['reports'], parameters: [{ name: 'report_id', in: 'path', required: true }], responses: {} } },
    '/market/watch': { get: { summary: 'AI 觀察名單', tags: ['watch'], parameters: [], responses: {} } },
  },
};

describe('public API page data', () => {
  const ops = publicOperations(spec, 'https://peoplesystem.tatdvsonorth.com');

  it('lists each GET with its full URL, summary, parameters and a curl example using a sample code', () => {
    const history = ops.find(op => op.path === '/market/dashboard/history/{code}')!;
    expect(history).toMatchObject({ method: 'GET', summary: '個股日線', group: 'dashboard', url: 'https://peoplesystem.tatdvsonorth.com/maya-sawa/market/dashboard/history/{code}' });
    expect(history.params).toEqual([{ name: 'code', where: 'path', required: true, description: '股票代號' }, { name: 'start', where: 'query', required: false, description: '' }]);
    expect(history.curl).toBe("curl 'https://peoplesystem.tatdvsonorth.com/maya-sawa/market/dashboard/history/2330'");
    expect(ops.find(op => op.path === '/market/reports/{report_id}')!.curl).toContain('/market/reports/<report_id>');
  });

  it('keeps the spec order and ignores anything that is not a GET', () => {
    const withWrite = { ...spec, paths: { ...spec.paths, '/market/notify': { post: { summary: 'send' } } } };
    expect(publicOperations(withWrite as any, 'https://x').map(op => op.path)).toEqual(Object.keys(spec.paths));
  });

  it('groups by area with a Chinese heading, and sends unknown areas to "其他"', () => {
    const groups = groupOperations([...ops, { ...ops[0], path: '/market/other', group: 'something-new' }]);
    expect(groups.map(([title]) => title)).toEqual(['行情與標的', '研究報告與主張', 'AI 觀察名單', '其他']);
    expect(groups[0][1]).toHaveLength(2);
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
