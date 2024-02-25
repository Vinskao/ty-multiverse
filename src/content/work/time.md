---
title: Time
publishDate: 2024-02-25 11:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/25
tags:
  - LocalDateTime
  - ZonedDateTime
  - Duration
  - Java
---

##### java.time.LocalDateTime

LocalDateTime 是 LocalDate 和 LocateTime 的結合，一個處理年月日，一個處理時分秒。

```java
LocalDate date = LocalDate.of(2024, 2, 25);
LocalTime time = LocalTime.of(12, 30, 45);
LocalDateTime dateTime = LocalDateTime.of(date, time);
// 2024-02-25T12:30:45

LocalDateTime customDateTime = LocalDateTime.of(2024, 2, 25, 12, 30, 45);
// 2024-02-25T12:30:45

LocalDateTime parsedDateTime = LocalDateTime.parse("2024-02-25T12:30:45");
// 2024-02-25T12:30:45
```

##### java.time.ZonedDateTime

LocalDateTime 是使用系統默認時區，如果使用者與 server 在不同時區，而需要在 server 端指定為使用者的時區，可以這樣設計：

```java
LocalDateTime localDateTime = LocalDateTime.parse("2024-02-25T12:30:45");
ZonedDateTime customTaipeiTime = ZonedDateTime.of(localDateTime, ZoneId.of("Asia/Taipei"));
```

ZonedDateTime 的 parse()方法無法直接解析 LocalDateTime 類型的字串，因為 LocalDateTime 不包含時區資訊。

先解析為 LocalDateTime，然後再轉換為帶有時區資訊的 ZonedDateTime。

##### java.time.Duration 計算兩個時間的差

可以使用 Duration.between() 方法來計算兩個 LocalDateTime 之間的時間差，或兩個 ZonedDateTime 之間的時間差，不能將它們混合使用。

Duration 另外有 toHours 等方法可以用 long 的資料型態取出時間中小時等數字。

```java
Duration dur = Duration.between(ZonedDateTime.parse("2024-02-25T12:00:00+08:00[Asia/Taipei]"),
                                ZonedDateTime.parse("2024-02-25T13:30:00+08:00[Asia/Taipei]") );
// PT1H30M  1 小時 30 分鐘的時間差
long hours = dur.toHours(); // 取得持續時間的小時部分。
long minutes = dur.toMinutes(); // 取得持續時間的分鐘部分。
long millis = dur.toMillis(); // 取得持續時間的毫秒部分。
long nanos = dur.toNanos(); // 取得持續時間的奈秒部分。
System.out.println("Hours: " + hours);
System.out.println("Minutes: " + minutes);
System.out.println("Milliseconds: " + millis);
System.out.println("Nanoseconds: " + nanos);
// Hours: 1
// Minutes: 90
// Milliseconds: 5400000
// Nanoseconds: 5400000000000
```
