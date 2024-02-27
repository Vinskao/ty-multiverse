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

#### 相等性

比較物件相等性用 equals()，而非==，==是比較參用相等性，也就是記憶體中儲存位置的相等性。但是沒有重新定義 equals 則其與==相同，因為沒有重新定義 equals()方法，它會繼承自 Object 類，而 Object 類別中的 equals()方法實際上與==運算子的行為相同。

若要比較實質相等性，必須重新定義 equals()。

#### String 特殊情況

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

#### 重寫 equals 方法

原始 ArrayList 的 equals 方法：

```java
public boolean equals(Object o) {
    if (o == this)
        return true;
    if (!(o instanceof List))
        return false;

    ListIterator<E> e1 = listIterator();
    ListIterator<?> e2 = ((List<?>) o).listIterator();
    while (e1.hasNext() && e2.hasNext()) {
        E o1 = e1.next();
        Object o2 = e2.next();
        if (!(o1==null ? o2==null : o1.equals(o2)))
            return false;
    }
    return !(e1.hasNext() || e2.hasNext());
}
```

改寫 ArrayList 的 equals 方法：

```java
@Override
public boolean equals(Object o) {
    if (o == this)
        return true;
    if (!(o instanceof List))
        return false;

    // 改寫的方法
    ArrayList<?> that = (ArrayList<?>) o; // o強轉成ArrayList，先不管儲存的元素型態
    // 檢查一：兩者長度是否相同
    if (this.size() != that.size()) return false;
    // 檢查一：儲存位置是否相同
    for (int i = 0; i < this.size(); i++) {
        if (!this.get(i).equals(that.get(i))) {
            return false;
        }
    }
    return true;
}
```

java.util.Objects 的 equals 方法：

```java
public static boolean equals(Object a, Object b) {
    return (a == b) || (a != null && a.equals(b));
}
```

equals 原始定義：

```java
public boolean equals(Object obj) {
    return (this == obj); // 比較位置是否相同
}
```
