// 配置：DSH 传进来的 config 之上，再叠一层 data/config.json。
//
// 为什么要有文件这一层：改 DSH 的 bundle patch 对普通用户太重了。
// 把 `config.example.json` 复制成 `data/config.json` 改一改就能用，
// 而且升级插件不会被覆盖。两处都写时，DSH 传进来的那个优先。

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const CONFIG_FILE = 'config.json'

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function merge(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(base[key])) out[key] = merge(base[key], value)
    else out[key] = value
  }
  return out
}

/**
 * @param {object} passed  DSH 传进来的 config
 * @param {string} dataDir 插件的 data 目录
 * @returns {object}
 */
export function loadConfig(passed = {}, dataDir = '') {
  let local = {}
  const file = dataDir ? join(dataDir, CONFIG_FILE) : ''
  if (file && existsSync(file)) {
    try {
      const raw = readFileSync(file, 'utf8')
      // 记事本另存会带 BOM
      const parsed = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw)
      if (isPlainObject(parsed)) local = parsed
    } catch {
      // 配置写坏了就当没有：插件照常起，只是用默认值
      local = {}
    }
  }
  return merge(local, isPlainObject(passed) ? passed : {})
}
