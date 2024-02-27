---
title: Java Persistence API
publishDate: 2024-02-26 16:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - JPA
  - Java
---

#### JPA (Java Persistence API)

JPA 是 Java 平台上的一個 ORM（Object-Relational Mapping）標準。透過 JAVA 與資料庫交互的一個工具，主要可以在 JAVA 中寫下資料庫查詢的方法，而不需要去資料庫下 CRUD 指令。

在 JAVA 中定義查詢方法時，也是透過 CRUD 區分功能，但也可以有複合式的功能。

這是一個用 username 查找 User 類別中的元素的 JPA 方法。

```java
List<User> findByUsername(String username);
// 分別定義了return型態、方法、輸入參數
```

只要寫 findByUsername，JPA 就會叫聚回傳定義的 List<User>去 User 類別找 username 這個屬性。findBy 關鍵字是 jpa 查詢的固定寫法。

除了 findBy，Between、And、Like、GreaterThan、OrderBy、Desc 都是 JPA 固定用法。

- findBy: 用於指定查詢的開始，後面跟著屬性名稱，表示根據該屬性進行查詢。
- Between: 用於指定範圍查詢，後面跟著兩個屬性值，表示查詢在兩個值之間的結果。
- And: 用於指定多個屬性的 AND 條件，後面跟著另一個屬性名稱，表示查詢兩個屬性滿足 AND 條件的結果。
- Like: 用於指定模糊查詢，後面跟著屬性值的部分匹配模式。
- GreaterThan: 用於指定大於某個值的查詢條件。
- OrderBy: 用於指定查詢結果的排序，後面跟著要排序的屬性名稱。

```java
// 根據年齡範圍查詢用戶
List<User> findByAgeBetween(int minAge, int maxAge);

// 根據用戶名稱和郵箱查詢用戶
List<User> findByUsernameAndEmail(String username, String email);

// 根據用戶名稱模糊查詢用戶
List<User> findByUsernameLike(String username);

// 查詢年齡大於指定年齡的用戶，並按照年齡降序排序
List<User> findByAgeGreaterThanOrderByAgeDesc(int age);
```

#### JPA 方法默認支援的回傳方式

##### Optional

Optional<Bean>：Java 8 引入的 Optional 類型可以用來表示一個可能為 null 的值，可以使用 Optional<Bean> 類型作為傳回類型，以表示方法可能傳回實體對象，也可能傳回 null。

```java
Optional<Bean> findById(Long id);
```

##### Set

希望集合中不包含重複的元素，使用 Set 是一個不錯的選擇，Set 不像 List 和 Map 可能會包含重複的元素。但是資料庫中的如果建立不同的主鍵(id)，通常每筆資料都是不重複的。所以 List 或 Set 結果一樣。

```java
Set<Bean> findAllBeans();
```

##### Map

每個 Bean 物件都有一個唯一的 id，但同時這個 id 也被用作 Map 中的鍵。 這樣做的目的是為了能夠以 id 為索引快速地存取對應的 Bean 物件。

```java
Map<Long, Bean> findAllBeansWithIdMapping();
```

##### Stream

Java 8 及以後的版本中，可以使用 Stream 作為回傳類型，傳回一個包含所有實體物件的流（Stream），可以對流進行各種操作，例如過濾、映射、排序等。

```java
Stream<Bean> findAllBeansAsStream();
```

- 過濾（Filtering）：
  假設我們只想保留名字以 "A" 開頭的 Bean：

  ```java
  Stream<Bean> beansStartingWithA = findAllBeansAsStream()
      .filter(bean -> bean.getName().startsWith("A"));
  ```

  beansStartingWithA 就是一個包含所有名字以 "A" 開頭的 Bean 的 Stream。

- 映射（Mapping）：
  假設我們想要取得所有 Bean 的名字：

  ```java
  Stream<String> beanNames = findAllBeansAsStream()
      .map(Bean::getName);
  ```

  如果不使用::，要這樣寫：

  ```java
  Stream<String> beanNames = findAllBeansAsStream()
    .map(new Function<Bean, String>() {
        @Override
        public String apply(Bean bean) {
            return bean.getName();
        }
    });
  ```

  beanNames 就是一個包含所有 Bean 名字的 Stream。

- 排序（Sorting）：
  假設我們想要按照名字的字母順序對 Bean 進行排序：

  ```java
  Stream<Bean> sortedBeans = findAllBeansAsStream()
      .sorted(Comparator.comparing(Bean::getName));
  ```

  sortedBeans 就是一個依照名字字母順序排序的 Stream。
