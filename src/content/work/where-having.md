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

##### WHERE

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

##### HAVING

HAVING 用於 SQL 聚合函數（如 SUM、COUNT、AVG 等）之後，對結果集進行篩選，篩選由 GROUP BY 子句分組的結果集。有 HAVING 需求 一定要先使用 GROUP BY。

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
