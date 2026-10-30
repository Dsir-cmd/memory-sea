# AGENTS.md

**这是给 agent 的安装手册。人看 [README.md](README.md)。**

用户可能只对你说一句「把这个装上」，然后贴一个仓库地址。这份文件就是你要执行的全部内容。

---

## 你要达成什么

让这台机器的 DSH 左侧导航里出现一个 **「记忆海」**，并且它读得到 LivingMemory 的记忆库。

判定标准只有一条：**重启 DSH 后，点开「记忆海」不是错误页。**

---

## 四条硬规矩

1. **记忆库只读。** 永远不要写、移动、删除 `livingmemory.db`。它属于用户，不属于这个插件。
2. **不碰 git。** 不要 commit、push、改 remote、改分支。
3. **不外传。** 用户的记忆内容、路径、token，一个字节都不要发到任何联网地方（包括 pastebin、gist、issue）。
4. **不猜。** 找不到就是找不到，报告给用户。宁可少装一步，也不要改一个用户没说的路径。

---

## 步骤

### 0. 判断平台

| 平台 | 命令 |
|---|---|
| Windows | `install.cmd` |
| macOS / Linux | `sh install.sh`（不用管可执行位）或 `chmod +x install.sh && ./install.sh` |

**不要**直接 `node scripts/install.mjs`——干净机器上通常没有 `node`，包装脚本会去找 DSH 自带的那个。

### 1. 跑安装

```bash
./install.cmd          # 或 ./install.sh
```

想看机器可读结果，加 `--json`：

```bash
./install.cmd --json
```

退出码决定你下一步：

| 退出码 | 含义 | 下一步 |
|---|---|---|
| `0` | 装好了 | 跳到 3 |
| `2` | 插件装上了，但**这台机器没有 LivingMemory** | 跳到 2 |
| `1` | 卡住了（没 profile / Node 太老 / 改配置失败） | 跳到 5 |

它会自己找 AstrBot 的常见安装位置（盘根的一键包、用户目录、`instances/*`）。
**找不到才回来问用户**，别一上来就让用户找路径。

### 2. 退出码 2：缺 LivingMemory

先看 `install` 的输出，它能分辨两种情况，别猜：

- 有 `ASTRBOT:` 和 `PLUGINS_DIR:` → **AstrBot 装了，只是没装 LM**。直接用那个 `PLUGINS_DIR` 的原值，不要自己拼路径。
- 一个都没有 → **这台机器上没有 AstrBot**。

然后：

1. **没有 AstrBot？**
   - 告诉用户：得先有 AstrBot（LM 是它的插件），再装 LM。
     给 [AstrBot 仓库](https://github.com/AstrBotDevs/AstrBot) 和 [官方文档](https://docs.astrbot.app)。
   - **然后停下。** 不要自作主张替用户下载安装 AstrBot——它是几百兆的运行时，
     用户可能根本不想装在这台机器上。

2. **有 AstrBot、没 LM？**
   - 把 LM 放进 `PLUGINS_DIR` 那个目录，重启 AstrBot（依赖会自动装）。
   - LM 的仓库：https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory

3. **LM 装了，但配置还没填？**
   `provider_settings.embedding_provider_id` 必须填一个 Embedding Provider，
   通常要用**用户的 API key**。**你不能代填，也不能替用户申请。**
   原话转达：

   > LivingMemory 需要一个 Embedding Provider（向量化模型）才能记住东西，聊天模型不算。
   > 推荐 `BAAI/bge-m3`。没配之前它会正常聊天，但一条记忆都不会留下。

4. 用户说配好了 → **重跑步骤 1**，这次应该拿到 `0`。

> **如果用户说「我的机器人还没挂到 QQ 里」——那不是问题，也不要去装 NapCat。**
> LM 只要有 AstrBot 就能记东西，AstrBot 自带 WebUI 可以对话。
> 明确告诉他：QQ 什么时候接都行，不影响这套记忆。

### 3. 验证

```bash
./install.cmd --json | ...    # 这一步不需要了
node scripts/doctor.mjs --json
```

> 如果这台机器没有 `node`，体检跳过——安装脚本已经做了同样的检查，把它的输出当证据。

`doctor` 的 `status`：

- **全部 ok** → 进 4
- **有 `missing` 项** → 那说明库没接上，回步骤 2
- **`dsh` 那项是 404 / 连不上** → 正常，DSH 还没重启，进 4

### 4. 告诉用户

只说两件事，别写小作文：

```
装好了。
重启一下 DSH，左侧导航会多一个「记忆海」。
这个目录别删——DSH 是从这里加载插件的。
如果点开是空的，说明还没接上记忆库，把 dsh 日志里 [memory-sea] 开头的行发给我。
```

如果用户还想要「DSH 里聊的话也写进记忆库」，再提一句：

```
想要双向的话要再装一个写入桥，要装吗？装了之后 AstrBot 也得重启一次。
```

### 5. 失败怎么报

按这个格式，缺一不可：

```
卡在哪：<一句话>
已经试过：<你跑过的命令 + 关键输出>
需要你：
  1. <具体动作>
  2. <具体动作>
```

**不要**只说「安装失败」。用户在另一头，看不到你的终端。

---

## 命令速查

| 想干什么 | 命令 |
|---|---|
| 一键装 | `./install.cmd` / `./install.sh` |
| 只看会改什么 | `./install.cmd --dry` |
| 顺带装写入桥 | `./install.cmd --bridge` |
| 指定 profile | `./install.cmd --profile <名字>` |
| 指定 AstrBot 根目录 | `./install.cmd --astrbot <目录>` |
| 体检 | `node scripts/doctor.mjs` |
| 造演示数据（截图/试跑用） | `node scripts/demo-data.mjs` |

---

## `--json` 的输出契约

安装脚本加 `--json` 会输出一个对象，字段固定：

```json
{
  "status": "ok | partial | blocked",
  "profile": "被改的 profile 目录，空字符串表示没定下",
  "dbPath": "找到的记忆库，空字符串表示没找到",
  "bridge": "写入桥的安装位置，空字符串表示没装",
  "configFile": "插件配置文件的路径",
  "changes": ["改了哪几行，给人看的"],
  "problems": ["需要解决的问题，一条一句"],
  "humanSteps": ["必须由人做的事，比如重启 DSH"],
  "next": "一句话的下一步",
  "steps": [{ "ok": true, "label": "…", "detail": "…" }]
}
```

判断规则：**`status` 是唯一权威**，`steps` 只是细节。
`status: ok` 也可能带 `humanSteps`（重启 DSH 是人的事）。

---

## 什么时候必须停下来问人

| 情况 | 为什么不能自己决定 |
|---|---|
| 有多个 DSH profile | 装错了地方等于没装，用户会以为坏了 |
| 要填 Embedding 的 API key | 那是用户的账号 |
| 写入桥已经存在 | 可能是用户自己改过的版本，覆盖会丢东西 |
| 用户的库是 0 条记忆 | 说明 LM 还没配好，装了也看不到东西 |
| `install` 退出码 1 | 说明有硬伤，继续折腾只会更乱 |

---

## 你需要知道的背景（一句话版）

- **三层地基**（DSH 视为已经装好，那不是你要管的事）：
  AstrBot（LM 的宿主）→ LivingMemory（记忆本体）→ 记忆海（这个仓库）。
  前两层缺一层，这扇窗就是空的。
- **不需要 QQ。** LM 只要 AstrBot 就能记东西，AstrBot 自带 WebUI。
  用户没接 QQ 完全不影响安装，**也不要主动提出帮他接**。
- 这个插件**自己不存记忆**。记忆归 LivingMemory，它只是「看」和「接」。
- 它**只读**那个 `.db`，所以装坏了也不会弄丢用户的记忆——这是你可以放心动手的原因。
- 「写入桥」是可选组件，装它才会往库里写；不装就是纯只读。
- 作用域配错不会报错，只会「写了但对面想不起来」。除非用户明确要求写回，否则不要碰 `scope`。
- 完整的判断依据在 [docs/前置条件.md](docs/前置条件.md)，用户问起来可以直接念给他。
