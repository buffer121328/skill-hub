#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const WAREHOUSE_DIR = path.join(HOME, '.agents', 'skills');
const README_PATH = path.join(WAREHOUSE_DIR, 'README.md');
const ORIGIN_MARKER = '.skill-hub-origin.json';

function parseFrontmatterDesc(mdPath) {
  if (!fs.existsSync(mdPath)) return '';
  const text = fs.readFileSync(mdPath, 'utf8');
  const m = text.match(/description:\s*>?-?\s*\r?\n?([\s\S]*?)(?:\r?\n[a-zA-Z0-9_-]+:|\r?\n---)/);
  if (m) {
    return m[1].replace(/\r?\n\s+/g, ' ').replace(/^['"]|['"]$/g, '').trim().slice(0, 160);
  }
  return '';
}

function scanWarehouse() {
  const categories = [];
  const skillMap = new Map();

  if (!fs.existsSync(WAREHOUSE_DIR)) return { categories, skillMap };

  for (const catName of fs.readdirSync(WAREHOUSE_DIR).sort()) {
    const catPath = path.join(WAREHOUSE_DIR, catName);
    if (!fs.statSync(catPath).isDirectory() || catName.startsWith('.')) continue;

    const skills = [];
    for (const sName of fs.readdirSync(catPath).sort()) {
      const sPath = path.join(catPath, sName);
      const mdPath = path.join(sPath, 'SKILL.md');
      if (fs.existsSync(mdPath)) {
        const desc = parseFrontmatterDesc(mdPath);
        const item = {
          name: sName,
          category: catName,
          relativePath: `${catName}/${sName}`,
          sourcePath: sPath,
          description: desc
        };
        skills.push(item);
        skillMap.set(sName, item);
      }
    }
    if (skills.length > 0) {
      categories.push({ category: catName, count: skills.length, skills });
    }
  }
  return { categories, skillMap };
}

function getProjectStatus(projectRoot) {
  const skillsDir = path.join(projectRoot, '.agents', 'skills');
  const nativeSkills = [];
  const injectedSkills = [];

  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir).sort()) {
      if (entry.startsWith('.')) continue;
      const full = path.join(skillsDir, entry);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        injectedSkills.push({
          name: entry,
          mode: 'symlink',
          source: fs.readlinkSync(full)
        });
      } else if (stat.isDirectory()) {
        const markerPath = path.join(full, ORIGIN_MARKER);
        if (fs.existsSync(markerPath)) {
          let meta = {};
          try {
            meta = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
          } catch {}
          injectedSkills.push({
            name: entry,
            mode: 'copy',
            category: meta.category || null,
            source: meta.sourcePath || null,
            injectedAt: meta.injectedAt || null
          });
        } else if (fs.existsSync(path.join(full, 'SKILL.md'))) {
          nativeSkills.push(entry);
        }
      }
    }
  }

  return {
    projectRoot,
    warehouseIndex: README_PATH,
    nativeSkills,
    injectedSkills
  };
}

function recommendForProject(projectRoot) {
  const { skillMap } = scanWarehouse();
  const status = getProjectStatus(projectRoot);
  const installedSet = new Set([
    ...status.nativeSkills,
    ...status.injectedSkills.map((s) => s.name)
  ]);

  const groups = [];
  const hasFrontend =
    fs.existsSync(path.join(projectRoot, 'frontend')) ||
    fs.existsSync(path.join(projectRoot, '.impeccable')) ||
    fs.existsSync(path.join(projectRoot, 'src'));
  const hasDocs = fs.existsSync(path.join(projectRoot, 'docs'));
  const hasGit = fs.existsSync(path.join(projectRoot, '.git'));

  if (hasFrontend) {
    const candidates = ['impeccable', 'frontend-design', 'ui-ux-pro-max', 'playground']
      .filter((n) => skillMap.has(n) && !installedSet.has(n))
      .map((n) => skillMap.get(n));
    if (candidates.length > 0) {
      groups.push({
        category: '01-frontend-ui',
        reason: '检测到前端目录（frontend/ 或 .impeccable/）',
        skills: candidates
      });
    }
  }

  if (hasGit) {
    const candidates = ['feature-dev', 'code-review', 'review-pr', 'code-simplifier', 'silent-failure-hunter']
      .filter((n) => skillMap.has(n) && !installedSet.has(n))
      .map((n) => skillMap.get(n));
    if (candidates.length > 0) {
      groups.push({
        category: '02-code-review-dev',
        reason: '检测到 Git 工程仓库，适合按需注入功能架构与代码审查技能',
        skills: candidates
      });
    }
  }

  if (hasDocs) {
    const candidates = ['pretty-mermaid', 'shuorenhua', 'deep-research', 'html-slides']
      .filter((n) => skillMap.has(n) && !installedSet.has(n))
      .map((n) => skillMap.get(n));
    if (candidates.length > 0) {
      groups.push({
        category: '04-docs-slides-research',
        reason: '检测到 docs/ 文档目录，适合按需注入架构图、去 AI 味审稿与调研技能',
        skills: candidates
      });
    }
  }

  return {
    projectRoot,
    installedNative: status.nativeSkills,
    installedInjected: status.injectedSkills,
    recommendedGroups: groups
  };
}

function ensureGitExclude(projectRoot, relEntry) {
  const excludeFile = path.join(projectRoot, '.git', 'info', 'exclude');
  if (!fs.existsSync(path.dirname(excludeFile))) return false;
  let content = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf8') : '';
  const lines = new Set(content.split(/\r?\n/));
  if (!lines.has(relEntry)) {
    content = content.replace(/\s*$/, '') + `\n${relEntry}\n`;
    fs.writeFileSync(excludeFile, content);
    return true;
  }
  return false;
}

function removeGitExclude(projectRoot, relEntry) {
  const excludeFile = path.join(projectRoot, '.git', 'info', 'exclude');
  if (!fs.existsSync(excludeFile)) return;
  const lines = fs.readFileSync(excludeFile, 'utf8').split(/\r?\n/);
  const filtered = lines.filter((l) => l.trim() !== relEntry);
  fs.writeFileSync(excludeFile, filtered.join('\n'));
}

function resolveTargets(targets) {
  const { categories, skillMap } = scanWarehouse();
  const resolved = [];
  const seen = new Set();

  for (const t of targets) {
    // Match category name or prefix (e.g., "01-frontend-ui")
    const cat = categories.find((c) => c.category === t);
    if (cat) {
      for (const s of cat.skills) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          resolved.push(s);
        }
      }
      continue;
    }
    // Match "<category>/<skill>" or "<skill>"
    const skillName = t.includes('/') ? path.basename(t) : t;
    if (skillMap.has(skillName) && !seen.has(skillName)) {
      seen.add(skillName);
      resolved.push(skillMap.get(skillName));
    }
  }
  return resolved;
}

function injectSkills(projectRoot, targets, { mode = 'copy', excludeGit = true } = {}) {
  const items = resolveTargets(targets);
  const destSkillsDir = path.join(projectRoot, '.agents', 'skills');
  fs.mkdirSync(destSkillsDir, { recursive: true });

  const injected = [];
  const skipped = [];

  for (const item of items) {
    const dest = path.join(destSkillsDir, item.name);
    if (fs.existsSync(dest)) {
      const stat = fs.lstatSync(dest);
      const isManagedCopy = stat.isDirectory() && fs.existsSync(path.join(dest, ORIGIN_MARKER));
      if (!stat.isSymbolicLink() && !isManagedCopy) {
        skipped.push({
          name: item.name,
          reason: '项目 .agents/skills/ 下已存在同名原生技能目录，受保护跳过'
        });
        continue;
      }
      fs.rmSync(dest, { recursive: true, force: true });
    }

    if (mode === 'symlink') {
      fs.symlinkSync(item.sourcePath, dest);
    } else {
      fs.cpSync(item.sourcePath, dest, { recursive: true, dereference: true });
      fs.writeFileSync(
        path.join(dest, ORIGIN_MARKER),
        JSON.stringify(
          {
            name: item.name,
            category: item.category,
            sourcePath: item.sourcePath,
            injectedAt: new Date().toISOString()
          },
          null,
          2
        ) + '\n'
      );
    }

    if (excludeGit) {
      ensureGitExclude(projectRoot, `.agents/skills/${item.name}`);
    }

    injected.push({
      name: item.name,
      category: item.category,
      mode,
      destPath: dest
    });
  }

  return { projectRoot, mode, injected, skipped };
}

function removeSkills(projectRoot, targets) {
  const destSkillsDir = path.join(projectRoot, '.agents', 'skills');
  const removed = [];
  const skipped = [];
  if (!fs.existsSync(destSkillsDir)) return { removed, skipped };

  const isAll = targets.includes('all');
  const resolvedNames = isAll
    ? null
    : new Set([
        ...targets.map((t) => (t.includes('/') ? path.basename(t) : t)),
        ...resolveTargets(targets).map((i) => i.name)
      ]);

  for (const entry of fs.readdirSync(destSkillsDir)) {
    if (!isAll && !resolvedNames.has(entry)) continue;
    const full = path.join(destSkillsDir, entry);
    const stat = fs.lstatSync(full);
    const isManagedCopy = stat.isDirectory() && fs.existsSync(path.join(full, ORIGIN_MARKER));

    if (stat.isSymbolicLink() || isManagedCopy) {
      fs.rmSync(full, { recursive: true, force: true });
      removeGitExclude(projectRoot, `.agents/skills/${entry}`);
      removed.push(entry);
    } else {
      skipped.push({ name: entry, reason: '项目原生技能目录，受保护不删除' });
    }
  }

  return { projectRoot, removed, skipped };
}

const args = process.argv.slice(2);
const cmd = args[0] || 'catalog';
let projectRoot = process.cwd();
let mode = 'copy';
let excludeGit = true;
const positional = [];

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) {
    projectRoot = path.resolve(args[++i]);
  } else if (args[i] === '--mode' && args[i + 1]) {
    mode = args[++i];
  } else if (args[i] === '--no-exclude-git') {
    excludeGit = false;
  } else if (args[i] === '--confirmed-by-user') {
    // Consumed flag for PreToolUse hook verification
  } else {
    positional.push(args[i]);
  }
}

if (cmd === 'catalog' || cmd === 'list') {
  const { categories } = scanWarehouse();
  const status = getProjectStatus(projectRoot);
  console.log(
    JSON.stringify(
      {
        warehouseIndex: README_PATH,
        totalCategories: categories.length,
        totalSkills: categories.reduce((acc, c) => acc + c.count, 0),
        projectStatus: status,
        categories: categories.map((c) => ({
          category: c.category,
          count: c.count,
          skills: c.skills.map((s) => s.name)
        }))
      },
      null,
      2
    )
  );
} else if (cmd === 'status') {
  console.log(JSON.stringify(getProjectStatus(projectRoot), null, 2));
} else if (cmd === 'recommend') {
  console.log(JSON.stringify(recommendForProject(projectRoot), null, 2));
} else if (cmd === 'inject') {
  console.log(JSON.stringify(injectSkills(projectRoot, positional, { mode, excludeGit }), null, 2));
} else if (cmd === 'remove') {
  console.log(JSON.stringify(removeSkills(projectRoot, positional), null, 2));
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
