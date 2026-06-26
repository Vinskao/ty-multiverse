import { useEffect, useState, useCallback } from 'react';

// Shape returned by maya-sawa GET /runpod/internal/cost (proxied via /api/runpod/cost).
interface RunpodPod {
  id: string;
  name: string;
  status: string | null;
  gpu: string | null;
  costPerHr: number;
  running: boolean;
  uptimeSeconds: number | null;
}

interface RunpodCostOverview {
  currency: string;
  balance: number;
  currentSpendPerHr: number;
  runningSpendPerHr: number;
  podCount: number;
  runningPodCount: number;
  pods: RunpodPod[];
}

// BASE_URL-aware path so the route resolves under the /tymultiverse base.
const apiPath = (path: string) => {
  const base = (import.meta as any).env?.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

function money(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n ?? 0);
}

function formatUptime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function RunpodCostDashboard() {
  const [data, setData] = useState<RunpodCostOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath('/api/runpod/cost'));
      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          detail = body?.detail?.message || body?.error || detail;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(detail);
      }
      const json = (await res.json()) as RunpodCostOverview;
      setData(json);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load RunPod cost');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 60s so the live spend rate stays current.
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const currency = data?.currency || 'USD';
  const monthlyProjection = data ? data.currentSpendPerHr * 24 * 30 : 0;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>RunPod GPU Cost</h2>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: loading ? '#eee' : '#fff',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 8, background: '#fde8e8', color: '#9b1c1c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Account balance" value={money(data.balance, currency)} />
            <StatCard label="Current spend / hr" value={money(data.currentSpendPerHr, currency)} accent="#ea580c" />
            <StatCard label="Est. monthly (24×30)" value={money(monthlyProjection, currency)} />
            <StatCard label="Running pods" value={`${data.runningPodCount} / ${data.podCount}`} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '8px 6px' }}>Pod</th>
                <th style={{ padding: '8px 6px' }}>GPU</th>
                <th style={{ padding: '8px 6px' }}>Status</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cost / hr</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Uptime</th>
              </tr>
            </thead>
            <tbody>
              {data.pods.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                    No pods on this account.
                  </td>
                </tr>
              )}
              {data.pods.map((pod) => (
                <tr key={pod.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 6px' }}>{pod.name || pod.id}</td>
                  <td style={{ padding: '8px 6px', color: '#6b7280' }}>{pod.gpu || '—'}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 12,
                        background: pod.running ? '#def7ec' : '#f3f4f6',
                        color: pod.running ? '#03543f' : '#6b7280',
                      }}
                    >
                      {pod.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{money(pod.costPerHr, currency)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{formatUptime(pod.uptimeSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
            Stopped pods bill $0 for compute, but volume storage is billed separately and is not shown here.
            {updatedAt && ` Updated ${updatedAt.toLocaleTimeString()}.`}
          </p>
        </>
      )}

      {!data && !error && loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || '#111827' }}>{value}</div>
    </div>
  );
}
