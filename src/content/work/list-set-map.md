---
title: List & Set & Map & Array
publishDate: 2024-03-04 16:00:00
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
List<String> list = new ArrayList<>();
list.add("apple");
list.add("banana");
list.add("apple"); // 可重複
System.out.println(list.get(2)); // apple
System.out.println(list.get(3)); // out of bound error
System.out.println(list); // [apple, banana, apple]
list.remove("banana");
System.out.println(list); // [apple, apple]
list.clear();
System.out.println(list); // []
```

##### 用迴圈取出 List 元素

使用 for-each 迴圈。 它的語法是 for (element_type element : collection)，其中 element_type 是集合中元素的類型，element 是在每次迭代中表示當前元素的變量，collection 是要遍歷的集合或數組。

也就是說 for-each 是專門為了遍歷每個 Collection 元素而設立的，可以直接對 Collection 元素讀取，一般 for 是做不到的。

```java
List<String> list_Strings = new ArrayList<>();
list_Strings.add("Red");
list_Strings.add("Green");
list_Strings.add("Orange");

for(String element : list_Strings){
    System.out.println(element);
}
```

##### 用迴圈計算一串數字的加總

###### ForEach

```java
List<Integer> numbers = new ArrayList<>();
numbers.add(5);
numbers.add(10);
numbers.add(15);

int sum = 0;
for (int num : numbers) {
    sum += num;
}
```

###### Stream

```java
Integer[] n = {5, 10 ,15 ,20 ,25 };
int sum2 = Arrays.stream(n).reduce(0, Integer::sum);
```

#### java.util.Set

1. 無序
2. 不可重複元素
3. 可變元素，可用 add(), remove(), clear()

Set 是一種集合，它不像 List 那樣有 index，因此沒有直接的方法來找到 Set 中的第 n 個元素。

```java
Set<String> set = new HashSet<>();
set.add("apple");
set.add("banana");
set.add("apple"); // 重複元素，但只會覆蓋上個apple，還是只有一個apple。
System.out.println(set.size()); // 2
set.remove("apple");
System.out.println(set.size()); // 1
```

##### 用迴圈計算一串數字的加總

要加總數字，要先放入數字到 set，使用 addAll 方法可以一次放入多個數字，支援所有繼承 Collection 的子類別，包括 ArrayList、HashSet、LinkedList 等等。

###### findAll

```java
set2.addAll(new ArrayList<>(Arrays.asList(2,3,5,6))); // [2, 3, 5, 6]
```

asList 將傳遞給它的陣列轉換為實作了 List 介面的列表，這個列表不支援新增或刪除元素，但可以使用列表的方法來修改陣列中的元素。現在 set 已經放好元素，可以做加總了。

###### 加總

```java
int sum = 0;
for(int n : set2){
    sum += n;
}
System.out.println(sum); // 16
```

現在試試 while 迴圈的寫法，要搭配 Iterator。

Iterator 遍歷集合（如 List、Collection、Array 等）中的元素，並對它們進行操作，以下用 hasNext(): 如果 Iterator 還有更多的元素可以迭代，則傳回 true；否則傳回 false。next()取得 Iterator 中的下一个元素，并将 Iterator 的位置向后移动一个位置，第一次调用 next() 方法时，它会返回集合中的第一个元素。

```java
Iterator<Integer> iterator = set2.iterator();
while(iterator.hasNext()){
  Integer n = iterator.next(); // 將[2, 3, 5, 6]一一取出
  sum += n; // 一一放入sum，結果是16
}

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

##### 用迴圈計算一串數字的加總

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

##### 用迴圈計算一串數字的加總
