/**
 * JSON 工具函数
 * 提供安全的 JSON 解析和验证功能
 */

/**
 * 检查字符串是否为有效的 JSON
 * @param str 要检查的字符串
 * @returns 是否为有效的 JSON
 */
export function isJson(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全地解析 JSON 字符串
 * @param jsonString JSON 字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T = any>(
  jsonString: string,
  defaultValue: T | null = null
): T | null {
  if (typeof jsonString !== 'string') {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 安全地将值转换为 JSON 字符串
 * @param value 要序列化的值
 * @param defaultValue 序列化失败时的默认值
 * @returns JSON 字符串或默认值
 */
export function safeJsonStringify(
  value: any,
  defaultValue: string = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

/**
 * 尝试解析 JSON，如果失败则返回原始字符串
 * @param jsonString JSON 字符串
 * @returns 解析后的对象或原始字符串
 */
export function tryParseJson(jsonString: string): any {
  if (typeof jsonString !== 'string') {
    return jsonString;
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString;
  }
}

/**
 * 检查值是否为有效的 JSON 对象（不是数组）
 * @param value 要检查的值
 * @returns 是否为有效的 JSON 对象
 */
export function isJsonObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

/**
 * 检查值是否为有效的 JSON 数组
 * @param value 要检查的值
 * @returns 是否为有效的 JSON 数组
 */
export function isJsonArray(value: any): boolean {
  return Array.isArray(value);
}

/**
 * 根据 Content-Type 头判断是否应该解析为 JSON
 * @param contentType Content-Type 头值
 * @returns 是否应该解析为 JSON
 */
export function shouldParseAsJson(contentType: string | null): boolean {
  return contentType !== null && contentType.includes('application/json');
}

/**
 * 安全地解析响应文本（根据 Content-Type 自动判断）
 * @param responseText 响应文本
 * @param contentType Content-Type 头值
 * @returns 解析后的数据（可能是对象或字符串）
 */
export function parseResponseText(
  responseText: string,
  contentType: string | null
): any {
  if (shouldParseAsJson(contentType)) {
    return tryParseJson(responseText);
  }
  return responseText;
}

