---
title: Lambda & "::" & Stream
publishDate: 2024-03-04 17:00:00
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

假設有以下功能可以被調用。

```java
public class SomeClass {
    public static void someMethod(String s) {
        System.out.println(s);
    }
}
```

分別用 Lambda、::調用以上方法：

- 用 Lambda 調用 someMethod()。

  ```java
  Consumer<String> consumer = (String s) -> SomeClass.someMethod(s);
  ```

- 用 :: 調用 someMethod()。

  ```java
  Consumer<String> consumer = SomeClass::someMethod;
  ```

#### Stream 流

使用 Stream 來處理集合、數組或其他元素的序列。可分為資料來源、中間操作、終端操作(操作共 2 類)來討論流的功能實現。中間操作與終端操作的差異是:

- 中間操作：只有轉換或處理流中的元素，在終端操作被調用時才會執行。
- 終端操作：決定數據最終型態，一旦終端操作被調用，流就會被消耗並且不能再被使用。

##### 資料來源

資料來源是可以使用流的項目，有以下三種：

- 集合： 可以使用集合類（如 List、Set、Map 等）的 stream() 方法來創建流。例如：List.stream()。
- 數組： 可以使用 Arrays.stream() 方法來將數組轉換為流。例如：Arrays.stream(array)。
- 文件： 可以使用 Files.lines() 方法來讀取文件的每一行並將其轉換為流。例如：Files.lines(Paths.get("file.txt"))。

##### 中間操作

篩選： 使用 filter() 方法來根據條件過濾流中的元素。

映射： 使用 map() 方法將流中的每個元素映射到另一個值。

排序： 使用 sorted() 方法對流中的元素進行排序。

去重： 使用 distinct() 方法去除流中的重複元素。

限制： 使用 limit() 方法來限制流中元素的數量。

跳過： 使用 skip() 方法來跳過流中的前幾個元素。

##### 終端操作

收集： 使用 collect() 方法將流中的元素收集到一個集合中。

迭代： 使用 forEach() 方法對流中的每個元素進行遍歷並執行指定的操作。

匹配： 使用 anyMatch()、allMatch() 或 noneMatch() 方法來檢查流中的元素是否符合指定的條件。

計數： 使用 count() 方法來計算流中的元素數量。

查找： 使用 findAny() 或 findFirst() 方法來查找流中的任意一個元素或第一個元素。

彙總： 使用 reduce 將流中的元素進行累加、組合或者進行其他的彙總操作。它接受一個組合函數（binary operator）作為參數，並使用這個函數來將流中的元素進行累加或者組合。

##### Arrays.stream 加總整數陣列

```java
Integer[] n = {5, 10 ,15 ,20 ,25 };
int sum2 = Arrays.stream(n).reduce(0, Integer::sum);
```
