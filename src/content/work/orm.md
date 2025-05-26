---
title: "ORM"
publishDate: 2025-05-24 10:00:00
img: /tymultiverse/assets/stock-2.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: Understanding ORM
tags:
  - JPA ORM
  - Django ORM
---

## ORM 概述

ORM（物件關聯對應）是一種程式設計技術，用來把物件導向程式中的類別（Class）與資料庫中的資料表（Table）建立對應關係，讓開發者不用手寫 SQL 語句，就能進行新增、查詢、更新、刪除（CRUD）操作。

---

## ORM 框架比較

| 功能                | JPA/Hibernate      | Django ORM        | MyBatis           |
| ----------------- | ------------------ | ----------------- | ----------------- |
| 自動生成 SQL          | ✅ 是               | ✅ 是              | ❌ 否              |
| Entity 與 Table 對應 | ✅ 是（@Entity）      | ✅ 是（Model）       | 部分（需配置）         |
| 自動管理資料狀態          | ✅ 是               | ✅ 是              | ❌ 否              |
| 延遲載入 / 快取         | ✅ 是（session）      | ✅ 是（QuerySet）    | ❌ 否（要自己控制）      |
| 使用 DDL 自動建表       | ✅ 是（schema auto）  | ✅ 是（migrations） | ❌ 否              |
| 查詢語言              | JPQL              | Django ORM API    | XML/SQL           |
| 交易管理              | ✅ 是（@Transactional）| ✅ 是（atomic）      | 部分（需配置）         |

---

## JPA/Hibernate 實作原理

JPA（Java Persistence API）本身只是「介面」，而 Hibernate 是最常見的實作。以下是 Hibernate 的核心實作機制：

### 1. 類別與資料表映射（Class-Table Mapping）
- 利用註解如 `@Entity`, `@Table`, `@Column` 來描述類別與資料表對應關係
- Hibernate 啟動時會讀取這些 metadata（註解或 XML），建立映射模型（mapping model）

### 2. 屬性與欄位映射（Field-Column Mapping）
- Hibernate 對每個屬性建立 getter/setter 映射
- 決定如何將欄位值轉成物件屬性

### 3. Session / EntityManager
- Hibernate 使用 Session（JPA 用 EntityManager）管理所有 Entity 的生命週期
- 包括：新增、查詢、更新、刪除（CRUD）操作

### 4. 自動生成 SQL
呼叫 `em.find(User.class, 1L)` 時，會自動產生對應的 SQL：
```sql
SELECT * FROM users WHERE id = 1;
```
你寫的是 Java 物件邏輯，Hibernate 負責底層轉成 SQL 與資料庫溝通。

### 5. 快取與狀態追蹤（Persistence Context）
- ORM 實作會追蹤物件狀態（如 Transient、Persistent、Detached）
- 避免重複查詢或更新
- 若你修改一個物件的欄位，只要呼叫 `transaction.commit()`，ORM 會產生 UPDATE 語句自動保存變更

---

## Django ORM 實作原理

Django ORM 是 Django 框架的資料庫抽象層，提供了一個直覺且強大的資料庫操作介面。以下是 Django ORM 的核心實作機制：

### 1. Model 定義
- 使用 Python 類別繼承 `models.Model` 來定義資料表
- 使用 `models.CharField`, `models.IntegerField` 等欄位類型定義資料結構
- 自動生成資料表名稱（app名稱_model名稱）

### 2. 查詢集（QuerySet）
- 提供鏈式查詢介面（如 `filter()`, `exclude()`, `order_by()`）
- 延遲執行（Lazy Evaluation）機制
- 支援複雜的查詢條件和關聯查詢

### 3. 資料庫遷移（Migrations）
- 自動追蹤模型變更
  - 偵測 Model 類別的變更（新增、修改、刪除欄位）
  - 偵測欄位屬性的變更（型別、長度、預設值等）
  - 偵測索引和約束的變更
- 生成遷移檔案
  - 使用 `python manage.py makemigrations` 生成遷移檔案
  - 遷移檔案包含前向（forward）和反向（backward）操作
  - 支援手動編輯遷移檔案以處理特殊情況
- 提供資料庫結構版本控制
  - 使用 `python manage.py migrate` 執行遷移
  - 自動追蹤已執行的遷移記錄（django_migrations 表）
  - 支援回滾（rollback）操作
  - 支援多環境部署（開發、測試、生產）
- 遷移檔案範例：
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('app_name', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(primary_key=True)),
                ('name', models.CharField(max_length=100)),
                ('email', models.EmailField(unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
```

### 4. 自動生成 SQL
呼叫 `User.objects.get(id=1)` 時，會自動產生對應的 SQL：
```sql
SELECT * FROM auth_user WHERE id = 1;
```
你寫的是 Python 物件邏輯，Django ORM 負責底層轉成 SQL 與資料庫溝通。

### 5. 交易管理
- 使用 `@transaction.atomic` 裝飾器或 context manager
- 支援巢狀交易
- 自動處理交易隔離級別