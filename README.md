# Skill & Plugin Hub (按需注入管家)

**English** | [中文](#中文)

## English

A tool for AI coding agents (Antigravity, Codex, Claude Code, or any agent that reads `.agents/skills/`) that keeps a large, categorized skill warehouse out of your global context and injects **only the skills a project actually needs** into `<project>/.agents/skills/`.

### Why
Loading dozens of skills globally bloats context and hurts agent focus. Skill Hub stores them in a warehouse (`~/.agents/skills/`) and installs them per project, on demand, after you confirm.

### Trigger condition
On `SessionStart`, the hook activates **only when the project has no project-level skills** (no `.agents/skills/*/SKILL.md`). It then:
1. Points the agent at the warehouse index `~/.agents/skills/README.md`.
2. Recommends categories from the project structure (`src/`, `frontend/`, `.git`, `docs/`).
3. Tells the agent to confirm via an `ask_question` popup before injecting anything.

Projects that already have skills are left untouched (zero extra context).

### Install
```bash
git clone https://github.com/buffer121328/skill-hub ~/.gemini/config/plugins/skill-hub
```
Requires Node.js 18+.

### Warehouse layout
```
~/.agents/skills/
├── README.md                          # index of all skills
├── 01-frontend-ui/<skill>/SKILL.md
├── 02-code-review-dev/<skill>/SKILL.md
└── ...
```
The warehouse is **not** bundled; create it yourself with your own skills.

### CLI
```bash
HUB=skills/skill-hub/scripts/skill-hub.mjs
node $HUB recommend --project <root>      # recommend skills for a project
node $HUB inject <skill|category...> --mode copy|symlink --confirmed-by-user --project <root>
node $HUB status --project <root>         # list native + injected skills
node $HUB remove <skill...|all> --project <root>
```
- `copy` (default): independent copy. `symlink`: stays in sync with the warehouse.
- `remove` only deletes skills carrying a `.skill-hub-origin.json` marker; native project skills are never touched.

### Compatibility
The CLI and `SKILL.md` are agent-agnostic. The `hooks.json` auto-trigger and confirmation hook are Antigravity features; with other agents, run the CLI manually.

### Safety
A `PreToolUse` hook forces a confirmation prompt on any `inject` command lacking `--confirmed-by-user`.

## 中文

一个面向 AI 编码助手的工具(Antigravity、Codex、Claude Code 等任何读取 `.agents/skills/` 的 Agent 均可使用):把分类整理好的技能仓库放在全局上下文之外,**只把项目真正需要的技能**注入到 `<项目>/.agents/skills/`。

### 为什么需要
全局加载几十个技能会撑爆上下文、分散 Agent 注意力。Skill Hub 把技能存放在全局仓库(`~/.agents/skills/`),经你确认后按项目按需安装。

### 触发条件
`SessionStart` 钩子**仅在项目没有项目级 skills 时触发**(即不存在 `.agents/skills/*/SKILL.md`)。触发后会:
1. 告知 Agent 全局仓库索引位置 `~/.agents/skills/README.md`;
2. 根据项目结构(`src/`、`frontend/`、`.git`、`docs/`)推荐分类;
3. 要求 Agent 在注入前通过 `ask_question` 弹窗让你确认。

已有项目级技能的项目不会被打扰(不额外占用上下文)。

### 安装
```bash
git clone https://github.com/buffer121328/skill-hub ~/.gemini/config/plugins/skill-hub
```
需要 Node.js 18+。

### 仓库结构
```
~/.agents/skills/
├── README.md                          # 技能总索引
├── 01-frontend-ui/<技能名>/SKILL.md
├── 02-code-review-dev/<技能名>/SKILL.md
└── ...
```
本仓库**不包含**技能仓库本身,请用你自己的技能搭建。

### 命令行
```bash
HUB=skills/skill-hub/scripts/skill-hub.mjs
node $HUB recommend --project <根目录>      # 为项目推荐技能
node $HUB inject <技能或分类...> --mode copy|symlink --confirmed-by-user --project <根目录>
node $HUB status --project <根目录>         # 查看原生与已注入技能
node $HUB remove <技能...|all> --project <根目录>
```
- `copy`(默认):独立复制;`symlink`:软链接,与全局仓库同步。
- `remove` 只删除带 `.skill-hub-origin.json` 标记的技能,**绝不删除项目原生技能**。

### 兼容性
命令行和 `SKILL.md` 与具体 Agent 无关。`hooks.json` 的自动触发与确认钩子是 Antigravity 的功能;在其他 Agent 中请手动运行命令行。

### 安全机制
`PreToolUse` 钩子会拦截任何缺少 `--confirmed-by-user` 的 `inject` 命令,并强制弹窗确认。

## License
MIT
