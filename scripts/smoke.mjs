#!/usr/bin/env node
/**
 * 冒烟测试：不启动 DSH，也把真东西跑一遍。
 * ---------------------------------------------------------------------------
 * 1. 造一份假库（走 demo-data.mjs）
 * 2. 直接用假库走一遍「读」的全部接口：stats / search / sea / atoms / graph / 注入块
 * 3. 用假的 ctx 装配真的 index.js，再打一遍它注册的 HTTP 路由
 * 4. 再装一遍「找不到库」的情形，确认不会崩、给的是引导
 *
 * 用法：node scripts/smoke.mjs
 */

import assert from 'node:assert/strict'
import { DEMO_DB, buildDemoDb } from './demo-data.mjs'
import { openLivingMemory } from '../packages/dsh-memory-sea/lib/lm-source.js'
import { apply } from '../packages/dsh-memory-sea/index.js'

let passed = 0
function ok(name, fn) {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

function createCtx() {
  const ctx = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    effect(fn) {
      const result = fn()
      if (typeof result === 'function') ctx.disposers.push(result)
      return result
    },
    on() {
      return () => {}
    },
    get() {
      return undefined
    },
    disposers: [],
    routes: [],
    contexts: [],
    systemPrompt: {
      context(config) {
        ctx.contexts.push(config)
        return () => {}
      },
    },
    webServer: {
      register(route) {
        ctx.routes.push(route)
        return () => {}
      },
      getOrigin() {
        return 'http://127.0.0.1:53792'
      },
    },
  }
  return ctx
}

function call(handler, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 0,
      headers: null,
      writeHead(status, headers) {
        this.statusCode = status
        this.headers = headers
      },
      end(body) {
        let parsed = null
        try {
          parsed = JSON.parse(body)
        } catch {
          parsed = { raw: body }
        }
        resolve({ status: this.statusCode, body: parsed })
      },
    }
    Promise.resolve(handler({ method, url, headers: {} }, res)).catch(reject)
  })
}

console.log('1. 假数据')
buildDemoDb()
const src = openLivingMemory(DEMO_DB)

ok('条数与分区对得上', () => {
  const stats = src.stats()
  assert.equal(stats.total, 50)
  const parts = src.partitionCounts()
  assert.equal(Number(parts.permanent), stats.total - Number(parts.long) - Number(parts.short))
  assert.ok(Number(parts.permanent) > 0 && Number(parts.long) > 0 && Number(parts.short) > 0)
})

ok('检索命中', () => {
  const hits = src.search('团子')
  assert.ok(hits.length > 0, '搜不到 团子')
})

ok('记忆海有点有线有脑区', () => {
  const sea = src.sea({ limit: 5000 })
  assert.ok(sea.points.length > 0, '没有点')
  assert.ok(sea.regions.length > 0, '没有脑区')
  assert.ok(sea.stats.spanDays > 100, `跨度只有 ${sea.stats.spanDays} 天`)
})

ok('注入块有两个区块', () => {
  const text = src.contextText({ maxChars: 1400, recent: 6 })
  assert.ok(text.includes('【长期底色】'), text.slice(0, 120))
  assert.ok(text.includes('【最近的记忆】'))
})

ok('原子 / 图谱 / 相似', () => {
  assert.ok(src.atoms({ limit: 10 }).length > 0)
  assert.ok(src.graph({ limit: 10 }).nodes.length > 0)
  assert.ok(src.similar(1, { limit: 3 }).length > 0)
})
src.close()

console.log('\n2. 装配真插件（有库）')
const ctx = createCtx()
apply(ctx, { dbPath: DEMO_DB, contextChars: 1400, contextRecent: 6 })

ok('注册了面板路由', () => {
  assert.equal(ctx.routes.length, 1)
  assert.equal(ctx.routes[0].path, '/memory-sea')
})

ok('注册了注入块', () => {
  assert.equal(ctx.contexts.length, 1)
  const text = ctx.contexts[0].text({})
  assert.ok(text.includes('【长期底色】'))
})

const handler = ctx.routes[0].handler

await (async () => {
  const status = await call(handler, '/memory-sea/status')
  ok('/status 认出 livingmemory 且条数对', () => {
    assert.equal(status.status, 200)
    assert.equal(status.body.source, 'livingmemory')
    assert.equal(status.body.counts.documents, 50)
    assert.ok(!status.body.missing)
  })

  const sea = await call(handler, '/memory-sea/sea')
  ok('/sea 有坐标可画', () => {
    assert.equal(sea.status, 200)
    assert.ok(sea.body.points.length > 0)
  })

  const items = await call(handler, '/memory-sea/items?limit=10')
  ok('/items 分页', () => {
    assert.equal(items.body.total, 50)
    assert.equal(items.body.items.length, 10)
  })

  const search = await call(handler, '/memory-sea/search?q=团子')
  ok('/search 中文命中', () => {
    assert.ok(search.body.total > 0)
  })

  const doc = await call(handler, '/memory-sea/doc?id=1')
  ok('/doc 取全文', () => {
    assert.equal(doc.status, 200)
    assert.ok(doc.body.doc.text.length > 0)
  })

  const mood = await call(handler, '/memory-sea/mood')
  ok('/mood 明确回不可用（不装情绪模块）', () => {
    assert.equal(mood.body.available, false)
  })
})()

console.log('\n3. 装配真插件（没有库）')
const empty = createCtx()
apply(empty, { dbPath: 'demo/definitely-missing.db' })
const emptyHandler = empty.routes[0].handler

await (async () => {
  const status = await call(emptyHandler, '/memory-sea/status')
  ok('缺库时 /status 给的是引导，不是 500', () => {
    assert.equal(status.status, 200)
    assert.equal(status.body.missing, true)
    assert.ok(status.body.reason.length > 0)
  })

  const sea = await call(emptyHandler, '/memory-sea/sea')
  ok('缺库时 /sea 回空海，面板不白屏', () => {
    assert.equal(sea.status, 200)
    assert.deepEqual(sea.body.points, [])
    assert.equal(sea.body.missing, true)
  })

  const items = await call(emptyHandler, '/memory-sea/items')
  ok('缺库时其余接口也回空', () => {
    assert.equal(items.status, 200)
    assert.equal(items.body.total, 0)
  })
})()

console.log(`\n通过 ${passed} 项。`)
