#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const WAREHOUSE_DIR = path.join(HOME, '.agents', 'skills');
const README_INDEX = path.join(WAREHOUSE_DIR, 'README.md');

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getWorkspaceSkills(workspaceRoot) {
  const skillsDir = path.join(workspaceRoot, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir).filter((name) => {
    const full = path.join(skillsDir, name);
    return fs.existsSync(path.join(full, 'SKILL.md'));
  });
}

function getRecommendedCategories(workspaceRoot) {
  const recs = [];
  if (
    fs.existsSync(path.join(workspaceRoot, 'frontend')) ||
    fs.existsSync(path.join(workspaceRoot, '.impeccable')) ||
    fs.existsSync(path.join(workspaceRoot, 'src'))
  ) {
    recs.push('01-frontend-ui (impeccable, frontend-design, ui-ux-pro-max, playground)');
  }
  if (fs.existsSync(path.join(workspaceRoot, '.git'))) {
    recs.push('02-code-review-dev (feature-dev, code-review, review-pr, code-simplifier)');
  }
  if (fs.existsSync(path.join(workspaceRoot, 'docs'))) {
    recs.push('04-docs-slides-research (pretty-mermaid, html-slides, shuorenhua, deep-research)');
  }
  return recs;
}

const input = readStdinJson();
const workspacePaths = Array.isArray(input.workspacePaths) ? input.workspacePaths : [];
const workspaceRoot = workspacePaths[0] || '';

if (!workspaceRoot || !fs.existsSync(README_INDEX)) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const installed = getWorkspaceSkills(workspaceRoot);

// Trigger condition: only activate when the project has NO project-level skills.
if (installed.length > 0) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}
const recs = getRecommendedCategories(workspaceRoot);

const message = [
  `[Skill-Hub Hook] 全局技能分类仓库索引位于 ${README_INDEX}。`,
  `当前项目 (${path.basename(workspaceRoot)}) 的 .agents/skills/ 尚无项目级技能（.agents/skills/ 为空或不存在）。`,
  recs.length > 0 ? `根据当前项目结构，仓库中可按需注入的推荐分类：${recs.join('；')}。` : '',
  `规则：当用户需要为项目注入技能或插件时，必须先读取 ${README_INDEX}，并调用 ask_question 工具（is_multi_select: true）弹窗让用户勾选确认要注入的技能及注入方式（直接复制 copy 或软链接 symlink），确认后再执行 skill-hub.mjs inject。`
]
  .filter(Boolean)
  .join('\n');

process.stdout.write(
  JSON.stringify({
    injectSteps: [
      {
        systemMessage: {
          systemMessage: message
        }
      }
    ]
  })
);
