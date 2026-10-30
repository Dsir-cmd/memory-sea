#!/bin/sh
# ---------------------------------------------------------------------------
# 一键安装（macOS / Linux）。人不用看这个；agent 读 AGENTS.md 然后跑它。
# 它只做一件事：找到一个能用的 node，交给 scripts/install.mjs。
# ---------------------------------------------------------------------------
set -e

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

NODE_BIN=$(command -v node 2>/dev/null || true)

if [ -z "$NODE_BIN" ]; then
  for candidate in "$HOME"/.dsh/dsh-runtimes/*/dependencies/node/bin/node; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo "[memory-sea] 没找到 node" >&2
  echo "  1) 用 DSH 自带的 node（在 ~/.dsh/dsh-runtimes 下面）" >&2
  echo "  2) 或者装一个 Node 22.5 以上" >&2
  exit 1
fi

exec "$NODE_BIN" "$HERE/scripts/install.mjs" "$@"
