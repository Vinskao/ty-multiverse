---
title: Lambda & "::"
publishDate: 2024-02-26 23:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - Lambda
  - ->
  - "::"
  - Java
---

#### Lambda 表達式

Lambda 表達式是 Java 8 中引入的一個重要特性，它可以用來建立匿名函數（或稱為閉包），從而實現函數式程式設計的一些特性。 Lambda 表達式主要用於簡化函數式介面（Functional Interface）的實作。

```java

```

#### ::

Java 8 中，雙冒號 :: 是一種新的語法，用於建立方法參考（Method Reference）。 它可以簡化 Lambda 表達式。

```java
public class SomeClass {
    public static void someMethod(String s) {
        System.out.println(s);
    }
}
```

調用以上方法：

- 用 Lambda 調用 someMethod()。

  ```java
  Consumer<String> consumer = (String s) -> SomeClass.someMethod(s);
  ```

- 用 :: 調用 someMethod()。

  ```java
  Consumer<String> consumer = SomeClass::someMethod;
  ```
