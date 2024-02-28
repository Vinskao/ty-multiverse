---
title: List & Set & Map & Array
publishDate: 2024-02-26 10:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - List
  - Set
  - Map
  - Array
  - Java
---

List、Set、Map 是三個可以管理一串元素的介面，繼承這三者的實體類別，都有長度不固定的特性，反之，Array 則是長度固定的，也就是 new 的時候就要賦予長度值。

以下介紹其特性：

#### java.util.List

1. 有序：列表中的元素按照它們被添加的順序排列
2. 可重複元素：列表允許儲存相同的元素。
3. 可變元素：可以透過新增、刪除、清空和修改操作來修改清單中的元素。可用 add(), remove(), clear(), set()。

```java
List<String> myList = new ArrayList<>();
myList.add("apple");
myList.add("banana");
myList.add("apple"); // 可重複
System.out.println(myList.get(2)); // apple
System.out.println(myList.get(3)); // out of bound error
System.out.println(myList); // [apple, banana, apple]
myList.remove("banana");
System.out.println(myList); // [apple, apple]
myList.clear();
System.out.println(myList); // []
```

#### java.util.Set

1. 無序
2. 不可重複元素
3. 可變元素，可用 add(), remove(), clear()

Set 是一種集合，它不像 List 那樣有 index，因此沒有直接的方法來找到 Set 中的第 n 個元素。

```java
Set<String> mySet = new HashSet<>();
mySet.add("apple");
mySet.add("banana");
mySet.add("apple"); // 重複元素，但只會儲存一次
// 以下為塞入List去找第 n 個元素
List<String> list = new ArrayList<>(set);
if (list.size() >= 2) {
    String secondElement = list.get(1);
    System.out.println("Second element: " + secondElement);
} else {
    System.out.println("Set does not contain enough elements");
}
// 在HashSet中元素的順序是不保證的，所以第二個元素不一定是 "banana"。
// 以上為塞入List去找第 n 個元素
System.out.println(mySet); // [banana, apple]
mySet.remove("banana");
System.out.println(mySet); // [apple]
mySet.clear();
System.out.println(mySet); // []
```

#### java.util.Map

1. 無序
2. Key 不可重複
3. Value 可重複

Map 中第一個是 key，第二個是 value，用{}儲存以方便放不同型別。

```java
Map<String, Integer> myMap = new HashMap<>();
myMap.put("apple", 3);
myMap.put("banana", 2);
myMap.put("apple", 5); // 覆蓋原有的值
System.out.println(myMap); // {banana=2, apple=5}
myMap.remove("banana");
System.out.println(myMap); // {apple=5}
myMap.clear();
System.out.println(myMap); // {}
```

##### 遍歷 HashMap 的鍵值對

這邊提供三種可以用迴圈讀取 HashMap 鍵值對的方式。
先準備一個 Hashmap 給等下三個迴圈跑，看是不是相同結果。

```java
public static void main(String[] args) {
    HashMap<Integer, String> map = new HashMap<Integer, String>();
    map.put(1,"Sorane");
    map.put(2,"Sayuri");
    map.put(3,"Chiaki");
}
```

- keySet()

  keySet() 是 HashMap 類別的一個方法，它傳回一個 Set 對象，該物件包含了 HashMap 中的所有鍵。當你只需要處理 HashMap 中的鍵時，可以使用 keySet()。 這種情況下，你只對鍵感興趣，不需要關心對應的值是什麼。

  ```java
  for(Integer key: map.keySet()){
      String value = map.get(key);
      System.out.println(value);
  }
  // 結果：
  // Sorane
  // Sayuri
  // Chiaki
  ```

- entrySet()

  當你需要同時存取鍵和對應的值時，可以使用 entrySet()。 在這種情況下，你可以直接從 Map.Entry 物件中取得鍵和值，而不需要先取得鍵再透過鍵取得值。

  ```java
  for(Map.Entry<Integer, String> entry: map.entrySet()){
      Integer key = entry.getKey();
      String value = entry.getValue();
      System.out.printf("k.%d; y.%s", key, value);
      System.out.println();
  }
  // 結果：
  // k.1; y.Sorane
  // k.2; y.Sayuri
  // k.3; y.Chiaki
  ```

- forEach()

  JAVA 8 以後的技術，用到 Lamda 表達式->。

  ```java
  map.forEach((key,value) -> {
      System.out.println(value);
  })
  // 結果：
  // Sorane
  // Sayuri
  // Chiaki
  ```

#### java.util.Array

實例化時就決定長度，初始值是 0。

```java
int[] myArray = new int[5];
myArray[0] = 10;
myArray[1] = 20;
myArray[2] = 30;
System.out.println(myArray[2]); // 30
System.out.println(myArray[3]); // 0
```
