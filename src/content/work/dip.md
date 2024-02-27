---
title: Dependency Injection
publishDate: 2024-02-24 12:00:00
img: /assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/24
tags:
  - DIP
  - OCP
  - Design Patterns
  - Java
---

#### 開放封閉原則

程式開發遵循開放擴增，封閉修改的設計模式。讓後進的程式與先到的程式耦合度降低，使得進行依賴反轉成為可能。

#### 依賴反轉

如果有一隻程式叫打掃，一隻程式叫掃地工（低層程式）。這兩隻程式一起運作才能成為清潔 API（高層程式）。有一天掃地工不幹了，清潔 API 就無法運作了，因為清潔 API 依賴掃地工，高層程式依賴低層程式。

```java
package org.controller;
public class CleanController {
  private CleanerService cleanerService;
  public CleanController(CleanerService cleanerService){
    this.cleanerService = cleanerService;
  }
  public void cleaningApi(){
    cleanerService.cleaner();
    cleanerService.clean();
    // "Cleaner is...""Cleaning..."
  }
}
```

```java
package org.service;
public class CleanService{
  public void clean(){
    System.out.print("Cleaning...");
  }
}
```

```java
package org.service;
public class CleanerService{
  public void cleaner(){
    System.out.print("Cleaner is...");
  }
}
```

如果清潔 API 依賴的是一個自動配發可用清潔工的清潔公司，那就不會有依賴清潔工的問題了，就不會有高層程式依賴低層程式的問題。service 有問題就換掉，controller 還是原封不動。

```java
package org.service;
public interface CleanerService {
  void cleaner();
  void clean();
}
```

```java
package org.service;
public class StandardCleanerService implements CleanerService {
  @Override
  public void cleaner(){
    System.out.print("Standard Cleaner is...")
  }
}
```

```java
package org.service;
public class AdvancedCleanerService implements CleanerService {
  @Override
  public void cleaner(){
    System.out.print("Advanced Cleaner is...")
  }
}
```

```java
package org.controller;
public class CleanController {
  private CleanerService cleanerService;
  public CleanController(CleanerService cleanerService){
    this.cleanerService = cleanerService;
  }
  public void cleaningApi(){
    cleanerService.cleaner();
    cleanerService.clean();
    // "Advance Cleaner is...""Cleaning..."
    // "Standard Cleaner is...""Cleaning..."
  }
}
```

clean()也是依此類推。我們一次只需要一種清潔工 service，Advance Cleaner 或 Standard Cleaner，一個不能用使用另一個即可。不需要改高層程式 controller。
