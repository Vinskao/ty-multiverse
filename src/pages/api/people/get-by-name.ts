import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const requestBody = await request.json();
    const { name } = requestBody;

    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要參數: name'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/people/get-by-name`;

    console.log('🔄 代理 people/get-by-name 請求:', { name });

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ people/get-by-name 代理成功:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ people/get-by-name 代理失敗:', error);

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
