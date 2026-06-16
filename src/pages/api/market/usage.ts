import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa:8000/maya-sawa';
const INTERNAL_SECRET = import.meta.env.MARKET_INTERNAL_SECRET;

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
    const response = await fetch(`${MAYA_SAWA_URL}/market/internal/usage`, {
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
    console.error('Error fetching market usage from maya-sawa:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch market usage',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
