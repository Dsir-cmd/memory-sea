#!/usr/bin/env node
/**
 * 闸二 · 禁运扫描
 * ---------------------------------------------------------------------------
 * 提交前把「不该出去的东西」扫一遍：数据文件、绝对路径、身份、实例指纹。
 * 命中任何一条就退出码 1，CI 与 pre-commit 都该跑它。
 *
 * 用法：node scripts/verify-clean.mjs
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 不看的目录（产物、依赖、git） */
const SKIP_DIRS = new Set(['node_modules', '.git', 'data', 'dist'])

/** 不可能被提交的产物（.gitignore 里也有一份，这里再挡一次） */
const SKIP_FILES = [
  /^demo\/.*\.db(-wal|-shm)?$/i,
  /\.log$/i,
  /\.jsonl$/i,
  // 扫描器自己必须逐字包含这些特征串，否则没法扫。文件很短，靠人眼 review。
  /^scripts\/verify-clean\.mjs$/,
]

/** 二进制：只查文件名，不做文本扫描 */
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.zip', '.gz'])

/** 文件名禁止 */
const BANNED_FILES = [
  { re: /\.(db|sqlite|sqlite3)$/i, why: '数据库文件（记忆本体）' },
  { re: /\.db-(wal|shm)$/i, why: 'SQLite 运行时文件' },
  { re: /\.jsonl$/i, why: '审计 / 心情日志' },
  { re: /\.log$/i, why: '运行日志' },
  { re: /^token\.txt$/i, why: '写入令牌' },
  { re: /^\.env/i, why: '环境变量 / 密钥' },
]

/**
 * 计算用的长数字常量。不在这里的白名单里，8–12 位连续数字一律当疑似账号报出来。
 * 每加一个都要写清楚它是什么——这份名单本身也是审计对象。
 */
const SAFE_NUMBERS = new Set([
  '2166136261', // client.js 里的 FNV-1a 32 位偏移基
  '16777619', // FNV-1a 的质数
  '4294967295', // 2^32 - 1，哈希归一化用
  '86400000', // 一天的毫秒数
  '10000000', // token 预算的上限（settings 里的 clamp）
])

/** 内容禁止 —— 每一条都对应一件真实发生过的事 */
const BANNED_CONTENT = [
  { re: /[A-Za-z]:\\/, why: 'Windows 绝对路径' },
  { re: /(鲸鲸|獨晴|独晴|大肥鱼)/, why: '私有身份 / 人设名' },
  { re: /(210942148|2214202482)/, why: 'QQ 号' },
  { re: /cd40f54e/i, why: 'AstrBot 实例指纹' },
  { re: /\b\d{8,12}\b/, why: '疑似 QQ 号 / 账号（8–12 位连续数字）', allow: SAFE_NUMBERS },
]

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = join(dir, entry.name)
    const rel = relative(ROOT, abs).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(abs, out)
      continue
    }
    if (SKIP_FILES.some((re) => re.test(rel))) continue
    out.push({ abs, rel })
  }
  return out
}

function lineOf(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1
  return line
}

function snippet(text, index, length = 60) {
  const start = Math.max(0, index - 20)
  return text.slice(start, start + length).replace(/\s+/g, ' ').trim()
}

async function main() {
  const files = await walk(ROOT)
  const violations = []
  const large = []

  for (const { abs, rel } of files) {
    for (const rule of BANNED_FILES) {
      if (rule.re.test(rel)) violations.push({ rel, line: 0, why: rule.why, hit: rel })
    }

    const info = await stat(abs)
    if (info.size > 2 * 1024 * 1024) large.push({ rel, size: info.size })
    if (BINARY_EXT.has(extname(rel).toLowerCase())) continue

    let text
    try {
      text = await readFile(abs, 'utf8')
    } catch {
      continue
    }
    if (text.includes('\u0000')) continue

    for (const rule of BANNED_CONTENT) {
      const global = new RegExp(rule.re.source, rule.re.flags.replace('g', '') + 'g')
      let reported = false
      for (const match of text.matchAll(global)) {
        if (rule.allow?.has(match[0])) continue
        violations.push({
          rel,
          line: lineOf(text, match.index),
          why: rule.why,
          hit: snippet(text, match.index),
        })
        reported = true
        break // 一个文件同一条规则报一次就够，不然刷屏
      }
      if (reported) continue
    }
  }

  for (const item of violations) {
    const where = item.line ? `${item.rel}:${item.line}` : item.rel
    console.log(`  ✗ ${where}  [${item.why}]  ${item.hit}`)
  }
  for (const item of large) {
    console.log(`  ! ${item.rel}  ${(item.size / 1024 / 1024).toFixed(1)}MB —— 大文件，确认是不是资源误入`)
  }

  console.log(
    `\n扫描 ${files.length} 个文件：${violations.length} 处命中，${large.length} 个大文件。`,
  )
  if (violations.length) {
    console.log('先处理上面这些再提交。')
    process.exitCode = 1
    return
  }
  console.log('干净。')
}

await main()
