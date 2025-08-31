---
title: "java-static-final-keywords"
publishDate: "2024-02-24 12:00:00"
img: /tymultiverse/assets/java.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/24
tags:
  - static
  - final
  - Java
---

#### 權限修飾

```java
public class Dog{}
```

```java
class Dog{}
```

如果這兩類別在同個 package 中，是可以互相訪問的。

如果一個在 org.service package、一個在 org.controller package，就只有 public 類別可以透過 import 被訪問。

#### final

如果成員、區域變數宣告 final，就要馬上設值且不能再變動。

```java
final int x = 1;
```

如果類別宣告 final，就不能被繼承也不能繼承類別，也不可以實作介面。

```java
public final class Xxx extends Zzz{}; // 錯，不能繼承類別
```

```java
public class Ooo extends Xxx{}; // 錯，不能被繼承
```

```java
public final class Xxx implements Yyy{};// 錯，不能實作介面
```

final 類別可以被實作嗎？只有介面才能被實作。

#### static

被宣告成 static 的成員變量只會屬於類別，不會讓實例擁有。
被宣告成 static 的成員變量用類別名稱來呼叫，因為在類別載入 static 成員即佔據記憶體。
.class 檔案在 JVM 載入後，預設即執行 static 區塊。

```java
public class MyClass {
    public static void myFunction(){};
}
```

```java
public class YourClass {
    public void yourFunction(){
        MyClass.myFunction();
    };
}
```

#### 靜態方法只能訪問靜態成員變量

```java
private final SalaryService salaryService = new SalaryService(); // 錯，無法在main被訪問

private static final SalaryService salaryService = new SalaryService();

public static void main(String[] args) {
    salaryService.setSalary();
}
```

## 設計原則與進階應用注意事項

- **靜態成員：** 使用時請注意避免過度依賴，造成類之間高耦合及難以測試。
- **Final 修飾：** 用於不可變物件或常數設定，確保資料一致性，防止意外修改。
- **實戰建議：** 善用 static 與 final 搭配各種設計模式（例如單例），提高程式穩定性與安全性。
