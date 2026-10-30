// 作用域：DSH 写进去的这条记忆，落在 livingmemory 的哪个"房间"里。
//
// 这是移植时最容易做错、也最难在事后发现的地方：
// LM 的检索按 session_id 过滤（默认 memory_scope_mode=legacy + use_session_filtering=true），
// 作用域对不上，记忆写得进去、但另一边永远召不回，而且不会报任何错。
//
// LM 的四种房间（见它自己的 core/memory_scope.py）：
//   global  → livingmemory:global               所有对话共享一片
//   user    → livingmemory:user:<平台>:<身份>    只跟某个人有关
//   session → <unified_msg_origin>              每个会话各自一间
//   legacy  → 看 use_session_filtering 的设置
//
// 所以本插件不暴露裸 session_id，而是让用户选「我要哪种房间」，再拼成 LM 认识的字符串。

export const SCOPE_MODES = ['global', 'user', 'session']

export function resolveScope(config = {}) {
  const raw = config?.scope

  // 直接给了一整串：原样透传，留给知道自己在干什么的人
  if (typeof raw === 'string' && raw.trim()) return raw.trim()

  const mode = String(raw?.mode ?? 'global').trim().toLowerCase() || 'global'

  if (mode === 'session') {
    const sessionId = String(raw?.sessionId ?? '').trim()
    return sessionId || 'livingmemory:global'
  }

  if (mode === 'user') {
    const platform = String(raw?.platform ?? 'qq').trim().toLowerCase() || 'qq'
    const identity = String(raw?.identity ?? '').trim()
    // 没填身份就退回 global，别写进一个谁也召不回的假房间
    if (!identity) return 'livingmemory:global'
    return `livingmemory:user:${platform}:${identity.toLowerCase()}`
  }

  return 'livingmemory:global'
}

/** 给人看的一句话解释，落在日志和面板里，装错了能一眼看出来。 */
export function describeScope(scope) {
  if (scope === 'livingmemory:global') return '全局（所有对话共享同一片记忆）'
  const user = /^livingmemory:user:([^:]+):(.+)$/.exec(scope)
  if (user) return `按人（${user[1]} · ${user[2]}）`
  return `按会话（${scope}）`
}
