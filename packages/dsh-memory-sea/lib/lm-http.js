// 记忆海的面板 HTTP —— 只读，数据全部来自 livingmemory 的库。
//
// 没有设置、没有维护、没有容量：这些属于旧的艾宾浩斯逻辑，LM 里不存在。
// 这里只提供"看"的能力：概览 / 记忆列表 / 检索 / 原子 / 图谱 / 记忆海。
//
// 找不到库时（lm === null）不报 500，而是回一份空数据 + missing 标记，
// 让面板显示「去装 livingmemory」的引导，而不是白屏。

import { clip } from './text.js'

const BUCKETS = {
  permanent: { min: 1.0, max: 2.0 },
  long: { min: 0.55, max: 1.0 },
  short: { min: 0.0, max: 0.55 },
}

const EMPTY_STATS = {
  points: 0,
  detail: 0,
  aggregated: 0,
  buckets: 0,
  links: 0,
  timeLinks: 0,
  spanDays: 0,
  focus: 0,
  bornAt: 0,
  people: 0,
  facts: 0,
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

function sameOrigin(req, origin) {
  const header = req.headers.origin
  if (!header) return true
  try {
    return new URL(header).origin === new URL(origin).origin
  } catch {
    return false
  }
}

function toItem(doc) {
  return {
    id: doc.id,
    text: clip(doc.text || '', 1200),
    createdAt: doc.createdAt,
    importance: doc.importance,
    topics: Array.isArray(doc.topics) ? doc.topics.slice(0, 8) : [],
    source: doc.source,
    session: doc.sessionId || '',
    status: doc.status,
  }
}

export function createLmHttpHandler({ ctx, lm, version = '', reason = '', tried = [] }) {
  return async function handle(req, res) {
    try {
      const origin = ctx.webServer.getOrigin()
      if (!sameOrigin(req, origin)) {
        sendJson(res, 403, { error: 'cross-origin request rejected' })
        return
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      const route = url.pathname.replace(/^\/memory-sea/, '').replace(/\/+$/, '') || '/'
      const method = (req.method ?? 'GET').toUpperCase()
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 40))
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)

      if (method === 'GET' && route === '/status') {
        if (!lm) {
          // 这扇窗还没接上记忆库：先把「怎么办」一起给出去
          sendJson(res, 200, {
            source: 'none',
            missing: true,
            version,
            reason,
            tried,
            counts: { documents: 0, atoms: 0, nodes: 0, edges: 0 },
            buckets: [],
            meta: {},
          })
          return
        }
        const stats = lm.stats()
        const counts = {
          documents: stats.total,
          atoms: stats.atoms,
          nodes: stats.nodes,
          edges: stats.edges,
        }
        const bucketCounts = lm.partitionCounts()
        const buckets = Object.entries(BUCKETS).map(([key, range]) => ({
          key,
          count: Number(bucketCounts[key] ?? 0),
          min: range.min,
          max: range.max,
        }))
        sendJson(res, 200, {
          source: 'livingmemory',
          dbPath: lm.dbPath,
          meta: lm.meta(),
          counts,
          buckets,
          atomTypes: stats.byAtomType ?? [],
          importance: stats.byImportance ?? [],
          timeline: stats.timeline ?? [],
        })
        return
      }

      // ---- 没接上记忆库：除 /status 外一律回空，不白屏 --------------------
      if (!lm) {
        if (route === '/sea') {
          sendJson(res, 200, { stats: EMPTY_STATS, regions: [], aggregates: [], points: [], links: [], missing: true, reason })
          return
        }
        if (route === '/items') {
          sendJson(res, 200, { bucket: url.searchParams.get('bucket') || 'all', total: 0, items: [], missing: true })
          return
        }
        if (route === '/search') {
          sendJson(res, 200, { total: 0, items: [], missing: true })
          return
        }
        if (route === '/atoms') {
          sendJson(res, 200, { type: 'all', total: 0, items: [], missing: true })
          return
        }
        if (route === '/graph') {
          sendJson(res, 200, { nodes: [], edgeCount: 0, missing: true })
          return
        }
        if (route === '/similar') {
          sendJson(res, 200, { id: 0, items: [], missing: true })
          return
        }
        if (route === '/mood') {
          sendJson(res, 200, { available: false, missing: true })
          return
        }
        sendJson(res, 404, { error: 'not found', missing: true })
        return
      }

      if (method === 'GET' && route === '/items') {
        const bucket = url.searchParams.get('bucket') || 'all'
        if (bucket !== 'all' && !BUCKETS[bucket]) {
          sendJson(res, 400, { error: 'unknown bucket' })
          return
        }
        const query = (url.searchParams.get('q') || '').trim()
        if (query) {
          const hits = lm.search(query, limit)
          sendJson(res, 200, { bucket, total: hits.length, items: hits.map(toItem) })
          return
        }
        const total = bucket === 'all' ? lm.stats().total : Number(lm.partitionCounts()[bucket] ?? 0)
        const docs =
          bucket === 'all'
            ? lm.listDocuments({ limit, offset })
            : lm.listByImportance({ min: BUCKETS[bucket].min, max: BUCKETS[bucket].max, limit, offset })
        sendJson(res, 200, { bucket, total, items: docs.map(toItem) })
        return
      }

      if (method === 'GET' && route === '/search') {
        const query = (url.searchParams.get('q') || '').trim()
        if (!query) {
          sendJson(res, 200, { total: 0, items: [] })
          return
        }
        const hits = lm.search(query, limit)
        sendJson(res, 200, { total: hits.length, items: hits.map(toItem) })
        return
      }

      if (method === 'GET' && route === '/atoms') {
        const type = (url.searchParams.get('type') || '').trim()
        const items = lm.atoms({ type, limit, offset })
        sendJson(res, 200, { type: type || 'all', total: items.length, items })
        return
      }

      if (method === 'GET' && route === '/graph') {
        sendJson(res, 200, lm.graph({ limit }))
        return
      }

      // 记忆海：点 + 线 + 统计。坐标由前端算，这里只给语义。
      if (method === 'GET' && route === '/sea') {
        sendJson(res, 200, lm.sea({ limit: 5000 }))
        return
      }

      if (method === 'GET' && route === '/similar') {
        const id = Number(url.searchParams.get('id'))
        if (!Number.isFinite(id)) {
          sendJson(res, 400, { error: 'missing id' })
          return
        }
        sendJson(res, 200, { id, items: lm.similar(id, { limit: 6 }) })
        return
      }

      if (method === 'GET' && route === '/doc') {
        const id = Number(url.searchParams.get('id'))
        if (!Number.isFinite(id)) {
          sendJson(res, 400, { error: 'missing id' })
          return
        }
        const doc = lm.getDocument(id)
        sendJson(res, doc ? 200 : 404, doc ? { id, doc } : { error: 'not found' })
        return
      }

      // 情绪时间线不在开源范围：老客户端问起来也要有个答
      if (method === 'GET' && route === '/mood') {
        sendJson(res, 200, { available: false, reason: 'mood module is not included in memory-sea' })
        return
      }

      // 旧接口：LM 接管后这些写操作没有意义
      if (method === 'POST') {
        sendJson(res, 410, {
          error: '记忆归 livingmemory：提炼、衰减、压缩由它自己跑，本面板只读',
        })
        return
      }

      sendJson(res, 404, { error: 'not found' })
    } catch (cause) {
      try {
        sendJson(res, 500, { error: String(cause?.message ?? cause) })
      } catch {
        /* response already gone */
      }
    }
  }
}
