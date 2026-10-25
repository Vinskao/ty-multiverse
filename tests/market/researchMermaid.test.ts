import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { parseResearchRecord } from '../../src/scripts/market/researchMap';

// Validate the exact corpus shipped by the adjacent backend, including safe Mermaid syntax.
// CI can run this test in the frontend alone using the retained representative fixture.
const seedDir = resolve(__dirname, '../../../maya-sawa/maya_sawa/data/market_research');
let records: Array<[string, string]>;
try {
  records = readdirSync(seedDir).filter((name) => name.endsWith('.json'))
    .map((name) => [name, readFileSync(`${seedDir}/${name}`, 'utf8')]);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  records = [['research-reviewed-2330.json', readFileSync(resolve(__dirname, '../fixtures/research-reviewed-2330.json'), 'utf8')]];
}
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

describe('reviewed research content in the actual frontend parser', () => {
  it.each(records)('parses and accepts both diagrams for %s', async (_name, json) => {
    const record = parseResearchRecord(json);
    expect(record).not.toBeNull();
    for (const graph of [record!.supplyChain, record!.technology]) {
      expect(await mermaid.parse(graph)).toBeTruthy();
    }
  });
});
