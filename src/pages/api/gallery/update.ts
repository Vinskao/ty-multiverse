import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const requestBody = await request.json();
    const { id, imageBase64 } = requestBody;

    if (typeof id !== 'number' || !imageBase64) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要參數: id (數字) 和 imageBase64'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/gallery/update`;

    console.log('🔄 代理 gallery/update 請求:', { id });

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, imageBase64 })
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ gallery/update 代理成功:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ gallery/update 代理失敗:', error);

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










