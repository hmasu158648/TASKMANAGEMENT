#!/usr/bin/env node
// Claude Code の PreToolUse フック。git の運用ルール(CLAUDE.md)に違反するコマンドを、実行前に止める。
//   1. main / master への、コミット・プッシュ
//   2. ブランチ名が「種類/イシュー番号-説明」の形式でない、ブランチの作成
// 違反のときは、理由を標準エラーに出して、終了コード 2 で終了する(= 実行を中止する)。
// 入力(標準入力)は、{ "tool_name": ..., "tool_input": { "command": ... } } の JSON。
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const BRANCH_RE = /^(feature|fix|docs|chore|refactor)\/#[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$/;
const PROTECTED = ['main', 'master'];
const COMMIT_LIKE = ['commit', 'cherry-pick', 'revert', 'am'];

function block(message) {
  process.stderr.write(`[guard-git] ${message}\n詳しくは CLAUDE.md を参照してください。\n`);
  process.exit(2);
}

// heredoc(<<'EOF' ... EOF)の本文は、コマンドではないので、取り除く。
function stripHeredocs(cmd) {
  return cmd.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n[ \t]*\2(?=\s|$)/g, '');
}

// 引用符の外にある ; | & ( ) 改行 で、コマンドを区切り、それぞれを単語に分ける。
function splitCommands(cmd) {
  const segments = [];
  let tokens = [];
  let cur = '';
  let has = false;
  let quote = null;
  const pushTok = () => {
    if (has) tokens.push(cur);
    cur = '';
    has = false;
  };
  const pushSeg = () => {
    pushTok();
    if (tokens.length) segments.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && cmd[i + 1] === '"') cur += cmd[++i];
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      has = true;
    } else if (/[;|&()\n\r]/.test(c)) {
      pushSeg();
    } else if (/\s/.test(c)) {
      pushTok();
    } else {
      cur += c;
      has = true;
    }
  }
  pushSeg();
  return segments;
}

// 1つのコマンドが git なら、{ sub, args, dir } を返す。違えば null。
function parseGit(tokens) {
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  if (i >= tokens.length) return null;
  const exe = tokens[i].replace(/\\/g, '/').split('/').pop().toLowerCase();
  if (exe !== 'git' && exe !== 'git.exe') return null;
  i++;
  let dir = null;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    if (tokens[i] === '-C') {
      dir = tokens[i + 1];
      i += 2;
    } else if (tokens[i] === '-c') {
      i += 2;
    } else {
      i++;
    }
  }
  if (i >= tokens.length) return null;
  return { sub: tokens[i], args: tokens.slice(i + 1), dir };
}

function currentBranch(dir) {
  if (process.env.GUARD_GIT_BRANCH) return process.env.GUARD_GIT_BRANCH; // 試験用
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir ? path.resolve(process.cwd(), dir) : process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const positionals = (args) => args.filter((a) => !a.startsWith('-'));

// ブランチを作る(または名前を変える)コマンドなら、新しい名前を返す。
function newBranchName(sub, args) {
  if (sub === 'switch') {
    const i = args.findIndex((a) => /^-[a-zA-Z]*[cC]$/.test(a) || a === '--create' || a === '--force-create');
    return i >= 0 ? args[i + 1] : null;
  }
  if (sub === 'checkout') {
    const i = args.findIndex((a) => /^-[a-zA-Z]*[bB]$/.test(a));
    return i >= 0 ? args[i + 1] : null;
  }
  if (sub === 'branch') {
    if (args.some((a) => ['-m', '-M', '--move'].includes(a))) {
      const pos = positionals(args);
      return pos[pos.length - 1] || null;
    }
    const readOnly = /^(-d|-D|--delete|-l|--list|-a|--all|-r|--remotes|-v|-vv|--verbose|--show-current|--merged|--no-merged|--contains|--no-contains|-u|--set-upstream-to.*|--unset-upstream|--edit-description|-c|-C|--copy)$/;
    if (args.some((a) => readOnly.test(a))) return null;
    return positionals(args)[0] || null;
  }
  return null;
}

function main() {
  let input;
  try {
    input = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  } catch {
    return; // 読めない入力は、止めない
  }
  const command = input && input.tool_input && input.tool_input.command;
  if (typeof command !== 'string' || !/\bgit\b/.test(command)) return;

  const segments = splitCommands(stripHeredocs(command));
  let simBranch; // このコマンドの途中で、ブランチが切り替わる場合に備えて、追跡する
  let simInit = false;

  for (const tokens of segments) {
    const g = parseGit(tokens);
    if (!g) continue;
    const { sub, args, dir } = g;
    if (!simInit) {
      simBranch = currentBranch(dir);
      simInit = true;
    }

    // ブランチの作成: 名前の形式を確認する
    const created = newBranchName(sub, args);
    if (created !== null && created !== undefined && !BRANCH_RE.test(created)) {
      block(
        `ブランチ名「${created}」は、ルールに合いません。` +
          '「種類/#イシュー番号-短い説明」(例: feature/#12-task-api)の形式にしてください。' +
          '種類は feature / fix / docs / chore / refactor、説明は半角の小文字・数字・ハイフンです。' +
          '先に、GitHub のイシューを作成する(または既存のイシューを確認する)必要があります。'
      );
    }

    // ブランチの切り替えを追跡する
    if (sub === 'switch' || (sub === 'checkout' && !args.includes('--'))) {
      simBranch = created || positionals(args)[0] || simBranch;
    }

    // main / master へのコミット
    if (COMMIT_LIKE.includes(sub) && PROTECTED.includes(simBranch)) {
      block(`${simBranch} ブランチには、直接コミットできません。イシューを作成し、作業用のブランチを作ってください。`);
    }

    // main / master へのプッシュ
    if (sub === 'push') {
      if (args.includes('--mirror')) block('--mirror でのプッシュは、禁止です。');
      const refspecs = positionals(args).slice(1);
      if (refspecs.length === 0 && PROTECTED.includes(simBranch)) {
        block(`${simBranch} ブランチは、直接プッシュできません。`);
      }
      for (const r of refspecs) {
        const dst = (r.includes(':') ? r.split(':').pop() : r).replace(/^\+/, '').replace(/^refs\/heads\//, '');
        if (PROTECTED.includes(dst) || (dst === 'HEAD' && PROTECTED.includes(simBranch))) {
          block(`${dst} への直接プッシュは、禁止です。作業用のブランチをプッシュして、PR を作成してください。`);
        }
      }
    }
  }
}

main();
