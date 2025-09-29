---
title: "git"
publishDate: "2025-09-24 10:00:00"
img: /tymultiverse/assets/git.png
img_alt: Git version control system with branching and merging visualization
description: 深入探討 Git reset --hard 與 --soft 的差異，以及團隊協作中為何 prefer revert 而非 reset 的實戰策略。
tags:
  - Git
  - Version Control
  - Team Collaboration
  - Development Tools
---

# Git Reset 指令深度解析

## 1. git reset --hard vs git reset --soft

### 指令比較表

| 指令 | HEAD 移動 | Index（暫存區） | Working Directory（工作區） | 常見用途 |
|------|-----------|----------------|-----------------------------|----------|
| `reset --soft <commit>` | 移動到指定 commit | 保留 index 狀態 | 保留工作區 | 退回到某個 commit，但保留修改，可以重新 commit |
| `reset --hard <commit>` | 移動到指定 commit | 清空 index | 覆蓋工作區 | 直接回到指定版本，所有未提交修改都會被丟掉（危險操作） |

👉 **簡單記憶：**

- **soft**：只動 HEAD（歷史回到某點，但改動還在，可以重 commit）。
- **hard**：動 HEAD + Index + Working dir（全砍掉，乾淨回到某點）。

## 2. 為什麼團隊協作 prefer git revert 而不是 git reset

### 🎯 revert 的特點

`revert` 會產生一個新的 commit，把目標 commit 的改動反做。

不會改寫 commit 歷史，所以**公共 branch（如 main/master/develop）**不會混亂。

### ⚠ reset 的風險

`reset`（尤其 `--hard`）會改變歷史。

如果已經 push 到 remote，再 reset，會導致 remote 與 local 歷史不一致。

團隊成員在 pull/fetch 時，會遇到 merge 衝突 或 forced push 覆蓋別人工作。

### ✨ 結論

- **個人分支**：可用 reset（因為沒人跟你共享，方便修改 commit 歷史）。
- **共享分支**：應用 revert（保證每個人看到相同歷史，避免協作混亂）。

