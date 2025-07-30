# 頁面內容結構化架構

## 概述

為了讓 AI 頁面分析功能更加準確和可靠，我們建立了一個統一的頁面內容結構化架構。這個架構通過標準化的 HTML 標記來幫助 AI 識別和提取頁面的主要內容。

## 架構組件

### 1. BaseLayout 更新

所有頁面現在都使用更新後的 `BaseLayout.astro`，它包含：

- **結構化內容容器**：`<main class="page-content" data-page-type="content">`
- **全局提取函數**：`window.extractPageContent()`
- **智能內容選擇器**：按優先級提取最佳內容

### 2. PageContent 組件

新增的 `PageContent.astro` 組件提供標準化的內容標記：

```astro
---
import PageContent from '../components/PageContent.astro';
---

<PageContent type="main">
  <h2>主要內容</h2>
  <p>這裡的內容會被 AI 優先分析</p>
</PageContent>
```

## 內容類型

支持以下內容類型（按 AI 分析優先級排序）：

| 類型 | 描述 | 使用場景 |
|------|------|----------|
| `content` | 主要內容區域 | 頁面核心內容 |
| `main` | 主要內容 | 文章主體、產品介紹 |
| `article` | 文章內容 | 部落格文章、技術文檔 |
| `sidebar` | 側邊欄內容 | 導航、相關連結 |
| `footer` | 頁腳內容 | 版權信息、聯絡方式 |

## 使用方法

### 基本使用

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageContent from '../components/PageContent.astro';
---

<BaseLayout title="頁面標題">
  <!-- 主要內容 -->
  <PageContent type="main">
    <h1>頁面標題</h1>
    <p>這是頁面的主要內容...</p>
  </PageContent>
  
  <!-- 側邊欄 -->
  <PageContent type="sidebar">
    <h3>相關連結</h3>
    <ul>
      <li><a href="#">連結1</a></li>
      <li><a href="#">連結2</a></li>
    </ul>
  </PageContent>
</BaseLayout>
```

### 複雜頁面結構

```astro
<BaseLayout title="複雜頁面">
  <div class="page-layout">
    <!-- 主要內容區域 -->
    <PageContent type="main" className="main-content">
      <h1>主要標題</h1>
      <p>主要內容段落...</p>
      
      <!-- 文章內容 -->
      <PageContent type="article" className="article-section">
        <h2>文章標題</h2>
        <p>文章內容...</p>
      </PageContent>
    </PageContent>
    
    <!-- 側邊欄 -->
    <PageContent type="sidebar" className="sidebar">
      <h3>導航</h3>
      <nav>
        <ul>
          <li><a href="#">選項1</a></li>
          <li><a href="#">選項2</a></li>
        </ul>
      </nav>
    </PageContent>
  </div>
</BaseLayout>
```

## AI 分析優化

### 內容提取優先級

AI 會按以下順序提取內容：

1. `[data-page-type="content"]` - 最高優先級
2. `[data-page-type="main"]` - 主要內容
3. `[data-page-type="article"]` - 文章內容
4. `<main>` 標籤內容
5. `<article>` 標籤內容
6. 其他內容選擇器

### 自動過濾

系統會自動過濾以下內容：

- 導航元素 (`nav`, `header`)
- 頁腳內容 (`footer`)
- 側邊欄 (`aside`, `.sidebar`)
- 廣告內容 (`.advertisement`, `.ads`)
- 社交分享按鈕 (`.social-share`)
- 評論區域 (`.comments`)
- 聊天機器人本身 (`.qa-bot-container`)

### 智能內容檢測

- **長度檢查**：確保提取的內容至少有 100 字
- **備用策略**：如果主要內容太少，會嘗試從 `body` 提取更多
- **語言檢測**：自動檢測頁面語言（中文/英文）
- **長度限制**：自動截斷超過 3000 字的內容

## 測試和驗證

### 測試頁面

訪問 `/example-content` 查看完整的使用示例。

### 調試信息

在瀏覽器 Console 中會顯示詳細的內容提取過程：

```
開始提取頁面內容...
使用全局提取函數，內容長度: 1234
內容預覽: [頁面內容預覽]...
最終文字長度: 1234
```

### 驗證方法

1. 打開瀏覽器開發者工具
2. 點擊頁面分析按鈕
3. 查看 Console 中的提取日誌
4. 確認提取的內容長度和預覽

## 最佳實踐

### 1. 內容標記

- 使用適當的 `type` 屬性標記內容
- 確保主要內容在 `main` 或 `content` 類型中
- 將導航和廣告放在 `sidebar` 類型中

### 2. 結構化

- 使用語義化的 HTML 標籤 (`h1`, `h2`, `p`, `ul` 等)
- 保持內容層次結構清晰
- 避免在主要內容中混入導航元素

### 3. 性能優化

- 避免過深的 DOM 嵌套
- 合理使用 CSS 類名
- 確保內容在頁面加載時即可用

## 故障排除

### 常見問題

1. **內容提取不完整**
   - 檢查是否使用了正確的 `data-page-type` 屬性
   - 確認主要內容在 `main` 或 `content` 容器中

2. **AI 分析結果不準確**
   - 檢查頁面結構是否符合最佳實踐
   - 查看 Console 中的提取日誌

3. **內容長度不足**
   - 確保頁面有足夠的文字內容
   - 檢查是否有內容被 CSS 隱藏

### 調試步驟

1. 打開瀏覽器開發者工具
2. 執行 `window.extractPageContent()` 查看提取結果
3. 檢查 Console 中的錯誤信息
4. 驗證頁面 HTML 結構

## 未來改進

- [ ] 支持更多內容類型
- [ ] 添加內容質量評分
- [ ] 實現內容摘要預覽
- [ ] 支持多語言內容檢測
- [ ] 添加內容更新通知 