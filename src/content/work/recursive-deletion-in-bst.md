---
title: "recursive-deletion-in-bst"
publishDate: "2025-09-13 10:00:00"
img: /tymultiverse/assets/algorithm.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: Understanding BST Recursive Deletion Algorithm
tags:
  - Algorithm
  - Data Structure
  - Binary Search Tree
  - Recursion
  - TreeNode
---

# BST 遞歸刪除演算法詳解

## 概述

二元搜尋樹 (Binary Search Tree, BST) 的刪除操作是資料結構中的經典問題，特別是處理有兩個子節點的情況時，需要使用「後繼節點替換」的巧妙策略。本文將深入剖析這個演算法的核心邏輯，解答常見的疑惑點。

---

## BST 刪除的三種情況

```
BST 節點刪除的三種情況
├─ 情況一：葉子節點 (無子節點)
│  ├─ 直接刪除該節點
│  └─ 返回 null 給父節點
├─ 情況二：只有一個子節點
│  ├─ 返回該子節點替換當前節點
│  └─ 保持樹的結構完整性
└─ 情況三：有兩個子節點
   ├─ 找到後繼節點 (右子樹最小值)
   ├─ 用後繼節點值替換當前節點值
   └─ 遞歸刪除後繼節點
```

---

## 核心邏輯解析

### 葉子節點的處理

```java
if (root.left == null) {
    return root.right;  // 對於葉子節點，這會返回 null
}
```

當要刪除的節點是葉子節點時：
- `root.left` 為 null
- `root.right` 為 null
- 返回 `root.right` (即 null)
- 父節點會收到這個 null 值，並將其指標設為 null

### 單子節點的處理

```java
if (root.left == null) {
    return root.right;  // 返回右子節點
} else if (root.right == null) {
    return root.left;   // 返回左子節點
}
```

這種情況直接返回存在的子節點，保持樹的連續性。

---

## 雙子節點的處理 (核心難點)

### 後繼節點的尋找

```java
// 後繼節點 (右子樹中最小的)
TreeNode successor = root.right;
while(successor.left != null){
    successor = successor.left;
}
```

後繼節點是右子樹中最小的節點，總是位於右子樹的最左邊。

### 值替換與遞歸刪除

```java
// 將要被刪除的節點的值，換成後繼節點的值
root.val = successor.val;

// 刪除那個已經被「借走」了值的後繼節點
root.right = deleteNode(root.right, successor.val);
```

這是演算法最巧妙的部分，包含兩個關鍵步驟：

---

## 解答常見疑惑

### 疑惑一：葉子節點的處理是否正確？

**問題**：當節點是葉子時，`if (root.left == null)` 條件成立，返回 `root.right` 會不會有問題？

**解答**：
```
葉子節點處理流程
├─ root.left == null ✓ (條件成立)
├─ root.right == null (對於葉子節點)
├─ 返回 root.right (即 null)
├─ 父節點收到 null，正確斷開連結
└─ 完美處理葉子節點情況
```

### 疑惑二：為什麼要替換值而不是指標？

**問題**：為什麼不直接改變指標，而是要複製後繼節點的值？

**解答**：
```
值替換 vs 指標替換
├─ 值替換優勢
│  ├─ 保持樹結構不變
│  ├─ 避免複雜指標操作
│  ├─ 只需要改變一個節點的內容
│  └─ 邏輯簡單清晰
├─ 指標替換缺點
│  ├─ 需要處理多個指標
│  ├─ 可能破壞樹的平衡
│  └─ 程式碼複雜度大幅增加
```

### 疑惑三：遞歸刪除的必要性？

**問題**：為什麼不能在找到後繼節點時就直接刪除，而要用遞歸？

**解答**：
```
遞歸刪除的必要性
├─ 後繼節點可能有右子節點
│  ├─ 後繼節點最多只有一個右子節點
│  └─ 這是 BST 性質決定的
├─ 統一處理邏輯
│  ├─ 所有刪除操作使用相同函式
│  └─ 避免重複程式碼
├─ 自動處理指標重連
│  ├─ 遞歸返回正確的子樹結構
│  └─ 父節點自動更新指標
```

---

## 實際執行範例

### 範例樹狀結構

```
原始樹狀結構
        50
       /  \
     30    70
    / \   /  \
  20  40 60  80
```

### 刪除節點 50 的過程

**步驟 1：找到要刪除的節點**
```
找到節點 50，有兩個子節點
├─ 左子樹：30
└─ 右子樹：70
```

**步驟 2：找到後繼節點**
```
後繼節點：右子樹的最小值 = 60
├─ 從根的右子節點 70 開始
├─ 檢查 70.left 是否為 null？否
├─ 往左走到 60
├─ 檢查 60.left 是否為 null？是
└─ 找到後繼節點：60
```

**步驟 3：值替換**
```
值替換過程
├─ root.val = successor.val
├─ 50 節點的值變為 60
├─ 現在根節點值是 60
├─ 樹中原本的 60 (後繼節點) 仍然存在
└─ 即將被刪除以消除重複
```

**步驟 4：遞歸刪除後繼節點**
```
刪除後繼節點 60
├─ 呼叫 deleteNode(root.right, 60)
├─ 在右子樹中尋找 60 (位於 70 的左子樹)
├─ 找到 60，發現它是葉子節點 (無子節點)
├─ 刪除 60，返回 null 給其父節點 70
└─ 70.left 更新為 null
```

**最終結果**
```
刪除完成後的樹
        60          ← 原來的 50 變為 60
       /  \
     30    70       ← 70 保持不變
    / \     \
  20  40     80     ← 60 被刪除，70 只有右子節點 80
```

---

## 程式碼實現

```java
public TreeNode deleteNode(TreeNode root, int key) {
    if (root == null) {
        return null;
    }

    if (key < root.val) {
        root.left = deleteNode(root.left, key);
    } else if (key > root.val) {
        root.right = deleteNode(root.right, key);
    } else {
        // 找到要刪除的節點
        if (root.left == null) {
            return root.right;
        } else if (root.right == null) {
            return root.left;
        }

        // 有兩個子節點的情況
        TreeNode successor = root.right;
        while (successor.left != null) {
            successor = successor.left;
        }

        // 值替換
        root.val = successor.val;

        // 遞歸刪除後繼節點
        root.right = deleteNode(root.right, successor.val);
    }

    return root;
}
```

---

## 時間複雜度分析

```
BST 刪除操作時間複雜度
├─ 平均情況：O(log n)
│  ├─ 尋找目標節點：O(log n)
│  ├─ 尋找後繼節點：O(log n)
│  └─ 刪除後繼節點：O(log n)
├─ 最壞情況：O(n)
│  └─ 當樹退化為鏈表時
└─ 空間複雜度：O(log n)
   └─ 遞歸呼叫棧的深度
```

---

## 關鍵洞察

1. **葉子節點的巧妙處理**：`if (root.left == null)` 同時處理了「無左子節點」和「葉子節點」兩種情況

2. **後繼節點的特性**：右子樹的最小值最多只有一個右子節點，這使得刪除操作變得簡單

3. **值替換策略**：透過替換值而非指標，保持樹結構穩定，同時避免複雜的指標操作

4. **遞歸的威力**：將複雜的雙子節點刪除問題，分解為簡單的單子節點刪除問題

5. **統一的處理邏輯**：所有刪除情況都使用相同的遞歸函式，程式碼簡潔優雅

這個演算法展示了遞歸思維和資料結構設計的精妙之處，值得深入學習和理解。
