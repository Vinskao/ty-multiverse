export type ApiParam = { name: string; where: 'path' | 'query'; required: boolean; description: string };
export type ApiExample = { venue: string; title: string; url: string; curl: string };
export type SchemaRow = { path: string; type: string; description: string };
export type ApiOperation = { method: 'GET'; path: string; url: string; summary: string; group: string; params: ApiParam[]; curl: string; schema: any | null; examples: ApiExample[] };

type Spec = { servers?: Array<{ url: string }>; paths: Record<string, Record<string, any>> };

function fallbackGroup(path: string): string | undefined {
  if (path.startsWith('/market/reports')) return '研究報告與主張';
  if (path.includes('/macro')) return '總體經濟';
  if (path.includes('/analysis/') || path === '/market/watch') return 'AI 分析與研究';
  if (path.startsWith('/market/')) return '行情與標的';
  return undefined;
}

// Sample values so the curl line works when pasted: path parameters not listed here stay as <name>.
const SAMPLES: Record<string, string> = { code: '2330' };

/** The public data API as rows for the page: GET operations only, in the order the server lists them. */
export function publicOperations(spec: Spec, origin: string): ApiOperation[] {
  const base = (spec.servers?.[0]?.url ?? '').replace(/\/$/, '');
  return Object.entries(spec.paths).flatMap(([path, methods]) => {
    const op = methods.get;
    if (!op) return [];
    const url = `${origin}${base}${path}`;
    const curlPath = path.replace(/\{(\w+)\}/g, (_, name: string) => SAMPLES[name] ?? `<${name}>`);
    const declaredGroup = String(op['x-group'] ?? op.tags?.[0] ?? '').trim();
    const group = !declaredGroup || declaredGroup === '其他' ? (fallbackGroup(path) ?? declaredGroup) || '其他' : declaredGroup;
    return [{
      method: 'GET' as const, path, url, summary: String(op.summary ?? ''), group,
      params: (op.parameters ?? []).map((parameter: any) => ({ name: parameter.name, where: parameter.in === 'path' ? 'path' as const : 'query' as const,
        required: Boolean(parameter.required), description: String(parameter.description ?? '') })),
      curl: `curl '${origin}${base}${curlPath}'`,
      schema: op.responses?.['200']?.content?.['application/json']?.schema ?? null,
      examples: (op['x-examples'] ?? []).map((item: any) => ({ venue: String(item.venue), title: String(item.title),
        url: `${origin}${base}${item.path}`, curl: `curl '${origin}${base}${item.path}'` })),
    }];
  });
}

/** Groups in the order the server first mentions them; the heading is whatever the route declared, so a new API (or a new group)
 *  shows up without touching this page. */
export function groupOperations(ops: ApiOperation[]): Array<[string, ApiOperation[]]> {
  const groups = new Map<string, ApiOperation[]>();
  for (const op of ops) groups.set(op.group, [...(groups.get(op.group) ?? []), op]);
  return [...groups];
}

/** Examples under their venue heading (台股、IBKR、Binance…), in the order the server lists them. */
export function groupExamples(examples: ApiExample[]): Array<[string, ApiExample[]]> {
  const venues = new Map<string, ApiExample[]>();
  for (const example of examples) venues.set(example.venue, [...(venues.get(example.venue) ?? []), example]);
  return [...venues];
}

const typeLabel = (schema: any): string => {
  if (Array.isArray(schema?.type)) return schema.type.join(' | ');
  if (schema?.type === 'array') return `${schema.items?.type && schema.items.type !== 'object' ? schema.items.type : 'array'}${schema.items?.type && schema.items.type !== 'object' ? '[]' : ''}`;
  return String(schema?.type ?? 'any');
};

/** The response schema as flat rows (points[].date …) so the page can show it as a table without a schema viewer. */
export function schemaRows(schema: any, prefix = ''): SchemaRow[] {
  if (!schema?.properties) return [];
  return Object.entries<any>(schema.properties).flatMap(([name, child]) => {
    const path = `${prefix}${name}`;
    const row = { path, type: typeLabel(child), description: String(child.description ?? '') };
    const inner = child.type === 'array' ? child.items : child;
    return [row, ...schemaRows(inner, child.type === 'array' ? `${path}[].` : `${path}.`)];
  });
}
