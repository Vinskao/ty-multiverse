import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const requestBody = await request.json();
    const { id } = requestBody;

    if (typeof id !== 'number') {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要參數: id (必須是數字)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/gallery/getById`;

    console.log('🔄 代理 gallery/getById 請求:', { id });

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ gallery/getById 代理成功:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ gallery/getById 代理失敗:', error);

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


