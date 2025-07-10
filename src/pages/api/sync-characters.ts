import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the character data from the request body
    const characterData = await request.json();
    
    console.log(`🔄 代理同步 ${characterData.length} 個角色到 Google Apps Script`);
    
    // Forward the data to Google Apps Script
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbyU77t4OsBghW0r_Yx7wmJyMOexBxAsARVaxFGox4Gz38Ze2cJpCR5wm3j6uIktkfNP/exec';
    
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(characterData)
    });
    
    if (!response.ok) {
      throw new Error(`Google Apps Script 回應錯誤: ${response.status}`);
    }
    
    const result = await response.text();
    console.log('✅ Google Apps Script 同步結果:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: '同步成功',
      result: result,
      characterCount: characterData.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('❌ 同步失敗:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: `同步失敗: ${error.message}`,
      error: error.toString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 