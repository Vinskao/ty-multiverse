import type { APIRoute } from 'astro';

// Prod (node SSR) reads the runtime container env via `process.env`; local
// `astro dev` injects `.env` into `import.meta.env`. Read both in either mode.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return new Response(
      JSON.stringify({ detail: 'Bearer token required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Use Maya Sawa's user-facing endpoint so its Keycloak `manage-users`
    // authorization is always enforced. Never expose the internal-secret route
    // through a public Astro endpoint.
    const response = await fetch(`${MAYA_SAWA_URL}/market/portfolio`, {
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
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
    console.error('Error fetching portfolio from maya-sawa:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch portfolio',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
