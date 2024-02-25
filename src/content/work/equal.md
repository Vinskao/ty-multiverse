---
title: Equals
publishDate: 2024-02-24 22:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/24
tags:
  - equals()
  - ==
  - Java
---

##### 相等性

比較物件相等性用 equals()，而非==，==是比較參用相等性，也就是記憶體中儲存位置的相等性。但是沒有重新定義 equals 則其與==相同，因為沒有重新定義 equals()方法，它會繼承自 Object 類，而 Object 類別中的 equals()方法實際上與==運算子的行為相同。

若要比較實質相等性，必須重新定義 equals()。

##### String 特殊情況

使用 String 類別不用自己改寫 equals()，String 類別中有這個方法覆寫 Object 類別的 equals()：

```java
public boolean equals(Object anObject){
  // 將目前字串與指定物件進行比較。在argument非null且是一個與傳入物件擁有相同的chars序列的字串，即回傳true。
}
```

```java
String s1 = new String("hello");
String s2 = new String("hello");
System.out.println(s1 == s2);         // false (比較參用位置)
System.out.println(s1.equals(s2));    // true (比較值)
```

為什麼比較參用會不同？

使用 new 建立物件時，會在 Heap 記憶體中為每個物件分配一個新的記憶體空間。 即使兩個物件的內容相同，它們也會被分配到不同的記憶體位置。 這就是為什麼 s1 和 s2 的記憶體位置不同。
