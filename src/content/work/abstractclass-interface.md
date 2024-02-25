---
title: Abstract Class VS Interface
publishDate: 2024-02-24 10:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/24
tags:
  - Interface
  - Abstract Class
  - Java
---

##### 抽象類別

一個可以同時存在抽象或實體方法的類別，其他類別繼承時也可以選擇要覆寫一個或多個抽象或實體方法。

##### 介面

其他類別可以透過實作一個介面的所有方法來覆寫其方法。假設介面有一個散步方法，那其他類別都可以透做實作獲取散步，並進行擴增。如果實作介面的屬性，會自動變成靜態 final 的狀態，一個不能改值的屬性。

---

##### 透過抽象類別實現多型

抽象類別是子類別透過繼承父類別取得其所有或一部份公開方法及屬性並覆寫成自己適合的方法，比如貓、狗（子類別）從動物（父類別）繼承抽象吼叫方法，分別覆寫成 out.print("喵")及 out.print("汪")，另外在貓、狗類別分別透過動物類別實例化後以 setter 改寫動物類別的屬性-血量。

```java
// 父類別中：
abstract class Animal {
  public abstract void makeSound(); // 抽象方法
      public void eat() { // 實體方法
          System.out.println("動物正在吃食物");
      }
}
```

```java
// 子類別中：
Animal animal = new Animal(); // 錯，抽象類別無法實例化

Animal dog = new Dog();
dog.eat(); // "動物正在吃食物"
```

```java
// 被實作介面
interface Animal {
  void walk();
}
```

```java
// 實作介面的類別
class Dog implements Animal {
  @Override
  public void walk(){
    System.out.println("狗散步");
  }
}
```

```java
public class Main {
  public static void main(String[] args) {
    Animal animal = new Animal(); // 錯，介面無法實例化

    Dog dog = new Dog();
    dog.walk(); // "狗散步"
  }
}
```

---

##### 繼承抽象類別

目的為在抽象類別的架構下，繼續建構程式的內容。

##### 繼承實體類別

目的為透過父子類別的 is-a 關係實現代碼重用或擴增。

```java
Roles roles = new Magician();
// Magician is a role.
```
