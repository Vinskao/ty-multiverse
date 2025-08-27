/**
 * Weapon damage calculation utility
 * This file contains functions for calculating weapon damage based on character attributes
 */

/**
 * Calculate the total weapon damage for a character
 * @param {Object} character - The character object with attributes and powers
 * @param {Array} weapons - Array of weapon objects with damage properties
 * @returns {Object} - Object containing the calculated damage values
 */
export function calculateWeaponDamage(character, weapons) {
  // 如果沒有武器，返回默認值
  if (!weapons || weapons.length === 0) {
    return {
      totalDamage: 0,
      baseDamageApplied: 0,
      bonusDamageApplied: 0,
      hasBonus: false,
      stateAttributes: []
    };
  }

  // 確保 weapons 是數組
  const weaponsArray = Array.isArray(weapons) ? weapons : [weapons];
  
  // 初始化總傷害和狀態效果
  let totalBaseDamage = 0;
  let totalBonusDamage = 0;
  let hasAnyBonus = false;
  let allStateAttributes = [];
  
  // 獲取角色的戰力值
  const characterUtilityPower = parseInt(String(character.utilityPower || 0), 10);
  const characterMagicPower = parseInt(String(character.magicPower || 0), 10);
  
  // 遍歷每個武器
  weaponsArray.forEach(weapon => {
    // 獲取武器屬性
    const baseDamage = weapon?.baseDamage || 0;
    const bonusDamage = weapon?.bonusDamage || 0;
    const bonusAttributes = weapon?.bonusAttributes || [];
    const stateAttributes = weapon?.stateAttributes || [];
    
    // 計算該武器所需的最小戰力
    const totalWeaponDamage = baseDamage + bonusDamage;
    const minRequiredUtilityPower = Math.ceil(totalWeaponDamage / 3);
    const minRequiredMagicPower = Math.ceil(totalWeaponDamage / 2);
    
    let weaponBaseDamage = 0;
    let weaponBonusDamage = 0;
    let weaponHasBonus = false;
    
    // 檢查角色是否達到該武器的要求
    if (characterUtilityPower >= minRequiredUtilityPower || characterMagicPower >= minRequiredMagicPower) {
      // 完整武器傷害
      weaponBaseDamage = baseDamage;
      
      // 檢查角色是否有加成屬性
      if (bonusAttributes && bonusAttributes.includes(character.attributes)) {
        weaponBonusDamage = bonusDamage;
        weaponHasBonus = true;
      }
    } else {
      // 減少武器傷害 (1/10)
      weaponBaseDamage = Math.floor(baseDamage / 10);
      
      // 檢查角色是否有加成屬性
      if (bonusAttributes && bonusAttributes.includes(character.attributes)) {
        weaponBonusDamage = Math.floor(bonusDamage / 10);
        weaponHasBonus = true;
      }
    }
    
    // 累加該武器的傷害
    totalBaseDamage += weaponBaseDamage;
    totalBonusDamage += weaponBonusDamage;
    
    // 如果有任何武器有加成，設置 hasAnyBonus 為 true
    if (weaponHasBonus) {
      hasAnyBonus = true;
    }
    
    // 收集所有狀態效果
    if (stateAttributes && Array.isArray(stateAttributes)) {
      allStateAttributes = [...allStateAttributes, ...stateAttributes];
    }
  });
  
  // 計算總傷害
  const totalDamage = totalBaseDamage + totalBonusDamage;
  
  return {
    totalDamage,
    baseDamageApplied: totalBaseDamage,
    bonusDamageApplied: totalBonusDamage,
    hasBonus: hasAnyBonus,
    stateAttributes: allStateAttributes
  };
}

// ------------------------------
// NOTE: The total weapon damage is now fetched directly from the TYMB backend.
// The API returns an integer – the total attack power including weapon bonuses.
// We still fall back to the local calculation if the API call fails for any reason.
// ------------------------------

export async function applyWeaponDamage(character, weapons) {
  try {
    // 使用角色名稱呼叫後端 API 取得總攻擊力
    const characterName = encodeURIComponent(character?.name || character?.nameOriginal || "");
    if (!characterName) throw new Error("Character name is missing");

    const baseUrl = import.meta.env.PUBLIC_TYMB_URL;
    const apiUrl = `${baseUrl}/people/damageWithWeapon?name=${characterName}`;
    
    console.log('🗡️ 請求傷害計算:', apiUrl);
    const response = await fetch(apiUrl, { 
      method: "GET",
      credentials: 'include'
    });

    if (!response.ok) throw new Error(`API response not ok: ${response.status}`);

    const data = await response.json();
    console.log('📡 傷害計算響應:', data);

    // 檢查是否為異步處理
    if (data.status === 'processing' && data.requestId) {
      console.log('🔄 開始輪詢傷害計算結果...');
      const totalDamage = await pollForDamageResult(data.requestId, baseUrl);
      
      // 更新角色 utilityPower
      const updatedCharacter = { ...character };
      updatedCharacter.utilityPower = parseInt(String(character.utilityPower || 0), 10) + totalDamage;

      // API 已包含武器加成，若總傷害 > 0 視為有加成
      const hasBonus = totalDamage > 0;

      return {
        character: updatedCharacter,
        hasBonus,
        stateAttributes: []
      };
    } else {
      // 直接返回結果
      const totalDamage = parseInt(String(data || 0), 10);
      
      // 更新角色 utilityPower
      const updatedCharacter = { ...character };
      updatedCharacter.utilityPower = parseInt(String(character.utilityPower || 0), 10) + totalDamage;

      // API 已包含武器加成，若總傷害 > 0 視為有加成
      const hasBonus = totalDamage > 0;

      return {
        character: updatedCharacter,
        hasBonus,
        stateAttributes: []
      };
    }
  } catch (error) {
    console.error("applyWeaponDamage – 使用 API 失敗，改用本地計算:", error);

    // 回退到原本的計算方式
    const { totalDamage, hasBonus, stateAttributes } = calculateWeaponDamage(character, weapons);

    const updatedCharacter = { ...character };
    updatedCharacter.utilityPower = parseInt(String(character.utilityPower || 0), 10) + totalDamage;

    return {
      character: updatedCharacter,
      hasBonus,
      stateAttributes
    };
  }
}

// 輪詢傷害計算結果
async function pollForDamageResult(requestId, baseUrl, maxAttempts = 30, interval = 6000) {
  console.log('🔄 開始輪詢傷害結果，RequestId:', requestId);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 輪詢嘗試 ${attempt}/${maxAttempts}...`);
      
      const existsUrl = `${baseUrl}/api/request-status/${requestId}/exists`;
      console.log('🔍 檢查傷害結果存在:', existsUrl);
      
      const existsResponse = await fetch(existsUrl, { credentials: 'include' });
      console.log('📡 存在檢查響應:', existsResponse.status, existsResponse.statusText);
      
      if (existsResponse.ok) {
        const existsData = await existsResponse.json();
        console.log('📊 傷害結果存在檢查:', existsData);
        
        if (existsData.exists) {
          const resultUrl = `${baseUrl}/api/request-status/${requestId}`;
          console.log('📥 獲取傷害結果:', resultUrl);
          
          const resultResponse = await fetch(resultUrl, { credentials: 'include' });
          console.log('📡 傷害結果響應:', resultResponse.status, resultResponse.statusText);
          
          if (!resultResponse.ok) {
            const errorText = await resultResponse.text();
            console.error('❌ 傷害結果獲取失敗:', errorText);
            throw new Error(`傷害結果獲取失敗: ${resultResponse.status} - ${errorText}`);
          }
          
          const result = await resultResponse.json();
          console.log('✅ 獲取傷害結果成功:', result);
          
          // 從結果中提取傷害值
          const damage = result.data || result.damage || result.totalDamage || 0;
          return parseInt(String(damage), 10);
        }
      } else {
        console.log('⚠️ 傷害結果存在檢查失敗:', existsResponse.status, existsResponse.statusText);
      }
      
      console.log('⏳ 傷害結果還不存在，繼續等待...');
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      } else {
        throw new Error('傷害計算輪詢超時');
      }
    } catch (error) {
      console.error(`❌ 傷害輪詢嘗試 ${attempt} 失敗:`, error);
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('傷害計算輪詢超時');
}
