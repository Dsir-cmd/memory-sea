#!/usr/bin/env node
/**
 * 语法检查：把仓库里每个 .js / .mjs 都过一遍 node --check。
 * ---------------------------------------------------------------------------
 * 为什么单独做：插件加载失败时，DSH 的报错往往只给一行栈，
 * 而顶层 `return`、漏括号这种错，`node --check` 一秒就能指出来。
 *
 * 用法：node scripts/check.mjs
 */

import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', '.git', 'demo', 'data'])

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, out)
    } else if (/\.m?js$/.test(entry.name)) {
      out.push(abs)
    }
  }
  return out
}

const files = walk(ROOT).filter((file) => statSync(file).isFile())
let failed = 0

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (error) {
    failed += 1
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    const message = String(error?.stderr ?? error?.message ?? error).trim().split('\n').slice(0, 6).join('\n')
    console.log(`  ✗ ${rel}\n${message.replace(/^/gm, '      ')}`)
  }
}

console.log(`\n检查 ${files.length} 个文件：${failed} 个语法错误。`)
if (failed) process.exitCode = 1
