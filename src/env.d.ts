/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// 允許 TypeScript 直接 import JSON 檔案
declare module "*.json" {
  const value: any;
  export default value;
}
