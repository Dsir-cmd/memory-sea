#!/usr/bin/env node
/**
 * 体检：换一台机器 / 装完插件的第一个命令。
 * ---------------------------------------------------------------------------
 * 它不启动任何东西，只回答一个问题：**这扇窗现在能不能开**。
 *
 *   node scripts/doctor.mjs
 *   node scripts/doctor.mjs --dsh http://127.0.0.1:53792
 *
 * 十项逐个查，红的直接给「怎么办」。退出码 1 表示有硬伤（缺依赖 / 打不开库）。
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discover } from '../packages/dsh-memory-sea/lib/discover.js'
import { openLivingMemory } from '../packages/dsh-memory-sea/lib/lm-source.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = join(ROOT, 'packages', 'dsh-memory-sea')
const DATA = join(PKG, 'data')
const CONFIG = join(DATA, 'config.json')

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? String(process.argv[i + 1] ?? fallback) : fallback
}

const DSH_URL = arg('dsh', 'http://127.0.0.1:53792').replace(/\/+$/, '')
const asJson = process.argv.includes('--json')

const results = []
let hardFail = false

function pass(label, detail) {
  results.push({ kind: 'ok', label, detail })
}
function warn(label, detail) {
  results.push({ kind: 'warn', label, detail })
}
function bad(label, detail, howto = '') {
  results.push({ kind: 'bad', label, detail, howto })
  hardFail = true
}

async function main() {
  // 1. Node 与 node:sqlite —— 这是整个插件的地基，老机器上最容易缺
  const [major, minor] = process.versions.node.split('.').map(Number)
  const nodeOk = major > 22 || (major === 22 && minor >= 5)
  if (!nodeOk) {
    bad(`Node 版本 ${process.versions.node} 太旧`, '需要 >= 22.5', '升级 DSH（它自带 Node）；或单独装一个 22.5+')
  } else {
    pass(`Node ${process.versions.node}`)
  }
  try {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(':memory:')
    db.exec('create table t(a)')
    db.close()
    pass('node:sqlite 可用')
  } catch (error) {
    bad('node:sqlite 不可用', String(error?.message ?? error), 'Node 版本不够，或这版 Node 没编进 SQLite')
  }

  // 2. 文件齐不齐
  const required = [
    'index.js',
    'client.js',
    'cordis.patch.yml',
    'config.example.json',
    'lib/lm-source.js',
    'lib/lm-http.js',
    'lib/scope.js',
    'lib/discover.js',
    'locale/zh.json',
    'icon.svg',
  ]
  const missing = required.filter((rel) => !existsSync(join(PKG, rel)))
  if (missing.length) bad('插件文件不全', missing.join(', '), '重新 clone 或重新 pack，别只拷一半')
  else pass('插件文件齐全（10 项）')

  // 3. 配置
  let config = {}
  if (existsSync(CONFIG)) {
    try {
      config = JSON.parse(readFileSync(CONFIG, 'utf8'))
      pass('读到了 data/config.json', `键：${Object.keys(config).join(', ') || '（空）'}`)
    } catch (error) {
      bad('data/config.json 不是合法 JSON', String(error?.message ?? error), '删掉重来，或照 config.example.json 抄')
      config = {}
    }
  } else {
    warn('没有 data/config.json', '会走自动发现 + 默认值', '要指定库就复制 config.example.json')
  }

  // 4. 找库
  const found = discover(config)
  if (!found.path) {
    bad(
      '没找到 livingmemory 的库',
      found.tried.length ? `找过 ${found.tried.length} 个位置` : '没有任何候选路径',
      '在 data/config.json 里写 "dbPath" 或 "astrbotRoot"',
    )
  } else {
    pass('找到库', found.tried[found.tried.length - 1])
  }

  // 5. 打开 + 看数据结构
  let lm = null
  if (found.path) {
    try {
      lm = openLivingMemory(found.path)
      const stats = lm.stats()
      const meta = lm.meta()
      pass(
        '只读打开成功',
        `${stats.total} 条记忆 / ${stats.atoms} 原子 / ${stats.nodes} 节点 · db_version ${meta.dbVersion ?? '未知'}`,
      )
      if (stats.total === 0) warn('库里一条记忆都没有', 'LM 装好了但还没记东西', '先聊几轮，再 /lmem status 确认')
      if (!meta.hasGraph) warn('没有图谱表', '图谱页签会是空的', 'LM 版本较旧，或还没建图')
    } catch (error) {
      bad('打不开这个库', String(error?.message ?? error), '确认路径指向 livingmemory.db 本身，且 AstrBot 不是以别的用户跑')
    }
  }

  // 6. 注入块
  if (lm) {
    try {
      const text = lm.contextText({ maxChars: 1400, recent: 6 })
      if (!text.trim()) warn('注入块是空的', '记忆条数可能为 0', '')
      else pass('注入块能拼出来', `${text.length} 字，首行：${text.split('\n')[0]}`)
    } catch (error) {
      bad('注入块拼不出来', String(error?.message ?? error))
    }
  }

  // 7. 写回桥（可选）
  const capture = config.capture ?? {}
  if (capture.enabled !== true) {
    warn('写回没开（正常）', '只读模式，不需要桥', '要用写回再装 astrbot-lm-bridge')
  } else {
    const base = String(capture.base ?? 'http://127.0.0.1:8792')
    let token = String(capture.token ?? '')
    if (!token && capture.tokenFile && existsSync(String(capture.tokenFile))) {
      try {
        token = readFileSync(String(capture.tokenFile), 'utf8').trim()
      } catch {
        /* 下面会报 token 不对 */
      }
    }
    try {
      const res = await fetch(`${base}/health`, {
        headers: { 'X-Token': token },
        signal: AbortSignal.timeout(2500),
      })
      const body = await res.json()
      if (body.engine === false) bad('桥起来了，但拿不到 LM 的引擎', `${base}/health → engine:false`, 'LM 没就绪，或版本换了内部结构')
      else if (body.tokenOk === false) bad('桥的 token 不对', `${base}/health → tokenOk:false`, '指对 tokenFile，或把 token.txt 里的字符串填进 capture.token')
      else pass('写回桥正常', `${base} · engine:${body.engine}`)
    } catch (error) {
      bad('连不上写回桥', `${base} — ${String(error?.message ?? error)}`, '装 astrbot-lm-bridge 并重启 AstrBot')
    }
  }

  // 8. DSH 里的面板（插件真的挂上了吗）
  try {
    const res = await fetch(`${DSH_URL}/memory-sea/status`, { signal: AbortSignal.timeout(2500) })
    if (res.status === 404) {
      bad('DSH 在跑，但没挂这个插件', `GET ${DSH_URL}/memory-sea/status → 404`, 'profile 的 bundles 里要加 dsh-memory-sea，然后重启 DSH')
    } else if (!res.ok) {
      bad('面板接口返回异常', `HTTP ${res.status}`, '看 DSH 日志里 [memory-sea] 开头的行')
    } else {
      const body = await res.json()
      if (body.missing) warn('面板挂着，但库没接上', body.reason ?? '', '同第 4 项')
      else pass('面板已挂上 DSH', `source:${body.source} · ${body.counts?.documents ?? 0} 条`)
    }
  } catch {
    warn('连不上 DSH', `${DSH_URL} 没开，或者换了端口`, '换个端口加 --dsh，或者先把 DSH 打开再看面板')
  }

  if (lm) lm.close()

  // ---- 输出 --------------------------------------------------------------
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          status: hardFail ? 'blocked' : 'ok',
          node: process.versions.node,
          dsh: DSH_URL,
          problems: results
            .filter((item) => item.kind === 'bad')
            .map((item) => `${item.label}${item.detail ? ` —— ${item.detail}` : ''}`),
          warnings: results
            .filter((item) => item.kind === 'warn')
            .map((item) => `${item.label}${item.detail ? ` —— ${item.detail}` : ''}`),
          checks: results,
        },
        null,
        2,
      ),
    )
  } else {
    const mark = { ok: '✓', warn: '!', bad: '✗' }
    console.log('')
    for (const item of results) {
      console.log(`  ${mark[item.kind]} ${item.label}${item.detail ? `  —— ${item.detail}` : ''}`)
      if (item.kind !== 'ok' && item.howto) console.log(`      怎么办：${item.howto}`)
    }
    const ok = results.filter((r) => r.kind === 'ok').length
    const warnCount = results.filter((r) => r.kind === 'warn').length
    const badCount = results.filter((r) => r.kind === 'bad').length
    console.log(`\n${ok} 正常 · ${warnCount} 提示 · ${badCount} 有问题`)
    if (hardFail) console.log('先处理带 ✗ 的项，再回去看面板。')
  }

  if (hardFail) process.exitCode = 1
}

await main()
