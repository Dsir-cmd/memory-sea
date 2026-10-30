# astrbot-lm-bridge · LM 写入桥（可选）

> 记忆海的**第二幕**。只读记忆海不需要它。

## 它解决什么

DSH 里的对话要写进 livingmemory，但 LM 的写入会生成向量、改 FAISS 索引，
跨进程直接写库会打架。所以让 AstrBot 里的这个插件代写——它就在 LM 旁边，
拿得到 LM 自己的 `MemoryEngine`，走的是 LM 原生的写入管线。

```
DSH 记忆海 ──POST /add──► astrbot-lm-bridge(127.0.0.1:8792) ──► livingmemory.MemoryEngine
```

只监听 127.0.0.1，必须带 `X-Token`，只提供 `/health` 和 `/add`，没有读接口。

## 装

1. 把整个 `packages/astrbot-lm-bridge/` 目录放进 AstrBot 的插件目录：
   `<AstrBot>/data/plugins/astrbot_plugin_lm_bridge/`
   （多实例装法：`instances/<id>/core/data/plugins/`）
2. 重启 AstrBot，日志里应该有 `[lm-bridge] listening on http://127.0.0.1:8792`
3. 看 `http://127.0.0.1:8792/health`：
   - `engine: true` → 找到 LM 的引擎了，可以写
   - `engine: false` → LM 没装好或还没启动，先把它跑起来

## 拿到 token

首次启动会在插件数据目录生成 `token.txt`：

```
<AstrBot>/data/plugin_data/astrbot_plugin_lm_bridge/token.txt
```

在记忆海的配置里两种填法都行：

- `capture.token`：直接粘这个字符串
- `capture.tokenFile`：写这个文件的路径（推荐，转手不用改）

## 配置

| 键 | 默认 | 说明 |
|---|---|---|
| `port` | `8792` | 只绑 127.0.0.1 |
| `token` | 空 | 留空自动生成并写进 `token.txt` |

## 一个必须知道的脆弱点

`_engine()` 取的是 LM 的**私有属性**（`star_cls.<holder>.memory_engine`），不是公开 API。
LM 升级改了内部结构，这个桥就会拿不到引擎——那时 `/health` 会回 `engine: false`，
`/add` 回 503，DSH 侧把记忆留在队列里，不会静默丢。

**已知可用版本**：livingmemory 2.7.x。换版本前先看一眼 `/health`。

## 许可

本目录代码 MIT。它调用的 livingmemory 是 AGPL-3.0 的独立项目，
本仓库不包含、不修改它的任何代码。
