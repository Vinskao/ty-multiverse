import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the request body from the client
    const requestBody = await request.json();
    
    console.log('🔄 處理 people/update 請求:', requestBody);
    
    // Get the backend URL from environment or use default
    const backendUrl = import.meta.env.DEV 
      ? 'http://localhost:8080/tymb/people/update'
      : `${import.meta.env.PUBLIC_TYMB_URL || 'https://peoplesystem.tatdvsonorth.com/tymb'}/people/update`;
    
    console.log('📡 轉發到後端:', backendUrl);
    
    // Forward the request to the backend server
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 後端回應錯誤:', response.status, errorText);
      
      // 特殊處理版本衝突錯誤
      if (errorText.includes('Character data has been modified by another user')) {
        return new Response(JSON.stringify({
          success: false,
          message: '數據已被其他用戶修改，請重新載入後再試',
          error: 'VERSION_CONFLICT',
          details: errorText
        }), {
          status: 409, // Conflict status
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // 特殊處理主鍵衝突錯誤
      if (errorText.includes('duplicate key value violates unique constraint') || 
          errorText.includes('already exists') ||
          errorText.includes('SQLState: 23505')) {
        return new Response(JSON.stringify({
          success: false,
          message: '後端錯誤：嘗試插入已存在的角色。這是一個後端邏輯錯誤，請聯繫管理員。',
          error: 'DUPLICATE_KEY',
          details: errorText,
          suggestion: '後端應該使用 UPDATE 而不是 INSERT 操作'
        }), {
          status: 400, // Bad Request
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      throw new Error(`後端更新失敗: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ 更新成功:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: '更新成功',
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('❌ people/update 處理失敗:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: `更新失敗: ${error.message}`,
      error: error.toString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 