#!/usr/bin/env node
/**
 * 一键安装（给 agent 用的）
 * ---------------------------------------------------------------------------
 * 人不必读这份代码；agent 读 AGENTS.md 然后跑这一条。
 *
 *   node scripts/install.mjs                        # 自动找 profile 和 LM
 *   node scripts/install.mjs --profile desktop      # 指定 profile
 *   node scripts/install.mjs --astrbot <目录>       # 指定 AstrBot 根目录
 *   node scripts/install.mjs --bridge               # 顺带装写入桥
 *   node scripts/install.mjs --json                 # 只输出一个 JSON
 *   node scripts/install.mjs --dry                  # 只看会改什么
 *
 * 退出码：0 = 可以用了；2 = 插件装上了但缺 LivingMemory；1 = 卡住了。
 *
 * 它绝不：写用户的记忆库、删文件、git 提交、联网上传。
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discover, findAstrBotRoots, pickPluginDir } from '../packages/dsh-memory-sea/lib/discover.js'
import { openLivingMemory } from '../packages/dsh-memory-sea/lib/lm-source.js'
import { pickProfile, ensurePlugin, PLUGIN_NAME } from './lib/profile.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PKG_DIR = join(ROOT, 'packages', 'dsh-memory-sea')
const BRIDGE_DIR = join(ROOT, 'packages', 'astrbot-lm-bridge')
const DATA_DIR = join(PKG_DIR, 'data')
const CONFIG_FILE = join(DATA_DIR, 'config.json')
const BRIDGE_PLUGIN = 'astrbot_plugin_lm_bridge'

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? String(process.argv[i + 1] ?? fallback) : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const asJson = flag('json')
const dry = flag('dry')
const wantBridge = flag('bridge')
const forceBridge = flag('force-bridge')

const steps = []
const report = {
  status: 'ok',
  version: '0.1.0',
  node: process.versions.node,
  sqlite: false,
  profile: '',
  dbPath: '',
  astrbot: '',
  pluginsDir: '',
  bridge: '',
  wroteConfig: false,
  configFile: CONFIG_FILE,
  changes: [],
  problems: [],
  humanSteps: [],
  next: '',
}

function step(ok, label, detail = '') {
  steps.push({ ok, label, detail })
}
function problem(message, humanStep = '') {
  report.problems.push(message)
  if (humanStep && !report.humanSteps.includes(humanStep)) report.humanSteps.push(humanStep)
}

function readConfig() {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeConfig(patch, base = {}) {
  const merged = { ...base, ...patch }
  if (dry) return
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
}

function main() {
  // ---- 1. 地基 -----------------------------------------------------------
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major > 22 || (major === 22 && minor >= 5)) {
    step(true, `Node ${process.versions.node}`)
  } else {
    step(false, `Node ${process.versions.node} 太旧（要 >= 22.5）`)
    problem('Node 版本不够', '升级 DSH，或装一个 Node 22.5+')
  }
  try {
    // 动态 import：老 Node 上没有这个模块，直接 require 会崩
    const { DatabaseSync } = require_sqlite()
    const db = new DatabaseSync(':memory:')
    db.exec('create table t(a)')
    db.close()
    report.sqlite = true
    step(true, 'node:sqlite 可用')
  } catch (error) {
    step(false, 'node:sqlite 不可用')
    problem(`Node 里没有 SQLite：${String(error?.message ?? error)}`, '升级 Node 到 22.5+')
  }

  // ---- 2. profile --------------------------------------------------------
  const picked = pickProfile({ profile: arg('profile'), profileDir: arg('profile-dir') })
  if (!picked.dir || !existsSync(join(picked.dir, 'package.json'))) {
    step(false, '没定下要装进哪个 profile', picked.reason)
    problem(
      picked.reason,
      picked.candidates.length
        ? `用 --profile 指定一个：${picked.candidates.map((dir) => dir.split(/[\\/]/).pop()).join(', ')}`
        : '先打开一次 DSH，让它把 profile 建出来',
    )
  } else {
    report.profile = picked.dir
    step(true, 'profile', picked.dir)
  }

  // ---- 3. 找 LM ----------------------------------------------------------
  const existing = readConfig()
  const config = { ...existing }
  if (arg('astrbot')) config.astrbotRoot = arg('astrbot')

  const found = discover(config)
  if (found.path) {
    report.dbPath = found.path
    step(true, '找到 livingmemory', found.path)
    try {
      const lm = openLivingMemory(found.path)
      const stats = lm.stats()
      lm.close()
      step(true, '只读打开成功', `${stats.total} 条记忆`)
      if (stats.total === 0) step(false, '库里还没有记忆', '先和机器人聊几轮')
    } catch (error) {
      step(false, '打不开这个库', String(error?.message ?? error))
      report.dbPath = ''
      problem(`打不开 ${found.path}`, '确认路径指向 livingmemory.db 本身')
    }
  } else {
    step(false, '没找到 livingmemory 的库', found.tried.length ? `找过 ${found.tried.length} 个位置` : '没有候选')
    report.status = 'partial'
    // 「缺 LM」这句话要说得具体：它在不在、该放进哪个目录
    const roots = findAstrBotRoots()
    if (roots.length) {
      const pluginDir = pickPluginDir(roots[0])
      report.astrbot = roots[0]
      report.pluginsDir = pluginDir
      problem(
        `AstrBot 在 ${roots[0]}，但里面没有 LivingMemory`,
        `把 LM 放进 ${pluginDir}，重启 AstrBot，再重跑本脚本`,
      )
      report.next = '装好 LivingMemory 后再跑一次，就能把库接上'
    } else {
      problem(
        '这台机器上没有 AstrBot，也没有 LivingMemory',
        '先装 AstrBot（文档见 https://docs.astrbot.app），再装 LM，然后重跑本脚本',
      )
      report.next = 'LM 是记忆本体，它必须跑在 AstrBot 里；装好 AstrBot 再来'
    }
  }

  // ---- 4. 写配置 ---------------------------------------------------------
  const patch = {}
  if (report.dbPath && !existing.dbPath) patch.dbPath = report.dbPath
  if (Object.keys(patch).length) {
    writeConfig(patch, existing)
    report.wroteConfig = true
    step(true, `写配置 ${dry ? '（预演）' : ''}`, Object.keys(patch).join(', '))
  } else {
    step(true, '配置不用改', existsSync(CONFIG_FILE) ? '已经有 data/config.json' : '走自动发现')
  }

  // ---- 5. 挂进 profile ---------------------------------------------------
  if (report.profile) {
    try {
      const result = ensurePlugin(report.profile, PKG_DIR, { dry })
      report.changes = result.changes
      if (!result.changes.length) step(true, '插件已经挂着了', '不用改')
      else {
        step(true, `挂进 profile${dry ? '（预演）' : ''}`, `${result.changes.length} 处改动`)
        report.humanSteps.push('重启 DSH，左侧导航会多一个「记忆海」')
        report.humanSteps.push(`别删 ${ROOT}：DSH 是从这个目录加载插件的`)
      }
    } catch (error) {
      step(false, '改 profile 失败', String(error?.message ?? error))
      report.status = 'blocked'
      problem(`改 profile 失败：${String(error?.message ?? error)}`, '看 DSH 日志，或手动改 profile 的 package.json')
    }
  }

  // ---- 6. 可选：写入桥 ---------------------------------------------------
  if (!wantBridge) {
    step(true, '写入桥：没要求装（只读模式）', '要装加 --bridge')
  } else if (!report.dbPath) {
    step(false, '装桥需要一个能用的 LM', '先把 LivingMemory 装好')
  } else {
    // 从库的路径反推 AstrBot 的数据目录：<…>/data/plugin_data/astrbot_plugin_livingmemory/livingmemory.db
    // 反推不出来就宁可不动——装错位置比不装更麻烦。
    const dataDir = astrbotDataDirOf(report.dbPath)
    if (!dataDir) {
      step(false, '看不出 AstrBot 的目录结构', report.dbPath)
      problem(
        '这个库不在 AstrBot 的标准位置，推不出插件目录',
        '用 --astrbot <AstrBot 根目录> 重跑，或者手动把 packages/astrbot-lm-bridge 放进插件目录',
      )
    } else {
      const pluginsDir = join(dataDir, 'plugins')
      const target = join(pluginsDir, BRIDGE_PLUGIN)
      if (existsSync(target) && !forceBridge) {
        report.bridge = target
        step(true, '写入桥已经在', target)
      } else {
        try {
          if (!dry) {
            mkdirSync(pluginsDir, { recursive: true })
            cpSync(BRIDGE_DIR, target, {
              recursive: true,
              filter: (src) => !/[\\/](__pycache__|data)([\\/]|$)/.test(src),
            })
          }
          report.bridge = target
          step(true, `写入桥${dry ? '（预演）' : ''}`, target)
          // 顺手把 token 文件的位置填进配置，但不打开开关：桥还没跑过，token 还不存在
          const tokenFile = join(dataDir, 'plugin_data', BRIDGE_PLUGIN, 'token.txt')
          const cfg = readConfig()
          const capture = cfg.capture && typeof cfg.capture === 'object' ? cfg.capture : {}
          if (!capture.tokenFile) {
            writeConfig({ capture: { ...capture, tokenFile } }, cfg)
            step(true, '配置里记下 token 文件位置', tokenFile)
          }
          report.humanSteps.push('重启 AstrBot，确认 http://127.0.0.1:8792/health 里 engine 为 true')
          report.humanSteps.push('把 data/config.json 的 capture.enabled 改成 true，再重启 DSH')
        } catch (error) {
          step(false, '装桥失败', String(error?.message ?? error))
          problem(`装桥失败：${String(error?.message ?? error)}`, '手动把 packages/astrbot-lm-bridge 放进 AstrBot 的 plugins 目录')
        }
      }
    }
  }

  // ---- 输出 --------------------------------------------------------------
  if (report.problems.length && report.status === 'ok') report.status = 'partial'
  if (!report.profile || !report.sqlite) report.status = 'blocked'

  if (asJson) {
    console.log(JSON.stringify({ ...report, steps }, null, 2))
  } else {
    for (const item of steps) {
      console.log(`  ${item.ok ? '✓' : '!'} ${item.label}${item.detail ? `  —— ${item.detail}` : ''}`)
    }
    console.log('')
    console.log(`STATUS: ${report.status}`)
    if (report.profile) console.log(`PROFILE: ${report.profile}`)
    if (report.dbPath) console.log(`DB: ${report.dbPath}`)
    if (report.astrbot) console.log(`ASTRBOT: ${report.astrbot}`)
    if (report.pluginsDir) console.log(`PLUGINS_DIR: ${report.pluginsDir}`)
    if (report.bridge) console.log(`BRIDGE: ${report.bridge}`)
    for (const item of report.problems) console.log(`PROBLEM: ${item}`)
    for (const item of report.humanSteps) console.log(`HUMAN_STEP: ${item}`)
    if (report.next) console.log(`NEXT: ${report.next}`)
  }

  if (report.status === 'blocked') process.exitCode = 1
  else if (report.status === 'partial') process.exitCode = 2
}

/**
 * 从库的路径反推 AstrBot 的数据目录（放在 plugin_data 上面那一层）。
 * 认不出就返回空串——宁可不装桥，也不要往一个猜出来的目录里塞文件。
 */
function astrbotDataDirOf(dbPath) {
  const norm = String(dbPath ?? '').replace(/\\/g, '/')
  const match = /^(.*)\/plugin_data\/astrbot_plugin_livingmemory\/livingmemory\.db$/i.exec(norm)
  return match ? match[1] : ''
}

/** 老 Node 上没有 node:sqlite，动态取一下，让报错落进体检而不是崩在 import。 */
function require_sqlite() {
  // eslint-disable-next-line global-require
  return process.getBuiltinModule
    ? process.getBuiltinModule('node:sqlite')
    : null
}

main()
