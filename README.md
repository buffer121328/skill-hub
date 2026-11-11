# Skill & Plugin Hub (按需注入管家)

An Antigravity plugin that keeps a categorized global skill warehouse (`~/.agents/skills/`) out of your context, and injects only the skills a project needs into `<project>/.agents/skills/`.

## 触发条件 / Trigger

On `SessionStart`, the hook activates **only when the project has no project-level skills** (no `.agents/skills/*/SKILL.md`). It then:
1. Points the agent at the warehouse index `~/.agents/skills/README.md`
2. Recommends categories based on project structure (`src/`, `frontend/`, `.git`, `docs/`)
3. Instructs the agent to confirm via an `ask_question` popup before injecting

Projects that already have skills are left untouched (zero context cost).

## 安装 / Install

```bash
git clone https://github.com/<your-name>/skill-hub ~/.gemini/config/plugins/skill-hub
```

## 全局仓库结构 / Warehouse layout

```
~/.agents/skills/
├── README.md              # index
├── 01-frontend-ui/<skill>/SKILL.md
├── 02-code-review-dev/<skill>/SKILL.md
└── ...
```

## CLI

```bash
HUB=skills/skill-hub/scripts/skill-hub.mjs
node $HUB recommend --project <root>
node $HUB inject <skill|category...> --mode copy|symlink --confirmed-by-user --project <root>
node $HUB status --project <root>
node $HUB remove <skill...|all> --project <root>
```

`remove` only deletes skills carrying a `.skill-hub-origin.json` marker — native project skills are never touched.

## Safety

A `PreToolUse` hook forces a confirmation prompt on any `inject` command lacking `--confirmed-by-user`.

## License

MIT
