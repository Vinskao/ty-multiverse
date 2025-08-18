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

## 🔒 V2模式限制功能

### 新增功能：V2模式下禁用多个功能

**需求**：在V2模式下不能使用以下功能：
- 选择在线专员
- 切换语言
- 页面分析

**实现方案**：
1. **配置化管理**：使用JSON配置文件管理V1/V2模式下的功能启用状态
2. **视觉反馈**：V2模式下相关按钮显示为禁用状态（灰色、透明度降低）
3. **交互限制**：点击禁用按钮时显示提示弹窗，说明限制原因
4. **快速切换**：提供"切换到v1"按钮，方便用户快速切换模式
5. **统一处理**：使用通用的 `showV2RestrictionMessage()` 方法处理所有限制提示

**技术实现**：
```typescript
// 配置化管理
private updateHeaderControlsByConfig(mode: 'v1' | 'v2') {
  const config = qabotConfig.header_controls[mode];
  // 根据配置更新各个控制项的状态
}

// 检查V2模式并阻止操作
if ((window as any).qabotMode === 'v2') {
  const config = qabotConfig.header_controls.v2[featureName];
  if (config && !config.enabled && config.restriction_message) {
    this.showV2RestrictionMessage(config.restriction_message);
  }
  return;
}
```

**配置文件结构**：
```json
{
  "header_controls": {
    "v1": {
      "language": { "enabled": true, "title": "切換語言" },
      "page_analysis": { "enabled": true, "title": "分析頁面" }
    },
    "v2": {
      "language": { 
        "enabled": false, 
        "title": "V2模式下無法切換語言",
        "restriction_message": "語言切換"
      }
    }
  }
}
```

**CSS样式**：
```css
/* 统一的禁用状态样式 */
.header-avatar.v2-disabled,
.language-button.v2-disabled,
.page-analysis-button.v2-disabled {
  cursor: not-allowed !important;
  opacity: 0.6 !important;
  filter: grayscale(50%);
}
```

**用户体验**：
- 清晰的视觉提示表明功能被禁用
- 友好的提示信息说明限制原因
- 便捷的切换选项帮助用户快速回到v1模式
- 统一的操作体验，所有禁用功能使用相同的提示方式

**配置化优势**：
- **易于维护**：功能启用状态集中管理，修改配置即可调整
- **扩展性强**：新增功能只需在配置文件中添加条目
- **代码简洁**：减少硬编码，提高代码可读性
- **统一管理**：所有header controls的状态在一个配置文件中管理
