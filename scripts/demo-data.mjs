#!/usr/bin/env node
/**
 * 闸三 · 假数据生成器
 * ---------------------------------------------------------------------------
 * 「零数据」不等于「零画面」。
 *
 * 这个脚本造一个和 livingmemory 同结构的 demo-livingmemory.db：
 * 3 个会话、50 条**完全虚构**的记忆、若干原子与图谱节点，时间跨度半年。
 *
 * 它同时解决三件事：
 *   1. 截图 —— 仓库里的每一张截图都必须来自这份假数据；
 *   2. 试跑 —— 不用装 AstrBot、不用 LM，也能把面板跑起来看；
 *   3. 贡献 —— 前端改动可以离线验证。
 *
 * 生成物在 demo/ 下，.gitignore 已排除，**永远不会被提交**。
 *
 * 用法：node scripts/demo-data.mjs
 */

import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DEMO_DIR = join(ROOT, 'demo')
export const DEMO_DB = join(DEMO_DIR, 'livingmemory.db')

/** 2026-05-01 起算，方便看"跨度半年" */
const BASE = Date.UTC(2026, 4, 1, 9, 0, 0)
const DAY = 86400000

/** [天偏移, 会话, importance, 正文, 主题, 关键事实] —— 全部虚构 */
const MEMORIES = [
  [0, 'global', 1.0, '对方叫阿岚，在成都做建筑设计，习惯凌晨工作。', ['身份'], ['阿岚 · 成都 · 建筑设计']],
  [0, 'global', 1.0, '阿岚养了一只三花猫叫团子，2023 年从小区楼下捡的。', ['身份', '猫'], ['团子是三花猫']],
  [1, 'user:10001', 0.62, '阿岚说这周要交一个商业综合体的概念方案，连续熬了两晚。', ['工作', '近况'], []],
  [2, 'user:10001', 0.41, '今天聊到成都下雨，阿岚说雨天的工地特别滑。', ['日常', '天气'], []],
  [3, 'user:10001', 1.0, '阿岚讨厌别人替他做决定，尤其是工作上的事。', ['关系'], ['不喜欢被代做决定']],
  [4, 'user:10001', 0.58, '阿岚开始学吉他，卡在 F 和弦，练了三天。', ['爱好'], []],
  [5, 'global', 0.55, '阿岚的母亲住在绵阳，每月回去一次。', ['家人'], ['母亲在绵阳']],
  [6, 'user:10001', 0.33, '聊到楼下新开的面馆，阿岚说杂酱面还行。', ['日常', '吃饭'], []],
  [8, 'user:10001', 0.72, '阿岚打算十月去大理待一周，还没定住宿。', ['计划', '旅行'], ['计划十月去大理']],
  [9, 'user:10002', 0.35, '同事问起团子的照片，阿岚发了一张它睡在图纸上的。', ['猫', '日常'], []],
  [10, 'user:10001', 0.48, '阿岚说最近睡眠不好，常常四点还醒着。', ['身体', '近况'], []],
  [12, 'user:10001', 0.66, '阿岚换了新的绘图显示器，说色准比之前好很多。', ['工作'], []],
  [14, 'global', 0.83, '阿岚的父亲去年做过一次心脏手术，恢复得不错。', ['家人', '身体'], ['父亲心脏手术']],
  [15, 'user:10001', 0.3, '聊到外卖，阿岚说他不吃香菜。', ['日常', '吃饭', '偏好'], []],
  [16, 'user:10001', 0.9, '阿岚说过，如果有一天他不做建筑了，想去做木工。', ['身份', '计划'], ['梦想是做木工']],
  [18, 'user:10002', 0.44, '团子把桌上的模型啃坏了，阿岚又气又笑。', ['猫', '日常'], []],
  [20, 'user:10001', 0.5, '阿岚这周开始早起跑步，跑了三次，每次三公里。', ['身体', '日常'], []],
  [22, 'user:10001', 0.61, '阿岚说方案被甲方打回来了，要重做立面。', ['工作', '近况'], []],
  [24, 'global', 0.78, '阿岚不喜欢过生日，但每年都会给自己买一本书。', ['习惯', '偏好'], ['生日买书']],
  [25, 'user:10001', 0.28, '今天只聊了几句，阿岚在赶图。', ['日常'], []],
  [27, 'user:10001', 0.57, '阿岚提到小时候在绵阳的河边钓过鱼，很久没去了。', ['回忆', '家人'], []],
  [30, 'user:10002', 0.39, '阿岚让我推荐了几本书，选了一本讲日本庭园的。', ['读书'], []],
  [32, 'user:10001', 0.86, '阿岚说他最怕的是把喜欢的事做成负担。', ['关系', '身份'], ['怕喜欢的事变成负担']],
  [34, 'user:10001', 0.52, '大理的住宿定了，洱海边一个老院子，十月三号入住。', ['计划', '旅行'], ['大理 · 洱海 · 十月三号']],
  [36, 'user:10001', 0.31, '聊到天气转热，成都三十四度。', ['天气'], []],
  [38, 'user:10002', 0.47, '阿岚的同事结婚，他随了份子但没去现场。', ['日常', '关系'], []],
  [40, 'user:10001', 0.64, '阿岚重新拾起吉他，这次练的是《卡农》的简化版。', ['爱好'], []],
  [42, 'global', 0.74, '阿岚有一个用了八年的旧水杯，搬家三次都带着。', ['习惯'], ['旧水杯']],
  [44, 'user:10001', 0.36, '连续加班，阿岚说这周不想说话。', ['近况'], []],
  [46, 'user:10001', 0.7, '阿岚说他想在四十岁前自己盖一栋小房子。', ['计划', '身份'], ['想自己盖房子']],
  [48, 'user:10002', 0.42, '团子掉毛严重，阿岚买了一台吸尘器。', ['猫', '日常'], []],
  [50, 'user:10001', 0.55, '阿岚去看了个展，说灯光打得很好，拍了很多照片。', ['日常', '爱好'], []],
  [52, 'user:10001', 0.29, '今天聊得很短，阿岚在外面吃饭。', ['日常'], []],
  [55, 'user:10001', 0.81, '阿岚说他其实很怕安静，一个人的时候会开着电视。', ['关系', '身体'], ['怕安静']],
  [58, 'user:10002', 0.38, '阿岚问起怎么做番茄牛腩，给了个简单的方子。', ['吃饭', '日常'], []],
  [60, 'user:10001', 0.6, '方案终于过了，甲方只提了两个小修改。', ['工作', '近况'], []],
  [63, 'user:10001', 0.45, '阿岚说他最近在听老歌，从九零年代的开始。', ['爱好'], []],
  [66, 'global', 0.88, '阿岚说，如果哪天他不在了，希望有人记得他做过什么，而不是他叫什么。', ['关系', '身份'], ['希望被记住做过的事']],
  [70, 'user:10001', 0.34, '成都连着下雨，阿岚说衣服晾不干。', ['天气', '日常'], []],
  [72, 'user:10001', 0.53, '大理回来了，阿岚说洱海的早晨比照片好看。', ['旅行', '近况'], []],
  [75, 'user:10002', 0.4, '团子第一次见到雨，躲在沙发底下不出来。', ['猫'], []],
  [78, 'user:10001', 0.68, '阿岚开始记录每天的工地进度，说这样心里有底。', ['工作', '习惯'], []],
  [82, 'user:10001', 0.26, '随手聊了几句，阿岚在改图纸。', ['日常'], []],
  [86, 'user:10001', 0.58, '阿岚去绵阳看父母，回来带了一箱腊肉。', ['家人', '日常'], []],
  [90, 'user:10002', 0.37, '阿岚问团子能不能吃蛋黄，我说少给一点。', ['猫'], []],
  [95, 'user:10001', 0.76, '阿岚说他决定明年辞掉现在的项目，去学半年木工。', ['计划', '身份'], ['明年学木工']],
  [100, 'user:10001', 0.49, '阿岚买了第一把凿子，说手感比想象中重。', ['爱好', '计划'], []],
  [110, 'user:10001', 0.63, '木工班的报名通过了，一月开课，每周六。', ['计划'], ['一月开课']],
  [120, 'user:10002', 0.32, '阿岚发来一张团子趴在木屑里的照片。', ['猫', '日常'], []],
  [130, 'user:10001', 0.71, '阿岚说，做模型和做木头是同一种安静。', ['关系', '爱好'], []],
]

const SESSIONS = {
  global: 'livingmemory:global',
  'user:10001': 'livingmemory:user:qq:10001',
  'user:10002': 'livingmemory:user:qq:10002',
}

const ATOMS = [
  ['person', '阿岚'],
  ['person', '团子'],
  ['person', '阿岚的母亲'],
  ['person', '阿岚的父亲'],
  ['fact', '成都是常驻地'],
  ['fact', '三花猫叫团子'],
  ['fact', '想学木工'],
  ['fact', '计划十月去大理'],
]

function isoAt(dayOffset) {
  return new Date(BASE + dayOffset * DAY).toISOString()
}

export function buildDemoDb(target = DEMO_DB) {
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { force: true })
  rmSync(`${target}-wal`, { force: true })
  rmSync(`${target}-shm`, { force: true })

  const db = new DatabaseSync(target)
  db.exec(`
    create table documents (
      id integer primary key autoincrement,
      doc_id text unique not null,
      text text not null,
      metadata text,
      created_at text,
      updated_at text
    );
    create table memory_atoms (
      id integer primary key autoincrement,
      parent_memory_id text,
      atom_type text,
      content text,
      importance real,
      status text,
      ttl_days integer,
      created_at text
    );
    create table graph_nodes (
      id integer primary key autoincrement,
      node_type text,
      node_value text,
      created_at text
    );
    create table graph_edges (
      id integer primary key autoincrement,
      source_id integer,
      target_id integer,
      relation text,
      weight real
    );
    create table graph_entries (
      id integer primary key autoincrement,
      source_memory_id integer
    );
    create table graph_entry_nodes (
      id integer primary key autoincrement,
      entry_id integer,
      node_id integer
    );
    create table db_version (version integer);
    insert into db_version (version) values (1);
    create virtual table livingmemory_memories_fts using fts5(content, doc_id);
  `)

  const insertDoc = db.prepare(
    `insert into documents (doc_id, text, metadata, created_at, updated_at) values (?, ?, ?, ?, ?)`,
  )
  const insertFts = db.prepare(`insert into livingmemory_memories_fts (content, doc_id) values (?, ?)`)

  const ids = []
  MEMORIES.forEach(([day, session, importance, text, topics, facts], index) => {
    const createdAt = isoAt(day)
    const seconds = Math.floor((BASE + day * DAY) / 1000)
    const docId = `demo-${String(index + 1).padStart(3, '0')}`
    const metadata = {
      create_time: seconds,
      importance,
      status: 'active',
      topics,
      key_facts: facts,
      session_id: SESSIONS[session],
      persona_id: 'default',
      source: 'conversation',
      source_weight: Math.round(importance * 60 + 30),
      last_access_time: importance > 0.6 ? seconds + 3600 : 0,
      access_count: importance > 0.6 ? 2 : 0,
    }
    insertDoc.run(docId, text, JSON.stringify(metadata), createdAt, createdAt)
    insertFts.run(text, docId)
    ids.push({ index, day, importance, text, topics })
  })

  const insertAtom = db.prepare(
    `insert into memory_atoms (parent_memory_id, atom_type, content, importance, status, ttl_days, created_at) values (?, ?, ?, ?, 'active', ?, ?)`,
  )
  ATOMS.forEach(([type, content], i) => {
    insertAtom.run(`demo-${String(i + 1).padStart(3, '0')}`, type, content, 0.8, type === 'person' ? 0 : 90, isoAt(i))
  })

  const insertNode = db.prepare(`insert into graph_nodes (node_type, node_value, created_at) values (?, ?, ?)`)
  const nodeIds = ATOMS.map(([type, value], i) => {
    insertNode.run(type, value, isoAt(i))
    return Number(db.prepare('select last_insert_rowid() id').get().id)
  })

  const insertEdge = db.prepare(
    `insert into graph_edges (source_id, target_id, relation, weight) values (?, ?, 'related', 0.5)`,
  )
  for (let i = 0; i < nodeIds.length - 1; i += 1) insertEdge.run(nodeIds[i], nodeIds[i + 1])

  // 把「团子」挂到提到它的记忆上，记忆海才有实体的线
  const insertEntry = db.prepare(`insert into graph_entries (source_memory_id) values (?)`)
  const insertEntryNode = db.prepare(`insert into graph_entry_nodes (entry_id, node_id) values (?, ?)`)
  const tangzi = nodeIds[1]
  for (const item of ids) {
    if (!item.topics.includes('猫')) continue
    insertEntry.run(item.index + 1)
    const entryId = Number(db.prepare('select last_insert_rowid() id').get().id)
    insertEntryNode.run(entryId, tangzi)
  }

  db.close()
  return target
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = buildDemoDb()
  console.log(`假数据已生成：${db}`)
  console.log('  · 3 个会话 / 50 条虚构记忆 / 半年跨度')
  console.log('  · 它不会被提交（.gitignore + 禁运扫描双重拦着）')
  console.log('  · 截图请指向这份数据：  MEMORY_SEA_DB=demo/livingmemory.db')
}
