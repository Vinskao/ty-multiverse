---
title: "angular-output"
publishDate: "2025-12-26 13:00:00"
img: /tymultiverse/assets/angular.png
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  探索 Angular 17.3 中引入的 Signal-based Outputs (output()) 如何取代傳統的 @Output 裝飾器，提供更簡潔且效能更好的組件間通信方式。
level: advance
category: Angular
tags:
  - angular
  - signals
  - typescript
---

# Angular Signal-based Outputs 深度解析

## 🚀 從零開始：TypeScript 基礎概念

在深入探討 Angular 的 `output()` 之前，讓我們先建立必要的 TypeScript 基礎知識。這些概念對於理解 `readonly` 修飾符至關重要。

### 什麼是 TypeScript？

**TypeScript** 是 JavaScript 的超集（Superset），為 JavaScript 添加了**靜態類型系統**。簡單來說：

```typescript
// JavaScript (動態類型)
let name = "John";
name = 123; // 允許，運行時才會出錯

// TypeScript (靜態類型)
let name: string = "John";
name = 123; // 編譯錯誤！TypeScript 會在開發時就發現這個錯誤
```

### 類別屬性（Class Properties）的基本概念

在 TypeScript 中，類別的屬性可以有**修飾符（Modifiers）**來控制它們的行為：

```typescript
class Example {
  // 公開屬性（預設）
  public normalProperty: string = "可以修改";

  // 私有屬性（只能在類別內部使用）
  private secretProperty: string = "外部看不到";

  // 保護屬性（子類別可以使用）
  protected familyProperty: string = "給子類用的";

  // 唯讀屬性（只能讀取，不能修改）
  readonly immutableProperty: string = "不能改！";
}
```

### 🔍 深入理解 `readonly` 修飾符

#### `readonly` 的基本含義

`readonly` 是 TypeScript 的**屬性修飾符**，它的作用是**防止屬性被重新賦值**。

```typescript
class Person {
  // 普通屬性：可以隨意修改
  name: string = "John";

  // 唯讀屬性：只能讀取，不能修改
  readonly id: number = 123;

  constructor() {
    this.name = "Jane"; // ✅ 可以修改
    this.id = 456; // ❌ 編譯錯誤！
  }

  updateName(newName: string) {
    this.name = newName; // ✅ 可以修改
    this.id = 789; // ❌ 編譯錯誤！
  }
}
```

#### 為什麼要用 `readonly`？

1. **防止意外修改**：保護重要的數據不會被不小心改變
2. **表達意圖**：告訴其他開發者「這個屬性不應該被修改」
3. **編譯時期檢查**：在開發時就發現潛在的錯誤，而非運行時

#### `readonly` vs `const` 的差異

```typescript
// const: 用於變數宣告
const PI = 3.14159; // 不能重新賦值

class Circle {
  readonly radius: number; // 屬性修飾符

  constructor(radius: number) {
    this.radius = radius; // ✅ 建構函式中可以設定
    // this.radius = 10; // ❌ 之後就不能改了
  }
}
```

### 屬性修飾符的位置

在 TypeScript 中，修飾符**總是寫在屬性名稱前面**：

```typescript
class Component {
  // 語法： [修飾符] 屬性名稱: 類型 [= 初始值]

  public name: string = "component";     // 公開屬性
  private count: number = 0;             // 私有屬性
  protected config: object = {};         // 保護屬性
  readonly version: string = "1.0.0";    // 唯讀屬性

  // 也可以組合使用
  public readonly apiKey: string = "secret"; // 公開但唯讀
}
```

### 實際應用場景

#### 場景 1：組件狀態
```typescript
class LoadingButton {
  readonly buttonId: string; // 按鈕 ID 不應該改變

  isLoading: boolean = false; // 可以改變的狀態
  clickCount: number = 0;    // 可以改變的計數

  constructor(id: string) {
    this.buttonId = id; // 在建構函式中設定
  }
}
```

#### 場景 2：API 響應
```typescript
class ApiResponse {
  readonly statusCode: number;   // HTTP 狀態碼不會改變
  readonly requestId: string;    // 請求 ID 不會改變

  data: any;                     // 數據可能會被後續處理
  isCached: boolean = false;     // 快取狀態可能改變
}
```

### 常見問題解答

**Q: 為什麼要寫在前面？**
A: 這是 TypeScript 的語法規則，所有修飾符都放在屬性名稱前面，這樣可以清楚地表達屬性的訪問權限和可變性。

**Q: 如果不加修飾符呢？**
A: 預設是 `public`，表示任何地方都可以訪問和修改。

**Q: `readonly` 可以用在方法上嗎？**
A: 不行，`readonly` 只適用於屬性，不適用於方法。

現在你已經掌握了 `readonly` 的基礎知識，讓我們回到 Angular 的 `output()` 函式...

## 什麼是組件輸出（Component Outputs）？

在 Angular 中，**輸出屬性（Output Properties）** 是組件間通信的重要機制。它允許**子組件向父組件發送事件和數據**，實現從下到上的數據流。這是 Angular 單向數據流的關鍵部分。

`readonly addItemEvent = output();` 代表的是 Angular 在 17.3 版本中引入的 **Signal-based Outputs**（基於 Signal 的輸出），這是對傳統 `@Output() addItemEvent = new EventEmitter();` 的現代化替代方案。

## 基本語法與函式簽章

### 標準語法

```typescript
readonly eventName = output<T>();
```

### 函式參數詳解

`output<T>()` 函式接受一個可選的泛型參數：

- **`T`**：指定輸出事件所攜帶的數據類型
- **返回值**：返回 `OutputEmitterRef<T>` 類型的物件
- **無參數時**：預設為 `output<void>()`，表示不攜帶數據的事件

### 實際使用範例

```typescript
// 基本事件（無數據）
readonly itemDeleted = output();

// 攜帶特定類型數據的事件
readonly itemAdded = output<Item>();
readonly countChanged = output<number>();
readonly userSelected = output<UserData>();

// 複雜對象類型
readonly formSubmitted = output<{valid: boolean, data: FormData}>();
```

## 語法解析：每個部分的深入含義

### 1. `output()` 函式

**核心功能**：
- 建立一個輸出屬性，讓子組件可以向父組件發送訊號
- 回傳 `OutputEmitterRef<T>` 實例，這個物件具有 `emit()` 方法
- 在 Angular 的 Signals 系統中註冊該輸出

**技術細節**：
- 內部使用 Angular 的 Signals 機制進行變更偵測
- 不依賴 Zone.js，可以在無 Zone 環境中正常運作
- 與 `input()` 函式形成對稱的 API 設計

### 2. `readonly` 修飾符

**安全性考量**：
- 防止意外重新賦值輸出屬性
- 確保輸出物件的引用不會被改變
- 這是 **Angular 官方強烈推薦的寫法**

**為什麼需要 readonly？**
```typescript
// ❌ 危險：可能意外重新賦值
addItemEvent = output();

// 某處程式碼不小心...
this.addItemEvent = new EventEmitter(); // 破壞了原有的輸出機制

// ✅ 安全：編譯時期就阻止錯誤
readonly addItemEvent = output();
// this.addItemEvent = ...; // TypeScript 編譯錯誤
```

### 3. 事件名稱命名

**命名慣例**：
- 使用 **camelCase** 格式
- 通常以動詞結尾，表示發生的動作
- 應描述事件的本質，而非具體行為

```typescript
// 好的命名
readonly itemAdded = output<Item>();
readonly userLoggedIn = output<User>();
readonly formSubmitted = output<FormData>();
readonly selectionChanged = output<SelectedItem[]>();

// 不推薦的命名
readonly click = output(); // 太過籠統
readonly data = output(); // 沒有動作意味
```

## 與傳統 @Output 的對比分析

### 傳統 @Output 寫法

```typescript
import { Component, EventEmitter, Output } from '@angular/core';

@Component({...})
export class ChildComponent {
  @Output() itemAdded = new EventEmitter<Item>();

  addItem(item: Item) {
    this.itemAdded.emit(item);
  }
}
```

### 新版 output() 寫法

```typescript
import { Component, output } from '@angular/core';

@Component({...})
export class ChildComponent {
  readonly itemAdded = output<Item>();

  addItem(item: Item) {
    this.itemAdded.emit(item);
  }
}
```

## 四大核心優勢詳解

### 🎯 更簡潔的語法結構

**裝飾器 vs 函式**：
- **傳統方式**：需要 `@Output()` 裝飾器 + `EventEmitter` 實例化
- **新方式**：單一函式呼叫，與 `input()` API 完全一致

**程式碼行數比較**：
```typescript
// 傳統：3 行 + import EventEmitter
@Output() itemAdded = new EventEmitter<Item>();

// 新版：1 行 + import output
readonly itemAdded = output<Item>();
```

### 🔍 增強的類型推導能力

**自動類型推斷**：
```typescript
// 無需顯式指定類型，TypeScript 可自動推斷
readonly itemAdded = output(); // 推斷為 output<unknown>

// 明確指定類型，提供最佳類型安全
readonly itemAdded = output<Item>();
```

**編譯時期檢查**：
```typescript
readonly userSelected = output<User>();

// ✅ 正確使用
this.userSelected.emit({id: 1, name: 'John'});

// ❌ 編譯錯誤：類型不匹配
this.userSelected.emit('invalid string'); // Error!
```

### ⚡ 效能與包體大小優化

**RxJS 依賴性**：
- **傳統 @Output**：強制依賴 RxJS 的 `EventEmitter`（繼承自 `Subject`）
- **新版 output()**：零 RxJS 依賴，可在無 RxJS 的專案中減少約 20-30KB

**效能特點**：
- 使用 Angular Signals 的變更偵測機制
- 在無 Zone.js 環境中表現更佳
- 記憶體使用更有效率

### 🔄 Signals 生態系統的一致性

**完整的 Signals API 家族**：
```typescript
// 輸入：從父組件接收數據
readonly user = input<User>();

// 輸出：向父組件發送事件
readonly userChanged = output<User>();

// 內部狀態：組件內部狀態管理
readonly isLoading = signal(false);

// 計算屬性：基於其他 Signals 的衍生狀態
readonly displayName = computed(() => `${this.user().firstName} ${this.user().lastName}`);
```

## 事件發送機制詳解

### emit() 方法的運作原理

```typescript
export class ChildComponent {
  readonly itemAdded = output<Item>();

  addNewItem(item: Item) {
    // 發送事件到父組件
    this.itemAdded.emit(item);

    // 可以連續發送多個事件
    this.itemAdded.emit(anotherItem);
  }
}
```

**事件傳遞流程**：
1. 子組件呼叫 `emit(value)`
2. Angular Signals 系統記錄變更
3. 父組件的 event binding 被觸發
4. 執行對應的處理函式

### 父組件的事件接收

**HTML 範本語法**：
```html
<!-- 標準事件綁定 -->
<app-child (itemAdded)="onItemAdded($event)"></app-child>

<!-- 解構賦值（Angular 17+） -->
<app-child (itemAdded)="onItemAdded($event); totalItems = totalItems + 1"></app-child>

<!-- 無數據事件 -->
<app-child (itemDeleted)="onItemDeleted()"></app-child>
```

**TypeScript 處理邏輯**：
```typescript
export class ParentComponent {
  totalItems = 0;
  items: Item[] = [];

  onItemAdded(newItem: Item) {
    console.log('新項目已添加：', newItem);
    this.items.push(newItem);
    this.totalItems = this.items.length;
  }

  onItemDeleted() {
    console.log('項目已刪除');
    this.totalItems = this.items.length;
  }
}
```

## 類型安全與泛型應用

### 基本類型安全

```typescript
// 基本資料類型
readonly countChanged = output<number>();
readonly isVisible = output<boolean>();
readonly message = output<string>();

// 自訂類型
interface User {
  id: number;
  name: string;
  email: string;
}

readonly userSelected = output<User>();
```

### 複雜對象類型

```typescript
// 表單數據
interface FormResult {
  isValid: boolean;
  data: Record<string, any>;
  errors: string[];
}

readonly formSubmitted = output<FormResult>();

// API 響應
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

readonly apiCompleted = output<ApiResponse<Item[]>>();
```

### 聯合類型與可選類型

```typescript
// 聯合類型：支援多種可能的數據類型
readonly notification = output<SuccessMessage | ErrorMessage | WarningMessage>();

// 可選屬性
readonly userUpdate = output<Partial<User>>();

// 字面量類型
readonly action = output<'create' | 'update' | 'delete'>();
```

## 實際應用模式與最佳實踐

### 常見使用模式

#### 1. CRUD 操作事件

```typescript
export class DataTableComponent {
  readonly itemCreated = output<Item>();
  readonly itemUpdated = output<Item>();
  readonly itemDeleted = output<ItemId>();
  readonly itemsReordered = output<ItemOrderChange>();
}
```

#### 2. 用戶互動事件

```typescript
export class SearchComponent {
  readonly searchQueryChanged = output<string>();
  readonly searchExecuted = output<SearchCriteria>();
  readonly suggestionSelected = output<string>();
}
```

#### 3. 狀態變更通知

```typescript
export class LoadingButtonComponent {
  readonly clicked = output<void>();
  readonly loadingStateChanged = output<boolean>();
}
```

### 最佳實踐建議

1. **總是使用 `readonly`**：保護輸出屬性不被意外修改
2. **明確指定泛型類型**：提供最佳的類型安全和開發體驗
3. **使用描述性事件名稱**：讓父組件清楚了解發生了什麼
4. **保持事件簡單**：每個輸出應只負責一種特定的事件類型
5. **考慮使用介面**：對於複雜的數據結構，定義明確的 TypeScript 介面

### 遷移指南

**從 @Output 遷移到 output()**：

```typescript
// 舊版
@Output() itemAdded = new EventEmitter<Item>();

// 新版
readonly itemAdded = output<Item>();

// 發送事件保持不變
this.itemAdded.emit(item);
```

**父組件使用方式完全相同**，無需修改 HTML 範本。