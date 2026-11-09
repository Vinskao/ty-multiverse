// Groups AI token usage into vendor > generation > minor version, so the
// "Provider / Model" panel stays readable instead of one row per raw model id.
// Pure logic (no DOM) so it can be tested; AiTokenUsageDashboard only renders it.

export interface UsageRow {
  aiProvider: string;
  modelName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationInputTokens: number;
  totalCacheReadInputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  callCount: number;
}

export interface Totals {
  calls: number;
  totalTokens: number;
  totalCost: number;
}

export interface VersionGroup extends Totals {
  version: string;
}

export interface GenerationGroup extends Totals {
  generation: string;
  versions: VersionGroup[];
}

export interface VendorGroup extends Totals {
  vendor: string;
  generations: GenerationGroup[];
}

export interface ParsedModel {
  generation: string;
  version: string;
}

const OTHER = 'Other';

const cap = (word: string): string => (word ? word[0].toUpperCase() + word.slice(1) : word);

// "5-5" / "5" -> "5.5" / "5"
const dotted = (major: string, minor?: string): string => (minor ? `${major}.${minor}` : major);

/** Drops the "[1m]" context suffix and a trailing 8-digit date snapshot, lowercases. */
function normalize(modelName: string): string {
  return modelName
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]*\]$/, '')
    .replace(/-\d{8}$/, '');
}

export function parseModel(modelName: string): ParsedModel {
  const raw = (modelName ?? '').trim();
  if (!raw) return { generation: OTHER, version: 'Unknown' };
  const name = normalize(raw);

  // claude-opus-5-5, claude-sonnet-4-6, claude-opus-5 (no minor)
  let m = /^claude-(opus|sonnet|haiku)-(\d+)(?:-(\d{1,2}))?$/.exec(name);
  if (m) {
    return { generation: `Claude ${m[2]}`, version: `${cap(m[1])} ${dotted(m[2], m[3])}` };
  }

  // older: claude-3-5-sonnet, claude-3-opus
  m = /^claude-(\d+)(?:-(\d{1,2}))?-(opus|sonnet|haiku)$/.exec(name);
  if (m) {
    return { generation: `Claude ${m[1]}`, version: `${cap(m[3])} ${dotted(m[1], m[2])}` };
  }

  // gpt-6.1-terra, gpt-6-luna, gpt-4.1-nano, gpt-3.5-turbo, gpt-4o, gpt-4o-mini
  m = /^gpt-(\d+)(?:\.(\d+))?(o)?(?:-(.+))?$/.exec(name);
  if (m) {
    const number = `${dotted(m[1], m[2])}${m[3] ?? ''}`;
    const suffix = m[4] ? ` ${m[4].split('-').map(cap).join(' ')}` : '';
    return { generation: `GPT-${m[1]}`, version: `${number}${suffix}` };
  }

  // gemini-1.5-flash, gemini-2.5-pro
  m = /^gemini-(\d+)(?:\.(\d+))?-(.+)$/.exec(name);
  if (m) {
    const suffix = m[3].split('-').map(cap).join(' ');
    return { generation: `Gemini ${m[1]}`, version: `${dotted(m[1], m[2])} ${suffix}` };
  }

  return { generation: OTHER, version: raw };
}

/** claude / claude-code are one vendor; unknown providers are placed by model name when possible. */
export function vendorOf(aiProvider: string, modelName: string): string {
  const provider = (aiProvider ?? '').trim().toLowerCase();
  if (provider === 'claude' || provider === 'claude-code') return 'claude';
  if (provider === 'codex' || provider === 'gemini') return provider;
  const name = (modelName ?? '').trim().toLowerCase();
  if (name.startsWith('claude-')) return 'claude';
  if (name.startsWith('gpt-')) return 'codex';
  if (name.startsWith('gemini-')) return 'gemini';
  return provider || 'unknown';
}

const empty = (): Totals => ({ calls: 0, totalTokens: 0, totalCost: 0 });

function add(target: Totals, row: UsageRow): void {
  target.calls += row.callCount ?? 0;
  target.totalTokens += row.totalTokens ?? 0;
  target.totalCost += row.totalEstimatedCostUsd ?? 0;
}

// "Claude 5" -> 5, "GPT-6" -> 6; "Other" sorts last.
const generationNumber = (generation: string): number => {
  const n = /(\d+)/.exec(generation);
  return n ? Number(n[1]) : -1;
};

export function groupUsage(rows: readonly UsageRow[]): VendorGroup[] {
  const vendors = new Map<string, VendorGroup>();

  for (const row of rows) {
    const vendorKey = vendorOf(row.aiProvider, row.modelName);
    const { generation, version } = parseModel(row.modelName);

    let vendor = vendors.get(vendorKey);
    if (!vendor) {
      vendor = { vendor: vendorKey, ...empty(), generations: [] };
      vendors.set(vendorKey, vendor);
    }
    add(vendor, row);

    let gen = vendor.generations.find((g) => g.generation === generation);
    if (!gen) {
      gen = { generation, ...empty(), versions: [] };
      vendor.generations.push(gen);
    }
    add(gen, row);

    let ver = gen.versions.find((v) => v.version === version);
    if (!ver) {
      ver = { version, ...empty() };
      gen.versions.push(ver);
    }
    add(ver, row);
  }

  const result = [...vendors.values()];
  for (const vendor of result) {
    vendor.generations.sort(
      (a, b) => generationNumber(b.generation) - generationNumber(a.generation) || b.totalTokens - a.totalTokens,
    );
    for (const gen of vendor.generations) {
      gen.versions.sort((a, b) => b.totalTokens - a.totalTokens || a.version.localeCompare(b.version));
    }
  }
  return result.sort((a, b) => b.totalTokens - a.totalTokens);
}
