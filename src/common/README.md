# Common Module

前端通用模块，提供共享的工具函数、类型定义、常量和辅助函数。

## 📁 目录结构

```
src/common/
├── constants/     # 常量定义
│   ├── api.ts    # API 相关常量
│   └── index.ts  # 统一导出
├── utils/         # 工具函数
│   ├── json.ts   # JSON 解析/验证工具
│   └── index.ts  # 统一导出
├── types/         # 通用类型
│   ├── error.ts  # 错误相关类型
│   ├── api.ts    # API 相关类型
│   └── index.ts  # 统一导出
├── helpers/       # 辅助函数
│   ├── typeCheck.ts  # 类型检查辅助函数
│   └── index.ts      # 统一导出
├── index.ts       # 统一导出入口
└── README.md      # 本文档
```

## 🚀 使用方式

### 统一导入（推荐）

```typescript
import { 
  isJson, 
  safeJsonParse, 
  isNumber, 
  API_BASE,
  ErrorResponse 
} from '@/common';
```

### 按需导入

```typescript
// 导入 JSON 工具函数
import { isJson, safeJsonParse, safeJsonStringify } from '@/common/utils';

// 导入类型检查辅助函数
import { isNumber, isString, isObject } from '@/common/helpers';

// 导入常量
import { API_BASE, HTTP_STATUS, CONTENT_TYPE } from '@/common/constants';

// 导入类型定义
import type { ErrorResponse, ApiResponse } from '@/common/types';
```

## 📚 API 文档

### JSON 工具函数 (`utils/json.ts`)

#### `isJson(str: string): boolean`
检查字符串是否为有效的 JSON。

```typescript
isJson('{"key": "value"}'); // true
isJson('invalid json');      // false
```

#### `safeJsonParse<T>(jsonString: string, defaultValue?: T | null): T | null`
安全地解析 JSON 字符串，失败时返回默认值。

```typescript
safeJsonParse('{"key": "value"}', {}); // { key: "value" }
safeJsonParse('invalid', null);         // null
```

#### `safeJsonStringify(value: any, defaultValue?: string): string`
安全地将值转换为 JSON 字符串，失败时返回默认值。

```typescript
safeJsonStringify({ key: 'value' }); // '{"key":"value"}'
safeJsonStringify(circularObj, '{}'); // '{}'
```

#### `tryParseJson(jsonString: string): any`
尝试解析 JSON，如果失败则返回原始字符串。

```typescript
tryParseJson('{"key": "value"}'); // { key: "value" }
tryParseJson('plain text');       // 'plain text'
```

#### `parseResponseText(responseText: string, contentType: string | null): any`
根据 Content-Type 自动判断并解析响应文本。

```typescript
parseResponseText('{"key": "value"}', 'application/json'); // { key: "value" }
parseResponseText('plain text', 'text/plain');              // 'plain text'
```

### 类型检查辅助函数 (`helpers/typeCheck.ts`)

#### `isNumber(value: any): value is number`
检查值是否为数字。

#### `isString(value: any): value is string`
检查值是否为字符串。

#### `isObject(value: any): value is Record<string, any>`
检查值是否为对象（不包括 null 和数组）。

#### `isArray(value: any): value is any[]`
检查值是否为数组。

#### `isEmpty(value: any): boolean`
检查值是否为空。

#### `toNumber(value: any, defaultValue?: number): number`
安全地将值转换为数字。

#### `toInteger(value: any, defaultValue?: number): number`
安全地将值转换为整数。

### 常量 (`constants/api.ts`)

#### `API_BASE`
统一的 API 基础 URL。

#### `GATEWAY_API_BASE`
Gateway API 基础 URL。

#### `DEFAULT_API_TIMEOUT`
默认 API 超时时间（15秒）。

#### `HTTP_STATUS`
HTTP 状态码常量对象。

#### `CONTENT_TYPE`
Content-Type 常量对象。

### 类型定义 (`types/`)

#### `ErrorResponse`
标准错误响应接口。

#### `ApiResponse<T>`
API 响应接口。

#### `BackendApiResponse<T>`
后端 API 响应接口。

#### `ApiRequestOptions`
API 请求选项接口。

## 🔄 迁移指南

### 从旧代码迁移

#### 旧代码
```typescript
import { API_BASE } from '@/utils/apiBase';
import type { ErrorResponse } from '@/types/error';
const data = JSON.parse(jsonString);
```

#### 新代码
```typescript
import { API_BASE } from '@/common/constants';
import type { ErrorResponse } from '@/common/types';
import { safeJsonParse } from '@/common/utils';
const data = safeJsonParse(jsonString, null);
```

## 📝 注意事项

1. **向后兼容**：旧的导入路径仍然可用（通过 re-export），但建议使用新的 common 模块。
2. **类型安全**：所有工具函数都提供了 TypeScript 类型定义和类型守卫。
3. **错误处理**：所有 JSON 相关函数都包含错误处理，不会抛出异常。

