// livingmemory 只读数据源 —— 记忆海面板的全部数据都从这里来
//
// 设计约束：
// 1. 只读。打开时 readOnly，永远不写 LM 的库。
// 2. 零依赖。Node 24 自带 node:sqlite，不装 better-sqlite3。
// 3. 表结构跟着 livingmemory 走：documents / memory_atoms / graph_*。
//    表缺失、列改名都不抛错，降级成空数据——上游升级不该让面板白屏。
//
// 用法：
//   const src = openLivingMemory(dbPath)
//   src.stats() / src.listDocuments() / src.search("关键词") / src.contextText()

import { DatabaseSync } from 'node:sqlite'

function parseMeta(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * 脑区。一段记忆只会属于一个区。
 * 顺序就是优先级：先被认领的区优先；靠"重要度 / 主题词 / 新鲜度"判断。
 *
 * 这是一张**通用**的主题表：想让它更贴合自己的用法，改这里的 keywords 就行，
 * 不用碰任何逻辑。每条记忆落在哪个区，全靠这几个词命中。
 */
export const REGIONS = [
  { key: 'permanent', name: '长期底色', color: '#ffcf6e', keywords: [] },
  {
    key: 'relational',
    name: '关系',
    color: '#ff9db0',
    keywords: ['关系', '家人', '朋友', '对象', '喜欢', '讨厌', '约定', '承诺', '信任', '陪我', '想念'],
  },
  {
    key: 'life',
    name: '生活',
    color: '#9fe08a',
    keywords: ['日常', '吃饭', '早', '晚', '睡', '梦', '生日', '天气', '身体', '累', '旅行', '近况'],
  },
  { key: 'plan', name: '计划', color: '#c9a6ff', keywords: ['计划', '项目', '待办', '目标', '下周', '明天', '准备', '打算'] },
  {
    key: 'work',
    name: '工作 / 技术',
    color: '#7fd1d1',
    keywords: ['工作', '代码', '插件', '配置', '部署', '报错', '日志', '模型', '接口', '数据'],
  },
  { key: 'working', name: '最近', color: '#f0a6c8', keywords: [] },
  { key: 'other', name: '其他', color: '#9aa8bd', keywords: [] },
]

const REGION_BY_KEY = new Map(REGIONS.map((region) => [region.key, region]))
const WORKING_MS = 36 * 3600 * 1000

export function regionOf(doc, now = Date.now()) {
  if (Number(doc.importance) >= 1) return 'permanent'
  const hay = `${(doc.topics || []).join(' ')} ${doc.text || ''}`.toLowerCase()
  for (const region of REGIONS) {
    if (!region.keywords.length) continue
    if (region.keywords.some((word) => hay.includes(word.toLowerCase()))) return region.key
  }
  if (now - Number(doc.createdAt || 0) < WORKING_MS) return 'working'
  return 'other'
}

function toDoc(row) {
  if (!row) return null
  const meta = parseMeta(row.metadata)
  return {
    id: row.id,
    text: row.text ?? '',
    createdAt: Number(meta.create_time ?? 0) * 1000 || Date.parse(row.created_at ?? '') || 0,
    importance: Number(meta.importance ?? 0.5),
    status: meta.status ?? 'active',
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    keyFacts: Array.isArray(meta.key_facts) ? meta.key_facts : [],
    sessionId: meta.session_id ?? '',
    personaId: meta.persona_id ?? '',
    source: meta.source ?? 'conversation',
    sourcePartition: meta.source_partition ?? '',
    sentiment: meta.sentiment ?? '',
    summary: meta.canonical_summary ?? '',
    lastAccess: Number(meta.last_access_time ?? 0) * 1000 || 0,
    accessCount: Number(meta.access_count ?? 0) || 0,
  }
}

export function openLivingMemory(dbPath) {
  if (!dbPath) throw new Error('没有给 livingmemory 库的路径')
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const q = (sql, ...params) => db.prepare(sql).all(...params)
  const one = (sql, ...params) => db.prepare(sql).get(...params)

  /** 表不存在 / 结构变了就当空，别让面板整页挂掉。 */
  const safeAll = (sql, ...params) => {
    try {
      return q(sql, ...params)
    } catch {
      return []
    }
  }
  const safeOne = (sql, ...params) => {
    try {
      return one(sql, ...params) ?? null
    } catch {
      return null
    }
  }
  const safeCount = (table) => Number(safeOne(`select count(*) c from ${table}`)?.c ?? 0)

  // 开库先确认是我们认识的 livingmemory：认不出就抛，由调用方降级成空面板
  const tables = new Set(safeAll("select name from sqlite_master where type='table'").map((r) => r.name))
  if (!tables.has('documents')) {
    throw new Error('这个库不是 livingmemory（没有 documents 表）')
  }

  function meta() {
    return {
      dbVersion: safeOne('select max(version) v from db_version')?.v ?? null,
      hasAtoms: tables.has('memory_atoms'),
      hasGraph: tables.has('graph_nodes') && tables.has('graph_edges'),
    }
  }

  function stats() {
    const total = safeCount('documents')
    const atoms = tables.has('memory_atoms') ? safeCount('memory_atoms') : 0
    const nodes = tables.has('graph_nodes') ? safeCount('graph_nodes') : 0
    const edges = tables.has('graph_edges') ? safeCount('graph_edges') : 0

    const byAtomType = tables.has('memory_atoms')
      ? safeAll('select atom_type k, count(*) c from memory_atoms group by atom_type order by c desc')
      : []
    const byImportance = safeAll(
      `select case
                when json_extract(metadata,'$.importance') >= 0.9 then '0.9+'
                when json_extract(metadata,'$.importance') >= 0.7 then '0.7-0.9'
                when json_extract(metadata,'$.importance') >= 0.5 then '0.5-0.7'
                else '<0.5' end bucket,
              count(*) c
       from documents group by bucket`,
    )
    const bySession = safeAll(
      `select json_extract(metadata,'$.session_id') s, count(*) c
       from documents group by s order by c desc limit 10`,
    )
    const timeline = safeAll(
      `select date(cast(json_extract(metadata,'$.create_time') as real) , 'unixepoch', 'localtime') d,
              count(*) c
       from documents group by d order by d desc limit 14`,
    )
    return { total, atoms, nodes, edges, byAtomType, byImportance, bySession, timeline }
  }

  function listDocuments({ limit = 20, offset = 0, order = 'desc' } = {}) {
    const dir = order === 'asc' ? 'asc' : 'desc'
    const rows = q(
      `select id, text, metadata, created_at, updated_at from documents
       order by id ${dir} limit ? offset ?`,
      limit,
      offset,
    )
    return rows.map(toDoc)
  }

  function getDocument(id) {
    return toDoc(one('select id, text, metadata, created_at, updated_at from documents where id = ?', id))
  }

  /** 按重要性区间列文档：面板的三个页签就靠它映射。 */
  function listByImportance({ min = 0, max = 1, limit = 40, offset = 0 } = {}) {
    const rows = q(
      `select id, text, metadata, created_at, updated_at from documents
       where cast(json_extract(metadata,'$.importance') as real) >= ?
         and cast(json_extract(metadata,'$.importance') as real) < ?
       order by id desc limit ? offset ?`,
      min,
      max,
      limit,
      offset,
    )
    return rows.map(toDoc)
  }

  /** 三个"层"的计数，仅供面板显示。 */
  function partitionCounts() {
    const buckets = [
      ['permanent', 1.0, 2.0],
      ['long', 0.55, 1.0],
      ['short', 0.0, 0.55],
    ]
    const out = {}
    for (const [name, min, max] of buckets) {
      out[name] =
        one(
          `select count(*) c from documents
           where cast(json_extract(metadata,'$.importance') as real) >= ?
             and cast(json_extract(metadata,'$.importance') as real) < ?`,
          min,
          max,
        )?.c ?? 0
    }
    return out
  }


  /**
   * FTS 先查，没命中再 LIKE 兜底。
   *
   * 注意表名：LM 真正用来检索的是 `livingmemory_memories_fts`（content, doc_id），
   * 那个 `documents_fts` 是早期版本留下的，只有 14 行、没有任何代码在读。
   * 一开始查错了表，所以永远只走 LIKE。
   */
  function search(keyword, limit = 20) {
    const kw = String(keyword ?? '').trim()
    if (!kw) return []
    const out = []
    const seen = new Set()
    if (tables.has('livingmemory_memories_fts') && tables.has('documents')) {
      try {
        for (const row of q(
          `select d.id, d.text, d.metadata, d.created_at, d.updated_at
           from livingmemory_memories_fts f
           join documents d on d.doc_id = f.doc_id
           where livingmemory_memories_fts match ? limit ?`,
          kw,
          limit,
        )) {
          if (seen.has(row.id)) continue
          seen.add(row.id)
          out.push(toDoc(row))
        }
      } catch {
        /* 单个字没有分词结果时 FTS 会报错，交给 LIKE */
      }
    }
    if (out.length < limit) {
      for (const row of q(
        `select id, text, metadata, created_at, updated_at from documents
         where text like ? order by id desc limit ?`,
        `%${kw}%`,
        limit - out.length,
      )) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        out.push(toDoc(row))
      }
    }
    return out
  }

  function atoms({ type = '', limit = 50, offset = 0 } = {}) {
    if (!tables.has('memory_atoms')) return []
    const rows = type
      ? q(
          `select id, parent_memory_id, atom_type, content, importance, status, ttl_days, created_at
           from memory_atoms where atom_type = ? order by id desc limit ? offset ?`,
          type,
          limit,
          offset,
        )
      : q(
          `select id, parent_memory_id, atom_type, content, importance, status, ttl_days, created_at
           from memory_atoms order by id desc limit ? offset ?`,
          limit,
          offset,
        )
    return rows.map((r) => ({
      id: r.id,
      parentId: r.parent_memory_id,
      type: r.atom_type,
      text: r.content ?? '',
      importance: Number(r.importance ?? 0),
      status: r.status ?? '',
      ttlDays: Number(r.ttl_days ?? 0),
      createdAt: r.created_at ?? '',
    }))
  }

  function graph({ limit = 20 } = {}) {
    if (!tables.has('graph_nodes')) return { nodes: [], edgeCount: 0 }
    // 注意：LM 的 graph_nodes 用 node_type / node_value，没有 name / weight 列
    const top = safeAll(
      `select id, node_type t, node_value v, created_at from graph_nodes order by id desc limit ?`,
      limit,
    ).map((r) => ({ id: r.id, name: r.v ?? '', type: r.t ?? '', weight: 0 }))
    return { nodes: top, edgeCount: safeCount('graph_edges') }
  }

  // ---- 相似记忆：字符二元组余弦，纯本地、即时算，不依赖模型 ----
  let gramCache = { count: -1, map: new Map() }

  function bigrams(text) {
    const s = String(text ?? '').replace(/\s+/g, '')
    const map = new Map()
    for (let i = 0; i < s.length - 1; i += 1) {
      const g = s.slice(i, i + 2)
      map.set(g, (map.get(g) || 0) + 1)
    }
    return map
  }

  function cosine(a, b) {
    let dot = 0
    let na = 0
    let nb = 0
    for (const v of a.values()) na += v * v
    for (const v of b.values()) nb += v * v
    const [small, large] = a.size <= b.size ? [a, b] : [b, a]
    for (const [k, v] of small) {
      const w = large.get(k)
      if (w) dot += v * w
    }
    if (!na || !nb) return 0
    return dot / Math.sqrt(na * nb)
  }

  function similar(id, { limit = 6 } = {}) {
    const rows = q('select id, text from documents')
    if (gramCache.count !== rows.length || !gramCache.map.size) {
      gramCache = { count: rows.length, map: new Map(rows.map((r) => [r.id, bigrams(r.text)])) }
    }
    const target = gramCache.map.get(Number(id))
    if (!target) return []
    const scored = []
    for (const [otherId, grams] of gramCache.map) {
      if (otherId === Number(id)) continue
      const score = cosine(target, grams)
      if (score > 0.02) scored.push({ id: otherId, score: Math.round(score * 1000) / 1000 })
    }
    scored.sort((a, b) => b.score - a.score)
    const byId = new Map(rows.map((r) => [r.id, r.text]))
    return scored.slice(0, limit).map((item) => ({
      id: item.id,
      score: item.score,
      text: String(byId.get(item.id) ?? '').split('\n')[0].slice(0, 60),
    }))
  }

  /**
   * 记忆海的数据：点 = 记忆，线 = 两条记忆共享的实体/标签。
   *
   * 只算"语义"，不算坐标——坐标由前端按记忆 id 确定性生成，
   * 这样新增记忆时旧点的位置不会变，海是慢慢长出来的，不是每次重排。
   *
   * 脑区：像人脑一样分区。区域由「重要度 / 主题词 / 新鲜度」决定，
   * 顺序即优先级（越靠前越先被认领）。
   */
  function sea({ limit = 5000, maxLinksPerNode = 6, hubLimit = 16, detailMin = 0.55 } = {}) {
    const docs = listDocuments({ limit, order: 'desc' })
    // 细节层：importance >= 0.55 的记忆，画成一个个点
    const detailDocs = docs.filter((d) => Number(d.importance ?? 0) >= detailMin)
    const ids = new Set(detailDocs.map((d) => d.id))

    // 记忆 id -> 特征集合（实体按 n: 前缀，标签按 t: 前缀）
    const features = new Map()
    const addFeature = (docId, key) => {
      if (!features.has(docId)) features.set(docId, new Set())
      features.get(docId).add(key)
    }

    if (tables.has('graph_entries') && tables.has('graph_entry_nodes')) {
      for (const row of safeAll(
        `select e.source_memory_id mid, n.node_id nid
         from graph_entries e join graph_entry_nodes n on n.entry_id = e.id`,
      )) {
        if (ids.has(row.mid)) addFeature(row.mid, `n:${row.nid}`)
      }
    }
    for (const doc of detailDocs) {
      for (const topic of doc.topics || []) addFeature(doc.id, `t:${topic}`)
    }

    // 特征 -> 记忆列表
    const byFeature = new Map()
    for (const [docId, keys] of features) {
      for (const key of keys) {
        if (!byFeature.has(key)) byFeature.set(key, [])
        byFeature.get(key).push(docId)
      }
    }

    // 两两配对：共享实体记 2 分，共享标签记 1 分；超过 hubLimit 的特征跳过，避免毛球
    const scores = new Map()
    for (const [key, list] of byFeature) {
      if (list.length < 2 || list.length > hubLimit) continue
      const weight = key.startsWith('n:') ? 2 : 1
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = Math.min(list[i], list[j])
          const b = Math.max(list[i], list[j])
          const pair = `${a}:${b}`
          scores.set(pair, (scores.get(pair) || 0) + weight)
        }
      }
    }

    // 每条记忆最多保留 maxLinksPerNode 条最强的线
    const perNode = new Map()
    const links = []
    const seenPair = new Set()
    for (const [pair, score] of [...scores.entries()].sort((x, y) => y[1] - x[1])) {
      const [a, b] = pair.split(':').map(Number)
      if (score < 2) continue
      const countA = perNode.get(a) || 0
      const countB = perNode.get(b) || 0
      if (countA >= maxLinksPerNode || countB >= maxLinksPerNode) continue
      perNode.set(a, countA + 1)
      perNode.set(b, countB + 1)
      seenPair.add(pair)
      links.push({ a, b, w: score, kind: 'graph' })
    }
    const graphLinks = links.length

    // 时间链：每篇接上紧挨着的两篇，只作可选的"轨迹"层，默认不显示
    const byTime = [...detailDocs].sort((x, y) => x.createdAt - y.createdAt || x.id - y.id)
    for (let i = 0; i < byTime.length; i += 1) {
      for (const step of [1, 2]) {
        const next = byTime[i + step]
        if (!next) continue
        const a = Math.min(byTime[i].id, next.id)
        const b = Math.max(byTime[i].id, next.id)
        const pair = `${a}:${b}`
        if (seenPair.has(pair)) continue
        seenPair.add(pair)
        links.push({ a, b, w: 1, kind: 'time' })
      }
    }

    const times = docs.map((d) => d.createdAt).filter((t) => t > 0)
    const spanDays = times.length ? (Math.max(...times) - Math.min(...times)) / 86400000 : 0

    // 分区：每条记忆归一个脑区，顺带统计区间连线
    const now = Date.now()
    const regionByDoc = new Map(docs.map((d) => [d.id, regionOf(d, now)]))
    const regionCounts = new Map()
    for (const key of regionByDoc.values()) regionCounts.set(key, (regionCounts.get(key) || 0) + 1)

    // 焦点 = 每个区里最靠前的那一小撮（按重要度），而不是"永久记忆"——
    // 永久记忆已经自己成一个区了，再给他们套环没有意义。
    const focusIds = new Set()
    for (const regionKey of regionCounts.keys()) {
      const inRegion = detailDocs
        .filter((d) => regionByDoc.get(d.id) === regionKey)
        .sort((a, b) => b.importance - a.importance)
      const k = Math.min(12, Math.max(3, Math.round(inRegion.length * 0.1)))
      for (const doc of inRegion.slice(0, k)) focusIds.add(doc.id)
    }
    const focus = focusIds.size
    const pairCounts = new Map()
    for (const link of links) {
      if (link.kind !== 'graph') continue
      const ra = regionByDoc.get(link.a)
      const rb = regionByDoc.get(link.b)
      if (!ra || !rb || ra === rb) continue
      const key = ra < rb ? `${ra}|${rb}` : `${rb}|${ra}`
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1)
    }
    const regionLinks = [...pairCounts.entries()]
      .map(([key, count]) => {
        const [a, b] = key.split('|')
        return { a, b, count }
      })
      .sort((x, y) => y.count - x.count)
      .slice(0, 12)

    // 聚合层：importance < detailMin 的记忆，按「脑区 × 周」团成星团。
    // 星团只统计 LM 里还活着的条目——LM 一删，星团就变小、变暗、最后消失。
    const weekStart = (ts) => {
      const date = new Date(Number(ts) || Date.now())
      const monday = new Date(date)
      monday.setHours(0, 0, 0, 0)
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
      return monday.getTime()
    }
    const buckets = new Map()
    for (const doc of docs) {
      if (ids.has(doc.id)) continue
      const region = regionByDoc.get(doc.id) ?? 'other'
      const week = weekStart(doc.createdAt)
      const key = `${region}|${week}`
      if (!buckets.has(key)) {
        buckets.set(key, { region, week, count: 0, sum: 0, from: doc.createdAt, to: doc.createdAt })
      }
      const bucket = buckets.get(key)
      bucket.count += 1
      bucket.sum += Number(doc.importance ?? 0)
      bucket.from = Math.min(bucket.from, doc.createdAt)
      bucket.to = Math.max(bucket.to, doc.createdAt)
    }
    const aggregates = [...buckets.values()].map((bucket) => ({
      region: bucket.region,
      week: bucket.week,
      count: bucket.count,
      importance: bucket.count ? bucket.sum / bucket.count : 0,
      from: bucket.from,
      to: bucket.to,
    }))
    const aggregatedCount = docs.length - detailDocs.length
    const nodeTypes = new Map(
      safeAll('select node_type t, count(*) c from graph_nodes group by node_type').map((row) => [row.t, row.c]),
    )

    return {
      stats: {
        points: docs.length,
        detail: detailDocs.length,
        aggregated: aggregatedCount,
        buckets: aggregates.length,
        links: graphLinks,
        timeLinks: links.length - graphLinks,
        spanDays: Math.round(spanDays * 10) / 10,
        focus,
        bornAt: times.length ? Math.min(...times) : 0,
        people: nodeTypes.get('person') || 0,
        facts: nodeTypes.get('fact') || 0,
      },
      regions: REGIONS.map((region) => ({
        key: region.key,
        name: region.name,
        color: region.color,
        count: regionCounts.get(region.key) || 0,
      })).filter((region) => region.count > 0),
      regionLinks,
      aggregates,
      points: detailDocs.map((d) => ({
        id: d.id,
        text: String(d.text || '').split('\n')[0].slice(0, 90),
        importance: d.importance,
        createdAt: d.createdAt,
        topics: (d.topics || []).slice(0, 5),
        source: d.source,
        focus: focusIds.has(d.id),
        region: regionByDoc.get(d.id),
        lastAccess: d.lastAccess || 0,
        recalled: d.lastAccess > d.createdAt + 60000,
        keyFact: (d.keyFacts || [])[0] || '',
      })),
      links,
    }
  }

  /**
   * 拼注入块：长期底色（importance >= permanentMin）+ 最近若干条。
   *
   * 排序刻意不用「最新优先」：底色层里既有真正的底，也有今天刚记下的琐事。
   * 按 source_weight 优先、同权重取更早的，让"最有分量的"排在前面，
   * 而不是让刚说完的那句占满上下文。
   */
  function contextText({
    maxChars = 1800,
    permanentMin = 1.0,
    permanentMax = 16,
    permanentLineChars = 90,
    recent = 8,
    recentLineChars = 80,
  } = {}) {
    const permanent = q(
      `select id, text, metadata, created_at from documents
       where cast(json_extract(metadata,'$.importance') as real) >= ?
       order by coalesce(cast(json_extract(metadata,'$.source_weight') as real), 50) desc, id asc
       limit ?`,
      permanentMin,
      permanentMax,
    ).map(toDoc)
    const recentDocs = q(
      `select id, text, metadata, created_at from documents
       where cast(json_extract(metadata,'$.importance') as real) < ?
       order by id desc limit ?`,
      permanentMin,
      recent,
    ).map(toDoc)

    const seen = new Set()
    const lines = []
    let used = 0

    /** 只取第一行（摘要），去掉重复和近似重复。 */
    function lineOf(doc, limit) {
      const first = String(doc.text || '').split('\n')[0].replace(/\s+/g, ' ').trim()
      const text = (first || String(doc.text || '')).slice(0, limit)
      const key = text.slice(0, 12)
      if (!text || seen.has(key)) return ''
      seen.add(key)
      return text
    }

    function push(line) {
      if (used + line.length + 1 > maxChars) return false
      lines.push(line)
      used += line.length + 1
      return true
    }

    if (permanent.length) {
      const block = ['【长期底色】']
      for (const d of permanent) {
        const text = lineOf(d, permanentLineChars)
        if (!text) continue
        if (used + text.length + 2 > maxChars * 0.75) break // 给"最近"留位置
        block.push(`· ${text}`)
        used += text.length + 2
      }
      if (block.length > 1) lines.push(...block)
    }

    const recentLines = []
    for (const d of recentDocs) {
      const text = lineOf(d, recentLineChars)
      if (!text) continue
      if (used + text.length + 2 > maxChars) break
      recentLines.push(`· ${text}`)
      used += text.length + 2
    }
    if (recentLines.length) {
      lines.push('【最近的记忆】', ...recentLines)
    }
    return lines.join('\n')
  }

  function close() {
    try {
      db.close()
    } catch {
      /* already closed */
    }
  }

  return {
    stats,
    meta,
    dbPath,
    listDocuments,
    listByImportance,
    partitionCounts,
    getDocument,
    search,
    atoms,
    graph,
    similar,
    sea,
    contextText,
    close,
  }
}

export default openLivingMemory
