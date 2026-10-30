// 找 livingmemory 的库。
//
// 不写死任何一台机器的路径。顺序：
//   配置（dbPath / astrbotDataDir）→ 环境变量 → astrbotRoot → 常见安装位置
// 全找不到也不是错误——面板会给出「去装 LM」的引导（见 lm-http.js 的 missing 分支）。
//
// 为什么要"常见安装位置"这一层：用户把仓库丢给 agent 时，没人会告诉它 AstrBot 装在哪。
// 几个 stat 调用而已，能找到就是省掉一轮问答。

import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DB_NAME = 'livingmemory.db'
export const PLUGIN_DIR = 'astrbot_plugin_livingmemory'

/** AstrBot 里这个插件的数据目录，两种布局都覆盖。 */
function layouts(root) {
  return [
    // 单实例安装：<root>/data/plugin_data/...
    join(root, 'data', 'plugin_data', PLUGIN_DIR, DB_NAME),
    // 多实例安装：<root>/instances/<uuid>/core/data/plugin_data/...
    ...instanceDirs(root).map((dir) => join(dir, 'core', 'data', 'plugin_data', PLUGIN_DIR, DB_NAME)),
  ]
}

function instanceDirs(root) {
  const base = join(root, 'instances')
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(base, entry.name))
  } catch {
    return []
  }
}

/**
 * 常见安装位置。只做 stat，不写、不递归。
 * 用户的机器千奇百怪，这几个覆盖"一键包"和"自己 clone"两种习惯。
 */
function commonRoots() {
  const out = []
  const home = homedir()
  const env = process.env

  if (process.platform === 'win32') {
    // 盘根下的一键包。两种拼法都要试：官方叫 AstrBot，但社区里有人装成 AstroBot。
    for (const drive of 'CDEFGH') {
      for (const name of ['AstrBot', 'AstroBot', 'astrbot', 'astrobot']) out.push(`${drive}:\\${name}`)
    }
    for (const name of ['AstrBot', 'AstroBot']) {
      out.push(join(home, name), join(home, 'Desktop', name), join(home, 'Documents', name))
      if (env.LOCALAPPDATA) out.push(join(env.LOCALAPPDATA, name), join(env.LOCALAPPDATA, 'Programs', name))
      if (env.APPDATA) out.push(join(env.APPDATA, name))
    }
  } else {
    for (const name of ['AstrBot', 'AstroBot', 'astrbot']) {
      out.push(join(home, name), join(home, 'apps', name), `/opt/${name}`, `/usr/local/${name}`)
    }
  }
  return out
}

/**
 * AstrBot 的插件目录（LM 该放哪儿、写入桥该放哪儿）。
 * 单实例和多实例两种布局都给出来，调用方自己挑。
 */
export function pluginDirsOf(root) {
  const out = [join(root, 'data', 'plugins')]
  for (const dir of instanceDirs(root)) out.push(join(dir, 'core', 'data', 'plugins'))
  return out
}

/**
 * 挑出真正该用的那个插件目录：
 * 已经存在的优先；都不存在时，多实例装法用实例目录，单实例用 data/plugins。
 */
export function pickPluginDir(root) {
  const dirs = pluginDirsOf(root)
  const existing = dirs.find((dir) => existsSync(dir))
  if (existing) return existing
  return dirs.length > 1 ? dirs[1] : dirs[0]
}

/**
 * 这台机器上有没有 AstrBot（哪怕没装 LM）。
 * 用来把"缺 LM"这句话说得更具体：它在哪儿、LM 该放进哪个目录。
 */
export function findAstrBotRoots() {
  const seen = new Set()
  const out = []
  const caseInsensitive = process.platform === 'win32'
  for (const root of commonRoots()) {
    // Windows 大小写不敏感：「AstroBot」和「astrobot」是同一个目录，别收两遍
    const key = caseInsensitive ? root.toLowerCase() : root
    if (seen.has(key) || !existsSync(root)) continue
    // 认一下：AstrBot 的目录里总有 data / instances / main.py 之一
    const looksRight =
      existsSync(join(root, 'data')) || existsSync(join(root, 'instances')) || existsSync(join(root, 'main.py'))
    if (!looksRight) continue
    seen.add(key)
    out.push(root)
  }
  return out
}

/**
 * @param {object} config 插件配置
 * @returns {{ path: string, tried: string[] }}
 */
export function discover(config = {}) {
  const tried = []
  const seen = new Set()

  const check = (candidate) => {
    if (!candidate) return ''
    const value = String(candidate).trim()
    if (!value || seen.has(value)) return ''
    seen.add(value)
    tried.push(value)
    return existsSync(value) ? value : ''
  }

  // ① 显式给了路径：以它为准，**不回落**去猜别的。
  //    猜错的代价比"没找到"大得多——那会把别人的库显示成你的。
  const explicit = config?.dbPath
    || process.env.MEMORY_SEA_DB
    || (config?.astrbotDataDir ? join(String(config.astrbotDataDir), 'plugin_data', PLUGIN_DIR, DB_NAME) : '')
  if (explicit) {
    const value = String(explicit).trim()
    tried.push(value)
    return { path: existsSync(value) ? value : '', tried }
  }

  // ② 给根目录（配置里的优先，然后是常见位置）
  const roots = [
    config?.astrbotRoot,
    process.env.ASTRBOT_ROOT,
    ...commonRoots(),
  ].filter(Boolean)

  for (const root of roots) {
    for (const candidate of layouts(String(root))) {
      const hit = check(candidate)
      if (hit) return { path: hit, tried }
    }
  }

  return { path: '', tried }
}
