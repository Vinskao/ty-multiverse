import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const urlObj = new URL(url);
    const characterName = urlObj.searchParams.get('name');

    if (!characterName) {
      return new Response(JSON.stringify({
        success: false,
        message: '缺少必要參數: name'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const gatewayUrl = `${import.meta.env.PUBLIC_TYMG_URL || 'http://localhost:8082/tymg'}/people/damageWithWeapon?name=${encodeURIComponent(characterName)}`;

    console.log('🔄 代理 people/damageWithWeapon 請求:', { name: characterName });

    const response = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Gateway 回應錯誤: ${response.status}`);
    }

    const result = await response.text(); // 根據後端，這是純文本回應
    console.log('✅ people/damageWithWeapon 代理成功:', result);

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error('❌ people/damageWithWeapon 代理失敗:', error);

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
