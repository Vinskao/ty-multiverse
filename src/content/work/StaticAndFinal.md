---
title: Static & Final
publishDate: 2024-02-24 12:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/24
tags:
  - static
  - final
  - Java
---

##### 權限修飾
```java
public class Dog{}
```
```java
class Dog{}
```
如果這兩類別在同個package中，是可以互相訪問的。

如果一個在org.service package、一個在org.controller package就只有public類別可以透過import被訪問。

##### final
如果成員、區域變數宣告final，就要馬上設值且不能再變動。
```java
final int x = 1;
```
如果類別宣告final，就不能被繼承也不能繼承類別，也不可以實作介面。
```java
public final class Xxx extends Zzz{}; // 錯，不能繼承類別
```
```java
public class Ooo extends Xxx{}; // 錯，不能被繼承
```
```java
public final class Xxx implements Yyy{};// 錯，不能實作介面
```
final類別可以被實作嗎？只有介面才能被實作。
##### static
被宣告成static的成員變量只會屬於類別，不會讓實例擁有。
被宣告成static的成員變量用類別名稱來呼叫，因為在類別載入static成員即佔據記憶體。
.class檔案在JVM載入後，預設即執行static區塊。
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
