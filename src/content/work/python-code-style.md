---
title: "python-code-style"
publishDate: "2025-09-16 15:00:00"
img: /tymultiverse/assets/python.png
img_alt: Python programming and code style illustration
description: |
  Python 程式碼風格深度指南：從 __init__.py 的基本概念到現代專案架構設計，掌握專業 Python 開發的最佳實踐
tags:
  - Python
  - Code Style
  - Package Management
  - Project Structure
  - Best Practices
---

# Python 程式碼風格與專案架構指南

這篇文章將深入探討 Python 程式碼組織的核心概念和最佳實踐，特別是 `__init__.py` 文件的重要性，以及如何設計可維護的大型專案架構。我們將通過實際的框架設計理念來理解這些技術的核心原理。

## 什麼是 `__init__.py`？

`__init__.py` 是 Python 的包初始化文件，告訴 Python 這個目錄是一個包 (package)。它的存在讓目錄可以被當作模組來匯入和使用。

### Python 語法基礎說明

在開始之前，讓我們先了解 Python 與 Java 在語法上的主要差異：

```python
# Python 語法特點 (與 Java 對比)
# 1. Python 沒有分號結尾，每行是一個語句
print("Hello World")  # 相當於 Java 的 System.out.println("Hello World");

# 2. Python 使用縮進表示代碼塊，而不是大括號
if True:
    print("這是 if 語句的內容")  # 相當於 Java 的 { }
    x = 1

# 3. Python 變數聲明不需要指定類型
name = "John"  # Java 需要: String name = "John";
age = 25       # Java 需要: int age = 25;

# 4. Python 函數定義使用 def 關鍵字
def greet(name):  # Java 需要: public void greet(String name) {
    return f"Hello, {name}"  # f-string 是 Python 3.6+ 的格式化語法

# 5. Python 沒有 public/private 等訪問修飾符，慣例使用下劃線
_private_var = "私有變數"  # 相當於 Java 的 private
public_var = "公開變數"   # 相當於 Java 的 public
```

### 基本功能

```python
# __init__.py 示例
# 空的 __init__.py 文件已經足夠讓 Python 認識這個目錄是包
# 注意：Python 註釋使用 # 而不是 //
```

### 進階用法

```python
# __init__.py 可以包含初始化代碼
# import 語法：from 模組 import 項目
from .main_module import MainClass  # 相當於 Java 的 import
from .utils import helper_function

# Python 變數不需要類型聲明
__version__ = "1.0.0"  # 相當於 Java 的 public static final String VERSION = "1.0.0";

# Python 列表相當於 Java 的 ArrayList
__all__ = ["MainClass", "helper_function"]  # 控制 import * 時匯出的項目

# Python 函數定義
def get_version():
    return __version__  # return 相當於 Java 的 return
```

## 🎯 Python 特殊方法 (`__xx__`) 深度解析

`__xx__` 是 Python 中的**特殊方法**（Special Methods），也被稱為**魔術方法**（Magic Methods）或**雙下劃線方法**（Dunder Methods）。這些方法讓你的類可以實現 Python 的內建操作。

### 為什麼需要特殊方法？

```python
# 沒有特殊方法的類
class BasicClass:
    def __init__(self, value):
        self.value = value

# 使用時很麻煩
obj = BasicClass(42)
print(len([obj]))  # TypeError: object of type 'BasicClass' has no len()

# 有特殊方法的類
class SmartClass:
    def __init__(self, value):
        self.value = value

    def __len__(self):           # 實現 len() 函數
        return 1

    def __str__(self):           # 實現 str() 轉換
        return f"SmartClass({self.value})"

    def __add__(self, other):    # 實現 + 運算符
        return SmartClass(self.value + other.value)

# 使用時很自然
obj = SmartClass(42)
print(len([obj]))  # 1
print(str(obj))    # SmartClass(42)
```

### 核心特殊方法分類

#### 1. **物件創建與初始化**

```python
class MyClass:
    def __new__(cls, *args, **kwargs):
        """創建實例之前調用，相當於 Java 的構造函數前處理"""
        print("創建實例...")
        instance = super().__new__(cls)
        return instance

    def __init__(self, value):
        """實例初始化，相當於 Java 的構造函數"""
        print("初始化實例...")
        self.value = value

    def __del__(self):
        """實例銷毀時調用，相當於 Java 的 finalize()"""
        print("銷毀實例...")

# 使用示例
obj = MyClass(42)  # 先調用 __new__，再調用 __init__
del obj           # 調用 __del__
```

#### 2. **字符串表示**

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        """給用戶看的字符串，相當於 Java 的 toString()"""
        return f"{self.name} ({self.age} 歲)"

    def __repr__(self):
        """給開發者看的字符串，用於調試"""
        return f"Person(name='{self.name}', age={self.age})"

    def __format__(self, format_spec):
        """自定義格式化，相當於 Java 的 String.format()"""
        if format_spec == 'short':
            return self.name
        return str(self)

# 使用示例
person = Person("小明", 25)
print(person)           # 小明 (25 歲) - 調用 __str__
print(repr(person))     # Person(name='小明', age=25) - 調用 __repr__
print(f"{person:short}") # 小明 - 調用 __format__
```

#### 3. **比較操作**

```python
class Number:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):      # == 運算符
        """相當於 Java 的 equals()"""
        if isinstance(other, Number):
            return self.value == other.value
        return False

    def __lt__(self, other):      # < 運算符
        """小於比較"""
        if isinstance(other, Number):
            return self.value < other.value
        return NotImplemented

    def __le__(self, other):      # <= 運算符
        return self < other or self == other

    def __gt__(self, other):      # > 運算符
        return not (self <= other)

    def __ge__(self, other):      # >= 運算符
        return not (self < other)

    def __ne__(self, other):      # != 運算符
        return not (self == other)

# 使用示例
a = Number(5)
b = Number(10)
print(a == b)  # False - 調用 __eq__
print(a < b)   # True  - 調用 __lt__
print(a <= b)  # True  - 調用 __le__
```

#### 4. **數學運算**

```python
class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __add__(self, other):     # + 運算符
        return Vector(self.x + other.x, self.y + other.y)

    def __sub__(self, other):     # - 運算符
        return Vector(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):    # * 運算符
        return Vector(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar):   # 反向乘法：scalar * vector
        return self * scalar

    def __iadd__(self, other):    # += 運算符（就地操作）
        self.x += other.x
        self.y += other.y
        return self

# 使用示例
v1 = Vector(1, 2)
v2 = Vector(3, 4)
print(v1 + v2)  # Vector(4, 6) - 調用 __add__
print(v1 * 3)   # Vector(3, 6) - 調用 __mul__
print(3 * v1)   # Vector(3, 6) - 調用 __rmul__
```

#### 5. **容器協議 (Container Protocol)**

```python
class MyList:
    def __init__(self):
        self._items = []

    def __len__(self):           # len() 函數
        return len(self._items)

    def __getitem__(self, index): # [] 讀取操作
        return self._items[index]

    def __setitem__(self, index, value): # [] 賦值操作
        self._items[index] = value

    def __delitem__(self, index): # del 操作
        del self._items[index]

    def __iter__(self):          # 迭代協議
        return iter(self._items)

    def __contains__(self, item): # in 運算符
        return item in self._items

    def append(self, item):
        self._items.append(item)

# 使用示例
my_list = MyList()
my_list.append(1)
my_list.append(2)
my_list.append(3)

print(len(my_list))      # 3 - 調用 __len__
print(my_list[0])        # 1 - 調用 __getitem__
print(2 in my_list)      # True - 調用 __contains__

for item in my_list:     # 調用 __iter__
    print(item)          # 1, 2, 3
```

#### 6. **上下文管理器**

```python
class FileManager:
    def __init__(self, filename, mode='r'):
        self.filename = filename
        self.mode = mode
        self.file = None

    def __enter__(self):
        """進入 with 語句時調用"""
        self.file = open(self.filename, self.mode)
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        """離開 with 語句時調用"""
        if self.file:
            self.file.close()
        # 返回 False 表示不處理異常
        return False

# 使用示例
with FileManager('test.txt', 'w') as f:
    f.write('Hello, World!')  # 文件會自動關閉
```

#### 7. **可調用對象**

```python
class Adder:
    def __init__(self, base):
        self.base = base

    def __call__(self, x):
        """讓實例可以像函數一樣調用"""
        return self.base + x

# 使用示例
add_five = Adder(5)
print(add_five(3))  # 8 - 調用 __call__
print(callable(add_five))  # True
```

### 特殊方法的最佳實踐

```python
# 好的實踐
class GoodExample:
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return f"GoodExample({self.value})"

    def __repr__(self):
        return f"GoodExample({self.value!r})"  # !r 調用 repr()

    def __eq__(self, other):
        if not isinstance(other, GoodExample):
            return NotImplemented  # 正確的做法
        return self.value == other.value

    def __hash__(self):
        """如果實現了 __eq__，通常也要實現 __hash__"""
        return hash(self.value)

    # 實現比較協議的完整集合
    def __lt__(self, other):
        if not isinstance(other, GoodExample):
            return NotImplemented
        return self.value < other.value

    # Python 3.4+ 可以自動生成其他比較方法
    # 但為了兼容性，建議手動實現

# 自動生成比較方法的現代做法 (Python 3.4+)
from functools import total_ordering

@total_ordering
class ModernExample:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        if not isinstance(other, ModernExample):
            return NotImplemented
        return self.value == other.value

    def __lt__(self, other):
        if not isinstance(other, ModernExample):
            return NotImplemented
        return self.value < other.value

    # @total_ordering 會自動生成 __le__, __gt__, __ge__
```

### 常見的特殊方法總結

| 方法 | 調用方式 | 用途 |
|------|----------|------|
| `__init__` | `obj = Class()` | 構造函數 |
| `__new__` | `obj = Class()` | 創建實例（在 `__init__` 之前） |
| `__del__` | `del obj` | 析構函數 |
| `__str__` | `str(obj)` | 用戶友好的字符串 |
| `__repr__` | `repr(obj)` | 開發者友好的字符串 |
| `__len__` | `len(obj)` | 長度 |
| `__getitem__` | `obj[key]` | 獲取項目 |
| `__setitem__` | `obj[key] = value` | 設置項目 |
| `__delitem__` | `del obj[key]` | 刪除項目 |
| `__iter__` | `for x in obj` | 迭代 |
| `__contains__` | `x in obj` | 包含檢查 |
| `__call__` | `obj()` | 使對象可調用 |
| `__eq__` | `obj1 == obj2` | 等於比較 |
| `__lt__` | `obj1 < obj2` | 小於比較 |
| `__add__` | `obj1 + obj2` | 加法 |
| `__enter__` | `with obj` | 進入上下文 |
| `__exit__` | `with obj` | 離開上下文 |

### 與 Java 的對比

```java
// Java 的對應概念
public class JavaExample implements Comparable<JavaExample> {
    private int value;

    public JavaExample(int value) {
        this.value = value;  // 相當於 Python 的 __init__
    }

    @Override
    public String toString() {
        return "JavaExample(" + value + ")";  // 相當於 Python 的 __str__
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof JavaExample) {
            return this.value == ((JavaExample) obj).value;  // 相當於 Python 的 __eq__
        }
        return false;
    }

    @Override
    public int hashCode() {
        return Integer.hashCode(value);  // 相當於 Python 的 __hash__
    }

    @Override
    public int compareTo(JavaExample other) {
        return Integer.compare(this.value, other.value);  // 相當於 Python 的 __lt__ 等
    }
}
```

**總結**：`__xx__` 方法是 Python 面向對象編程的核心，它們讓你的類可以與 Python 的內建操作無縫集成，提供類似 Java 中 `equals()`, `toString()`, `compareTo()` 等方法的功能，但更加強大和靈活。

### 包結構示例

```
my_package/
├── __init__.py          # 包初始化文件
├── module1.py          # 第一個模組
├── module2.py          # 第二個模組
└── subpackage/         # 子包
    ├── __init__.py
    └── submodule.py
```

## 🏗️ 現代 Python 專案架構設計

在設計大型 Python 專案時，良好的架構設計至關重要。讓我們通過一個實際的框架案例來探討如何組織代碼結構。

### 架構設計原則

現代 Python 專案通常採用模組化的設計，將複雜的功能分解成可管理的組件，每個組件都有明確的責任範圍。

## 💡 程式碼組織的核心概念

### 1. 數據結構設計 (Frames/Data Structures)

在設計系統時，首先需要定義數據的流通格式。每個數據單元都應該包含必要的數據和元信息：

```python
# 數據結構的基本設計模式
# Python 類定義使用 class 關鍵字，相當於 Java 的 class
class DataFrame:
    # __init__ 是構造函數，相當於 Java 的構造函數
    def __init__(self, data, metadata=None):
        # self 相當於 Java 的 this
        self.data = data
        # Python 的 or 運算符相當於 Java 的 ?: 三元運算符
        self.metadata = metadata or {}  # 如果 metadata 是 None，就使用空字典
        self.timestamp = datetime.now()  # 調用 datetime.now() 方法

# 使用示例
frame = DataFrame("some data", {"type": "text"})  # 創建實例
print(frame.data)  # 訪問屬性
```

常見的數據類型設計：
- **結構化數據**: 使用類或命名元組 (相當於 Java 的 class 或 record)
- **流數據**: 實現異步迭代器協議 (相當於 Java 的 Stream API)
- **配置數據**: 使用配置類管理參數 (相當於 Java 的 Properties 或配置類)
- **控制數據**: 定義系統控制信號 (相當於 Java 的 enum 或常量)

### 2. 處理流程設計 (Pipeline Pattern)

處理流程是連接各個組件的核心機制，定義數據如何在系統中流動：

```python
# 處理流程的設計模式
# Python 支持異步函數 (async/await)，相當於 Java 的 CompletableFuture
class Pipeline:
    def __init__(self):
        self.stages = []  # Python 列表相當於 Java 的 ArrayList

    def add_stage(self, stage):
        self.stages.append(stage)  # 相當於 Java 的 list.add()
        return self  # 返回 self 支持鏈式調用，相當於 Java 的 builder pattern

    # async def 表示異步函數，await 用於等待異步操作
    async def process(self, data):
        # for 循環相當於 Java 的 for-each 循環
        for stage in self.stages:
            data = await stage.process(data)  # await 等待異步結果
        return data

# 使用示例
pipeline = Pipeline()
result = await pipeline.add_stage(service1).add_stage(service2).process(data)
```

### 3. 服務層設計 (Service Layer)

服務層負責具體的業務邏輯實現，每個服務負責特定的功能領域：

```python
# 服務設計模式
# Python 支持抽象方法的概念，但不像 Java 有 abstract 關鍵字
class BaseService:
    def __init__(self, config=None):
        # Python 的字典相當於 Java 的 HashMap
        self.config = config or {}  # 相當於 Java 的 this.config = config != null ? config : new HashMap<>();

    # 抽象方法：子類必須實現
    async def process(self, data):
        raise NotImplementedError("子類必須實現此方法")  # 相當於 Java 的 abstract method

# 繼承語法：class 子類(父類)
class TextProcessingService(BaseService):
    async def process(self, data):
        # 具體的文字處理邏輯
        processed_data = data.upper()  # Python 字符串方法，相當於 Java 的 data.toUpperCase()
        return processed_data
```

### 4. 處理器設計 (Processor Pattern)

處理器負責數據的轉換、過濾和增強，是系統中可插拔的組件：

```python
# 處理器設計模式
class BaseProcessor:
    async def process(self, data):
        """處理數據的主方法"""
        """Python 三引號字符串是文檔字符串，相當於 Java 的 /** */ 註釋"""
        return data

    def can_process(self, data):
        """檢查是否能處理此數據"""
        return True  # Python 的布林值是 True/False，大寫開頭

class DataFilter(BaseProcessor):
    def __init__(self, filter_criteria):
        self.filter_criteria = filter_criteria  # 相當於 Java 的 this.filter_criteria = filter_criteria;

    async def process(self, data):
        # Python 的 if 語句相當於 Java 的 if
        if self._matches_criteria(data):
            return data
        return None  # Python 的 None 相當於 Java 的 null

    def _matches_criteria(self, data):
        # 私有方法慣例使用單下劃線開頭
        return data.get("type") == self.filter_criteria.get("type")
```

## 📊 數據流設計模式

在設計系統架構時，理解數據如何在各個組件間流動是非常重要的。以下是一個典型的數據處理流程：

```
原始數據輸入
    ↓
輸入驗證與預處理
    ↓
數據轉換與標準化
    ↓
業務邏輯處理
    ↓
數據增強與優化
    ↓
輸出格式化
    ↓
最終結果輸出
```

### 流程設計最佳實踐

1. **輸入處理**: 驗證數據格式和完整性
2. **數據轉換**: 將數據轉換為系統內部格式
3. **業務處理**: 應用具體的業務邏輯
4. **數據優化**: 根據需求增強或簡化數據
5. **輸出處理**: 格式化數據以符合外部接口

## 🎯 實際專案結構示例

以下是一個完整的 Python 專案結構示例，展示了良好的代碼組織方式：

```python
# main.py - 應用程序入口
# Python 的 import 語法：from 包.模組 import 類/函數
from src.core.pipeline import DataPipeline
from src.services import TextService, ImageService  # 多個 import 可以寫在同一行
from src.processors import FilterProcessor, TransformProcessor

# Python 函數定義使用 async 表示異步函數
async def main():
    # 初始化服務 - Python 字典語法：{"key": "value"}
    text_service = TextService(config={"language": "zh-tw"})
    image_service = ImageService(config={"quality": "high"})

    # 創建處理器 - Python 支持關鍵字參數
    filter_proc = FilterProcessor(criteria={"type": "valid"})
    transform_proc = TransformProcessor(rules={"normalize": True})

    # 構建處理管道 - Python 支持多行語法，使用括號包裹
    pipeline = (
        DataPipeline()  # 創建實例
        .add_stage(text_service)  # 鏈式調用
        .add_stage(filter_proc)
        .add_stage(transform_proc)
        .add_stage(image_service)
    )

    # 處理數據 - Python 字典作為數據結構
    input_data = {"text": "sample data", "images": ["img1.jpg"]}  # 列表語法
    result = await pipeline.process(input_data)  # await 異步等待

    return result

# Python 的主程序入口點檢查
# 相當於 Java 的 public static void main(String[] args)
if __name__ == "__main__":
    import asyncio  # 動態 import
    asyncio.run(main())  # 運行異步函數
```

### Python 語法重點說明

1. **Import 語法**: `from 包 import 模組` 相當於 Java 的 `import 包.模組`
2. **字典 (Dict)**: `{"key": "value"}` 相當於 Java 的 `Map<String, Object>`
3. **列表 (List)**: `["item1", "item2"]` 相當於 Java 的 `ArrayList<String>`
4. **異步語法**: `async def` 和 `await` 相當於 Java 的 `CompletableFuture`
5. **鏈式調用**: 方法返回 `self` 支持 `.method1().method2()` 模式
6. **主程序檢查**: `if __name__ == "__main__":` 確保只有直接運行時才執行

## 💡 Python 程式碼風格關鍵原則

### __init__.py: 包管理的基礎

- **包識別**: Python 通過 `__init__.py` 識別目錄為包
- **初始化**: 可包含包級別的初始化代碼
- **匯入控制**: 通過 `__all__` 控制 `from package import *` 的行為
- **版本管理**: 常存放包的版本信息和元數據

### 數據結構設計原則

- **統一格式**: 定義標準化的數據格式便於組件間通信
- **元信息管理**: 包含處理所需的上下文和元數據
- **類型安全**: 為不同數據類型設計明確的處理邏輯
- **可擴展性**: 支持輕鬆添加新的數據類型和結構

### 服務層設計原則

- **單一責任**: 每個服務負責特定的功能領域
- **配置管理**: 通過參數和配置對象管理服務行為
- **異步處理**: 實現非阻塞的數據處理模式
- **錯誤恢復**: 設計健壯的錯誤處理和恢復機制

### 處理流程設計原則

- **鏈式調用**: 支持流暢的鏈式 API 設計
- **動態配置**: 允許運行時調整處理流程
- **狀態監控**: 提供流程狀態和性能監控能力
- **調試支持**: 便於中間結果檢查和問題排查

### 處理器設計原則

- **模組化**: 設計可插拔的處理器組件
- **組合性**: 支持處理器的組合和重用
- **條件處理**: 實現基於條件的數據處理邏輯
- **性能優化**: 考慮處理器的執行效率和資源使用

## 🔧 Python 開發最佳實踐

### 專案結構組織

良好的專案結構是維護性代碼的基礎：

```python
# 推薦的專案結構
my_python_project/
├── __init__.py              # 根包初始化
├── main.py                  # 應用程序入口
├── setup.py                 # 包安裝配置
├── requirements.txt         # 依賴管理
├── src/                     # 源代碼目錄
│   ├── __init__.py
│   ├── core/               # 核心功能
│   │   ├── __init__.py
│   │   ├── pipeline.py     # 處理流程
│   │   └── config.py       # 配置管理
│   ├── services/           # 服務層
│   │   ├── __init__.py
│   │   ├── base_service.py
│   │   └── data_service.py
│   └── utils/              # 工具函數
│       ├── __init__.py
│       └── helpers.py
├── tests/                   # 測試代碼
│   ├── __init__.py
│   ├── test_pipeline.py
│   └── test_services.py
└── docs/                    # 文檔
    └── README.md
```

### 錯誤處理模式

設計健壯的錯誤處理機制：

```python
# Python 異常處理語法相當於 Java 的 try-catch-finally
class BaseService:
    async def process(self, data):
        try:
            result = await self._process_data(data)
            return result
        except ValidationError as e:  # except 相當於 Java 的 catch
            logger.warning(f"數據驗證失敗: {e}")  # f-string 格式化相當於 Java 的 String.format
            return await self._handle_validation_error(data, e)
        except ProcessingError as e:
            logger.error(f"處理失敗: {e}")
            return await self._handle_processing_error(data, e)
        except Exception as e:  # Exception 是所有異常的基類，相當於 Java 的 Exception
            logger.critical(f"未預期的錯誤: {e}")
            return await self._handle_unexpected_error(data, e)

    # Python 支持類型提示 (type hints)，相當於 Java 的泛型
    async def _handle_validation_error(self, data, error) -> ErrorResponse:
        # 返回標準化的錯誤響應 - Python 支持多行函數調用
        return ErrorResponse(
            type="validation_error",    # 關鍵字參數
            message=str(error),         # str() 相當於 Java 的 toString()
            original_data=data
        )
```

### Python 異常處理與 Java 的對比

```python
# Python 的異常處理
try:
    risky_operation()
except ValueError as e:      # 指定異常類型
    handle_value_error(e)
except Exception as e:       # 捕獲所有異常
    handle_general_error(e)
finally:                     # 總是執行
    cleanup()

# 相當於 Java 的：
# try {
#     riskyOperation();
# } catch (ValueError e) {
#     handleValueError(e);
# } catch (Exception e) {
#     handleGeneralError(e);
# } finally {
#     cleanup();
# }
```

### 代碼風格建議

1. **命名規範**: 使用有意義的變數和函數名稱
2. **模組化**: 將相關功能組織在單一模組中
3. **文檔化**: 為公共 API 撰寫詳細的文檔字符串
4. **類型提示**: 在適當的地方使用類型提示
5. **測試覆蓋**: 為關鍵功能編寫單元測試

### Python vs Java 語法對比表

| 概念 | Python | Java | 說明 |
|------|--------|------|------|
| **變數聲明** | `name = "John"` | `String name = "John";` | Python 不需要類型聲明 |
| **函數定義** | `def func():` | `public void func() {}` | Python 使用 `def`，Java 使用返回值類型 |
| **類定義** | `class MyClass:` | `public class MyClass {}` | Python 使用冒號和縮進 |
| **條件語句** | `if x > 0:` | `if (x > 0) {}` | Python 使用冒號，Java 使用括號和大括號 |
| **循環** | `for item in list:` | `for (String item : list) {}` | Python 的 for-in 相當於 Java 的 for-each |
| **異常處理** | `try: except:` | `try { } catch { }` | Python 使用冒號，Java 使用大括號 |
| **註釋** | `# 單行註釋` | `// 單行註釋` | Python 單行註釋使用 # |
| **多行註釋** | `"""多行"""` | `/* 多行 */` | Python 使用三引號 |
| **布林值** | `True/False` | `true/false` | Python 首字母大寫 |
| **空值** | `None` | `null` | Python 使用 None |
| **字符串** | `"hello"` 或 `'hello'` | `"hello"` | Python 支持單雙引號 |
| **列表/陣列** | `[1, 2, 3]` | `int[] arr = {1, 2, 3};` | Python 使用方括號 |
| **字典/Map** | `{"key": "value"}` | `Map<String, String> map = new HashMap<>();` | Python 使用大括號 |
| **匯入** | `from pkg import cls` | `import pkg.cls;` | Python 支持選擇性匯入 |
| **繼承** | `class Child(Parent):` | `class Child extends Parent {}` | Python 使用括號，Java 使用 extends |
| **介面實現** | 不需要關鍵字 | `class Impl implements Interface {}` | Python 沒有介面關鍵字 |
| **訪問修飾符** | `_private` (慣例) | `private/public/protected` | Python 使用下劃線表示私有 |
| **靜態方法** | `@staticmethod` | `public static void method()` | Python 使用裝飾器 |
| **抽象方法** | `raise NotImplementedError` | `abstract void method();` | Python 沒有 abstract 關鍵字 |

## 總結

掌握 Python 的程式碼風格和專案架構設計是成為優秀開發者的關鍵。從基礎的 `__init__.py` 概念到複雜的系統架構設計，這些原則為開發可維護、高質量的 Python 應用提供了堅實的基礎。

通過遵循這些最佳實踐，你將能夠：
- 建立清晰且易於維護的代碼結構
- 設計靈活且可擴展的系統架構
- 開發健壯且高效的 Python 應用
- 提升團隊協作和代碼可讀性

無論是開發簡單的腳本還是複雜的企業級應用，這些程式碼風格原則都將幫助你寫出更好的 Python 代碼。
