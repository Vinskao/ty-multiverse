---
title: Inheritance & Polymorphism
publishDate: 2024-02-25 18:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/25
tags:
  - Inheritance
  - Polymorphism
  - Java
---

##### 繼承 Inheritance

繼承父類別，在子類別使用其方法及屬性。

##### 多型 Polymorphism

子類別覆寫父類別方法，改寫成適合子類別的方法，但方法名字維持相同，以對該方法抽象化。

---

##### 直接實例化子類別以調用方法

先有繼承，才能使用多形。

創建一個實體類別 Animal。他有一個可以發出聲音的方法 makeSound。

```java
public class Animal {
    public void makeSound() {
      System.out.println("Animal sound");
    };
}
```

用三個類別繼承他，兩個覆寫方法 makeSound，一個只繼承類別。

```java
public class Cat extends Animal {
    @Override
    public void makeSound() {
      System.out.println("Meow!");
    }
}
public class Dog extends Animal {
    @Override
    public void makeSound() {
      System.out.println("Woof!");
    }
}
public class Human extends Animal {
    // 沒覆寫方法
}
```

實例化這三個子類別並呼叫 makeSound()。

```java
public static void case1() {
    Cat cat = new Cat();
    Dog dog = new Dog();
    Human human = new Human();

    cat.makeSound();    // Meow!

    dog.makeSound();    // Woof!

    human.makeSound();  // Animal sound
}
```

Cat 與 Dog 使用了自己覆寫的 makeSound()，而 Human 使用了父類別的 makeSound()。如果子類別沒有覆寫父類別的方法，則子類別將繼承父類別的方法。

##### 多型：實例化子類別，以父類別做參用變量調用方法

```java
public static void case2() {
    Cat cat = new Cat();
    Dog dog = new Dog();
    Human human = new Human();

    Animal animal; // 以父類別做參用變量

    animal = cat;
    animal.makeSound(); // Meow!

    animal = dog;
    animal.makeSound(); // Woof!

    animal = human;
    animal.makeSound(); // Animal sound
}
```

當需要新增加其他子類別時，無需修改現有的程式碼，只需要新增新的子類別並確保它們符合父類別的方法。 符合開閉原則 OCP。
