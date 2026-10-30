# 架构

一页纸说清：谁读谁、谁写谁、哪里是进程边界、以及为什么这么切。

## 一、两个进程，一份记忆

```
        ┌──────────────────────────────┐
        │  AstrBot                      │
        │  ├ LivingMemory  ──────────┐  │
        │  │   livingmemory.db       │  │   ← 唯一的记忆本体
        │  └ astrbot-lm-bridge       │  │
        │      127.0.0.1:8792  ◄─────┘  │   ← 只写，走 LM 自己的管线
        └───────────▲──────────────────┘
                    │ HTTP（可选，只为「写」）
        ┌───────────┴──────────────────┐
        │  DSH                          │
        │  └ dsh-memory-sea             │
        │      ├ index.js   装配         │
        │      ├ lm-source  只读 SQLite ─┼──► livingmemory.db
        │      ├ lm-http    面板接口     │
        │      └ client.js  记忆海       │
        └──────────────────────────────┘
```

**读**：DSH 直接只读那个 `.db`。不依赖 AstrBot 在跑，也不需要任何认证。
**写**：必须经过桥，因为 LM 的写入要生成向量、改 FAISS 索引，跨进程写会打架。

这条边界是整件事的地基：**能不跨界就不跨界**。
读走文件，写走 HTTP，两边都只碰进程边界上那一个窄口。

## 二、四个模块

| 模块 | 干什么 | 边界 |
|---|---|---|
| `lib/lm-source.js` | 打开 SQLite，出统计 / 列表 / 检索 / 记忆海 / 注入块 | 只读，`readOnly: true` |
| `lib/lm-http.js` | 面板的 HTTP 接口 | 只读，所有 POST 回 410 |
| `lib/lm-capture.js` | 攒轮次 → 提炼 → POST 给桥 | 只在 `capture.enabled` 时装配 |
| `client.js` | 记忆海（Canvas）、列表、检索、详情 | 只调 `/memory-sea/*` |

`index.js` 只做装配：找库、开库、注册注入块、注册路由、按需装配采集。

## 三、表结构依赖

面板读的是 LM 的库，所以它必须认识 LM 的表。目前用到：

| 表 | 用途 | 缺失时 |
|---|---|---|
| `documents` | 记忆本体（`text` + `metadata` JSON） | 认不出库，抛错 → 面板降级 |
| `memory_atoms` | 最小事实单元 | 原子页签为空 |
| `graph_nodes` / `graph_edges` | 图谱 | 图谱页签为空 |
| `graph_entries` / `graph_entry_nodes` | 记忆 ↔ 实体的关联，记忆海靠它连实体线 | 只剩「共享标签」的线 |
| `livingmemory_memories_fts` | 全文检索 | 退回 `LIKE` 匹配 |
| `db_version` | 版本号展示 | 显示 `null` |

`metadata` 里用到的键：`importance`、`create_time`（unix 秒）、`topics`、`key_facts`、
`session_id`、`status`、`source`、`last_access_time`、`access_count`、`source_weight`。

> 表缺了、列改名了，都不抛错——`safeAll` / `safeOne` 包着，降级成空数据。
> 唯一会让面板整体降级的是 `documents` 表不存在：那说明这不是 LM 的库。

## 四、注入：DSH 每轮看到的"记忆"

```js
ctx.systemPrompt.context({
  name: 'memory-sea',
  order: 940,
  text: () => lm.contextText({ maxChars, recent }),
})
```

`contextText()` 拼两块：

```
【长期底色】
· importance = 1.0 的记忆，按 source_weight 排，越有分量越靠前
【最近的记忆】
· 最近 N 条，按时间倒序
```

为什么这么排：
- 底色里既有真正重要的事，也有今天刚记下的琐事。按 `importance` 排会让"今天重要"挤掉"一直重要"，
  所以按 `source_weight`（原始权重），同权重取更早的——**老的东西更该站在前面**。
- 有字数上限（`contextChars`），永远不会把整库塞进 prompt。
- 同一段记忆在一个会话里只注入一次，之后靠对话历史延续，不会每轮重复烧 token。

## 五、记忆海怎么算

点 = `importance >= 0.55` 的记忆。线 = 两条记忆共享实体（权 2）或共享标签（权 1）。

- **坐标不在后端算**：前端用记忆 id 做确定性投影，新增记忆时旧点位置不变。
  海是慢慢长出来的，不是每次刷新重排。
- **脑区**：见 `lib/lm-source.js` 的 `REGIONS`。靠关键词命中决定落哪个区，
  想改就改那一张表，不用碰逻辑。
- **聚合**：`importance < 0.55` 的记忆不画点，按「脑区 × 周」团成星团。
  LM 一删，星团就变小、变暗、最后消失。

## 六、找不到库时

插件照常加载。`lm === null` 时：

- `/status` 回 `{ missing: true, reason, tried }`——把"找过哪些地方"一起给出去
- `/sea` 回空海结构（不是 404），面板不会白屏
- 注入块回空字符串

**空面板 + 一句怎么做，比一个红叉有用。**
