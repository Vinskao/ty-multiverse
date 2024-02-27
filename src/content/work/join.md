---
title: Join
publishDate: 2024-02-26 16:00:00
img: /assets/SQL.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/02/26
tags:
  - INNER JOIN
  - OUTER JOIN
  - LEFT JOIN
  - SQL
---

#### INNER JOIN

INNER JOIN 返回兩個表中匹配行的交集。即，它只返回兩個表中都存在的行。如果在其中一個表中沒有相應的匹配行，那麼這些行不會包含在結果中。

INNER JOIN 不會在結果中產生 NULL 值，它只返回兩個表中都有匹配的行。

```sql
SELECT * FROM table1 INNER JOIN table2 ON table1.column = table2.column;
```

#### OUTER JOIN

OUTER JOIN 分為左外連接（LEFT OUTER JOIN）和右外連接（RIGHT OUTER JOIN）。

LEFT OUTER JOIN 就是 LEFT JOIN。

它返回兩個表中所有的行，以及它們之間的匹配行。如果在其中一個表中沒有相應的匹配行，則對應的行將以 NULL 值填充。

在 LEFT OUTER JOIN 中，左表（table1）中的所有行都將包含在結果中，而右表（table2）中只有與左表中匹配的行才會包含在結果中。如果在右表中找不到匹配的行，則右表中的列將以 NULL 值填充。

```sql
SELECT * FROM table1 LEFT OUTER JOIN table2 ON table1.column = table2.column;
SELECT * FROM table1 RIGHT OUTER JOIN table2 ON table1.column = table2.column;
```

FULL (OUTER) JOIN（全外連接）是 SQL 中的一種連接方式，它會傳回左表和右表中的所有行，並以 NULL 值填入未匹配的行。 FULL JOIN 傳回的結果集包含了 LEFT JOIN 和 RIGHT JOIN 的結果集聯集。

```sql
SELECT *
FROM table1
FULL JOIN table2 ON table1.column = table2.column;
```
