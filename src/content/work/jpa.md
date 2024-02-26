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

##### JPA (Java Persistence API)

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
