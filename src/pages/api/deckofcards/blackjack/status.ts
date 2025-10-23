import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/deckofcards/blackjack/status`;

    console.log('🔄 代理 blackjack/status 請求');

    const response = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.text();
    console.log('✅ blackjack/status 代理成功:', result);

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error('❌ blackjack/status 代理失敗:', error);

    return new Response(JSON.stringify({
      success: false,
      message: `代理失敗: ${error.message}`,
      error: error.toString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

