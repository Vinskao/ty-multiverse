import type { APIRoute } from 'astro';

// 直接使用本地QA服務的URL
const QA_API_URL = 'http://localhost:8000/qa/query';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        message: '請提供有效的問題文本'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('QA Proxy: 調用API:', QA_API_URL);
    console.log('QA Proxy: 請求內容:', { text });
    
    // 調用後端QA API
    const response = await fetch(QA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    console.log('QA Proxy: 響應狀態:', response.status);

    if (!response.ok) {
      throw new Error(`QA API error: ${response.status}`);
    }

    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('QA Proxy Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: '無法連接到QA服務，請稍後再試'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 