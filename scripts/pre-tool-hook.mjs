#!/usr/bin/env node
import fs from 'node:fs';

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const input = readStdinJson();
const toolName = input?.toolCall?.name || '';
const cmdLine = input?.toolCall?.args?.CommandLine || '';

if (toolName === 'run_command' && cmdLine.includes('skill-hub.mjs') && /\binject\b/.test(cmdLine)) {
  // If the agent did not explicitly pass --confirmed-by-user after ask_question modal, force a confirmation prompt
  if (!cmdLine.includes('--confirmed-by-user')) {
    process.stdout.write(
      JSON.stringify({
        decision: 'force_ask',
        reason: 'Skill-Hub Hook：即将向当前项目的 .agents/skills/ 注入技能，请确认选择的技能列表与注入方式。'
      })
    );
    process.exit(0);
  }
}

process.stdout.write(JSON.stringify({ decision: 'allow' }));
