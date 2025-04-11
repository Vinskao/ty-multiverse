/**
 * Weapon damage calculation utility
 * This file contains functions for calculating weapon damage based on character attributes
 */

/**
 * Calculate the total weapon damage for a character
 * @param {Object} character - The character object with attributes and powers
 * @param {Object} weapon - The weapon object with damage properties
 * @returns {Object} - Object containing the calculated damage values
 */
export function calculateWeaponDamage(character, weapon) {
  // Default values if weapon is not provided
  const baseDamage = weapon?.baseDamage || 0;
  const bonusDamage = weapon?.bonusDamage || 0;
  const bonusAttributes = weapon?.bonusAttributes || [];
  
  // Get character's utility power
  const characterUtilityPower = parseInt(String(character.utilityPower || 0), 10);
  
  // If character has no utility power, they can't use weapons
  if (characterUtilityPower === 0) {
    return {
      totalDamage: 0,
      baseDamageApplied: 0,
      bonusDamageApplied: 0,
      hasBonus: false
    };
  }
  
  // Calculate the minimum utility power required for full weapon damage
  const totalWeaponDamage = baseDamage + bonusDamage;
  const minRequiredUtilityPower = Math.ceil(totalWeaponDamage / 3);
  
  let baseDamageApplied = 0;
  let bonusDamageApplied = 0;
  let hasBonus = false;
  
  // Check if character has enough utility power for full weapon damage
  if (characterUtilityPower >= minRequiredUtilityPower) {
    // Full weapon damage
    baseDamageApplied = baseDamage;
    
    // Check if character has bonus attributes
    if (bonusAttributes && bonusAttributes.includes(character.attributes)) {
      bonusDamageApplied = bonusDamage;
      hasBonus = true;
    }
  } else {
    // Reduced weapon damage (1/10 of normal)
    baseDamageApplied = Math.floor(baseDamage / 10);
    
    // Check if character has bonus attributes
    if (bonusAttributes && bonusAttributes.includes(character.attributes)) {
      bonusDamageApplied = Math.floor(bonusDamage / 10);
      hasBonus = true;
    }
  }
  
  // Calculate total damage
  const totalDamage = baseDamageApplied + bonusDamageApplied;
  
  return {
    totalDamage,
    baseDamageApplied,
    bonusDamageApplied,
    hasBonus
  };
}

/**
 * Apply weapon damage to a character's utility power
 * @param {Object} character - The character object with attributes and powers
 * @param {Object} weapon - The weapon object with damage properties
 * @returns {Object} - Updated character object with modified utility power
 */
export function applyWeaponDamage(character, weapon) {
  const { totalDamage, hasBonus } = calculateWeaponDamage(character, weapon);
  
  // Create a copy of the character object
  const updatedCharacter = { ...character };
  
  // Add weapon damage to utility power
  updatedCharacter.utilityPower = parseInt(String(character.utilityPower || 0), 10) + totalDamage;
  
  // Return the updated character and whether bonus was applied
  return {
    character: updatedCharacter,
    hasBonus
  };
}
