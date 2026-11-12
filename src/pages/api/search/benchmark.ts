import type { APIRoute } from 'astro';
import { buildBenchmarkIndex } from '../../../scripts/search/benchmarkIndex';

// Flat search index of the home page's supply-chain diagram for the nav bar search; public data only.
export const GET: APIRoute = async () => {
  const base = process.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
  const get = async (path: string) => {
    try {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  };
  const [versions, monitor, outlook] = await Promise.all([get('/market/benchmark/versions'), get('/market/benchmark/monitor'),
    get('/market/dashboard/analysis/AI?productType=outlook')]);
  const current = Array.isArray(versions)
    ? (versions.find((version: { is_current?: boolean }) => version.is_current) ?? versions[0] ?? null) : null;
  const entries = buildBenchmarkIndex(current, monitor, outlook?.analysis?.content ?? null);
  return Response.json({ entries }, { headers: { 'Cache-Control': 'public, max-age=300' } });
};
