// DSH 侧采集：保留原来「攒轮次 → LLM 提炼 → 入库」的设计，
// 只把「入库」换成 POST 给 AstrBot 侧的 lm-bridge，由 livingmemory 自己写。
//
// 为什么不是直接写库：LM 的写入要生成向量并改 FAISS 索引，跨进程写会打架。
// 所以提炼留在 DSH，写入交给持有引擎的那一侧。

const MAX_TURN_CHARS = 4000
const MAX_PENDING_TURNS = 200
const MAX_RETRY_ITEMS = 100

export class LmCapture {
  constructor({ judge, bridge, settings, log = () => {} }) {
    this.judge = judge
    this.bridge = bridge // { base, token, enabled }
    this.settings = settings
    this.log = log
    this.ready = false
    this.disabled = false
    this.ingesting = false
    this.buffers = new Map()
    this.pending = []
    this.retry = []
  }

  /** bridge 是否可用；token 不对就直接停掉采集，避免一直空转重试。 */
  async checkBridge() {
    if (!this.bridge?.base) return false
    if (this.disabled) return false
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2500)
      const res = await fetch(`${this.bridge.base}/health`, {
        headers: { 'X-Token': this.bridge.token ?? '' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) return false
      const body = await res.json()
      if (body?.tokenOk === false) {
        this.disabled = true
        this.log('warn', 'lm-bridge 的 token 不对，DSH 记忆写回已停用（检查 captureToken / token.txt）')
        return false
      }
      this.ready = Boolean(body?.engine)
      return this.ready
    } catch {
      this.ready = false
      return false
    }
  }

  // ---------------------------------------------------------------- 采集
  onSessionEvent(session, event) {
    if (!session || !event) return
    const header = session.header
    if (header?.parentSession || header?.origin === 'subagent') return
    const id = String(session.id ?? header?.id ?? '')
    if (!id) return
    const buffer = this.buffers.get(id) ?? { user: '', assistant: '', at: 0 }

    if (event.type === 'user/message') {
      const message = event.data
      if (message?.source?.kind !== 'user') return
      const text = messageText(message.content)
      if (text) {
        buffer.user = clip(text, MAX_TURN_CHARS)
        buffer.assistant = ''
        buffer.at = event.time ?? Date.now()
        this.buffers.set(id, buffer)
      }
      return
    }
    if (event.type === 'assistant/message') {
      const text = messageText(event.data?.message?.content)
      if (text) {
        buffer.assistant = clip(text, MAX_TURN_CHARS)
        this.buffers.set(id, buffer)
      }
      return
    }
    if (event.type === 'turn/end') {
      if (!buffer.user || !buffer.assistant || event.data?.reason?.kind !== 'completed') {
        this.buffers.delete(id)
        return
      }
      this.buffers.delete(id)
      this.enqueue({ at: buffer.at || event.time || Date.now(), user: buffer.user, assistant: buffer.assistant })
    }
  }

  enqueue(turn) {
    this.pending.push(turn)
    if (this.pending.length > MAX_PENDING_TURNS) this.pending = this.pending.slice(-MAX_PENDING_TURNS)
    const every = Math.max(1, Number(this.settings?.get?.()?.writeEveryTurns ?? 3))
    if (this.pending.length >= every) void this.ingest()
  }

  // ---------------------------------------------------------------- 提炼 + 写
  async ingest() {
    if (this.ingesting || this.disabled) return
    if (!this.pending.length && !this.retry.length) return
    if (!this.judge?.available?.()) {
      this.log('warn', 'llm 不可用，DSH 记忆暂缓提炼')
      return
    }
    if (!this.ready && !(await this.checkBridge())) {
      this.log('warn', 'lm-bridge 还没就绪，DSH 记忆留在队列里')
      return
    }
    this.ingesting = true
    try {
      const turns = this.pending.slice(-40)
      this.pending = this.pending.slice(turns.length)
      let items = []
      if (turns.length) {
        try {
          items = await this.judge.extract(turns)
        } catch (error) {
          this.log('warn', `提炼失败，轮次放回队列: ${String(error?.message ?? error)}`)
          this.pending = [...turns, ...this.pending].slice(-MAX_PENDING_TURNS)
          items = []
        }
      }
      const queue = [...this.retry, ...items]
      this.retry = []
      let ok = 0
      for (const raw of queue) {
        const text = composeText(raw)
        if (!text) continue
        const payload = {
          text,
          importance: importanceOf(raw),
          // 关键：必须写进和另一边同一个作用域。
          // LM 的检索按 session_id 过滤，作用域写错时记忆写得进去、对面永远召不回，
          // 而且不会报任何错——所以这里不拼字符串，统一由 lib/scope.js 解析。
          session_id: String(this.bridge.scope || 'livingmemory:global'),
          ...(this.bridge.personaId ? { persona_id: String(this.bridge.personaId) } : {}),
          metadata: {
            source: 'dsh',
            cross_surface: true,
            topics: [...new Set([...(raw.tags ?? []), ...(raw.keywords ?? [])])].slice(0, 8),
            key_facts: [String(raw.summary ?? '')].filter(Boolean),
            event_at: raw.eventAt ?? Date.now(),
          },
        }
        if (await this.post(payload)) ok += 1
        else this.retry.push(raw)
      }
      if (this.retry.length > MAX_RETRY_ITEMS) this.retry = this.retry.slice(-MAX_RETRY_ITEMS)
      if (ok) this.log('info', `DSH 记忆已写入 livingmemory：${ok} 条`)
    } finally {
      this.ingesting = false
    }
  }

  async post(payload) {
    try {
      const res = await fetch(`${this.bridge.base}/add`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Token': this.bridge.token ?? '' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        this.ready = res.status === 503 ? false : this.ready
        return false
      }
      return true
    } catch {
      this.ready = false
      return false
    }
  }
}

/** turns → 模型提炼出的条目 → 一行可存的文本 */
function composeText(raw) {
  const summary = String(raw?.summary ?? '').trim()
  const detail = String(raw?.detail ?? '').trim()
  if (!summary && !detail) return ''
  if (detail && detail !== summary) return `${summary}\n\n${detail}`
  return summary || detail
}

function importanceOf(raw) {
  const weight = Number(raw?.weight ?? 50)
  if (raw?.kind === 'permanent' || weight >= 82) return 1.0
  const value = weight / 100
  return Math.max(0.3, Math.min(0.9, Number.isFinite(value) ? value : 0.5))
}

function clip(text, limit) {
  const value = String(text ?? '')
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

/** 从 DSH 消息内容里取纯文本（兼容 string / 段数组）。 */
export function messageText(content) {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (!block) continue
    if (typeof block === 'string') parts.push(block)
    else if (typeof block.text === 'string') parts.push(block.text)
    else if (typeof block.content === 'string') parts.push(block.content)
  }
  return parts.join('\n').trim()
}
