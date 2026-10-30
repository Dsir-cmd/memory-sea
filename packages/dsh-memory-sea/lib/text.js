const PAD = (n) => String(n).padStart(2, '0')

/** Local-wall-clock "YYYY-MM-DD HH:mm". */
export function formatDateTime(ms) {
  const d = new Date(Number(ms) || Date.now())
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}`
}

/** Local-wall-clock "MM-DD HH:mm", used where the year is obvious. */
export function formatShort(ms) {
  const d = new Date(Number(ms) || Date.now())
  return `${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}`
}

export function formatDay(ms) {
  const d = new Date(Number(ms) || Date.now())
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`
}

export function clip(text, max) {
  const value = String(text ?? '')
  if (value.length <= max) return value
  return value.slice(0, Math.max(0, max - 1)) + '…'
}

/** Collapse whitespace and drop control characters; keep the text otherwise intact. */
export function cleanText(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那', '有', '和', '就', '不',
  '人', '都', '一', '上', '也', '很', '到', '说', '要', '去', '会', '着', '没', '好', '吗', '呢',
  '吧', '啊', '呀', '哦', '嗯', '一个', '什么', '怎么', '因为', '所以', '但是', '如果', '可以',
  '这个', '那个', '现在', '今天', '明天', '昨天', '然后', '而且', '还是', '就是', '不是', '没有',
  '觉得', '知道', '时候', '东西', '事情', '我们', '你们', '他们', '自己', '这样', '那样', '一下',
  '真的', '其实', '已经', '还有', '是的', '对的', '好的', '的话', '一点', '有点', '感觉', '应该',
])
const STOP_CHARS = new Set([...STOP_WORDS].filter((word) => word.length === 1))

/**
 * Cheap local tokenizer for mixed Chinese/English text: ASCII words plus CJK
 * bigrams and trigrams. No model call, no external dictionary.
 */
export function extractKeywords(text, limit = 160) {
  const value = String(text ?? '').toLowerCase()
  const out = new Set()
  for (const match of value.matchAll(/[a-z0-9][a-z0-9_+.-]{1,30}/g)) {
    const word = match[0].replace(/[.-]+$/, '')
    if (word.length >= 2 && !STOP_WORDS.has(word)) out.add(word)
  }
  const runs = value.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const run of runs) {
    for (const size of [2, 3]) {
      for (let i = 0; i + size <= run.length; i += 1) {
        const gram = run.slice(i, i + size)
        if (STOP_WORDS.has(gram)) continue
        if (size === 2 && STOP_CHARS.has(gram[0]) && STOP_CHARS.has(gram[1])) continue
        out.add(gram)
      }
    }
    if (run.length >= 2 && run.length <= 6 && !STOP_WORDS.has(run)) out.add(run)
  }
  return [...out].slice(0, limit)
}

/** Split a message into lines that look like an actual conversation turn. */
export function messageText(content) {
  if (typeof content === 'string') return cleanText(content)
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
  }
  return cleanText(parts.join('\n'))
}

/** Tolerantly read the first JSON object/array found in a model reply. */
export function parseLooseJson(text) {
  const value = String(text ?? '').trim()
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : value
  const start = body.search(/[{[]/)
  if (start < 0) throw new Error('memory judge returned no JSON')
  const open = body[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < body.length; i += 1) {
    const ch = body[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return JSON.parse(body.slice(start, i + 1))
    }
  }
  throw new Error('memory judge returned truncated JSON')
}

export function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function sha1(text) {
  let h = 0x811c9dc5
  const value = String(text)
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
