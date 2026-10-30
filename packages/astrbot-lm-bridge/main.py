"""给同机的「记忆海」DSH 插件留一个写入 livingmemory 的接口。

背景：QQ 侧的对话由 AstrBot 自己写进 livingmemory；DSH 侧的对话由记忆海采集，
但它不该（也不能）直接写 LM 的 FAISS 索引。所以这里开一个只监听 127.0.0.1 的
小接口，由本进程内的 MemoryEngine 代写——走的还是 LM 自己的写入管线。

安全：
- 只绑 127.0.0.1
- 必须带 X-Token，token 首次启动随机生成，存在插件数据目录的 token.txt
- 只提供 /health 和 /add，没有读接口

可选：这个桥是第二幕。只读记忆海不需要它。
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import secrets
import time
from pathlib import Path
from typing import Any

from aiohttp import web
from astrbot.api import logger
from astrbot.api.event import AstrMessageEvent  # noqa: F401  (保持与框架一致的导入)
from astrbot.api.star import Context, Star, StarTools, register

PLUGIN_NAME = "astrbot_plugin_lm_bridge"
VERSION = "0.1.0"

# 没指定作用域时的落点：全局，所有对话共享一片。
# 想按人/按会话分，由 DSH 侧的计算结果通过 session_id 传进来。
DEFAULT_SCOPE = "livingmemory:global"


def _token_file() -> Path:
    try:
        base = Path(StarTools.get_data_dir(PLUGIN_NAME))
    except Exception:
        base = Path(__file__).resolve().parent / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base / "token.txt"


def load_or_create_token() -> str:
    path = _token_file()
    try:
        if path.exists():
            value = path.read_text(encoding="utf-8").strip()
            if value:
                return value
    except Exception:
        pass
    value = secrets.token_hex(16)
    try:
        path.write_text(value, encoding="utf-8")
    except Exception as exc:
        logger.warning(f"[lm-bridge] token 写入失败：{exc!r}")
    return value


def create_app(get_engine, token: str) -> web.Application:
    """把 HTTP 层单独拆出来，便于脱离 AstrBot 做自测。"""

    async def health(request: web.Request) -> web.Response:
        engine = None
        try:
            engine = get_engine()
        except Exception:
            engine = None
        # 调用方可以带上 X-Token 顺便验一下 token 对不对，
        # 免得 DSH 那边带着错 token 一直重试。
        return web.json_response(
            {
                "ok": True,
                "engine": engine is not None,
                "version": VERSION,
                "tokenOk": request.headers.get("X-Token", "") == token,
            }
        )

    async def add(request: web.Request) -> web.Response:
        if request.headers.get("X-Token", "") != token:
            return web.json_response({"ok": False, "error": "unauthorized"}, status=403)
        engine = get_engine()
        if engine is None:
            return web.json_response({"ok": False, "error": "livingmemory 还没就绪"}, status=503)
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"ok": False, "error": "bad json"}, status=400)

        text = str(body.get("text") or "").strip()
        if not text:
            return web.json_response({"ok": False, "error": "text 不能为空"}, status=400)
        try:
            importance = float(body.get("importance", 0.5))
        except (TypeError, ValueError):
            importance = 0.5
        importance = max(0.0, min(1.0, importance))
        metadata = body.get("metadata") if isinstance(body.get("metadata"), dict) else {}

        kwargs: dict[str, Any] = {
            "session_id": str(body.get("session_id") or DEFAULT_SCOPE),
            "importance": importance,
            "metadata": metadata,
        }
        persona_id = str(body.get("persona_id") or "").strip()
        if persona_id:
            kwargs["persona_id"] = persona_id

        try:
            doc_id = await engine.add_memory(text, **kwargs)
        except Exception as exc:
            logger.warning(f"[lm-bridge] 写入失败：{exc!r}")
            return web.json_response({"ok": False, "error": repr(exc)}, status=500)
        logger.info(f"[lm-bridge] 收下一条记忆 #{doc_id}：{text[:40]}")
        return web.json_response({"ok": True, "id": doc_id})

    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_post("/add", add)
    return app


@register(
    PLUGIN_NAME,
    "memory-sea",
    "同机写入 livingmemory 的本地接口（只给 DSH 的记忆海插件用）",
    VERSION,
)
class LMBridgePlugin(Star):
    def __init__(self, context: Context, config: dict[str, Any] | None = None) -> None:
        super().__init__(context)
        self.config = config or {}
        self.token = str(self.config.get("token") or "") or load_or_create_token()
        self.port = int(self.config.get("port") or 8792)
        self._runner: web.AppRunner | None = None
        self._site: web.TCPSite | None = None

    # ------------------------------------------------------------ 生命周期
    async def initialize(self) -> None:
        app = create_app(self._engine, self.token)
        self._runner = web.AppRunner(app)
        await self._runner.setup()
        self._site = web.TCPSite(self._runner, "127.0.0.1", self.port)
        try:
            await self._site.start()
            logger.info(f"[lm-bridge] listening on http://127.0.0.1:{self.port}")
        except Exception as exc:
            logger.error(f"[lm-bridge] 端口 {self.port} 启动失败：{exc!r}")

    async def terminate(self) -> None:
        try:
            if self._runner is not None:
                await self._runner.cleanup()
        except Exception:
            pass
        logger.info("[lm-bridge] 已停止")

    # ------------------------------------------------------------ 取引擎
    def _engine(self):
        """拿到 livingmemory 的 MemoryEngine；没就绪就返回 None。

        注意：这里摸的是 LM 的**私有属性**（star_cls.<holder>.memory_engine），
        不是公开 API。LM 升级换了内部结构就会断——fail bridge 会明确报出来，
        不会静默丢记忆（/add 回 503，DSH 侧把条目留在队列里）。
        """
        star = None
        try:
            star = self.context.get_registered_star("astrbot_plugin_livingmemory")
        except Exception:
            star = None
        if star is None:
            # 名字对不上时兜底：按目录名/显示名扫一遍
            try:
                for item in self.context.get_all_stars() or []:
                    key = str(getattr(item, "name", "") or "")
                    root = str(getattr(item, "root_dir_name", "") or "")
                    if "livingmemory" in key or "livingmemory" in root:
                        star = item
                        break
            except Exception:
                star = None
        plugin = getattr(star, "star_cls", None) if star is not None else None
        if plugin is None:
            return None
        for holder_name in ("initializer", "event_handler", "command_handler"):
            holder = getattr(plugin, holder_name, None)
            engine = getattr(holder, "memory_engine", None) if holder is not None else None
            if engine is not None:
                return engine
        return None

    # ------------------------------------------------------------ 状态
    def health(self) -> dict[str, Any]:
        engine = self._engine()
        return {
            "ok": True,
            "version": VERSION,
            "port": self.port,
            "engine": engine is not None,
            "token_hash": hashlib.sha256(self.token.encode()).hexdigest()[:8],
            "ts": int(time.time()),
        }
