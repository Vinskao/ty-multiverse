import type { APIRoute } from 'astro';

// Prod (node SSR) reads the runtime container env via `process.env` — Astro inlines
// `import.meta.env` at build time (undefined for server-only vars). Local `astro dev`
// is the opposite: it injects `.env` into `import.meta.env`, not `process.env`.
// Read both so the secret/URL resolves in dev AND prod.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const INTERNAL_SECRET = process.env.MARKET_INTERNAL_SECRET || import.meta.env.MARKET_INTERNAL_SECRET;

export const GET: APIRoute = async () => {
  if (!INTERNAL_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Internal secret not configured',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const response = await fetch(`${MAYA_SAWA_URL}/runpod/internal/cost`, {
      headers: {
        'X-Internal-Secret': INTERNAL_SECRET,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching RunPod cost from maya-sawa:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch RunPod cost',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
