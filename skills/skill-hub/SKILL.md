---
name: skill-hub
description: >-
  Scan the categorized global skill warehouse in ~/.agents/skills/ (indexed by
  ~/.agents/skills/README.md), prompt the user with an interactive confirmation popup
  (ask_question modal) to select skills/categories, and inject (copy or symlink) or
  remove them into the current project's .agents/skills/ directory.
---

# Skill-Hub：全局分类技能仓库与项目级按需注入管家

## 架构约定

1. **全局分类技能仓库（`~/.agents/skills/`）**：
   - 所有技能按功能归类存放在 `~/.agents/skills/<分类目录>/<技能名>/` 下，不会全量塞入全局上下文。
   - **唯一总索引文档**：[README.md](file://~/.agents/skills/README.md)。
2. **项目级技能目录（`<project>/.agents/skills/`）**：
   - 只放当前项目真正用到的技能。
   - 支持**直接复制（`--mode copy`，默认）**或**软链接（`--mode symlink`）**两种注入方式。
3. **强制弹窗确认（结合 `ask_question` 与 `hooks.json`）**：
   - 在把任何技能注入到 `<project>/.agents/skills/` 之前，**必须先调用 `ask_question` 工具弹窗**（设置 `is_multi_select: true`），列出候选技能/分类供用户勾选确认，并让用户确认注入模式（复制 `copy` 或软链 `symlink`）。
   - 若未经过用户确认直接调用注入命令，插件自带的 `PreToolUse` Hook（`hooks.json`）也会强制拦截并弹窗要求用户二次确认。

---

## 标准执行步骤

### 第一步：读取索引与扫描项目推荐
先读取 [~/.agents/skills/README.md](file://~/.agents/skills/README.md) 或运行推荐命令：
```bash
node ~/.gemini/config/plugins/skill-hub/skills/skill-hub/scripts/skill-hub.mjs recommend --project "<project_root>"
```

### 第二步：使用 `ask_question` 弹窗让用户勾选确认（必做）
调用 `ask_question` 工具弹出交互式选择框：
- **问题 1（多选 `is_multi_select: true`）**：列出推荐或用户感兴趣的具体技能（注明所属分类和功能简述），让用户勾选要注入到 `<project>/.agents/skills/` 的技能。
- **问题 2（单选 `is_multi_select: false`）**：询问注入方式：
  - `(Recommended) 直接复制到项目的 .agents/skills/（copy，独立文件）`
  - `创建软链接到项目的 .agents/skills/（symlink，与全局仓库同步）`

### 第三步：执行注入命令（`inject`）
拿到用户在弹窗中的确认结果后，执行注入脚本（带上 `--confirmed-by-user` 标记已通过弹窗确认）：

```bash
# 默认直接复制（--mode copy）
node ~/.gemini/config/plugins/skill-hub/skills/skill-hub/scripts/skill-hub.mjs inject <skill_or_category...> --mode copy --confirmed-by-user --project "<project_root>"

# 或软链接模式（--mode symlink）
node ~/.gemini/config/plugins/skill-hub/skills/skill-hub/scripts/skill-hub.mjs inject <skill_or_category...> --mode symlink --confirmed-by-user --project "<project_root>"
```

> 支持传入分类目录名（如 `01-frontend-ui`、`02-code-review-dev`）或单个技能名（如 `impeccable`、`pretty-mermaid`、`code-review`）。

### 第四步：查看状态或移除已注入技能（`status` / `remove`）
- 查看当前项目已安装的原生技能与通过 `skill-hub` 注入的技能：
  ```bash
  node ~/.gemini/config/plugins/skill-hub/skills/skill-hub/scripts/skill-hub.mjs status --project "<project_root>"
  ```
- 移除已注入的技能（仅移除带 `.skill-hub-origin.json` 标记的复制技能或软链接技能，**绝不删除项目原生技能**）：
  ```bash
  node ~/.gemini/config/plugins/skill-hub/skills/skill-hub/scripts/skill-hub.mjs remove <skill_name...|all> --project "<project_root>"
  ```
