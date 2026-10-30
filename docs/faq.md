# 常见问题

## 面板是空的

先看 DSH 日志里那一行：

```text
[memory-sea] 没找到 livingmemory 的记忆库（找过 N 个位置）
```

`N` 说明它至少试过。判断顺序：

1. 那个 `.db` 文件真的存在吗？（LM 装好、聊过几轮才会有内容）
2. 是**多实例**装法吗？路径在 `instances/<实例>/core/data/plugin_data/...`，
   给 `astrbotRoot` 时它会自动扫 `instances/*`；不给也会试几个常见位置（盘根的一键包、用户目录）
3. 都不对：直接写 `dbPath` 指向文件本身

写完之后要**重启 DSH**（配置只在启动时读一次）。

## 面板只显示一句"还没找到记忆库"

这是设计好的：找不到库不报错、不白屏，给一句怎么做。
按提示补 `dbPath` / `astrbotRoot`。

## LM 升级后面板空了

LM 改了表名或列名，面板还不认识。它**不会崩**（缺表降级成空数据），但需要适配。

开 issue 时带上：

- LM 版本号（`/lmem status` 里有）
- `[memory-sea]` 开头的日志
- 用 SQLite 工具看一眼 `select name from sqlite_master where type='table'`

## 注入的记忆不更新

预期行为。**记忆块在每个会话开始时生成一次**，会话中途新增的记忆不会回灌——
否则每轮都要重新拼一遍、重新烧 token。

想立刻看到新记忆：开一个新会话，或者重启 DSH。

## 聊久了变慢 / token 变多

记忆块有字数上限，不会无限长：

| 配置 | 默认 | 作用 |
|---|---|---|
| `contextChars` | 1400 | 每次注入的总字数 |
| `contextRecent` | 6 | 注入最近几条 |

调小这两个。别把 `contextChars` 调到 500 以下——那就什么都剩不下了。

## 写回不工作

三步排查：

**① 桥起来了吗**

```text
GET http://127.0.0.1:8792/health
```

- 连不上 → 桥插件没装好或 AstrBot 没重启
- `engine: false` → LM 没就绪（或者 LM 版本换了内部结构，桥摸不到引擎）

**② token 对吗**

`tokenOk: false` 就是不对。DSH 侧的 `capture.tokenFile` 要指向
`<AstrBot>/data/plugin_data/astrbot_plugin_lm_bridge/token.txt`，或者把文件里的字符串填进 `capture.token`。

**③ 作用域对了吗**

见 [scope.md](scope.md)。这是"写了但搜不到"最常见的原因，而且不报错。

## 有多个 AstrBot 实例，读的是哪一个？

给 `astrbotRoot` 时，它扫 `instances/*` 取**第一个**找到的库；
顺序不保证，所以多实例请直接写 `dbPath`，别靠自动找。

## 端口 8792 被占了

桥的端口可在 AstrBot 插件配置里改。改完 DSH 侧同步改 `capture.base`。

## 打开库报错（只读失败）

两种可能：

1. 文件不是 LM 的库 → 报"这个库不是 livingmemory（没有 documents 表）"
2. 文件权限不够 → LM 那边以别的用户运行、或者文件被独占

第二种在 Windows 上偶尔出现。先确认 AstrBot 和 DSH 是同一个用户跑的。

## 能删吗？删什么？

- **停用插件**：DSH 里关掉 `dsh-memory-sea`，记忆不受影响（本来就没写过）
- **清配置**：删插件目录下的 `data/`
- **删记忆**：那要去 LM 那边删，不在这里

## 为什么截图是假数据？

因为这个仓库只放界面和逻辑，不放任何真实记忆。见仓库根目录 README 的「零数据」。
