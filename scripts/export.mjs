#!/usr/bin/env node
/**
 * 闸一 · 白名单导出
 * ---------------------------------------------------------------------------
 * 私有工作目录（含真实记忆、日志、个人配置）→ 公开仓库，只按清单复制。
 *
 * 这是「零数据」最重要的一道闸：清单外的东西**没有进仓库的通道**。
 * 不用「记得删掉 data/」，因为那件事迟早会忘。
 *
 * 用法：
 *   node scripts/export.mjs --from <私有插件目录>
 *   node scripts/export.mjs --from <私有插件目录> --force   # 覆盖已导出文件
 *
 * 注意：第一次导出之后，仓库里的副本就是源码本体（要改就在仓库里改）。
 * 再跑 --force 会把私有目录的版本盖回来——只在明确想同步上游时才用。
 */

import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = join(ROOT, 'packages', 'dsh-memory-sea')

/**
 * 唯一允许从私有目录进来的文件。
 * 加一行 = 多开放一个文件；删一行 = 关掉这条通道。
 */
export const MANIFEST = [
  'index.js',
  'client.js',
  'icon.svg',
  'locale/zh.json',
  'locale/en.json',
  'lib/paths.js',
  'lib/settings.js',
  'lib/text.js',
  'lib/judge.js',
  'lib/lm-source.js',
  'lib/lm-http.js',
  'lib/lm-capture.js',
]

/**
 * 在仓库里重写过的文件，不从上游复制：
 * 包名、插件 id、路由前缀都变了，覆盖会退回旧名字。
 * 另外 lib/scope.js、lib/discover.js 是开源版新写的。
 */
export const OWNED_IN_REPO = [
  'package.json',
  'cordis.patch.yml',
  'config.example.json',
  'lib/config.js',
  'lib/scope.js',
  'lib/discover.js',
]

function parseArgs(argv) {
  const out = { from: '', force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--from') out.from = argv[i + 1] ?? ''
    else if (arg === '--force') out.force = true
    else if (arg === '--help' || arg === '-h') out.help = true
  }
  return out
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  const { from, force, help } = parseArgs(process.argv.slice(2))
  if (help) {
    console.log('用法: node scripts/export.mjs --from <私有插件目录> [--force]')
    return
  }
  if (!from) {
    console.error('缺少 --from：指向私有插件目录（含 index.js / client.js / lib/ 的那个）。')
    process.exitCode = 1
    return
  }
  const source = resolve(from)
  if (!(await exists(join(source, 'index.js')))) {
    console.error(`--from 目录里没有 index.js，检查一下路径：${source}`)
    process.exitCode = 1
    return
  }

  const rows = []
  for (const rel of MANIFEST) {
    const src = join(source, rel)
    const dst = join(TARGET, rel)
    if (!(await exists(src))) {
      rows.push({ rel, status: 'missing' })
      continue
    }
    if ((await exists(dst)) && !force) {
      rows.push({ rel, status: 'kept' })
      continue
    }
    await mkdir(dirname(dst), { recursive: true })
    await copyFile(src, dst)
    rows.push({ rel, status: 'copied' })
  }

  const width = Math.max(...rows.map((row) => row.rel.length))
  const label = { copied: '已复制', kept: '保留仓库版', missing: '上游没有' }
  for (const row of rows) {
    console.log(`  ${row.rel.padEnd(width)}  ${label[row.status]}`)
  }
  const copied = rows.filter((row) => row.status === 'copied').length
  console.log(`\n共 ${rows.length} 个条目：复制 ${copied}，保留 ${rows.filter((r) => r.status === 'kept').length}，缺失 ${rows.filter((r) => r.status === 'missing').length}`)
  if (!force && copied < rows.length) {
    console.log('已有文件默认不覆盖（仓库副本现在是源码本体）。确要同步上游请加 --force。')
  }
  console.log(`\n仓库自己维护、不从上游复制的：${OWNED_IN_REPO.join(', ')}`)
}

await main()
