import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/gallery/getAll`;

    console.log('🔄 代理 gallery/getAll 請求到 Gateway:', gatewayUrl);

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ gallery/getAll 代理成功:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ gallery/getAll 代理失敗:', error);

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

