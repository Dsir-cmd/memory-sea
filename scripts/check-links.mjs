#!/usr/bin/env node
/**
 * 死链检查：所有 .md 里的相对链接必须指到真实存在的文件。
 * ---------------------------------------------------------------------------
 * 公开仓库最伤信任的小毛病：README 点进去 404。
 * 外链（http/https）不查——那要联网，而且别人的站挂了不该拦我们的提交。
 *
 * 用法：node scripts/check-links.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', '.git', 'demo', 'data'])

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (/\.md$/i.test(entry.name)) out.push(abs)
  }
  return out
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
let checked = 0
const broken = []

for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(LINK)) {
    let target = match[1].trim()
    if (!target || /^(https?:|mailto:|#|<)/i.test(target)) continue
    // 去掉锚点与查询
    target = target.split('#')[0].split('?')[0]
    if (!target) continue
    checked += 1
    const abs = resolve(dirname(file), decodeURIComponent(target))
    let ok = false
    try {
      ok = statSync(abs).isFile() || existsSync(abs)
    } catch {
      ok = false
    }
    if (!ok) {
      const line = text.slice(0, match.index).split('\n').length
      broken.push({ file: relative(ROOT, file).replace(/\\/g, '/'), line, target })
    }
  }
}

for (const item of broken) console.log(`  ✗ ${item.file}:${item.line}  → ${item.target}`)
console.log(`\n检查 ${checked} 个相对链接：${broken.length} 个死链。`)
if (broken.length) process.exitCode = 1
