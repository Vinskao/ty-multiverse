# QABotV2 修复总结

## 🔧 修复内容

### 1. 引用链接显示问题修复

**问题**：引用链接显示 `---` 而不是实际的文件名

**解决方案**：
- 修改 `buildCitationsHTML()` 方法
- 直接使用 `file_path` 移除 `.md` 扩展名作为显示名称
- 确保显示的是实际的文件名（如 `list-set-map`）

**代码变更**：
```typescript
// 移除 .md 副檔名作為顯示名稱
displayName = citation.file_path.replace(/\.md$/, '');

// 在链接中显示实际文件名
<a href="${escapeHtml(url)}" target="_blank" class="citation-link">
  ${escapeHtml(displayName)}
</a>
```

### 2. V2等待UI共用化

**问题**：V2没有使用V1的等待UI，用户体验不一致

**解决方案**：
- 在 `QAPlatform.astro` 中创建共用的等待UI组件
- V2使用相同的等待UI，保持一致性

**新增组件**：
```html
<!-- 共用的等待UI组件 -->
<div class="loading-message" id="loadingMessage" style="display: none;">
  <div class="message bot-message">
    <div class="message-avatar">
      <img src="..." alt="真夜" class="bot-avatar" />
    </div>
    <div class="message-content-wrapper">
      <div class="message-header">
        <span class="ai-name">真夜</span>
      </div>
      <div class="message-content">
        <div class="loading">
          <div class="spinner"></div>
          <span>正在思考中...</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

**V2集成**：
```typescript
private showLoadingMessage() {
  const loadingEl = document.getElementById('loadingMessage') as HTMLElement;
  if (loadingEl) {
    const clone = loadingEl.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.id = 'v2LoadingMessage';
    this.messagesEl.appendChild(clone);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
```

## ✅ 修复效果

1. **引用链接显示**：现在正确显示文件名（如 `list-set-map`）而不是 `---`
2. **等待UI一致性**：V1和V2使用相同的等待UI，用户体验统一
3. **代码复用**：等待UI组件化，便于维护和扩展

## 🎯 技术优势

- **统一体验**：V1和V2用户界面保持一致
- **代码复用**：共用组件减少重复代码
- **易于维护**：UI组件集中管理，便于后续修改
