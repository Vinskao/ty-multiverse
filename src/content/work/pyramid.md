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

#### 使用 API：repeat()

repeat(int count)是 String 類別的方法，用於建立由該字串重複特定次數形成的新字串。 此方法是 Java 11 中新增的功能。

```java
String str = "Java Exercises!";
System.out.println(str.repeat(3));
// Java Exercises!Java Exercises!Java Exercises!
```

如果不使用 repeat 需要怎麼達成相同結果?

##### StringBuilder

StringBuilder 是 Java 中用於動態建構字串的一個類別。

```java
public class T1 {
    public String repeat(int count) {
        if (count <= 0) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            sb.append("Java Exercises!");
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        T1 t1 = new T1();
        System.out.println(t1.repeat(3));
        // Java Exercises!Java Exercises!Java Exercises!
    }
}
```

##### StringBuilder 接龍

```java
StringBuilder sb = new StringBuilder();
sb.append("Hello");
sb.append(" ");
sb.append("World");
String result = sb.toString(); // "Hello World"
```

##### StringBuilder 帶有初始容量

```java
StringBuilder sb = new StringBuilder(20); // 初始容量為20
sb.append("This is a long string that may require resizing.");
// StringBuilder在內部會根據需要自動擴展其緩衝區的大小以容納更多的字元。 如果字串的長度超過了初始容量，StringBuilder會自動重新分配一個更大的緩衝區
```

如果不使用 repeat 及 StringBuilder 需要怎麼達成相同結果? 用+=。

```java
public class T1 {
    public static void main(String[] args) {
        String str = "Java Exercises!";
        System.out.println(repeat2(str, 3));
        // Java Exercises!Java Exercises!Java Exercises!
    }

    public static String repeat2(String str, int count) {
        if (count <= 0) {
            return "";
        }

        String repeated = "";
        for (int i = 0; i < count; i++) {
            repeated += str;
        }

        return repeated;
    }
}
```

#### 半塔

```
*
**
***
****
*****
```

###### 1. 使用 repeat()

```java
int totalHeight = 5;
String space = " ";
String star = "*";

for (int i = 0; i < totalHeight + 1 ; i++){
    System.out.print(star.repeat(i));
    System.out.println();
}
```

###### 2. 使用 repeat()，並用 StringBuilder 打包

```java
public class Pyramid {
    int totalHeight = 5;
    String space = " ";
    String star = "*";
    public static void main(String[] args) {
        Pyramid p = new Pyramid();
        System.out.println(p.halfPyramid1());
    }
    public String halfPyramid1(){
        StringBuilder rs = new StringBuilder();
        for (int i = 0; i < totalHeight + 1 ; i++){
            rs.append(star.repeat(i)).append("\n");
        }
        return rs.toString();
        // 如果不呼叫.toString()方法，result將保持為一個StringBuilder物件而不是一個字串物件。
    }
}
```

###### 3. 只用 StringBuilder 與迴圈

為了要換行，使用兩個 for。

```java
// 其他設定跟上面一樣
public String halfPyramid2(){
    StringBuilder rs = new StringBuilder();
    for (int i = 0; i < totalHeight + 1 ; i++){
        // 外迴圈執行6次
        for(int j = 0; j < i; j++){
            // 內迴圈執行5次，5層的*
            // 第1行（i=0），內迴圈不會執行，因為j<i為false
            // 第2行（i=1），內循環執行1次，新增1個星號
            // 第3行（i=2），內循環執行2次，新增2個星號
            // ...
            // 第6行（i=5），內循環執行5次，新增5個星號
            rs.append(star);
        }
        rs.append("\n"); // 內迴圈每次執行完出來就換行
    }
    return rs.toString();
}
```

#### 鬆金字塔

```
    *
   * *
  * * *
 * * * *
* * * * *
```

###### 1. 使用 repeat()

```java
int totalHeight = 5;
String space = " ";
String sonStar = "* ";

for (int i=0; i < totalHeight + 1 ; i++){
    // run 6 times
    System.out.print(space.repeat(totalHeight-i));
    System.out.print(sonStar.repeat(i));
    System.out.println();
}
```

###### 2. 使用 repeat()，並用 StringBuilder 打包

```java
// 其他設定跟上面一樣
public String sonPyramid1(){
    StringBuilder rs = new StringBuilder();
    for (int i =0 ; i < totalHeight + 1; i++){
        // run 6 times
        rs.append(space.repeat(totalHeight - i));
        // 第1圈i=0，重複5次空格
        // 第2圈i=1，重複4次空格
        // 第6圈i=5，重複0次空格
        rs.append(sonStar.repeat(i)).append("\n");
        // 第1圈i=0，重複0次星號
        // 第2圈i=1，重複1次星號
        // 第6圈i=5，重複5次星號
    }
    return rs.toString();
    // 塔上會有一行空白列
}
```

###### 3. 只用 StringBuilder 與迴圈

```java
// 其他設定跟上面一樣
public String sonPyramid2(){
    StringBuilder rs = new StringBuilder();
    for (int i =0 ; i < totalHeight + 1; i++){
        // run 6 times
        for(int j = 0; j < totalHeight - i; j++){
            rs.append(space);
            // 第1圈i=0，重複5次空格
            // 第2圈i=1，重複4次空格
            // 第6圈i=5，重複0次空格
        }
        for(int j = 0; j < i; j++){
            rs.append(sonStar);
            // 第1圈i=0，重複0次星號
            // 第2圈i=1，重複1次星號
            // 第6圈i=5，重複5次星號， j < i 所以j 在第六圈應該跑 6-1次 = 5次
        }
        rs.append("\n");
    }
    return rs.toString();
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
