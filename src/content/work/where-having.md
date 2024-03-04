---
title: Where & Having
publishDate: 2024-02-26 15:00:00
img: /assets/SQL.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - HAVING
  - WHERE
  - GROUP BY
  - SQL
---

#### WHERE

WHERE 用於篩選行（records），僅適用於資料庫中的原始資料，可用於篩選欄位中的值，比如查詢哪些行的特定欄位值等於、小於、大於等於某個特定值。

```sql
SELECT * FROM employees WHERE salary > 50000;

SELECT * FROM employees WHERE age > 30 AND department = 'IT';

SELECT * FROM employees WHERE department IN ('IT', 'HR', 'Finance');

SELECT * FROM employees WHERE salary BETWEEN 40000 AND 60000;

SELECT * FROM employees WHERE last_name LIKE 'Sorane%';

SELECT * FROM employees WHERE middle_name IS NULL;

-- 將 first_name 欄位的值轉換為大寫，然後與 'JOHN' 進行比較。
SELECT * FROM employees WHERE UPPER(first_name) = 'JOHN';
```

##### LIKE

模糊查詢，可以查 LIKE 後面接的字所在的結果集。

'1995%' 將匹配以 '1995' 開頭的任何字串、日期、整數等等。

```sql
SELECT birth
FROM customer
WHERE birth LIKE '1995%';
```

日期也可以這樣查。

```sql
SELECT birth
FROM customer
WHERE YEAR(birth) = 1995;
```

#### HAVING

HAVING 用於 SQL 聚合函數（如 SUM、COUNT、AVG 等）之後，對結果集進行篩選，篩選由 GROUP BY 子句分組的結果集。有 HAVING 需求 一定要先使用 GROUP BY。

##### GROUP BY

###### GROUP BY 放 1 個欄位

顯示每一種不同的 price，只會有 price 欄位。

```sql
SELECT price FROM order_to_meal GROUP BY price;
-- 下兩個都錯
SELECT * FROM order_to_meal GROUP BY price
SELECT id FROM order_to_meal GROUP BY price
-- Column 'order_to_meal.id' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.
```

錯誤訊息說 SELECT 的對象一定要包在聚合函數或 GROUP BY 中。

###### GROUP BY 放 2 個欄位

可以在 GROUP BY 放兩個欄位，這樣還會是顯示每一種不同的 price？

由於 meal_id 比 price 的欄位還多，所以變成顯示每一種不同的 meal_id 及其對應的 price。這個現象跟 ORDER BY meal_id DESC 沒有關係，那句只是幫我確認有沒有重複值而已。

```sql
SELECT price, meal_id FROM order_to_meal GROUP BY price, meal_id ORDER BY meal_id DESC;
```

###### GROUP BY 放 3 個欄位

現在我再放一個 order_id（欄位最多的）到 GROUP BY 中，誰會有重複值，誰會不重複？ 注意，price、meal_id、order_id 在這張表都不是唯一的。

這時候就要明確來區分一下，

- 只有一個 GROUP BY 欄位則該欄位唯一性保持：
  如果只有一個欄位參與 GROUP BY 子句，那麼結果集中將只包含每種不同的值，而每種值只會出現一次。 這是因為 GROUP BY 子句將根據該列的值對結果進行分組，確保每種不同的值只會出現一次。
- 多個欄位參與 GROUP BY 子句時：
  組合唯一性： 如果多個欄位參與 GROUP BY 子句，那麼結果集中將包含每種不同的組合，且每種組合只會出現一次。 這意味著每種不同的組合值都將成為結果集中的一行。

```sql
SELECT price, meal_id, order_id FROM order_to_meal GROUP BY price, meal_id, order_id ORDER BY order_id DESC;
```

因此三個 GROUP BY 欄位個別欄位都有重複值，但是組合起來，每個組合都是唯一的。

##### 聚合函數 + GROUP BY

SELECT 兩個欄位，GROUP BY 一個欄位，那個 SELECT 的其中一個欄位一定是聚合函數。

```sql
SELECT order_id, count(*), sum(price)
FROM order_to_meal
GROUP BY order_id
```

也可以幫查詢欄位加上別名。

```sql
SELECT order_id, count(*) AS meal_count, sum(price) AS total_price
FROM order_to_meal
GROUP BY order_id
```

##### 聚合函數 + GROUP BY + HAVING

```sql
-- 查詢包含了兩個欄位：department 和 AVG(salary)
-- 所有部門及平均工資
SELECT department, AVG(salary) FROM employees GROUP BY department;

-- 查詢包含了兩個欄位：department 和 AVG(salary)
-- 篩選出平均工資大於 50000 的部門
SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 50000;

-- 多個條件的篩選
SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) > 50000 AND COUNT(*) > 10;

-- 聚合函數條件的篩選
SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING COUNT(*) * AVG(salary) > 500000;

SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING avg_salary > 50000;

SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) IS NOT NULL;
```
