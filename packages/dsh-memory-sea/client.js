window.__ModuleLoader__.load({
  id: 'dsh-memory-sea',
  factory(require) {
    const React = require('react')
    const { useState, useEffect, useCallback, useRef } = React
    const h = React.createElement

    const NS = 'memory-sea'
    const API = '/memory-sea'

    const zh = {
      nav: '记忆海',
      title: '记忆海',
      seaTitle: '记忆海',
      selfName: '我',
      seaSub: '记下的每一件事，都是一个点',
      listSub: 'livingmemory · 只读',
      viewSea: '记忆海',
      viewList: '列表',
      statPoints: '点',
      statLinks: '线',
      statSpan: '跨度',
      statFocus: '焦点',
      statNodes: '图谱节点',
      statEdges: '关系',
      permHint: 'importance = 1.0，不衰减',
      longHint: '0.55 ≤ importance < 1.0',
      shortHint: 'importance < 0.55',
      atomsHint: 'LM 从对话里抽出来的最小事实单元，带类型和 TTL。',
      graphTitle: '知识图谱',
      graphHint: '由记忆里的实体和关系长出来，用来跨记忆找回关联。',
      days: '天',
      searchPlaceholder: '按关键词找一条旧事，回车',
      search: '检索',
      searching: '检索中…',
      searchEmpty: '没找到相关的旧事。',
      searchClear: '清除检索',
      recent: '最近的记忆',
      atomsTitle: '记忆原子',
      importance: '重要度',
      source: '来源',
      expand: '展开',
      collapse: '收起',
      loading: '读取中…',
      empty: '这里还没有记忆。',
      note: '记忆由 livingmemory 自己维护：重要性每天衰减 0.01，按类型有 TTL（情景 7 天 / 事实 180 天 / 关系 90 天 / 偏好 60 天），30 天清理 importance<0.3 的条目。本页只读。',
      hintDrag: '左键拖动旋转 · 右键拖动平移 · 滚轮缩放 · 双击聚焦',
      focusOn: '高亮焦点',
      focusOff: '取消高亮',
      labelsOn: '标签开',
      labelsOff: '标签关',
      traceOn: '轨迹开',
      traceOff: '轨迹关',
      linksOn: '关联开',
      layoutSphere: '球体',
      layoutFlat: '平面',
      linksOff: '关联关',
      recentN: '最近',
      refresh: '刷新',
      reset: '复位',
      experience: '经历',
      time: '时间',
      recalled: '被想起过',
      related: '顺着线连着的',
      similar: '相似记忆',
      moodNow: '此刻',
      colorMood: '心情色',
      colorTier: '重要度色',
      moodAt: '当时心情',
      legendMood: '颜色 = 记忆出生时的心情',
      legendRegion: '颜色 = 脑区',
      bornAt: '出生在',
      people: '人',
      facts: '事实',
      replayStart: '回放',
      replayPause: '暂停',
      replayNext: '下一条',
      replayPrev: '上一条',
      readFull: '看全文',
      foldUp: '收起',
      seaSearch: '找一条记忆（Esc 关闭）',
      recallPrefix: '想起「',
      recallMiddle: '」，顺着线亮起了：',
      riverStart: '最初',
      riverNow: '现在',
      sourceChat: '对话',
      sourceMigrated: '迁入',
      sourceDsh: 'DSH',
      bucketAll: '全部',
      bucketPermanent: '永久',
      bucketLong: '长期',
      bucketShort: '短期',
      db: '数据库',
      close: '关闭',
    }

    const en = {
      nav: 'Memory Sea',
      title: 'Memory Sea',
      seaTitle: 'Memory Sea',
      selfName: 'me',
      seaSub: 'Every memory you kept is a point',
      listSub: 'livingmemory · read-only',
      viewSea: 'Sea',
      viewList: 'List',
      statPoints: 'points',
      statLinks: 'links',
      statSpan: 'span',
      statFocus: 'focus',
      statNodes: 'graph nodes',
      statEdges: 'edges',
      permHint: 'importance = 1.0, never decays',
      longHint: '0.55 ≤ importance < 1.0',
      shortHint: 'importance < 0.55',
      atomsHint: 'Smallest fact units extracted by LM, with type and TTL.',
      graphTitle: 'Graph',
      graphHint: 'Entities and relations built from memories.',
      days: 'd',
      searchPlaceholder: 'Search a memory, press Enter',
      search: 'Search',
      searching: 'Searching…',
      searchEmpty: 'No matching memory.',
      searchClear: 'Clear',
      recent: 'Recent memories',
      atomsTitle: 'Atoms',
      importance: 'importance',
      source: 'source',
      expand: 'Expand',
      collapse: 'Collapse',
      loading: 'Loading…',
      empty: 'No memory yet.',
      note: 'Memory is maintained by livingmemory itself. This page is read-only.',
      hintDrag: 'drag to rotate · right-drag to pan · wheel to zoom · double-click to focus',
      focusOn: 'Highlight focus',
      focusOff: 'Clear highlight',
      labelsOn: 'Labels on',
      labelsOff: 'Labels off',
      traceOn: 'Trace on',
      traceOff: 'Trace off',
      linksOn: 'Links on',
      layoutSphere: 'Sphere',
      layoutFlat: 'Flat',
      linksOff: 'Links off',
      recentN: 'recent',
      refresh: 'Refresh',
      reset: 'Reset',
      experience: 'Experience',
      time: 'time',
      recalled: 'recalled before',
      related: 'linked along the lines',
      similar: 'similar memories',
      moodNow: 'now',
      colorMood: 'mood color',
      colorTier: 'tier color',
      moodAt: 'mood then',
      legendMood: 'color = mood when the memory was born',
      legendRegion: 'color = brain region',
      bornAt: 'born',
      people: 'people',
      facts: 'facts',
      replayStart: 'Replay',
      replayPause: 'Pause',
      replayNext: 'Next',
      replayPrev: 'Prev',
      readFull: 'Read full',
      foldUp: 'Fold',
      seaSearch: 'Find a memory (Esc to close)',
      recallPrefix: 'recalling "',
      recallMiddle: '", lighting up: ',
      riverStart: 'start',
      riverNow: 'now',
      sourceChat: 'chat',
      sourceMigrated: 'migrated',
      sourceDsh: 'dsh',
      bucketAll: 'All',
      bucketPermanent: 'Permanent',
      bucketLong: 'Long',
      bucketShort: 'Short',
      db: 'database',
      close: 'Close',
    }

    const CSS = `
.ebm-page { width: 100%; min-width: 0; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 1.65; }
.ebm-page-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
.ebm-page-inner { width: 100%; max-width: 1080px; margin: 0 auto; padding: 34px 40px 80px; box-sizing: border-box; }
.ebm-page-head { padding-bottom: 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ebm-page-title { font-size: 23px; font-weight: 600; letter-spacing: .2px; margin: 0 0 6px; }
.ebm-page-sub { color: var(--dsw-alias-label-secondary); font-size: 12.5px; margin: 0; }
.ebm-switch { display: flex; gap: 6px; }
.ebm-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 12px; cursor: pointer; background: transparent; }
.ebm-chip.on { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); }
.ebm-mono { font-variant-numeric: tabular-nums; }
.ebm-input { flex: 1; height: 38px; padding: 0 14px; border-radius: 10px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); font-size: 13px; outline: none; box-sizing: border-box; }
.ebm-input:focus { border-color: var(--dsw-alias-label-secondary); }
.ebm-btn { height: 34px; padding: 0 14px; border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); border-radius: 9px; font-size: 12.5px; cursor: pointer; }
.ebm-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.ebm-btn.on { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.ebm-link { background: none; border: 0; padding: 0; color: var(--dsw-alias-brand-primary); cursor: pointer; font-size: 12px; }
.ebm-section { margin-top: 24px; }
.ebm-h3 { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
.ebm-panel { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 14px 16px; }
.ebm-hint { color: var(--dsw-alias-label-secondary); font-size: 11.5px; margin: -4px 0 10px; }
.ebm-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.ebm-stat { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 12px 14px; }
.ebm-stat-k { color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.ebm-stat-v { font-size: 21px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; }
.ebm-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 12px; }
.ebm-tiers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.ebm-tier { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; padding: 12px 14px; }
.ebm-tier-name { font-weight: 600; display: flex; justify-content: space-between; align-items: baseline; }
.ebm-tier-num { font-size: 18px; font-variant-numeric: tabular-nums; }
.ebm-tier-hint { color: var(--dsw-alias-label-secondary); font-size: 11.5px; margin-top: 4px; }
.ebm-node { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid var(--dsw-alias-border-l1); padding: 7px 0; font-size: 12.5px; }
.ebm-node:first-child { border-top: 0; }
.ebm-node-type { color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.ebm-badge { display: inline-flex; align-items: center; padding: 0 7px; height: 18px; border-radius: 5px; font-size: 11px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.ebm-doc { border-top: 1px solid var(--dsw-alias-border-l1); padding: 11px 0; }
.ebm-doc:first-child { border-top: 0; padding-top: 2px; }
.ebm-doc-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.ebm-doc-text { margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
.ebm-doc-text.clip { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ebm-topics { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ebm-empty { color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 6px 0; }
.ebm-note { color: var(--dsw-alias-label-secondary); font-size: 11.5px; margin-top: 22px; }
.ebm-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; margin-top: 10px; }

.ebm-sea { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.ebm-sea-head { padding: 22px 28px 10px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ebm-sea-stats { display: flex; gap: 18px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.ebm-sea-stats b { color: var(--dsw-alias-label-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
.ebm-sea-mood { display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: rgba(180, 205, 235, .8); }
.ebm-sea-mood span { display: inline-flex; align-items: center; gap: 5px; }
.ebm-sea-mood i { width: 7px; height: 7px; border-radius: 999px; display: inline-block; }
.ebm-sea-stage { position: relative; flex: 1; min-height: 0; margin: 0 16px 16px; border-radius: 16px; overflow: hidden; background: radial-gradient(circle at 50% 50%, #101a2e 0%, #070b14 55%, #04060c 100%); border: 1px solid var(--dsw-alias-border-l1); }
.ebm-sea-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
.ebm-sea-canvas.dragging { cursor: grabbing; }
.ebm-sea-tools { position: absolute; left: 14px; top: 12px; display: flex; gap: 8px; flex-wrap: wrap; z-index: 2; }
.ebm-sea-tools .ebm-btn { height: 28px; padding: 0 11px; font-size: 11.5px; background: rgba(10, 16, 28, .72); }
.ebm-sea-hint { position: absolute; right: 14px; bottom: 58px; color: rgba(180, 200, 230, .35); font-size: 10.5px; z-index: 2; pointer-events: none; }
.ebm-sea-card { position: absolute; right: 12px; top: 12px; width: min(320px, 42%); max-height: calc(100% - 96px); overflow-y: auto; background: rgba(9, 14, 24, .9); border: 1px solid rgba(120, 160, 220, .22); border-radius: 12px; padding: 12px 14px; z-index: 3; }
.ebm-sea-card-title { font-size: 13px; font-weight: 600; color: #e9f1ff; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 8px; }
.ebm-sea-card-meta { font-size: 11px; color: rgba(160, 185, 220, .8); margin-bottom: 8px; line-height: 1.8; }
.ebm-sea-card-text { font-size: 12.5px; line-height: 1.65; color: rgba(230, 238, 250, .92); white-space: pre-wrap; }
.ebm-sea-card-sub { font-size: 11px; color: rgba(150, 175, 210, .8); margin: 10px 0 5px; }
.ebm-sea-card-links { display: flex; flex-wrap: wrap; gap: 6px; }
.ebm-sea-card-links button { border: 1px solid rgba(120, 170, 220, .25); background: rgba(30, 48, 72, .5); color: rgba(200, 222, 248, .9); font-size: 11px; border-radius: 999px; padding: 1px 9px; cursor: pointer; }
.ebm-sea-card-links button:hover { border-color: rgba(150, 220, 255, .55); }
.ebm-sea-badge { position: absolute; left: 14px; top: 48px; z-index: 2; display: flex; gap: 10px; color: rgba(160, 185, 220, .8); font-size: 11.5px; }
.ebm-sea-badge b { color: #e8f0ff; font-variant-numeric: tabular-nums; }
.ebm-sea-bottom { position: absolute; left: 14px; right: 14px; bottom: 10px; z-index: 2; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.ebm-sea-recall { color: rgba(208, 226, 246, .86); font-size: 11.5px; line-height: 1.5; max-width: 62%; text-shadow: 0 1px 2px rgba(0, 0, 0, .8); }
.ebm-sea-recall b { color: #ffe9b8; font-weight: 600; }
.ebm-sea-river { display: flex; align-items: center; gap: 12px; pointer-events: auto; }
.ebm-sea-river input { width: 200px; accent-color: #7fe3d4; }
.ebm-sea-river-label { font-size: 10.5px; color: rgba(170, 195, 225, .6); }
.ebm-sea-legend { display: flex; gap: 12px; font-size: 10.5px; color: rgba(170, 195, 225, .7); margin-left: auto; }
.ebm-sea-legend span { display: inline-flex; align-items: center; gap: 5px; }
.ebm-sea-regions { position: absolute; left: 14px; top: 50px; z-index: 2; display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: rgba(190, 210, 235, .8); }
.ebm-sea-search { position: absolute; left: 50%; top: 52px; transform: translateX(-50%); width: min(360px, 60%); z-index: 6; }
.ebm-sea-search .ebm-input { width: 100%; background: rgba(9, 14, 24, .94); border-color: rgba(140, 180, 235, .4); }
.ebm-sea-regions > div { display: flex; align-items: center; gap: 6px; }
.ebm-sea-regions i { width: 7px; height: 7px; border-radius: 999px; display: inline-block; }
.ebm-sea-regions b { color: rgba(225, 238, 255, .85); font-weight: 500; font-variant-numeric: tabular-nums; }
.ebm-sea-dot { width: 7px; height: 7px; border-radius: 999px; display: inline-block; }
`

    // ---------------------------------------------------------------- 工具
    function fmtTime(ms) {
      if (!ms) return '—'
      const d = new Date(Number(ms))
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    function fmtNum(value) {
      return (Number(value) || 0).toLocaleString('zh-CN')
    }

    async function getJson(url) {
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    }

    /** 稳定的伪随机：同一 id 永远得到同一个方向，新增记忆不会让旧点乱跑。 */
    function hash01(str) {
      let h = 2166136261
      const s = String(str)
      for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
      }
      return (h >>> 0) / 4294967295
    }

    /** #7fd1a0 -> "127,209,160"，给 canvas 的 rgba() 用。 */
    function hexToRgb(hex) {
      const match = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ''))
      if (!match) return null
      const value = parseInt(match[1], 16)
      return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`
    }

    /** 脑区中心：手摆的，位置固定，跟视频里的分区一个意思。 */
    const REGION_POS = {
      permanent: [0, 0.15, 0],
      relational: [-2.5, 0.95, 0.75],
      life: [-2.0, -1.35, -1.35],
      plan: [1.75, 1.65, 1.15],
      ops: [2.55, -0.75, 0.95],
      working: [0.55, -2.0, -1.75],
      other: [0.2, 2.45, -1.35],
    }

    // ---------------------------------------------------------------- 球体布局
    // 半径 = 重要度（越重要越靠内），方位角 = 脑区（宽度按条数占比）。
    const SHELL = { perm: 0.95, s1: 1.55, s2: 2.15, s3: 2.75, agg: 3.35 }
    const GAP_DEG = 2

    function shellRadius(importance) {
      const value = Number(importance ?? 0)
      if (value >= 1) return SHELL.perm
      if (value >= 0.8) return SHELL.s1
      if (value >= 0.65) return SHELL.s2
      return SHELL.s3
    }

    /** 把记忆摊到"内核 + 三层壳 + 聚合外雾"上；平面模式沿用原来的分区团。 */
    function buildLayout(mode, raw) {
      const regions = raw?.regions ?? []
      const permRegion = regions.find((region) => region.key === 'permanent') ?? null
      const shellRegions = regions.filter((region) => region.key !== 'permanent')
      const total = shellRegions.reduce((sum, region) => sum + region.count, 0) || 1
      const sectors = []

      if (mode === 'sphere') {
        const gap = (GAP_DEG * Math.PI) / 180
        const usable = Math.PI * 2 - gap * shellRegions.length
        let cursor = 0
        for (const region of shellRegions) {
          const span = Math.max(0.05, (usable * region.count) / total)
          const start = cursor + gap / 2
          const mid = start + span / 2
          sectors.push({
            ...region,
            start,
            span,
            mid,
            label: [Math.cos(mid) * 3.95, 0.3, Math.sin(mid) * 3.95],
          })
          cursor = start + span + gap / 2
        }
        // 永久记忆不占扇区：它们贴在核心球面上，绕整圈铺开
        if (permRegion) {
          sectors.push({
            ...permRegion,
            start: 0,
            span: Math.PI * 2,
            mid: 0,
            core: true,
            label: [0, 1.62, 0],
          })
        }
      } else {
        for (const region of regions) {
          const [x, y, z] = REGION_POS[region.key] ?? [0, 0, 0]
          sectors.push({ ...region, start: 0, span: Math.PI * 2, mid: 0, label: [x, y - 0.4, z] })
        }
      }

      const sectorOf = new Map(sectors.map((sector) => [sector.key, sector]))

      // 时间归一：0 = 最早，1 = 最新（悬浮回放用）
      const times = (raw?.points ?? []).map((point) => Number(point.createdAt) || 0).filter(Boolean)
      const tMin = times.length ? Math.min(...times) : 0
      const tMax = times.length ? Math.max(...times) : 1
      const timeNorm = (value) => {
        const t = Number(value) || 0
        if (!(tMax > tMin)) return 0.5
        return Math.min(1, Math.max(0, (t - tMin) / (tMax - tMin)))
      }

      const points = (raw?.points ?? []).map((point) => {
        const sector = sectorOf.get(point.region)
        if (mode === 'sphere' && sector) {
          const r = shellRadius(point.importance)
          const theta = sector.core
            ? hash01(`${point.id}:th`) * Math.PI * 2
            : sector.start + hash01(`${point.id}:th`) * sector.span
          const phi = (hash01(`${point.id}:ph`) - 0.5) * 2.0
          const cosPhi = Math.cos(phi)
          return {
            ...point,
            x: cosPhi * Math.cos(theta) * r,
            y: Math.sin(phi) * r,
            z: cosPhi * Math.sin(theta) * r,
          }
        }
        const [cx, cy, cz] = REGION_POS[point.region] ?? [0, 0, 0]
        const count = regions.find((region) => region.key === point.region)?.count ?? 1
        const spread = 0.3 + 0.85 * Math.sqrt(count / 60)
        const a = hash01(`${point.id}:a`) * Math.PI * 2
        const cosT = hash01(`${point.id}:b`) * 2 - 1
        const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT))
        const jitter = hash01(`${point.id}:r`)
        const r = spread * (0.4 + jitter * 0.9)
        return {
          ...point,
          x: cx + Math.cos(a) * sinT * r,
          y: cy + cosT * r * 0.7,
          z: cz + Math.sin(a) * sinT * r,
        }
      })

      const aggregates = (raw?.aggregates ?? []).map((agg) => {
        const sector = sectorOf.get(agg.region)
        if (mode === 'sphere' && sector) {
          const seed = `agg:${agg.region}:${agg.week}`
          const r = SHELL.agg + (hash01(`${seed}:r`) - 0.5) * 0.3
          const theta = sector.start + hash01(`${seed}:th`) * sector.span
          const phi = (hash01(`${seed}:ph`) - 0.5) * 1.2
          const cosPhi = Math.cos(phi)
          return {
            ...agg,
            x: cosPhi * Math.cos(theta) * r,
            y: Math.sin(phi) * r,
            z: cosPhi * Math.sin(theta) * r,
          }
        }
        const [cx, cy, cz] = REGION_POS[agg.region] ?? [0, 0, 0]
        const ang = hash01(`${agg.region}:${agg.week}:a`) * Math.PI * 2
        const rad = 0.85 + hash01(`${agg.region}:${agg.week}:r`) * 0.95
        return {
          ...agg,
          x: cx + Math.cos(ang) * rad,
          y: cy + (hash01(`${agg.region}:${agg.week}:y`) - 0.5) * 0.9,
          z: cz + Math.sin(ang) * rad,
        }
      })

      return { points, aggregates, sectors }
    }

    function sourceLabel(t, source) {
      if (source === 'ebbinghaus') return t('sourceMigrated')
      if (source === 'dsh') return t('sourceDsh')
      if (source === 'conversation' || source === 'chat') return t('sourceChat')
      return source || ''
    }

    function MemoryIcon({ size = 18, active = false }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.72 },
      },
        h('path', {
          d: 'M2 14.2c0-3 2.9-5.4 6.5-5.4 2.8 0 4.8 1.1 6.2 2.8l3.1-2.2c.6-.4 1.3.1 1.1.8l-.5 1.7.5 1.7c.2.7-.5 1.2-1.1.8l-3.1-2.2c-1.4 1.7-3.4 2.8-6.2 2.8C4.9 15.2 2 15 2 14.2z',
          fill: 'currentColor',
        }),
        h('circle', { cx: 6.7, cy: 12.7, r: 0.9, fill: 'var(--dsw-specific-sidebar-fill, #fff)' }),
        h('circle', { cx: 17.6, cy: 6.6, r: 1.15, fill: 'currentColor', opacity: 0.85 }),
        h('circle', { cx: 20.4, cy: 4.7, r: 0.75, fill: 'currentColor', opacity: 0.55 }),
      )
    }

    // ---------------------------------------------------------------- 3D 记忆海
    function MemorySea({ t, onSwitch }) {
      const canvasRef = useRef(null)
      const stageRef = useRef(null)
      const dataRef = useRef({ points: [], links: [], stats: null })
      const screenRef = useRef([])
      const viewRef = useRef({ yaw: 0.55, pitch: -0.22, dist: 10.2, panX: 0, panY: 0, target: null })
      const dragRef = useRef(null)
      const spriteRef = useRef(null)
      const optRef = useRef({ labels: true, focus: true, selected: null, trace: false, cutoff: 1 })

      const [stats, setStats] = useState(null)
      const [selected, setSelected] = useState(null)
      // 默认状态（按使用者确认的截图）：高亮关、标签关、关联关、轨迹关、球体
      // 进去是一颗干净的球；要看连线/文字，自己点开那三个开关。
      const [labels, setLabels] = useState(false)
      const [highlight, setHighlight] = useState(false)
      const [trace, setTrace] = useState(false)
      const [linksOn, setLinksOn] = useState(false)
      const [limit, setLimit] = useState(5000)
      const [river, setRiver] = useState(1)
      const [mood, setMood] = useState(null)
      const [regions, setRegions] = useState([])
      const [similar, setSimilar] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [dragging, setDragging] = useState(false)
      const [replaying, setReplaying] = useState(false)
      const [fullText, setFullText] = useState(null)
      const [searchOpen, setSearchOpen] = useState(false)
      const [searchQuery, setSearchQuery] = useState('')
      const replayRef = useRef(false)

      /** 选中并让相机转向那颗星。 */
      const focusOn = useCallback((point) => {
        if (!point) return
        setSelected(point)
        setFullText(null)
        const view = viewRef.current
        view.target = {
          yaw: Math.atan2(point.x, point.z),
          pitch: Math.max(-1, Math.min(1, -Math.atan2(point.y, Math.hypot(point.x, point.z)))),
        }
      }, [])

      optRef.current.labels = labels
      optRef.current.focus = highlight
      optRef.current.selected = selected
      optRef.current.trace = trace
      optRef.current.linksOn = linksOn
      optRef.current.moodRgb = mood?.top?.[0]?.color ? hexToRgb(mood.top[0].color) : null

      const [layout, setLayout] = useState('sphere')
      const layoutRef = useRef('sphere')

      /** 按当前布局重算所有坐标（数据不变，只是重新摆位）。 */
      const applyLayout = useCallback((mode) => {
        const current = dataRef.current
        if (!current?.raw) return
        const built = buildLayout(mode, current.raw)
        current.points = built.points
        current.aggregates = built.aggregates
        current.sectors = built.sectors
        
      }, [])

      const load = useCallback(async (nextLimit) => {
        setLoading(true)
        try {
          const data = await getJson(`${API}/sea?limit=${nextLimit}`)
          const times = data.points.map((p) => p.createdAt).filter(Boolean)
          const minT = times.length ? Math.min(...times) : 0
          const maxT = times.length ? Math.max(...times) : 1
          const regions = data.regions ?? []
          // 邻接表：选中某个点后，顺着线亮起来的就是这些
          const adj = new Map()
          for (const link of data.links) {
            if (link.kind !== 'graph') continue
            if (!adj.has(link.a)) adj.set(link.a, [])
            if (!adj.has(link.b)) adj.set(link.b, [])
            adj.get(link.a).push(link.b)
            adj.get(link.b).push(link.a)
          }
          dataRef.current = {
            links: data.links,
            stats: data.stats,
            adj,
            minT,
            maxT,
            regions,
            regionLinks: data.regionLinks ?? [],
            raw: {
              points: data.points,
              aggregates: data.aggregates ?? [],
              regions,
            },
          }
          applyLayout(layoutRef.current)
          setStats(data.stats)
          setRegions(regions)
          setLoading(false)
          setError('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
          setLoading(false)
        }
      }, [applyLayout])

      useEffect(() => { void load(limit) }, [limit, load])

      // 自动跟随：每 20 秒问一次总数，只有条数变了才重新取点（旧点位置不变）
      useEffect(() => {
        const timer = setInterval(async () => {
          try {
            const status = await getJson(`${API}/status`)
            const count = Number(status?.counts?.documents ?? -1)
            if (count !== Number(dataRef.current.stats?.points ?? -1)) void load(limit)
          } catch {
            /* 网络抖动就等下一轮 */
          }
        }, 20000)
        return () => clearInterval(timer)
      }, [limit, load])

      // 此刻的情绪：开源版不内置情绪模块，接口恒回 available:false，这里静默跳过
      useEffect(() => {
        let alive = true
        const fetchMood = async () => {
          try {
            const data = await getJson(`${API}/mood`)
            if (alive && data?.available) setMood(data)
          } catch {
            /* 没有情绪模块就静默 */
          }
        }
        void fetchMood()
        const timer = setInterval(fetchMood, 60000)
        return () => { alive = false; clearInterval(timer) }
      }, [])

      // 相似记忆：选中哪条就去算哪条
      useEffect(() => {
        if (!selected) { setSimilar([]); return undefined }
        let alive = true
        getJson(`${API}/similar?id=${selected.id}`)
          .then((data) => { if (alive) setSimilar(data.items ?? []) })
          .catch(() => { if (alive) setSimilar([]) })
        return () => { alive = false }
      }, [selected])

      // 换一条记忆就把"全文"收回去
      useEffect(() => { setFullText(null) }, [selected?.id])

      // 回放：每 2 秒跳到下一条（按时间倒序），相机跟着转过去
      useEffect(() => {
        const timer = setInterval(() => {
          if (!replayRef.current) return
          const sorted = [...dataRef.current.points].sort((a, b) => b.createdAt - a.createdAt)
          if (!sorted.length) return
          const current = optRef.current.selected?.id
          const index = sorted.findIndex((point) => point.id === current)
          const next = sorted[Math.min(sorted.length - 1, index + 1)] || sorted[0]
          focusOn(next)
        }, 2000)
        return () => clearInterval(timer)
      }, [focusOn])

      // F 搜索
      useEffect(() => {
        const onKey = (event) => {
          const tag = String(event.target?.tagName ?? '').toLowerCase()
          if (tag === 'input' || tag === 'textarea') {
            if (event.key === 'Escape') setSearchOpen(false)
            return
          }
          if (event.key === 'f' || event.key === 'F') {
            event.preventDefault()
            setSearchOpen(true)
          } else if (event.key === 'Escape') {
            setSearchOpen(false)
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      const runSeaSearch = async () => {
        const value = searchQuery.trim()
        if (!value) return
        try {
          const data = await getJson(`${API}/search?q=${encodeURIComponent(value)}&limit=10`)
          const hit = (data.items ?? [])[0]
          if (!hit) return
          const point = dataRef.current.points.find((item) => item.id === hit.id)
          if (point) focusOn(point)
          setSearchOpen(false)
        } catch {
          /* 搜索失败就保持打开 */
        }
      }

      const loadFullText = async () => {
        if (!selected) return
        try {
          const data = await getJson(`${API}/doc?id=${selected.id}`)
          setFullText(data.doc?.text ?? selected.text ?? '')
        } catch {
          setFullText(selected.text ?? '')
        }
      }

      // ---------------------------------------------------------- 渲染循环
      useEffect(() => {
        const canvas = canvasRef.current
        const stage = stageRef.current
        if (!canvas || !stage) return undefined
        const ctx2d = canvas.getContext('2d')
        let raf = 0
        let width = 0
        let height = 0
        let dpr = Math.min(2, window.devicePixelRatio || 1)

        const resize = () => {
          const rect = stage.getBoundingClientRect()
          width = Math.max(1, Math.round(rect.width))
          height = Math.max(1, Math.round(rect.height))
          dpr = Math.min(2, window.devicePixelRatio || 1)
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(stage)

        // 按颜色缓存光点贴图：白芯 + 该颜色的柔光
        const spriteCache = new Map()
        const spriteFor = (rgb) => {
          const cached = spriteCache.get(rgb)
          if (cached) return cached
          const s = document.createElement('canvas')
          s.width = 64
          s.height = 64
          const sc = s.getContext('2d')
          const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32)
          g.addColorStop(0, 'rgba(255,255,255,0.95)')
          g.addColorStop(0.18, `rgba(${rgb},0.8)`)
          g.addColorStop(0.45, `rgba(${rgb},0.25)`)
          g.addColorStop(1, `rgba(${rgb},0)`)
          sc.fillStyle = g
          sc.fillRect(0, 0, 64, 64)
          spriteCache.set(rgb, s)
          return s
        }

        const project = (p, view, focal, cx, cy) => {
          const cyaw = Math.cos(view.yaw)
          const syaw = Math.sin(view.yaw)
          const cp = Math.cos(view.pitch)
          const sp = Math.sin(view.pitch)
          const x1 = p.x * cyaw + p.z * syaw
          const z1 = -p.x * syaw + p.z * cyaw
          const y1 = p.y * cp - z1 * sp
          const z2 = p.y * sp + z1 * cp
          const denom = Math.max(0.2, view.dist - z2)
          const scale = focal / denom
          return { sx: cx + x1 * scale + view.panX, sy: cy + y1 * scale + view.panY, scale, depth: z2 }
        }

        let lastFrame = 0
        const draw = (now = 0) => {
          // 用真实时间算步长：帧率掉下来时旋转速度不会跟着变慢
          const delta = lastFrame ? Math.min(3, Math.max(0.2, (now - lastFrame) / 16.67)) : 1
          lastFrame = now
          const view = viewRef.current
          if (view.target) {
            view.yaw += (view.target.yaw - view.yaw) * 0.08 * delta
            view.pitch += (view.target.pitch - view.pitch) * 0.08 * delta
            if (Math.abs(view.target.yaw - view.yaw) < 0.004 && Math.abs(view.target.pitch - view.pitch) < 0.004) {
              view.target = null
            }
          } else if (!dragRef.current) {
            view.yaw += 0.0008 * delta
          }
          const cx = width / 2
          const cy = height / 2
          const focal = Math.min(width, height) * 1.15

          ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx2d.clearRect(0, 0, width, height)

          const { points, links } = dataRef.current
          const opts = optRef.current
          const projected = points.map((p) => ({ p, ...project(p, view, focal, cx, cy) }))

          // ---- 脑区：球体模式画壳层与扇区，平面模式画分区团 ----
          const regionList = dataRef.current.regions || []
          const sectors = dataRef.current.sectors || []
          const regionLinks = dataRef.current.regionLinks || []
          const sphereMode = layoutRef.current === 'sphere'
          
          const centerOf = (key) => REGION_POS[key] ?? [0, 0, 0]

          if (sphereMode) {
            // 三道壳层轮廓（近似：以原点为圆心、半径 r*scale 的圆）
            const origin = project({ x: 0, y: 0, z: 0 }, view, focal, cx, cy)
            for (const radius of [SHELL.s1, SHELL.s2, SHELL.s3]) {
              ctx2d.strokeStyle = 'rgba(150,190,240,0.045)'
              ctx2d.lineWidth = 0.8
              ctx2d.beginPath()
              ctx2d.arc(origin.sx, origin.sy, radius * origin.scale, 0, Math.PI * 2)
              ctx2d.stroke()
            }
            // 扇区分界：从内核边缘拉向外圈
            if (opts.linksOn) {
              for (const sector of sectors) {
                if (sector.core) continue
                const angle = sector.start
                const inner = project({ x: Math.cos(angle) * SHELL.perm, y: 0, z: Math.sin(angle) * SHELL.perm }, view, focal, cx, cy)
                const outer = project({ x: Math.cos(angle) * SHELL.agg, y: 0, z: Math.sin(angle) * SHELL.agg }, view, focal, cx, cy)
                ctx2d.strokeStyle = 'rgba(150,190,240,0.05)'
                ctx2d.lineWidth = 0.7
                ctx2d.beginPath()
                ctx2d.moveTo(inner.sx, inner.sy)
                ctx2d.lineTo(outer.sx, outer.sy)
                ctx2d.stroke()
              }
            }
          } else {
            const maxPair = Math.max(1, ...regionLinks.map((link) => link.count))
            for (const link of regionLinks) {
              if (!opts.linksOn) break
              const [ax, ay, az] = centerOf(link.a)
              const [bx, by, bz] = centerOf(link.b)
              const pa = project({ x: ax, y: ay, z: az }, view, focal, cx, cy)
              const pb = project({ x: bx, y: by, z: bz }, view, focal, cx, cy)
              const strength = link.count / maxPair
              ctx2d.strokeStyle = `rgba(150,190,240,${0.04 + strength * 0.16})`
              ctx2d.lineWidth = 0.7 + strength * 1.6
              ctx2d.beginPath()
              ctx2d.moveTo(pa.sx, pa.sy)
              ctx2d.lineTo(pb.sx, pb.sy)
              ctx2d.stroke()
            }
            for (const region of regionList) {
              const [rx, ry, rz] = centerOf(region.key)
              const pr = project({ x: rx, y: ry, z: rz }, view, focal, cx, cy)
              ctx2d.globalAlpha = 0.5
              ctx2d.strokeStyle = region.color
              ctx2d.lineWidth = 1
              ctx2d.beginPath()
              ctx2d.arc(pr.sx, pr.sy, 4.5, 0, Math.PI * 2)
              ctx2d.stroke()
              ctx2d.globalAlpha = 1
            }
          }

          const sun = project({ x: 0, y: 0, z: 0 }, view, focal, cx, cy)
          const sunR = sphereMode
            ? SHELL.perm * sun.scale
            : Math.max(18, Math.min(width, height) * 0.055) * (sun.scale / focal) + 8
          const grad = ctx2d.createRadialGradient(sun.sx, sun.sy, 0, sun.sx, sun.sy, sunR * 2.2)
          const moodRgb = opts.moodRgb || '255,196,96'
          grad.addColorStop(0, 'rgba(255,242,205,0.9)')
          grad.addColorStop(0.22, `rgba(${moodRgb},0.34)`)
          grad.addColorStop(0.55, `rgba(${moodRgb},0.1)`)
          grad.addColorStop(1, `rgba(${moodRgb},0)`)
          ctx2d.globalCompositeOperation = 'lighter'
          ctx2d.fillStyle = grad
          ctx2d.beginPath()
          ctx2d.arc(sun.sx, sun.sy, sunR * 2.2, 0, Math.PI * 2)
          ctx2d.fill()
          ctx2d.globalCompositeOperation = 'source-over'

          // 最中间那颗是她自己
          ctx2d.save()
          ctx2d.textAlign = 'center'
          ctx2d.textBaseline = 'middle'
          ctx2d.font = '600 13px system-ui, -apple-system, "Segoe UI", sans-serif'
          ctx2d.shadowColor = 'rgba(0,0,0,0.85)'
          ctx2d.shadowBlur = 8
          ctx2d.fillStyle = 'rgba(255,246,222,0.95)'
          ctx2d.fillText(t('selfName'), sun.sx, sun.sy + 1)
          ctx2d.restore()

          const byId = new Map(projected.map((it) => [it.p.id, it]))
          const data = dataRef.current
          const adj = data.adj || new Map()
          // optRef 里存的是整条记忆对象，这里统一换成 id 再比（之前拿对象比 id，永远对不上）
          const selectedId = opts.selected && typeof opts.selected === 'object'
            ? opts.selected.id
            : (opts.selected ?? null)
          const active = new Set()
          if (selectedId != null) {
            active.add(selectedId)
            for (const id of adj.get(selectedId) || []) active.add(id)
          }
          const cutoff = data.minT && data.maxT > data.minT
            ? data.minT + (data.maxT - data.minT) * (opts.cutoff || 0)
            : 0

          // 线：
          //   关联开 → 全部画出来（平时很淡，选中时相关的亮起来）
          //   关联关 → 平时一条线都不画；一旦选中某条记忆，只把和它直接相连的那几根画出来并点亮
          const showAllLinks = !!opts.linksOn
          ctx2d.lineWidth = 0.6
          for (const link of links) {
            const isTime = link.kind === 'time'
            if (isTime && !opts.trace) continue
            const a = byId.get(link.a)
            const b = byId.get(link.b)
            if (!a || !b) continue
            const incident = selectedId != null && (link.a === selectedId || link.b === selectedId)
            if (!showAllLinks && !incident) continue
            const hot = incident || (showAllLinks && active.size > 0 && active.has(link.a) && active.has(link.b))
            const depth = (a.depth + b.depth) / 2
            const near = Math.max(0, Math.min(1, (view.dist - depth) / (view.dist + 3)))
            const base = isTime ? 0.11 : 0.1
            const alpha = hot ? 0.55 : (active.size ? base * 0.35 : base) * (0.3 + near * 0.8)
            ctx2d.setLineDash(isTime ? [2, 4] : [])
            ctx2d.strokeStyle = hot
              ? 'rgba(150,240,255,0.55)'
              : (isTime ? `rgba(110,160,245,${alpha})` : `rgba(140,195,255,${alpha})`)
            ctx2d.lineWidth = hot ? 1 : 0.6
            ctx2d.beginPath()
            ctx2d.moveTo(a.sx, a.sy)
            ctx2d.lineTo(b.sx, b.sy)
            ctx2d.stroke()
          }
          ctx2d.lineWidth = 0.6
          ctx2d.setLineDash([])

          // 球体模式：从内核往焦点星拉几道很淡的射线（像她伸出去的神经）
          if (sphereMode) {
            for (const it of projected) {
              if (!it.p.focus) continue
              ctx2d.strokeStyle = 'rgba(150,200,255,0.05)'
              ctx2d.lineWidth = 0.6
              ctx2d.beginPath()
              ctx2d.moveTo(sun.sx, sun.sy)
              ctx2d.lineTo(it.sx, it.sy)
              ctx2d.stroke()
            }
          }

          const ordered = [...projected].sort((m, n) => m.depth - n.depth)
          const screen = []
          const regionColors = new Map((dataRef.current.regions || []).map((r) => [r.key, r.color]))

          // 聚合层：importance < 0.55 的记忆团成「区 × 周」的星团。
          // 大小 = 那一周还剩多少条，亮度 = 平均重要度；LM 删掉条目，它就变暗变小。
          const aggregates = dataRef.current.aggregates || []
          const aggCutoff = cutoff
          for (const agg of aggregates) {
            const [ax, ay, az] = centerOf(agg.region)
            const ang = hash01(`${agg.region}:${agg.week}:a`) * Math.PI * 2
            const rad = 0.85 + hash01(`${agg.region}:${agg.week}:r`) * 0.95
            const pr = project({
              x: ax + Math.cos(ang) * rad,
              y: ay + (hash01(`${agg.region}:${agg.week}:y`) - 0.5) * 0.9,
              z: az + Math.sin(ang) * rad,
            }, view, focal, cx, cy)
            const fadedAgg = aggCutoff > 0 && agg.to > aggCutoff
            const rgb = hexToRgb(regionColors.get(agg.region)) || '143,182,255'
            const strength = Math.max(0.08, Math.min(0.6, agg.importance))
            const size = (3.2 + Math.sqrt(agg.count) * 2.4) * (0.7 + pr.scale / focal * 0.6)
            ctx2d.globalAlpha = fadedAgg ? 0.05 : 0.1 + strength * 0.55
            ctx2d.drawImage(spriteFor(rgb), pr.sx - size / 2, pr.sy - size / 2, size, size)
            ctx2d.globalAlpha = 1
            if (agg.count > 3 && pr.scale > 90) {
              ctx2d.font = '9.5px system-ui, -apple-system, "Segoe UI", sans-serif'
              ctx2d.fillStyle = `rgba(210,225,245,${fadedAgg ? 0.15 : 0.42})`
              ctx2d.textAlign = 'center'
              ctx2d.fillText(String(agg.count), pr.sx, pr.sy + 2)
              ctx2d.textAlign = 'start'
            }
          }
          for (const it of ordered) {
            const { p } = it
            // 被压进同一个节点的永久记忆不单独画，免得糊成一团
            const near = Math.max(0, Math.min(1, (view.dist - it.depth) / (view.dist + 3)))
            const isSel = selectedId === p.id
            const isNeighbor = active.size > 0 && active.has(p.id) && !isSel
            const faded = cutoff > 0 && p.createdAt > cutoff
            const dim = (active.size > 0 && !active.has(p.id)) || faded
            // 颜色按脑区：柔和光点的颜色 = 这个区的颜色
            const hex = regionColors.get(p.region)
              || (p.importance >= 1 ? '#ffcf6e' : p.importance >= 0.55 ? '#7fe3d4' : '#8fb6ff')
            const rgb = hexToRgb(hex) || '143,182,255'
            const alpha = dim ? 0.1 : 0.42 + near * 0.45
            const size = 1.4 + near * 2.1

            const sprite = spriteFor(rgb)
            const d = Math.max(5, size * 7)
            ctx2d.globalAlpha = alpha
            ctx2d.drawImage(sprite, it.sx - d / 2, it.sy - d / 2, d, d)
            ctx2d.globalAlpha = 1

            // 焦点星：外面再罩一层大光晕，看起来像"亮一点的星"
            if (p.focus) {
              const halo = Math.max(16, size * 13)
              ctx2d.globalAlpha = dim ? 0.03 : 0.13
              ctx2d.drawImage(sprite, it.sx - halo / 2, it.sy - halo / 2, halo, halo)
              ctx2d.globalAlpha = 1
            }

            // 高亮焦点：给每区那几条较重要的记忆套一圈细环
            if (opts.focus && p.focus && !isSel) {
              ctx2d.strokeStyle = `rgba(${rgb},0.42)`
              ctx2d.lineWidth = 0.9
              ctx2d.beginPath()
              ctx2d.arc(it.sx, it.sy, size * 2.2 + 2.5, 0, Math.PI * 2)
              ctx2d.stroke()
            }

            if (isNeighbor) {
              ctx2d.strokeStyle = `rgba(${rgb},0.5)`
              ctx2d.lineWidth = 1
              ctx2d.beginPath()
              ctx2d.arc(it.sx, it.sy, size * 2.4 + 2, 0, Math.PI * 2)
              ctx2d.stroke()
            }
            if (isSel) {
              ctx2d.strokeStyle = `rgba(${rgb},0.9)`
              ctx2d.lineWidth = 1.6
              ctx2d.beginPath()
              ctx2d.arc(it.sx, it.sy, size * 2.8 + 3, 0, Math.PI * 2)
              ctx2d.stroke()
              ctx2d.strokeStyle = 'rgba(220,255,250,0.45)'
              ctx2d.lineWidth = 0.8
              ctx2d.beginPath()
              ctx2d.arc(it.sx, it.sy, size * 2.8 + 7, 0, Math.PI * 2)
              ctx2d.stroke()
            }
            screen.push({ id: p.id, x: it.sx, y: it.sy })
          }
          screenRef.current = screen

          // 区名画在最上层，免得被光点和核心盖住
          for (const sector of sectors) {
            if (sphereMode && sector.span < 0.12) continue
            const [rx, ry, rz] = sector.label ?? centerOf(sector.key)
            const pr = project({ x: rx, y: ry, z: rz }, view, focal, cx, cy)
            const labelY = sector.key === 'permanent' && !sphereMode ? pr.sy + 32 : pr.sy - 14
            ctx2d.textAlign = 'center'
            ctx2d.textBaseline = 'middle'
            ctx2d.font = '600 13.5px system-ui, -apple-system, "Segoe UI", sans-serif'
            ctx2d.shadowColor = 'rgba(0,0,0,0.9)'
            ctx2d.shadowBlur = 6
            ctx2d.fillStyle = sector.color
            ctx2d.fillText(sector.name, pr.sx, labelY)
            ctx2d.shadowBlur = 0
            ctx2d.font = '10.5px system-ui, -apple-system, "Segoe UI", sans-serif'
            ctx2d.fillStyle = 'rgba(205,220,240,0.6)'
            ctx2d.fillText(String(sector.count), pr.sx, sector.key === 'permanent' && !sphereMode ? pr.sy + 46 : pr.sy + 14)
            ctx2d.textAlign = 'start'
            ctx2d.textBaseline = 'alphabetic'
          }

          if (opts.labels) {
            ctx2d.textBaseline = 'middle'
            const labelled = [...ordered]
              .filter((it) => selectedId === it.p.id || active.has(it.p.id) || it.p.focus)
              .slice(0, 14)
            for (const it of labelled) {
              const { p } = it
              const isSel = selectedId === p.id
              const near = Math.max(0, Math.min(1, (view.dist - it.depth) / (view.dist + 3)))
              ctx2d.font = `${isSel ? 12 : 10.5}px system-ui, -apple-system, "Segoe UI", sans-serif`
              ctx2d.fillStyle = isSel ? 'rgba(225,255,250,0.95)' : `rgba(185,210,240,${0.32 + near * 0.4})`
              const text = p.text.length > 13 ? `${p.text.slice(0, 13)}…` : p.text
              ctx2d.fillText(text, it.sx + 8, it.sy - 6)
            }
          }

          ctx2d.globalCompositeOperation = 'source-over'
          raf = requestAnimationFrame(draw)
        }
        raf = requestAnimationFrame(draw)

        let lastX = 0
        let lastY = 0
        const onDown = (e) => {
          if (e.button === 0) {
            dragRef.current = { mode: 'rotate' }
            viewRef.current.target = null
          } else {
            dragRef.current = { mode: 'pan' }
          }
          lastX = e.clientX
          lastY = e.clientY
          setDragging(true)
          canvas.setPointerCapture?.(e.pointerId)
        }
        const onMove = (e) => {
          const drag = dragRef.current
          if (!drag) return
          const dx = e.clientX - lastX
          const dy = e.clientY - lastY
          lastX = e.clientX
          lastY = e.clientY
          const view = viewRef.current
          if (drag.mode === 'rotate') {
            view.yaw += dx * 0.006
            view.pitch = Math.max(-1.2, Math.min(1.2, view.pitch + dy * 0.006))
          } else {
            view.panX += dx
            view.panY += dy
          }
        }
        const onUp = (e) => {
          dragRef.current = null
          setDragging(false)
          canvas.releasePointerCapture?.(e.pointerId)
        }
        const onWheel = (e) => {
          e.preventDefault()
          const view = viewRef.current
          view.dist = Math.max(2.4, Math.min(16, view.dist * Math.exp(e.deltaY * 0.0012)))
        }
        const onClick = (e) => {
          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          let best = null
          let bestD = 14
          for (const item of screenRef.current) {
            const d = Math.hypot(item.x - x, item.y - y)
            if (d < bestD) { bestD = d; best = item }
          }
          if (!best) { setSelected(null); return }
          const point = dataRef.current.points.find((p) => p.id === best.id) || null
          setSelected(point)
          if (point && e.detail >= 2) {
            const view = viewRef.current
            view.target = {
              yaw: Math.atan2(point.x, point.z),
              pitch: Math.max(-1, Math.min(1, -Math.atan2(point.y, Math.hypot(point.x, point.z)))),
            }
          }
        }
        const onDbl = (e) => { e.preventDefault() }

        canvas.addEventListener('pointerdown', onDown)
        canvas.addEventListener('pointermove', onMove)
        canvas.addEventListener('pointerup', onUp)
        canvas.addEventListener('pointercancel', onUp)
        canvas.addEventListener('wheel', onWheel, { passive: false })
        canvas.addEventListener('click', onClick)
        canvas.addEventListener('dblclick', onDbl)

        return () => {
          cancelAnimationFrame(raf)
          ro.disconnect()
          canvas.removeEventListener('pointerdown', onDown)
          canvas.removeEventListener('pointermove', onMove)
          canvas.removeEventListener('pointerup', onUp)
          canvas.removeEventListener('pointercancel', onUp)
          canvas.removeEventListener('wheel', onWheel)
          canvas.removeEventListener('click', onClick)
          canvas.removeEventListener('dblclick', onDbl)
        }
      }, [])

      const resetView = () => {
        const view = viewRef.current
        view.target = null
        view.yaw = 0.55
        view.pitch = -0.22
        view.dist = layoutRef.current === 'sphere' ? 10.2 : 6.2
        view.panX = 0
        view.panY = 0
      }

      /** 球体 / 平面 切换：只重摆坐标，不重新取数。 */
      const toggleLayout = () => {
        const next = layoutRef.current === 'sphere' ? 'flat' : 'sphere'
        layoutRef.current = next
        setLayout(next)
        applyLayout(next)
        const view = viewRef.current
        view.target = null
        view.dist = next === 'sphere' ? 10.2 : 6.2
        view.panX = 0
        view.panY = 0
      }

      /** 回放的单步：-1 更新一条，+1 更旧一条。 */
      const stepReplay = (direction) => {
        const sorted = [...dataRef.current.points].sort((a, b) => b.createdAt - a.createdAt)
        if (!sorted.length) return
        const index = sorted.findIndex((point) => point.id === optRef.current.selected?.id)
        const next = sorted[Math.max(0, Math.min(sorted.length - 1, index + direction))]
        if (next) focusOn(next)
      }


      const adjacency = dataRef.current.adj || new Map()
      const neighborPoints = selected
        ? (adjacency.get(selected.id) || [])
            .map((id) => dataRef.current.points.find((p) => p.id === id))
            .filter(Boolean)
            .slice(0, 8)
        : []

      return h('div', { className: 'ebm-sea' },
        h('div', { className: 'ebm-sea-head' },
          h('div', null,
            h('h1', { className: 'ebm-page-title' }, t('seaTitle')),
            h('p', { className: 'ebm-page-sub' }, t('seaSub')),
          ),
          h('div', { className: 'ebm-switch' },
            h('button', { className: 'ebm-chip on' }, t('viewSea')),
            h('button', { className: 'ebm-chip', onClick: onSwitch }, t('viewList')),
          ),
          h('div', { className: 'ebm-sea-stats' },
            h('span', null, t('statPoints'), ' ', h('b', null, fmtNum(stats?.points))),
            h('span', null, t('statLinks'), ' ', h('b', null, fmtNum(stats?.links))),
            h('span', null, t('statSpan'), ' ', h('b', null, stats?.spanDays ?? 0), ' ', t('days')),
            h('span', null, t('statFocus'), ' ', h('b', null, fmtNum(stats?.focus))),
            h('span', null, t('bornAt'), ' ', h('b', null, stats?.bornAt ? fmtTime(stats.bornAt).split(' ')[0] : '—')),
            h('span', null, h('b', null, fmtNum(stats?.people)), ' ', t('people')),
            h('span', null, h('b', null, fmtNum(stats?.facts)), ' ', t('facts')),
          ),
          mood?.top?.length
            ? h('div', { className: 'ebm-sea-mood' },
                h('span', null, t('moodNow')),
                mood.top.slice(0, 2).map((dim) => h('span', { key: dim.key },
                  h('i', { style: { background: dim.color } }),
                  `${dim.label} ${Math.round(dim.value)}`)),
              )
            : null,
        ),
        h('div', { className: 'ebm-sea-stage', ref: stageRef },
          h('canvas', { className: `ebm-sea-canvas${dragging ? ' dragging' : ''}`, ref: canvasRef }),
          h('div', { className: 'ebm-sea-tools' },
            h('button', {
              className: `ebm-btn${highlight ? ' on' : ''}`,
              onClick: () => setHighlight((value) => !value),
            }, highlight ? t('focusOn') : t('focusOff')),
            h('button', {
              className: `ebm-btn${labels ? ' on' : ''}`,
              onClick: () => setLabels((value) => !value),
            }, labels ? t('labelsOn') : t('labelsOff')),
            h('button', {
              className: `ebm-btn${linksOn ? ' on' : ''}`,
              onClick: () => setLinksOn((value) => !value),
            }, linksOn ? t('linksOn') : t('linksOff')),
            h('button', {
              className: `ebm-btn${trace ? ' on' : ''}`,
              onClick: () => setTrace((value) => !value),
            }, trace ? t('traceOn') : t('traceOff')),
            h('button', { className: 'ebm-btn on', onClick: toggleLayout }, layout === 'sphere' ? t('layoutSphere') : t('layoutFlat')),
            h('button', { className: 'ebm-btn', onClick: () => void load(limit) }, t('refresh')),
            h('button', { className: 'ebm-btn', onClick: resetView }, t('reset')),
            h('button', { className: 'ebm-btn', onClick: () => stepReplay(1) }, `‹ ${t('replayPrev')}`),
            h('button', {
              className: `ebm-btn${replaying ? ' on' : ''}`,
              onClick: () => {
                const next = !replayRef.current
                replayRef.current = next
                setReplaying(next)
                if (next && !optRef.current.selected) stepReplay(1)
              },
            }, replaying ? t('replayPause') : t('replayStart')),
            h('button', { className: 'ebm-btn', onClick: () => stepReplay(-1) }, `${t('replayNext')} ›`),
          ),
          searchOpen
            ? h('div', { className: 'ebm-sea-search' },
                h('input', {
                  className: 'ebm-input',
                  autoFocus: true,
                  placeholder: t('seaSearch'),
                  value: searchQuery,
                  onChange: (event) => setSearchQuery(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') void runSeaSearch()
                    if (event.key === 'Escape') setSearchOpen(false)
                  },
                }),
              )
            : null,
          regions.length
            ? h('div', { className: 'ebm-sea-regions' },
                regions.map((region) => h('div', { key: region.key },
                  h('i', { style: { background: region.color } }),
                  h('span', null, region.name),
                  h('b', null, region.count),
                )),
              )
            : null,
          h('div', { className: 'ebm-sea-badge' },
            loading ? t('loading') : null,
            error ? h('span', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
          ),
          selected
            ? h('div', { className: 'ebm-sea-card' },
                h('div', { className: 'ebm-sea-card-title' },
                  h('span', null, selected.text.slice(0, 18) + (selected.text.length > 18 ? '…' : '')),
                  h('button', { className: 'ebm-link', onClick: () => setSelected(null) }, t('close')),
                ),
                h('div', { className: 'ebm-sea-card-meta' },
                  h('div', null, `${t('time')}：${fmtTime(selected.createdAt)}`),
                  h('div', null, `${t('importance')}：${Number(selected.importance).toFixed(2)}　${selected.importance >= 1 ? t('bucketPermanent') : selected.importance >= 0.55 ? t('bucketLong') : t('bucketShort')}`),
                  h('div', null, `${t('source')}：${sourceLabel(t, selected.source)}${selected.recalled ? `　·　${t('recalled')}` : ''}`),
                  selected.mood
                    ? h('div', null, `${t('moodAt')}：${selected.mood.label} ${Math.round(selected.mood.value)}`)
                    : null,
                ),
                h('div', { className: 'ebm-sea-card-text' }, selected.text || ''),
                fullText === null
                  ? h('button', {
                      className: 'ebm-link',
                      style: { marginTop: '8px' },
                      onClick: () => void loadFullText(),
                    }, t('readFull'))
                  : h('div', null,
                      h('div', { className: 'ebm-sea-card-text', style: { marginTop: '8px', color: 'rgba(225,236,250,.95)' } }, fullText),
                      h('button', {
                        className: 'ebm-link',
                        style: { marginTop: '6px' },
                        onClick: () => setFullText(null),
                      }, t('foldUp')),
                    ),
                neighborPoints.length
                  ? h('div', null,
                      h('div', { className: 'ebm-sea-card-sub' }, t('related')),
                      h('div', { className: 'ebm-sea-card-links' },
                        neighborPoints.map((p) => h('button', {
                          key: p.id,
                          onClick: () => setSelected(p),
                        }, p.text.slice(0, 12) + (p.text.length > 12 ? '…' : ''))),
                      ),
                    )
                  : null,
                similar.length
                  ? h('div', null,
                      h('div', { className: 'ebm-sea-card-sub' }, t('similar')),
                      h('div', { className: 'ebm-sea-card-links' },
                        similar.map((item) => h('button', {
                          key: item.id,
                          title: `相似度 ${item.score}`,
                          onClick: () => {
                            const point = dataRef.current.points.find((p) => p.id === item.id)
                            if (point) setSelected(point)
                          },
                        }, item.text.slice(0, 12) + (item.text.length > 12 ? '…' : ''))),
                      ),
                    )
                  : null,
              )
            : null,
          h('div', { className: 'ebm-sea-bottom' },
            selected && neighborPoints.length
              ? h('div', { className: 'ebm-sea-recall' },
                  t('recallPrefix'),
                  h('b', null, selected.text.slice(0, 12)),
                  t('recallMiddle'),
                  neighborPoints.slice(0, 6).map((p) => p.text.slice(0, 8)).join('、'),
                )
              : null,
            h('div', { className: 'ebm-sea-river' },
              h('span', { className: 'ebm-sea-river-label' }, t('riverStart')),
              h('input', {
                type: 'range', min: 0, max: 1000, value: Math.round(river * 1000),
                onChange: (e) => {
                  const value = Number(e.target.value) / 1000
                  setRiver(value)
                  optRef.current.cutoff = value
                },
              }),
              h('span', { className: 'ebm-sea-river-label' }, t('riverNow')),
              h('div', { className: 'ebm-sea-legend' },
                h('span', null, t('legendRegion')),
              ),
            ),
          ),
          h('div', { className: 'ebm-sea-hint' }, t('hintDrag')),
        ),
      )
    }

    // ---------------------------------------------------------------- 列表面板（完整版）
    function MemoryListFull({ t, onSwitch }) {
      const [status, setStatus] = useState(null)
      const [items, setItems] = useState([])
      const [total, setTotal] = useState(0)
      const [bucket, setBucket] = useState('all')
      const [query, setQuery] = useState('')
      const [results, setResults] = useState(null)
      const [expanded, setExpanded] = useState({})
      const [atoms, setAtoms] = useState([])
      const [graph, setGraph] = useState(null)
      const [busy, setBusy] = useState('')
      const [error, setError] = useState('')

      const loadStatus = useCallback(async () => {
        try {
          setStatus(await getJson(`${API}/status`))
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        }
      }, [])

      const loadItems = useCallback(async (nextBucket) => {
        try {
          const data = await getJson(`${API}/items?bucket=${nextBucket}&limit=60`)
          setItems(data.items || [])
          setTotal(Number(data.total || 0))
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        }
      }, [])

      const loadAtoms = useCallback(async () => {
        try {
          const data = await getJson(`${API}/atoms?limit=10`)
          setAtoms(data.items || [])
        } catch {
          setAtoms([])
        }
      }, [])

      const loadGraph = useCallback(async () => {
        try {
          setGraph(await getJson(`${API}/graph?limit=12`))
        } catch {
          setGraph(null)
        }
      }, [])

      useEffect(() => {
        void loadStatus()
        void loadAtoms()
        void loadGraph()
      }, [loadStatus, loadAtoms, loadGraph])

      useEffect(() => { void loadItems(bucket) }, [bucket, loadItems])

      const runSearch = async () => {
        const value = query.trim()
        if (!value) { setResults(null); return }
        setBusy('search')
        try {
          const data = await getJson(`${API}/search?q=${encodeURIComponent(value)}&limit=40`)
          setResults(data.items || [])
          setError('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
          setResults([])
        } finally {
          setBusy('')
        }
      }

      const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
      const list = results ?? items
      const counts = status?.counts ?? { documents: 0, atoms: 0, nodes: 0, edges: 0 }
      const buckets = status?.buckets ?? []
      const tierHint = { permanent: t('permHint'), long: t('longHint'), short: t('shortHint') }

      return h('div', { className: 'ebm-page-scroll' },
        h('div', { className: 'ebm-page-inner' },
          h('div', { className: 'ebm-page-head' },
            h('div', null,
              h('h1', { className: 'ebm-page-title' }, t('title')),
              h('p', { className: 'ebm-page-sub' }, `${t('listSub')} · ${fmtNum(counts.documents)} ${t('statPoints')}`),
            ),
            h('div', { className: 'ebm-switch' },
              h('button', { className: 'ebm-chip', onClick: onSwitch }, t('viewSea')),
              h('button', { className: 'ebm-chip on' }, t('viewList')),
            ),
          ),
          error ? h('div', { className: 'ebm-error' }, error) : null,

          h('div', { className: 'ebm-section' },
            h('div', { className: 'ebm-stats' },
              h('div', { className: 'ebm-stat' }, h('div', { className: 'ebm-stat-k' }, t('statPoints')), h('div', { className: 'ebm-stat-v' }, fmtNum(counts.documents))),
              h('div', { className: 'ebm-stat' }, h('div', { className: 'ebm-stat-k' }, t('atomsTitle')), h('div', { className: 'ebm-stat-v' }, fmtNum(counts.atoms))),
              h('div', { className: 'ebm-stat' }, h('div', { className: 'ebm-stat-k' }, t('statNodes')), h('div', { className: 'ebm-stat-v' }, fmtNum(counts.nodes))),
              h('div', { className: 'ebm-stat' }, h('div', { className: 'ebm-stat-k' }, t('statEdges')), h('div', { className: 'ebm-stat-v' }, fmtNum(counts.edges))),
            ),
          ),

          h('div', { className: 'ebm-section' },
            h('div', { className: 'ebm-tiers' },
              buckets.map((tier) => h('div', { key: tier.key, className: 'ebm-tier' },
                h('div', { className: 'ebm-tier-name' },
                  h('span', null, t(`bucket${tier.key[0].toUpperCase()}${tier.key.slice(1)}`)),
                  h('span', { className: 'ebm-tier-num' }, fmtNum(tier.count)),
                ),
                h('div', { className: 'ebm-tier-hint' }, tierHint[tier.key] ?? ''),
              )),
            ),
          ),

          h('div', { style: { display: 'flex', gap: '10px', margin: '20px 0 14px' } },
            h('input', {
              className: 'ebm-input',
              value: query,
              placeholder: t('searchPlaceholder'),
              onChange: (e) => setQuery(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') void runSearch() },
            }),
            h('button', { className: 'ebm-btn', onClick: () => void runSearch() },
              busy === 'search' ? t('searching') : t('search')),
            results ? h('button', { className: 'ebm-btn', onClick: () => { setResults(null); setQuery('') } }, t('searchClear')) : null,
          ),

          results
            ? null
            : h('div', { className: 'ebm-tabs' },
                ['all', 'permanent', 'long', 'short'].map((key) => h('button', {
                  key,
                  className: `ebm-chip${bucket === key ? ' on' : ''}`,
                  onClick: () => setBucket(key),
                },
                  key === 'all' ? t('bucketAll') : t(`bucket${key[0].toUpperCase()}${key.slice(1)}`),
                  h('span', { className: 'ebm-mono' }, key === 'all'
                    ? fmtNum(total || counts.documents)
                    : fmtNum((buckets.find((item) => item.key === key) ?? {}).count ?? 0)),
                )),
              ),

          h('div', { className: 'ebm-panel' },
            list.length
              ? list.map((doc) => h('div', { key: doc.id, className: 'ebm-doc' },
                  h('div', { className: 'ebm-doc-head' },
                    h('span', { className: 'ebm-mono' }, fmtTime(doc.createdAt)),
                    h('span', { className: 'ebm-badge' }, `${t('importance')} ${Number(doc.importance ?? 0).toFixed(2)}`),
                    doc.source ? h('span', { className: 'ebm-badge' }, sourceLabel(t, doc.source)) : null,
                    h('button', { className: 'ebm-link', onClick: () => toggle(doc.id) },
                      expanded[doc.id] ? t('collapse') : t('expand')),
                  ),
                  h('div', { className: `ebm-doc-text${expanded[doc.id] ? '' : ' clip'}` }, doc.text || ''),
                  doc.topics?.length
                    ? h('div', { className: 'ebm-topics' },
                        doc.topics.map((topic, index) => h('span', { key: index, className: 'ebm-badge' }, topic)))
                    : null,
                ))
              : h('div', { className: 'ebm-empty' }, results ? t('searchEmpty') : t('loading')),
          ),

          h('div', { className: 'ebm-section' },
            h('h3', { className: 'ebm-h3' }, t('atomsTitle')),
            h('div', { className: 'ebm-hint' }, t('atomsHint')),
            h('div', { className: 'ebm-panel' },
              atoms.length
                ? atoms.map((atom) => h('div', { key: atom.id, className: 'ebm-doc' },
                    h('div', { className: 'ebm-doc-head' },
                      h('span', { className: 'ebm-badge' }, atom.type),
                      h('span', { className: 'ebm-badge ebm-mono' }, `${t('importance')} ${Number(atom.importance ?? 0).toFixed(2)}`),
                      atom.ttlDays ? h('span', { className: 'ebm-badge ebm-mono' }, `TTL ${Math.round(atom.ttlDays)}d`) : null,
                    ),
                    h('div', { className: 'ebm-doc-text' }, atom.text || ''),
                  ))
                : h('div', { className: 'ebm-empty' }, t('loading')),
            ),
          ),

          graph && Array.isArray(graph.nodes) && graph.nodes.length
            ? h('div', { className: 'ebm-section' },
                h('h3', { className: 'ebm-h3' }, t('graphTitle')),
                h('div', { className: 'ebm-hint' }, t('graphHint')),
                h('div', { className: 'ebm-panel' },
                  graph.nodes.map((node) => h('div', { key: node.id, className: 'ebm-node' },
                    h('span', null, node.name),
                    h('span', { className: 'ebm-node-type' }, node.type || ''),
                  )),
                ),
              )
            : null,

          h('p', { className: 'ebm-note' }, t('note')),
        ),
      )
    }

    // ---------------------------------------------------------------- 面板
    function MemoryPanel(props) {
      const t = props.t ?? ((key) => key)
      const [view, setView] = useState('sea')
      return h('div', { className: 'ebm-page' },
        h('style', null, CSS),
        view === 'sea'
          ? h(MemorySea, { t, onSwitch: () => setView('list') })
          : h(MemoryListFull, { t, onSwitch: () => setView('sea') }),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'memory-sea: locale')
      const raw = ctx.locale.bind(NS)
      const t = (key) => {
        let value
        try { value = raw(key) } catch { value = undefined }
        if (typeof value === 'string' && value.length > 0 && value !== key) return value
        return zh[key] ?? value ?? key
      }
      const Panel = (props) => h(MemoryPanel, { ...props, t })
      const Icon = (props) => h(MemoryIcon, props)
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
        { name: 'sidebar.panellist', id: 'memory-sea', order: 20, label: () => t('nav') },
        Icon,
      ))
      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: 'memory-sea' },
        Panel,
      ))
    }

    return { name: NS, inject: ['slots', 'locale'], apply }
  },
})
