# dsh-memory-sea

> 在 DSH 里给 [livingmemory](https://github.com/lxfight-s-Astrbot-Plugins/astrbot_plugin_livingmemory) 开一扇窗。

只读 LM 的记忆库，把记忆画成一片海：每条记忆一个点，按时间、权重、主题铺开。
不写库、不收集数据、不做第二套记忆引擎。

**记忆归 LivingMemory，这扇窗只负责让你看见它。**

## 装

这个包是 DSH 插件。完整步骤（含先装 LM）在仓库根目录的 README：

配套的可选组件：`astrbot-lm-bridge`（让 DSH 的对话也写进 LM）。

## 它需要

- DSH
- 一份已经跑起来的 livingmemory（AGPL-3.0，独立项目，本包不包含它）
- Node >= 22.5（用到内置的 `node:sqlite`）

## 许可

MIT。livingmemory 是 AGPL-3.0 的独立项目，本仓库不包含、不修改它的代码。
