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

/**
 * Apply weapon damage to a character's utility power
 * @param {Object} character - The character object with attributes and powers
 * @param {Array} weapons - Array of weapon objects with damage properties
 * @returns {Object} - Updated character object with modified utility power
 */
export function applyWeaponDamage(character, weapons) {
  const { totalDamage, hasBonus, stateAttributes } = calculateWeaponDamage(character, weapons);
  
  // Create a copy of the character object
  const updatedCharacter = { ...character };
  
  // Add weapon damage to utility power
  updatedCharacter.utilityPower = parseInt(String(character.utilityPower || 0), 10) + totalDamage;
  
  // Return the updated character and whether bonus was applied
  return {
    character: updatedCharacter,
    hasBonus,
    stateAttributes
  };
}
