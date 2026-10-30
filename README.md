# 记忆海 · Memory Sea

> 在 DSH 里给你的 [LivingMemory](https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory) 开一扇窗。

每条记忆是一个点。点按时间铺开，按重要度分出层次，按主题落到不同的"脑区"，
共享实体和标签的点之间有线。你看到的是一片海，不是一张表。

- **只读**：打开库时 `readOnly`，一个字节都不写
- **会接话**：把记忆块注入 DSH 的上下文，聊天时它自然带着过去
- **能查**：关键词检索、原子、图谱、相似记忆
- **它自己不记记忆**——记忆归 LivingMemory，这里只是「看」和「接」

> **懒人路径**：把仓库地址丢给你的 agent，说一句「装这个」。
> 它会读 [`AGENTS.md`](AGENTS.md)，自己装、自己判断成没成，最后只回你一句「重启 DSH」。

---

## 它长什么样

> 截图全部由仓库里的**假数据**生成（`npm run demo` 造 50 条虚构记忆），
> 不含任何真实记忆。生成方法见 [`screenshots/README.md`](screenshots/README.md)。

---

## 一、先装 LivingMemory（这一步不能跳）

**记忆海自己不记记忆。** 它读的是 LivingMemory 的库——没有 LM，这扇窗里永远是空的。

所以先问自己两个问题：

| 问题 | 答案是「没有」的话 |
|---|---|
| 我装 AstrBot 了吗？ | 它是 LM 的宿主：[仓库](https://github.com/AstrBotDevs/AstrBot) · [官方文档](https://docs.astrbot.app) |
| 我装 LivingMemory 了吗？ | 下面 1–4 步 |

> **不需要 QQ。** LM 只要 AstrBot 就能记东西——AstrBot 自带 WebUI，你在里面打字它就会记。
> 「把机器人接进 QQ」是另一件事，什么时候做都行，不影响这里。
>
> 不确定自己在第几步？可以直接跑一次 `install.cmd`：它会探一遍地基，
> 然后告诉你缺什么、缺在哪个目录。详细的分层说明在 [docs/前置条件.md](docs/前置条件.md)。

LivingMemory 是 AstrBot 的长期记忆插件（作者 [lxfight](https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory)，AGPL-3.0）。
它做的事比这扇窗多得多：语义检索、图谱、原子、衰减、反思、备份。

### 1. 装

1. 把 LM 的插件目录放进 AstrBot 的 `data/plugins/` 下
2. 重启或重载 AstrBot（Python 依赖会按 `requirements.txt` 自动装）
3. AstrBot 的插件配置页里找到 **LivingMemory**

> 不确定 AstrBot 装在哪、插件该放哪个目录？跑一次 `install.cmd`——
> 它会打印 `ASTRBOT:` 和 `PLUGINS_DIR:` 两个路径，照着放就行。
>
> AstrBot 建议 4.24.2 以上。

### 2. 配（只必填一个）

| 配置项 | 作用 |
|---|---|
| `provider_settings.embedding_provider_id` | **必填**。记忆向量化用的 Embedding Provider |
| `provider_settings.llm_provider_id` | 可选。总结和评估记忆用的模型，留空用默认 |
| `bot_language` | `zh` / `en` / `ru` / `ja` |

Embedding 不是聊天模型，是专门做向量化的那个。建议 `BAAI/bge-m3`（1024 维，免费可用）。
LM 自己的文档里有专门一章讲怎么接：`docs/guide/embedding-model.md`。

**这一步不配好，LM 会照常聊天，但一条记忆都不会留下。** 这是新手最常见的第一道坎。

### 3. 验证它真的在记

在 AstrBot 的 WebUI 里（接了 QQ 就在 QQ 里）聊几轮，然后：

```text
/lmem status
/lmem summarize
/lmem search 你刚说过的词
```

能看到条数、能搜到，才算通了。

> 聊了、但 `/lmem status` 一直是 0 条 → 九成是 embedding provider 没配好，回第 2 步。
> 这一步没通，装记忆海只会看到一片空白。

### 4. 记住库在哪

```text
<AstrBot>/data/plugin_data/astrbot_plugin_livingmemory/livingmemory.db
```

多实例装法的路径长一点：

```text
<AstrBot>/instances/<实例>/core/data/plugin_data/astrbot_plugin_livingmemory/livingmemory.db
```

记忆海找的就是这个文件。它**只需要读**，不需要 AstrBot 正在运行。

---

## 二、再装记忆海

### 0. 最省事：丢给你的 agent

把仓库地址发给你的 agent（DSH 里那个就行），说一句「装这个」。

它会读 [`AGENTS.md`](AGENTS.md)——那是专门给 agent 写的运行手册，不是给人看的——
然后跑 `install.cmd`，自己判断成没成，最后只回你一句「重启 DSH」。

装不上的时候它不会硬撑：缺 LivingMemory 就停下来告诉你先装 LM，
多个 profile 就问你装哪个，要填 key 就把问题原样转给你。

> 下面 1–3 是它做的事，你想自己来也行。

### 1. 装插件

```bash
git clone https://github.com/Dsir-cmd/memory-sea
```

在 DSH 的 profile 里加两行（profile 就是 `~/.dsh/profiles/<名字>/package.json`）：

```json
{
  "dependencies": {
    "dsh-memory-sea": "link:<仓库路径>/packages/dsh-memory-sea"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-memory-sea"
      ]
    }
  }
}
```

重启 DSH，左侧导航多一个 **记忆海**。

> 懒得手改 `package.json`？`npm run link -- --profile <名字>` 会替你加那两行，改前留备份。

### 2. 告诉它库在哪

两种都行：

**A. 自动找**（推荐先试）——在配置里给 AstrBot 的根目录，它自己去 `instances/*` 里找：

```json
{ "astrbotRoot": "<AstrBot 安装目录>" }
```

**B. 直接指**——给 `.db` 文件本身的路径：

```json
{ "dbPath": "<AstrBot>/.../astrbot_plugin_livingmemory/livingmemory.db" }
```

配置写哪儿？把 `config.example.json` 复制成插件目录下的 `data/config.json` 再改：

```bash
cp packages/dsh-memory-sea/config.example.json packages/dsh-memory-sea/data/config.json
```

> 也可以写在 DSH 的 bundle patch 里给这一行加 `config: {...}`，两处都写时 DSH 那边优先。

### 3. 第一眼

点开侧栏「记忆海」，应该看到一片点。没有点、只有一句提示的话——
说明库没找到，按提示补上 `dbPath` 再重启。

---

## 三、作用域：为什么"写了却搜不到"

> 只读不需要看这一节。等你要让 DSH 的对话**写回** LM 时再看。

LM 的每条记忆都挂在一个 `session_id` 上，检索时按它过滤。
**作用域写错，记忆写得进去，但对面永远想不起来，而且不会报任何错。**

LM 那边由 `filtering_settings.memory_scope_mode` 决定房间怎么分，
记忆海这边必须设成同一档：

| 你想要的 | LM 设成 | 记忆海 `scope.mode` |
|---|---|---|
| 所有对话共享一片海 | `global` | `global` |
| 只跟某一个人有关 | `user` | `user` + `platform` / `identity` |
| 每个群、每个私聊各自一间 | `session` | `session` + 复制 LM 面板里的 `session_id` |

三条经验：

1. **两边必须对上。** 一边 `global` 一边 `session`，就是"写了但搜不到"。
2. **不确定就先 `global`。** 它最不容易串味，也最容易看出链路通没通。
3. **`user` 模式要填身份**：`identity` 是 LM 里那个人的 `sender_id`（QQ 号）或别名。填不对会退回 `global`，日志里会有一行提示。

---

## 四、可选：让 DSH 里的话也写进去

前面都是"看"。如果还想让 DSH 里的对话也进入同一个记忆库——
那就需要 `astrbot-lm-bridge`：一个 190 行的 AstrBot 插件，开个只监听本机的口子，
把提炼好的记忆交给 LM 自己写（跨进程直接改 FAISS 索引会打架）。

```text
DSH 记忆海 ──POST /add──► astrbot-lm-bridge(127.0.0.1:8792) ──► livingmemory
```

装法见 [`packages/astrbot-lm-bridge/README.md`](packages/astrbot-lm-bridge/README.md)。
装完在配置里打开：

```json
{
  "capture": {
    "enabled": true,
    "tokenFile": "<AstrBot>/data/plugin_data/astrbot_plugin_lm_bridge/token.txt",
    "provider": "deepseek-account",
    "model": "deepseek-flash",
    "personaId": ""
  },
  "scope": { "mode": "global" }
}
```

`provider` / `model` 是**提炼用的模型**——随便挑个便宜的就够，它只做"把对话压成几条记忆"。
`personaId` 可以留空；填了会和 LM 的人格隔离对上。

**这是第二幕。** 不装它，记忆海照样完整可用——只是不会往库里写东西。

---

## 五、它不做什么

说清楚边界，比列功能有用：

- **不做第二套记忆引擎。** 没有自己的三层 JSON、没有自己的衰减，不做 LM 已经在做的事。
- **不写 LM 的库。** 面板全程只读；要写只走桥，由 LM 自己写。
- **不内置情绪 / 好感 / 人设。** 那是每个项目自己的事。
- **不做遥测。** 一个字节都不往外发。
- **仓库里没有任何数据。** 没有记忆、没有日志、没有账号、没有令牌。见下面「零数据」。

---

## 六、零数据

这个仓库只包含两样东西：**界面**和**逻辑**。

- 私有工作目录不是 git 仓库；文件按 [12 行白名单](scripts/export.mjs) 复制进仓库，
  清单外的东西**没有进仓库的通道**
- 提交前 `npm run verify` 扫一遍：`.db` / `.jsonl` / `.log` / 绝对路径 / 身份 / 实例指纹，命中就失败
- 截图、试跑、开发都用 [`npm run demo`](scripts/demo-data.mjs) 造的假库

所以 clone 下来是干净的，你的记忆也永远不会出现在这里。

---

## 七、常见问题

**面板是空的，但我知道 LM 里全是记忆。**
库没找到。日志里会写"找过几个位置"，把那几个路径和你的实际路径比一下，然后写 `dbPath`。

**LM 升级后面板空了。**
LM 改了表结构而记忆海还不认识。它不会崩（表缺了就降级成空数据），但需要一次适配。
开个 issue，把 LM 版本号带上。

**写着写着 DSH 变慢了。**
记忆块注入是有字数上限的（`contextChars`，默认 1400）。调小它，或者调小 `contextRecent`。

**能不能不装 LM，只用这个面板？**
不能——它没有自己的库。想要不依赖 LM 的方案，那是另一个项目。

**支持 Windows / macOS / Linux？**
核心是 `node:sqlite`，跨平台。自动找库目前按 AstrBot 的目录约定来。

---

## 八、开发

```bash
./install.cmd    # 一键装（Windows；macOS/Linux 用 sh install.sh）
npm run check    # 语法检查：每个 .js / .mjs 过一遍 node --check
npm run links    # 死链检查：所有 .md 里的相对链接必须指到真文件
npm run doctor   # 体检：十项逐个查，红的直接给「怎么办」
npm run demo     # 造一份假库（demo/livingmemory.db）
npm run smoke    # 不开 DSH，把读路径和 HTTP 路由全跑一遍（16 项）
npm run verify   # 禁运扫描：确认没有数据混进来
npm run link     # 把插件挂进一个 DSH profile（改 package.json，会留备份）
npm run export   # 从私有目录按白名单同步（只有作者用得到）
```

装完先跑 `npm run doctor`——它会把「Node 够不够、库找没找到、桥通不通、面板挂没挂上」
一次说完，比对着面板猜快得多。

架构说明见 [`docs/architecture.md`](docs/architecture.md)，
作用域细节见 [`docs/scope.md`](docs/scope.md)，
常见坑见 [`docs/faq.md`](docs/faq.md)，
干净机器验收清单见 [`docs/验收.md`](docs/验收.md)。

---

## 许可

本仓库 **MIT**。

[LivingMemory](https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory) 是 **AGPL-3.0** 的独立项目。
本仓库不包含、不修改它的任何代码，只通过「只读 SQLite」和「本地 HTTP」两个进程边界和它说话。
要用它，请按它自己的文档安装与遵守它自己的许可。
