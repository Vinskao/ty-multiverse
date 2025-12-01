/**
 * 类型检查辅助函数
 */

/**
 * 检查值是否为数字
 * @param value 要检查的值
 * @returns 是否为数字
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为字符串
 * @param value 要检查的值
 * @returns 是否为字符串
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为对象（不包括 null 和数组）
 * @param value 要检查的值
 * @returns 是否为对象
 */
export function isObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

/**
 * 检查值是否为数组
 * @param value 要检查的值
 * @returns 是否为数组
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为函数
 * @param value 要检查的值
 * @returns 是否为函数
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为空（null, undefined, 空字符串, 空数组, 空对象）
 * @param value 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (isObject(value) && Object.keys(value).length === 0) {
    return true;
  }
  return false;
}

/**
 * 检查值是否定义了（不为 null 或 undefined）
 * @param value 要检查的值
 * @returns 是否已定义
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查对象是否包含指定的键
 * @param obj 要检查的对象
 * @param keys 要检查的键数组
 * @returns 是否包含所有指定的键
 */
export function hasKeys<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): boolean {
  if (!isObject(obj)) {
    return false;
  }
  return keys.every(key => key in obj);
}

/**
 * 检查值是否为有效的数字字符串
 * @param value 要检查的值
 * @returns 是否为有效的数字字符串
 */
export function isNumericString(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const parsed = Number(value);
  return !isNaN(parsed) && isFinite(parsed);
}

/**
 * 安全地将值转换为数字
 * @param value 要转换的值
 * @param defaultValue 转换失败时的默认值
 * @returns 转换后的数字或默认值
 */
export function toNumber(value: any, defaultValue: number = 0): number {
  if (isNumber(value)) {
    return value;
  }
  if (isString(value)) {
    const parsed = Number(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * 安全地将值转换为整数
 * @param value 要转换的值
 * @param defaultValue 转换失败时的默认值
 * @returns 转换后的整数或默认值
 */
export function toInteger(value: any, defaultValue: number = 0): number {
  if (isNumber(value)) {
    return Math.floor(value);
  }
  if (isString(value)) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

