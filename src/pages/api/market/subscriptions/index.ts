import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Footer sign-up for the daily reading by email; maya-sawa stores the address as pending and mails a confirmation link.
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.slice(0, 254) : '';
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/subscriptions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }), signal: AbortSignal.timeout(15000),
    });
    return Response.json(response.ok ? { status: 'pending' } : { detail: 'Subscription refused' }, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Subscription unavailable' }, { status: 502 });
  }
};
