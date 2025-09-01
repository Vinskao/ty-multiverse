---
title: "Embedding vs Full-text Search"
publishDate: "2025-08-27 02:00:00"
img: /tymultiverse/assets/algorithm.jpg
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: 比較Embedding向量搜索與傳統全文檢索的差異，理解AI搜索系統的兩種武器
tags:
  - Embedding
  - Full Text Search
  - Vector Search
  - AI Search
---

# Embedding vs Full-text Search：AI 搜索的兩種武器

## 前言

想像你在網上購物，想找一件「舒服的藍色襯衫」：

**傳統搜索：** 你打「藍色襯衫」，系統找包含這些字的商品
**AI 搜索：** 你打「舒服的藍色襯衫」，系統理解你的需求，推薦各種「感覺相似」的衣服

這就是 **Embedding（嵌入）** vs **Full-text Search（全文檢索）** 的差異！

本文將用最淺顯的方式，帶你理解這兩種搜索技術的差異與應用！

## 🔍 兩種搜索技術的核心差異

### **Full-text Search：精確匹配**
**比喻：** 像在圖書館用「書名」或「關鍵字」找書

**特點：**
- 找包含特定字詞的內容
- 精確匹配，沒有模糊空間
- 適合：精確查詢、過濾條件

**例子：**
```
查詢："machine learning"
結果：只返回包含 "machine" 和 "learning" 的文檔
```

### **Embedding Search：語義理解**
**比喻：** 像用「內容的感覺」找書

**特點：**
- 理解查詢的「意涵」，不是字面意思
- 可以找到「意義相似」的內容
- 適合：智能推薦、自然語言查詢

**例子：**
```
查詢："機器學習"
結果：可能返回包含 "AI"、"深度學習"、"神經網路" 的文檔
```

## 🏗️ 兩種技術的加速引擎

### **Full-text Search 的加速器：GIN Index**

#### **什麼是 GIN Index？**
**比喻：** 像一本超級詳細的「關鍵字索引表」

**核心原理：**
```sql
-- 傳統全文檢索（慢）
SELECT * FROM articles WHERE content ILIKE '%machine learning%';

-- 使用 GIN 索引（快）
CREATE INDEX idx_content_gin ON articles USING GIN (to_tsvector('english', content));
```

#### **GIN 的工作流程**
1. **文檔處理：** 將文檔分解成單詞
2. **建立倒排索引：**
   ```
   "machine" → [文檔1, 文檔5, 文檔23]
   "learning" → [文檔3, 文檔5, 文檔12]
   ```
3. **查詢匹配：** 找同時包含關鍵字的文檔交集

### **Embedding Search 的加速器：IVFFlat Index**

#### **什麼是 IVFFlat Index？**
**比喻：** 智能的分區管理系統

**核心原理：**
1. **聚類分組：** 將相似的向量分成不同群組
2. **快速定位：** 先找最相關的群組
3. **精確搜索：** 在群組內進行詳細比較

#### **IVFFlat 的詳細工作流程**
1. **建立聚類：** 用 K-means 將向量分成 1000 個群組
2. **記錄中心點：** 每個群組有一個代表向量
3. **搜索時：** 先找距離最近的幾個群組，再在群組內精確搜索

#### **實際比較**
```python
# Full-text Search 查詢
query = "machine learning"
results = database.search_text(query)

# Embedding Search 查詢
query_vector = embed_text("機器學習的概念")  # 轉換成向量
results = database.search_vector(query_vector)
```

## ⚖️ 技術對比：選擇哪種搜索更適合？

### **📊 核心差異比較**

| 特性 | Full-text Search | Embedding Search |
|-----|------------------|------------------|
| **查詢類型** | 精確關鍵字 | 自然語言 |
| **匹配方式** | 字詞匹配 | 語義相似度 |
| **查詢例子** | "machine learning" | "AI 學習的基礎概念" |
| **返回結果** | 包含關鍵字的文檔 | 意義相關的文檔 |
| **處理語言** | 依賴語言規則 | 理解語境和意涵 |
| **擴展性** | 處理大量文檔 | 需要大量計算資源 |

### **🎯 什麼情況用哪種？**

#### **用 Full-text Search 當：**
- ✅ 需要精確匹配特定術語
- ✅ 查詢是結構化的關鍵字
- ✅ 關注特定的命名實體
- ✅ 需要布林邏輯查詢（AND/OR/NOT）

#### **用 Embedding Search 當：**
- ✅ 查詢是自然語言
- ✅ 需要理解語義和意涵
- ✅ 想要智能推薦和發現
- ✅ 處理多語言或模糊查詢

## 🔄 雙雄合體：現代搜索系統的最佳實踐

### **🎯 為什麼需要結合？**

現代應用通常需要同時處理：
- **精確查詢：** 「找包含 'Python' 的文檔」
- **智能理解：** 「找類似 '機器學習入門' 的內容」

### **🏗️ 結合架構**

```sql
-- 建立同時支持兩種搜索的資料表
CREATE TABLE articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    embedding vector(768),  -- 向量表示
    
    -- 全文檢索欄位
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED
);

-- 建立雙索引
CREATE INDEX idx_vector ON articles USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_text ON articles USING GIN (search_vector);
```

### **🔍 混合搜索流程**

```python
def smart_search(query_text, k=10):
    """
    先用全文檢索縮小範圍，再用向量搜索排序
    """
    # 步驟1：全文檢索獲得候選集
    text_matches = search_by_text(query_text, limit=100)
    
    # 步驟2：在候選集中進行向量相似度計算
    query_vector = embed_text(query_text)
    
    results = []
    for doc in text_matches:
        # 結合文本匹配分數和向量相似度
        text_score = calculate_text_relevance(doc, query_text)
        vector_score = cosine_similarity(query_vector, doc.embedding)
        combined_score = 0.6 * vector_score + 0.4 * text_score
        
        results.append((doc, combined_score))
    
    # 返回最相關的結果
    return sorted(results, key=lambda x: x[1], reverse=True)[:k]
```

### **1️⃣ AI 聊天機器人**
- **Full-text：** 處理用戶的精確問題
- **Embedding：** 理解問題的語義意圖
- **結合效果：** 提供又準確又智能的回答

### **2️⃣ 電商商品搜索**
- **Full-text：** 匹配商品名稱和描述
- **Embedding：** 根據用戶偏好推薦相似商品
- **結合效果：** 提升搜索精準度和用戶體驗

### **3️⃣ 內容管理系統**
- **Full-text：** 快速過濾特定類型內容
- **Embedding：** 發現內容間的隱藏關聯
- **結合效果：** 建立智能的內容發現機制

## 🛠️ 實戰部署指南

### **PostgreSQL 混合搜索設置**

```sql
-- 1. 安裝擴展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. 建立混合搜索表
CREATE TABLE content (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    embedding vector(768),
    text_search tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED
);

-- 3. 建立雙索引
CREATE INDEX idx_embedding ON content USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_text ON content USING GIN (text_search);
```

### **Python 實現示例**

```python
import psycopg2
from sentence_transformers import SentenceTransformer

class HybridSearch:
    def __init__(self):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.conn = psycopg2.connect("your_database_url")
    
    def search(self, query, limit=10):
        # 生成查詢向量
        query_vector = self.encoder.encode(query)
        
        with self.conn.cursor() as cur:
            # 混合搜索查詢
            cur.execute("""
                SELECT id, title,
                       1 - (embedding <=> %s::vector) as vector_score,
                       ts_rank(text_search, to_tsquery('english', %s)) as text_score
                FROM content
                WHERE text_search @@ to_tsquery('english', %s)
                ORDER BY (0.7 * vector_score + 0.3 * text_score) DESC
                LIMIT %s
            """, (query_vector.tolist(), query, query, limit))
            
            return cur.fetchall()
```






## 🎯 總結：選擇適合你的搜索技術

**Embedding vs Full-text Search** 就像是選擇不同的思考方式：

### **📖 Full-text Search**
- **像傳統圖書館員**：精確、可靠、快速
- **適合**：需要精確結果的應用
- **優勢**：簡單、穩定、高效

### **🤖 Embedding Search**
- **像AI助手**：智能、理解、創新
- **適合**：需要智能推薦的應用
- **優勢**：理解語義、發現關聯

### **🎪 最佳實踐**
現代應用通常結合兩者：
- 用 Full-text 做初步過濾
- 用 Embedding 做智能排序
- 獲得又快又準的搜索體驗

現在你知道如何選擇合適的搜索技術了！🚀
