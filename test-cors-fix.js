// 測試 CORS 修復的腳本
// 在瀏覽器控制台中運行此腳本來測試 API 調用

async function testCorsFix() {
  console.log('🧪 測試 CORS 修復...');

  try {
    // 測試 1: 獲取可用模型
    console.log('📡 測試獲取可用模型...');
    const modelsResponse = await fetch('/maya-v2/available-models/', {
      // 移除 credentials，因為我們使用 token 認證
      // credentials: 'include'
    });

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('✅ 模型 API 成功:', modelsData);
    } else {
      console.error('❌ 模型 API 失敗:', modelsResponse.status, modelsResponse.statusText);
    }

    // 測試 2: 發送測試問題（如果有模型）
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      const models = modelsData?.models || (Array.isArray(modelsData) ? modelsData : []);
      const activeModels = models.filter((m: any) => m.is_active === true);

      if (activeModels.length > 0) {
        console.log('📝 測試發送問題...');
        const testPayload = {
          question: 'Hello, this is a test question',
          model_name: activeModels[0].model_id || activeModels[0].name,
          sync: false,
          use_knowledge_base: false
        };

        const askResponse = await fetch('/maya-v2/ask-with-model/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
          // 移除 credentials，因為我們使用 token 認證
          // credentials: 'include'
        });

        if (askResponse.ok) {
          const askData = await askResponse.json();
          console.log('✅ 問題發送成功:', askData);
        } else {
          console.error('❌ 問題發送失敗:', askResponse.status, askResponse.statusText);
        }
      }
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }

  console.log('🏁 測試完成');
}

// 將函數添加到全域
window.testCorsFix = testCorsFix;

console.log('🔧 CORS 測試函數已載入。運行 testCorsFix() 來測試修復。');
