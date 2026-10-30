// 记忆海 —— 在 DSH 里给 livingmemory 开一扇窗。
//
// 责任边界：
//   · 记忆归 livingmemory。这里不存记忆、不衰减、不压缩、不做第二套引擎。
//   · 读：直接只读 LM 的 SQLite（不依赖 AstrBot 在跑）。
//   · 写（可选）：把 DSH 里的对话提炼成记忆，交给 AstrBot 侧的 lm-bridge 代写，
//     因为跨进程改 LM 的 FAISS 索引会打架。
//
// 找不到 LM 的库时插件照常加载：面板给出「去装 livingmemory」的引导，不报错、不白屏。

import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { PACKAGE_ROOT } from './lib/paths.js'
import { SettingsStore } from './lib/settings.js'
import { Judge } from './lib/judge.js'
import { openLivingMemory } from './lib/lm-source.js'
import { createLmHttpHandler } from './lib/lm-http.js'
import { LmCapture } from './lib/lm-capture.js'
import { discover } from './lib/discover.js'
import { resolveScope, describeScope } from './lib/scope.js'
import { loadConfig, CONFIG_FILE } from './lib/config.js'

export const name = 'memory-sea'
export const inject = ['systemPrompt', 'webServer']

const VERSION = '0.1.0'
const ROUTE = '/memory-sea'

function log(ctx, level, message) {
  try {
    const logger = ctx.logger
    if (logger && typeof logger[level] === 'function') logger[level](`[memory-sea] ${message}`)
    else console[level === 'warn' ? 'warn' : 'log'](`[memory-sea] ${message}`)
  } catch {
    /* logging must never break the plugin */
  }
}

export function apply(ctx, rawConfig = {}) {
  const dataDir = resolve(PACKAGE_ROOT, String(rawConfig?.dataDir ?? 'data'))
  // DSH 传进来的配置优先；平时改 data/config.json 就行
  const config = loadConfig(rawConfig, dataDir)

  // ---- 记忆源：只读 livingmemory ------------------------------------------
  const found = discover(config)
  let lm = null
  let reason = ''
  if (found.path) {
    try {
      lm = openLivingMemory(found.path)
      log(ctx, 'info', `记忆源 ${found.path}（只读）`)
    } catch (error) {
      reason = `打不开 ${found.path}：${String(error?.message ?? error)}`
      log(ctx, 'warn', reason)
    }
  } else {
    reason = '还没找到 livingmemory 的记忆库'
    log(
      ctx,
      'info',
      `没找到 livingmemory 的记忆库（找过 ${found.tried.length} 个位置）。在 data/${CONFIG_FILE} 里写 dbPath 或 astrbotRoot 再重启即可`,
    )
  }

  // ---- 写回（可选）：v0.2 的能力，默认关 --------------------------------
  const captureConfig = config?.capture ?? {}
  const captureEnabled = Boolean(lm) && captureConfig.enabled === true
  let capture = null
  let settings = null

  if (captureEnabled) {
    settings = new SettingsStore(dataDir, config?.settings)
    const scope = resolveScope(config)
    const judge = new Judge(ctx, settings)
    capture = new LmCapture({
      judge,
      settings,
      bridge: {
        base: String(captureConfig.base ?? 'http://127.0.0.1:8792'),
        token: String(captureConfig.token ?? ''),
        tokenFile: String(captureConfig.tokenFile ?? ''),
        scope,
        personaId: String(captureConfig.personaId ?? '').trim(),
      },
      log: (level, message) => log(ctx, level, message),
    })
    log(ctx, 'info', `写回作用域 ${scope} —— ${describeScope(scope)}`)
  }

  const boot = (async () => {
    if (!capture) return
    await settings.load()
    // 提炼模型可以只写在 capture 里，省得用户再去翻 data/settings.json
    const provider = String(captureConfig.provider ?? '').trim()
    const model = String(captureConfig.model ?? '').trim()
    if (provider || model) {
      await settings.save({ judge: { ...(provider ? { provider } : {}), ...(model ? { model } : {}) } })
    }
    if (!capture.bridge.token && capture.bridge.tokenFile) {
      try {
        capture.bridge.token = (await readFile(capture.bridge.tokenFile, 'utf8')).trim()
      } catch (error) {
        log(ctx, 'warn', `读不到写入令牌 ${capture.bridge.tokenFile}：${String(error?.message ?? error)}`)
      }
    }
    const ok = await capture.checkBridge()
    log(
      ctx,
      ok ? 'info' : 'warn',
      ok ? 'lm-bridge 已连接：DSH 的记忆会写回 livingmemory' : 'lm-bridge 未就绪：先攒着，起来再写',
    )
  })().catch((error) => {
    log(ctx, 'warn', `初始化失败：${String(error?.stack ?? error)}`)
  })

  // ---- 注入：DSH 每轮看到的"记忆" -----------------------------------------
  ctx.effect(
    () =>
      ctx.systemPrompt.context({
        name: 'memory-sea',
        order: 940,
        interpolate: false,
        text: () => {
          if (!lm) return ''
          try {
            return lm.contextText({
              maxChars: Math.max(200, Number(config?.contextChars ?? 1400)),
              recent: Math.max(0, Number(config?.contextRecent ?? 6)),
            })
          } catch (error) {
            log(ctx, 'warn', `读取记忆失败：${String(error?.message ?? error)}`)
            return ''
          }
        },
      }),
    'memory-sea: prompt context',
  )

  // ---- 采集：只在显式打开写回时装配 ---------------------------------------
  if (capture) {
    ctx.effect(() => {
      const dispose = ctx.on('session/event', (session, event) => {
        try {
          capture.onSessionEvent(session, event)
        } catch {
          /* capture is best-effort */
        }
      })
      // 兜底：即使没攒够轮次，也每 5 分钟试一次提炼/补写
      const timer = setInterval(() => {
        void capture.ingest()
      }, 300000)
      return () => {
        dispose()
        clearInterval(timer)
      }
    }, 'memory-sea: capture to livingmemory')
  }

  // ---- 面板接口 -----------------------------------------------------------
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: createLmHttpHandler({
          ctx,
          lm,
          version: VERSION,
          reason,
          tried: found.tried,
        }),
      }),
    'memory-sea: http route',
  )

  // ---- 卸载：关掉只读连接 --------------------------------------------------
  if (lm) {
    ctx.effect(
      () => () => {
        try {
          lm.close()
        } catch {
          /* already closed */
        }
      },
      'memory-sea: lm close',
    )
  }
}
