#!/usr/bin/env node
/**
 * 把记忆海挂进一个 DSH profile。
 * ---------------------------------------------------------------------------
 * README 里"改 package.json"那一步最容易出错：少一个逗号，或者 bundles 忘了加。
 * 这个脚本只做两件事，做坏了会留备份：
 *
 *   1. dependencies 里加一条 link:<本仓库路径>
 *   2. dsh.profile.bundles 里加名字
 *
 *   node scripts/link.mjs --profile desktop          # 真改，留 .bak
 *   node scripts/link.mjs --profile desktop --dry    # 只看会改什么
 *   node scripts/link.mjs --profile-dir <目录>       # 自定义 profile 位置
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PKG_DIR = join(ROOT, 'packages', 'dsh-memory-sea')
const PKG_NAME = 'dsh-memory-sea'

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? String(process.argv[i + 1] ?? fallback) : fallback
}

function main() {
  const dry = process.argv.includes('--dry')
  const profile = arg('profile', 'desktop')
  const profileDir = arg('profile-dir') || join(homedir(), '.dsh', 'profiles', profile)
  const file = join(profileDir, 'package.json')

  if (!existsSync(file)) {
    console.error(`没找到 ${file}`)
    console.error('用 --profile <名字> 指定，或用 --profile-dir <目录> 直接给路径。')
    process.exitCode = 1
    return
  }

  const raw = readFileSync(file, 'utf8')
  let pkg
  try {
    pkg = JSON.parse(raw)
  } catch (error) {
    console.error(`${file} 不是合法 JSON：${String(error?.message ?? error)}`)
    process.exitCode = 1
    return
  }

  const changes = []
  const linkValue = `link:${PKG_DIR.replace(/\\/g, '/')}`

  pkg.dependencies = pkg.dependencies ?? {}
  if (pkg.dependencies[PKG_NAME] !== linkValue) {
    changes.push(`dependencies.${PKG_NAME}: ${pkg.dependencies[PKG_NAME] ?? '(无)'} → ${linkValue}`)
    pkg.dependencies[PKG_NAME] = linkValue
  }

  pkg.dsh = pkg.dsh ?? {}
  pkg.dsh.profile = pkg.dsh.profile ?? {}
  if (!Array.isArray(pkg.dsh.profile.bundles)) pkg.dsh.profile.bundles = []
  if (!pkg.dsh.profile.bundles.includes(PKG_NAME)) {
    changes.push(`dsh.profile.bundles: 加 ${PKG_NAME}`)
    pkg.dsh.profile.bundles.push(PKG_NAME)
  }

  if (!changes.length) {
    console.log(`${PKG_NAME} 已经挂在 ${profileDir} 里了，没动它。`)
    console.log('如果面板没出来，重启 DSH 试试。')
    return
  }

  console.log(`${dry ? '（预演，不写入）' : ''}要改 ${file}：`)
  for (const line of changes) console.log(`  · ${line}`)

  if (dry) {
    console.log('\n去掉 --dry 就真写。')
    return
  }

  const backup = `${file}.bak-${Date.now()}`
  copyFileSync(file, backup)
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  console.log(`\n已写入。原文件备份在 ${backup}`)
  console.log('重启 DSH，左侧导航里应该多一个「记忆海」。')
}

main()
