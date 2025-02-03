---
title: "Ansible: An Overview"
publishDate: 2025-01-08 13:00:00
img: /tymultiverse/assets/ansible.png
img_alt: A bright pink sheet of paper used to wrap flowers curves in front of rich blue background
description: |
  2024/01/08
tags:
  - Ansible
---

# Ansible Overview

## Introduction

Ansible 是一款強大的自動化工具，採用無代理（Agentless）的架構，適用於各種伺服器及雲端環境的配置和管理。

## Key Components

### Ansible Agentless

- **無需安裝代理**：直接透過 SSH（或 WinRM）進行管理。

### Ansible Automation Controller (AAC)

- **基於角色的存取控制**：管理自動化任務並細分權限。  
- **一鍵佈署**：簡化應用程式和配置的部署流程。

### Ansible Automation Hub

- **中央儲存庫**：專為 Ansible Automation Platform 設計，用以集中存放模組與插件。

### Event-Driven Ansible

事件驅動型 Ansible 包含三個主要部分：
1. **Sources**：事件來源。  
2. **Rules**：定義何時觸發動作的規則。  
3. **Actions**：根據規則執行的任務。

## 附加概念

### 建立 Host

支援多種方式：
- **SSH**：適用於 Linux 系統。  
- **WinRM**：適用於 Windows 系統。  
- **IP 清單**：透過一組 IP 地址統一管理。

*注意：密碼等敏感資訊應透過 Ansible Vault 或其他方法妥善保管。*

### Template 管理

利用模板技術管理：
- 機密資訊（例如密碼）
- 憑證檔案
- 外部參數傳遞

### Job Launch vs Template Launch

- **Job Launch**：直接啟動任務，但無法動態更新變數。  
- **Template Launch**：可反映最新動態變數的狀態及更新。

### Playbooks, Tasks & Modules

- **Playbook**：定義一組任務的配置文件。  
- **Task**：單一操作，通常對應到一個 Ansible 模組。  
- **Module**：完成具體任務的基本單位。

## Conclusion

Ansible 因其無代理架構和簡潔的語法，成為自動化和配置管理的重要工具，能夠有效提升 IT 運維效率.

## 進階應用與最佳實踐

- **Ansible Galaxy：** 探索社群分享的角色及模組，快速建立自動化解決方案。
- **錯誤排除：** 遇到連線或 YAML 格式問題時，檢查 SSH 配置與模組版本，並參考官方的 troubleshooting 指南。
- **安全管理：** 建議使用 Ansible Vault 加密敏感資料，並建立嚴格的權限控管策略。

## 參考資源

- [Ansible 官方文件](https://docs.ansible.com/)
- [Ansible Galaxy](https://galaxy.ansible.com/)
- [最佳實踐與範例](https://www.ansible.com/resources/get-started)