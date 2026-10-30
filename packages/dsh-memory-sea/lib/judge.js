// 提炼：把 DSH 里的一小段对话，交给一个便宜的模型压成 0–8 条记忆。
//
// 只保留 "extract"（写回时要用的那一步）。
// 复审 / 压缩 / 衰减是旧三段式引擎的活，LM 自己会做，这里不留。

import { DETAIL_CHARS } from './settings.js'
import { cleanText, clip, formatDateTime, parseLooseJson } from './text.js'

const MAX_SUMMARY = 42

function detailBudget(settings, partition = 'short') {
  return DETAIL_CHARS[settings.detail[partition]] ?? 80
}

function judgeRoute(settings) {
  return { provider: String(settings.judge.provider).trim(), model: String(settings.judge.model).trim() }
}

const effortCache = new Map()

/**
 * 提炼不该把预算花在推理上：挑这个模型 advertised 的最低档 effort，
 * 模型没有这个概念时就不传这个字段。
 */
async function pickEffort(ctx, provider, model) {
  const key = `${provider}/${model}`
  if (effortCache.has(key)) return effortCache.get(key)
  let effort
  try {
    const llm = ctx.get('llm')
    const info = await llm.resolveModelInfo(provider, model)
    const efforts = info?.reasoning?.efforts ?? []
    const preferred = ['minimal', 'low', 'medium', 'none']
    effort = efforts.find((entry) => preferred.includes(String(entry.id).toLowerCase()))?.id
      ?? info?.reasoning?.defaultEffort
  } catch {
    effort = undefined
  }
  effortCache.set(key, effort)
  return effort
}

/** One JSON-only model call with a timeout, returning raw assistant text. */
export async function callModel(ctx, settings, { system, user, maxTokens, onUsage }) {
  const llm = ctx.get('llm')
  if (!llm || typeof llm.stream !== 'function') throw new Error('llm service is not available in this profile')
  const route = judgeRoute(settings)
  if (!route.provider || !route.model) throw new Error('提炼模型还没配置（judge.provider / judge.model）')
  const signal = AbortSignal.timeout(settings.judge.timeoutMs)
  const reasoningEffort = await pickEffort(ctx, route.provider, route.model)
  const stream = llm.stream({
    provider: route.provider,
    model: route.model,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
    temperature: settings.judge.temperature,
    maxTokens: maxTokens ?? settings.judge.maxTokens,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
    signal,
  })
  let text = ''
  let failure = ''
  let usage
  for await (const chunk of stream) {
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'usage') usage = chunk.usage
    else if (chunk.type === 'finish') {
      const reason = chunk.reason ?? {}
      if (reason.kind !== 'stop' && reason.kind !== 'tool-calls' && reason.kind !== 'max-tokens') {
        failure = reason.failure?.message ?? reason.kind ?? 'model call failed'
      }
    }
  }
  if (usage && typeof onUsage === 'function') {
    try { onUsage(usage) } catch { /* accounting must never break the call */ }
  }
  if (failure && !text.trim()) throw new Error(failure)
  if (!text.trim()) throw new Error('model returned an empty reply (token budget too small?)')
  return text
}

const EXTRACT_SYSTEM = `你是一个长期记忆的整理器。你要把刚刚发生的一小段对话，压缩成以后真的用得上的记忆。

只输出一个 JSON 对象，不要解释、不要 Markdown 代码块：
{"items":[{"summary":"...","detail":"...","weight":0,"tags":["..."],"keywords":["..."],"kind":"short","turn":1}]}

规则：
1. summary 是一句独立可读的事实，不超过 ${MAX_SUMMARY} 个字。
2. detail 只补充对话里确实出现过的信息，不推测、不编造，不超过 {{DETAIL}} 字。
3. weight 是这件事以后还重不重要：寒暄 5-20；普通日常 30-50；偏好、计划、约定 55-75；身份、底线、承诺、重要情感 80-100。
4. kind 三选一：
   - short：几天后就没用的琐事、临时状态、随手聊的内容；
   - long：几周内仍然有用的事实、近况、计划、关系进展；
   - permanent：对方是谁、性格、习惯、喜好、底线、长期约定、重要情感事件。
5. turn 是这条记忆来自第几段对话（输入里的 #编号），必须填。
6. 把「今天/昨天/刚才」换成具体日期；用第三人称写（「对方」「助手」）。
7. 一条记忆只讲一件事；没有值得记的内容就输出 {"items":[]}；最多 {{MAX}} 条。
8. 不记录系统提示、工具调用、代码、报错；不重复对话原文。`

function renderTurns(turns, settings) {
  const budget = detailBudget(settings, 'short') * 3
  return turns
    .map((turn, index) => {
      const at = formatDateTime(turn.at)
      const user = clip(cleanText(turn.user), budget)
      const assistant = clip(cleanText(turn.assistant), budget)
      return `#${index + 1} [${at}]\n对方：${user}\n助手：${assistant}`
    })
    .join('\n\n')
}

function normalizeItem(raw, settings, fallbackKind = 'short') {
  if (!raw || typeof raw !== 'object') return undefined
  const summary = cleanText(String(raw.summary ?? '')).slice(0, MAX_SUMMARY)
  if (!summary) return undefined
  const kind = ['short', 'long', 'permanent'].includes(raw.kind) ? raw.kind : fallbackKind
  const detail = clip(cleanText(String(raw.detail ?? '')), detailBudget(settings, kind))
  const weight = Math.max(0, Math.min(100, Math.round(Number(raw.weight) || 0)))
  const turn = Math.max(1, Math.round(Number(raw.turn) || 0)) || undefined
  const tags = Array.isArray(raw.tags) ? raw.tags.map((tag) => cleanText(String(tag)).slice(0, 8)).filter(Boolean).slice(0, 4) : []
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((word) => cleanText(String(word)).slice(0, 12)).filter(Boolean).slice(0, 8)
    : []
  return { summary, detail, weight, tags, keywords, kind, turn }
}

export class Judge {
  constructor(ctx, settings, onUsage) {
    this.ctx = ctx
    this.settings = settings
    this.onUsage = onUsage
  }

  available() {
    const llm = this.ctx.get('llm')
    return Boolean(llm && typeof llm.stream === 'function')
  }

  async extract(turns) {
    const settings = this.settings.get()
    const system = EXTRACT_SYSTEM
      .replace('{{DETAIL}}', String(detailBudget(settings, 'short')))
      .replace('{{MAX}}', '8')
    const user = `现在是 ${formatDateTime(Date.now())}。请整理下面这段对话：\n\n${renderTurns(turns, settings)}`
    const first = await callModel(this.ctx, settings, { system, user, maxTokens: settings.judge.maxTokens, onUsage: this.onUsage })
    let parsed
    try {
      parsed = parseLooseJson(first)
    } catch {
      // Output was cut off (long batch / reasoning): retry once with a bigger
      // budget and an explicit reminder, instead of failing this cycle.
      const retry = await callModel(this.ctx, settings, {
        system,
        user: `${user}\n\n注意：你上一次的输出被截断了。这次只输出一个完整、紧凑的 JSON 对象，确保最后的右括号存在。`,
        maxTokens: Math.min(8000, Math.max(settings.judge.maxTokens * 2, 2400)),
        onUsage: this.onUsage,
      })
      parsed = parseLooseJson(retry)
    }
    const items = Array.isArray(parsed.items) ? parsed.items : []
    return items.map((item) => normalizeItem(item, settings, 'short')).filter(Boolean).slice(0, 8)
  }
}
