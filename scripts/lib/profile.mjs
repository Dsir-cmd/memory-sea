// DSH profile 的读 / 改。link.mjs 和 install.mjs 共用同一份，避免两套逻辑跑偏。

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const PLUGIN_NAME = 'dsh-memory-sea'

function profilesRoot() {
  return join(homedir(), '.dsh', 'profiles')
}

/** 读 JSON 时去掉 BOM：Windows 上用记事本另存会带 BOM，JSON.parse 会当场炸。 */
function readJson(file) {
  const raw = readFileSync(file, 'utf8')
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw)
}

/** 列出所有 profile 目录（含没 package.json 的，调用方自己过滤）。 */
export function listProfiles() {
  try {
    return readdirSync(profilesRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(profilesRoot(), entry.name))
  } catch {
    return []
  }
}

function bundlesOf(dir) {
  try {
    const pkg = readJson(join(dir, 'package.json'))
    return Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles : []
  } catch {
    return []
  }
}

/** 一个能加载插件的 profile：bundles 里有 DSH 自己的底座。 */
function isUsable(dir) {
  if (!existsSync(join(dir, 'package.json'))) return false
  const bundles = bundlesOf(dir)
  return bundles.some((name) => String(name).startsWith('@deepseek-ai/dsh-'))
}

/**
 * 带界面的 profile。记忆海是侧栏面板，装进没有 UI 的 profile（比如 headless）
 * 等于装了个看不见的东西——宁可只认带 web-app 的那个。
 */
function hasWebUi(dir) {
  return bundlesOf(dir).some((name) => String(name).includes('dsh-web-app'))
}

/**
 * 定下要改哪个 profile。
 * @returns {{ dir: string, reason: string, candidates: string[] }}
 */
export function pickProfile({ profile = '', profileDir = '' } = {}) {
  if (profileDir) return { dir: profileDir, reason: '调用方指定了 --profile-dir', candidates: [] }
  if (profile) {
    return { dir: join(profilesRoot(), profile), reason: `调用方指定了 --profile ${profile}`, candidates: [] }
  }
  const usable = listProfiles().filter(isUsable)
  const withUi = usable.filter(hasWebUi)
  const pool = withUi.length ? withUi : usable

  if (pool.length === 1) {
    return { dir: pool[0], reason: withUi.length ? '唯一带界面的 profile' : '唯一的 profile', candidates: pool }
  }
  return {
    dir: '',
    reason: pool.length ? `有 ${pool.length} 个带界面的 profile，需要指定` : '没找到任何可用的 profile',
    candidates: pool,
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 把插件挂进 profile：dependencies 加 link，bundles 加名字。
 * 已经是目标状态就什么都不做（可重复执行）。
 */
export function ensurePlugin(profileDir, pluginDir, { dry = false } = {}) {
  const file = join(profileDir, 'package.json')
  if (!existsSync(file)) {
    throw new Error(`profile 里没有 package.json：${file}`)
  }
  const pkg = readJson(file)
  if (!isPlainObject(pkg)) throw new Error(`${file} 不是对象`)

  const linkValue = `link:${pluginDir.replace(/\\/g, '/')}`
  const changes = []

  pkg.dependencies = isPlainObject(pkg.dependencies) ? pkg.dependencies : {}
  if (pkg.dependencies[PLUGIN_NAME] !== linkValue) {
    changes.push(`dependencies.${PLUGIN_NAME}: ${pkg.dependencies[PLUGIN_NAME] ?? '(无)'} → ${linkValue}`)
    pkg.dependencies[PLUGIN_NAME] = linkValue
  }

  pkg.dsh = isPlainObject(pkg.dsh) ? pkg.dsh : {}
  pkg.dsh.profile = isPlainObject(pkg.dsh.profile) ? pkg.dsh.profile : {}
  if (!Array.isArray(pkg.dsh.profile.bundles)) pkg.dsh.profile.bundles = []
  if (!pkg.dsh.profile.bundles.includes(PLUGIN_NAME)) {
    changes.push(`dsh.profile.bundles: 加 ${PLUGIN_NAME}`)
    pkg.dsh.profile.bundles.push(PLUGIN_NAME)
  }

  if (!changes.length || dry) return { file, changes, backup: '' }

  const backup = `${file}.bak-${Date.now()}`
  copyFileSync(file, backup)
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  return { file, changes, backup }
}
