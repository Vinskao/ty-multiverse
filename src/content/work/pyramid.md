---
title: Pyramid
publishDate: 2024-02-26 19:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - Pyramid
  - Java
---

#### 半塔

```
*
**
***
****
*****
```

```java
int totalHeight = 5;
String space = " ";
String star = "*";

for (int i = 0; i < totalHeight + 1 ; i++){
    System.out.print(star.repeat(i));
    System.out.println();
}
```

#### 鬆金字塔

```
    *
   * *
  * * *
 * * * *
```

```java
int totalHeight = 5;
String space = " ";
String starSpace = "* ";

for (int i=0; i < totalHeight; i++){
    System.out.print(space.repeat(totalHeight-i));
    System.out.print(starSpace.repeat(i));
    System.out.println();
}
```

#### 金字塔

```
     *
    ***
   *****
  *******
 *********
```

```java
int totalHeight = 5;
String space = " ";
String star = "*";

for (int i = 0; i < totalHeight; i++){
    System.out.print(space.repeat(totalHeight - i));
    if (i > 0) {
        System.out.println(star.repeat(i)+star.repeat(i)+star);
    } else {
        System.out.println(star);
    }
}
```

#### 斜晶塔

```
    *
   * *
  * * *
 * * * *
* * * * *
 * * * *
  * * *
   * *
    *
```

```java
int totalHeight = 5;
String star = "*";
String starSpace = "* ";

for (int i=0; i < totalHeight; i++){
    System.out.print(space.repeat(totalHeight-i));
    System.out.print(starSpace.repeat(i));
    System.out.println();
}

for (int i = totalHeight ; i > 0; i--){
    System.out.print(space.repeat(totalHeight-i));
    System.out.print(starSpace.repeat(i));
    System.out.println();
}
```

#### 正晶塔

```
     *
    ***
   *****
  *******
 *********
  *******
   *****
    ***
     *
```

使用 String.repeat(n) 方法，其中 n 是 0 或負數，則會返回一個空字串。

```java
int totalHeight = 5;
String space = " ";
String star = "*";

for (int i = 0; i < totalHeight; i++){
    System.out.print(space.repeat(totalHeight - i));
    if (i > 0) {
        System.out.println(star.repeat(i)+star.repeat(i)+star);
    } else {
        System.out.println(star);
    }
}
for (int i = totalHeight ; i > 1; i--){
    System.out.print(space.repeat(totalHeight - i + 2));
    System.out.println(star.repeat(i - 1) + star.repeat(i - 2));
}
```
