"""FastAPI 应用入口：CORS、路由注册、统一异常处理、健康检查。"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.common.response import ApiError, fail, ok
from app.config import settings
from app.routers import api_router
from app.services import es_client, llm, redis_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("rag.app")

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- 统一异常处理 ----------------
@app.exception_handler(ApiError)
async def handle_api_error(_: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code, content=fail(exc.message, code=exc.code)
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    detail = errors[0].get("msg", "参数校验失败") if errors else "参数校验失败"
    return JSONResponse(status_code=422, content=fail(f"参数校验失败：{detail}", code=1))


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(_: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code, content=fail(str(exc.detail), code=1)
    )


@app.exception_handler(Exception)
async def handle_unexpected(_: Request, exc: Exception):
    logger.exception("未处理异常: %s", exc)
    return JSONResponse(status_code=500, content=fail("服务器内部错误", code=1))


# ---------------- 路由与健康检查 ----------------
app.include_router(api_router)


@app.get("/api/health")
def health():
    return ok(
        {
            "app": settings.app_name,
            "elasticsearch": es_client.is_available(),
            "redis": redis_client.is_available(),
            "llm": llm.llm_available(),
        }
    )


@app.on_event("startup")
def on_startup():
    logger.info("应用启动：%s", settings.app_name)
    logger.info("Elasticsearch 可用: %s", es_client.is_available())
    logger.info("Redis 可用: %s", redis_client.is_available())
    logger.info("大模型已配置: %s", llm.llm_available())
    try:
        if es_client.is_available():
            es_client.ensure_index()
    except Exception:  # noqa: BLE001
        logger.warning("ES 索引初始化失败（可稍后重试）", exc_info=True)
