# 作用域（scope）

> 只读不需要看这一节。等你要让 DSH 的对话**写回** LM 时，这一节比任何文档都重要。

## 一句话

LM 的每条记忆都挂在一个 `session_id` 上，检索时按它过滤。
**写进去的房间和读出来的房间不是同一间，就会「写了但想不起来」，而且不报任何错。**

## 一、LM 那边怎么分房间

看 `filtering_settings.memory_scope_mode`（LM 的插件配置里）：

| 值 | 房间 | 效果 |
|---|---|---|
| `global` | `livingmemory:global` | 所有对话共享一片 |
| `user` | `livingmemory:user:<平台>:<身份>` | 按人分。身份来自 `sender_id` 或别名映射 |
| `session` | 会话自己的 `unified_msg_origin` | 每个群、每个私聊各自一间 |
| `legacy`（默认） | 看 `use_session_filtering` | 开 = 按会话；关 = 全局 |

## 二、记忆海这边怎么配

```json
{
  "scope": {
    "mode": "global",
    "platform": "qq",
    "identity": "",
    "sessionId": ""
  }
}
```

| `mode` | 算出来的 `session_id` | 什么时候用 |
|---|---|---|
| `global` | `livingmemory:global` | LM 也是 `global`，或者你只想让所有对话共享 |
| `user` | `livingmemory:user:<platform>:<identity>` | LM 是 `user`，`identity` 填那个人的 QQ 号或别名 |
| `session` | 你填的 `sessionId` 原样 | LM 是 `session`，复制某个会话的 `unified_msg_origin` |

也可以直接给一整串（`scope` 写成字符串），原样透传——留给知道自己在干什么的人。

## 三、四种常见搭配

**① 一片海（最省事）**

```json
LM:   memory_scope_mode = global
海:   { "scope": { "mode": "global" } }
```

谁说的话都进同一片海，DSH 这边写了 QQ 那边立刻能召回。适合单人使用。

**② 只跟一个人有关**

```json
LM:   memory_scope_mode = user
海:   { "scope": { "mode": "user", "platform": "qq", "identity": "<QQ 号>" } }
```

`identity` 要和 LM 算出来的那个身份**完全一致**。LM 的身份规则：

1. 先看 `access_control.identity_aliases` 里有没有 `qq:<QQ号>` 或 `<QQ号>` 的别名，有就用别名
2. 否则用 `sender_id`（就是 QQ 号）

所以大多数人填 QQ 号就够了；配过别名的填别名。

**③ 每个会话各自一间**

```json
LM:   memory_scope_mode = session
海:   { "scope": { "mode": "session", "sessionId": "<某个 unified_msg_origin>" } }
```

`unified_msg_origin` 长这样：`<平台>:<消息类型>:<目标 id>`。
在 LM 的面板里能看到每条记忆的 `session_id`，复制一个过来即可。

**④ 不确定**

先用 `global` 跑通，看见链路通了，再往细分走。

## 四、怎么确认配对成功

1. 打开写回，随便聊两轮，等日志出现 `DSH 记忆已写入 livingmemory：N 条`
2. 在 LM 的面板里搜刚才那句话的关键词
3. 搜不到 → 九成是作用域没对上

排查顺序：

```text
① LM 的 memory_scope_mode 是多少？
② 记忆海日志里打印的 scope 是什么？（启动时有一行「写回作用域 ...」）
③ 两者算出来的 session_id 是同一个字符串吗？
④ 用 LM 自己的 /lmem search 再搜一次（排除是面板缓存）
```

## 五、为什么不能自动对

技术上讲，记忆海可以直接读 LM 的配置，但它不该：
- LM 的配置存在 AstrBot 的库里，格式随版本变
- 猜错比没猜更糟——用户会以为配好了

所以这里选择：**把选择权交给用户，把后果说清楚**。
启动日志里固定打印一行 `写回作用域 <session_id> —— <人话解释>`，装错了当场能看见。
