export type ApiParam = { name: string; where: 'path' | 'query'; required: boolean; description: string };
export type ApiOperation = { method: 'GET'; path: string; url: string; summary: string; group: string; params: ApiParam[]; curl: string };

type Spec = { servers?: Array<{ url: string }>; paths: Record<string, Record<string, any>> };

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
    return [{
      method: 'GET' as const, path, url, summary: String(op.summary ?? ''), group: String(op.tags?.[0] ?? 'other'),
      params: (op.parameters ?? []).map((parameter: any) => ({ name: parameter.name, where: parameter.in === 'path' ? 'path' as const : 'query' as const,
        required: Boolean(parameter.required), description: String(parameter.description ?? '') })),
      curl: `curl '${origin}${base}${curlPath}'`,
    }];
  });
}

const GROUPS: Array<[string, string[]]> = [
  ['行情與標的', ['dashboard', 'taiex-futures', 'mini-tsmc-futures']],
  ['研究報告與主張', ['reports']],
  ['AI 觀察名單', ['watch']],
];

export function groupOperations(ops: ApiOperation[]): Array<[string, ApiOperation[]]> {
  const known = new Set(GROUPS.flatMap(([, tags]) => tags));
  const grouped = GROUPS.map(([title, tags]): [string, ApiOperation[]] => [title, ops.filter(op => tags.includes(op.group))]).filter(([, rows]) => rows.length);
  const rest = ops.filter(op => !known.has(op.group));
  return rest.length ? [...grouped, ['其他', rest]] : grouped;
}
