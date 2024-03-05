---
title: Exception
publishDate: 2024-03-05 18:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/03/05
tags:
  - Inheritance
  - Java
---

#### NullPointerException

只要使用含 null 的元素操作就會產生此 exception。

```java
public static void main(String[] args) {
    String str = null;
    System.out.println(str.length());
}
```
