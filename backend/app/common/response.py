"""统一响应封装、业务异常、通用工具。

响应契约（对齐设计书 §12.2）：
- 成功：{"code": 0, "data": ..., "message": "success"}
- 失败：{"code": 非0, "message": "..."}
"""
from __future__ import annotations

from datetime import datetime
from typing import Any


def ok(data: Any = None, message: str = "success") -> dict:
    return {"code": 0, "message": message, "data": data}


def fail(message: str, code: int = 1) -> dict:
    return {"code": code, "message": message, "data": None}


class ApiError(Exception):
    """业务异常：由全局异常处理器转为统一失败响应。"""

    def __init__(self, message: str, code: int = 1, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def fmt_dt(dt: datetime | None) -> str:
    """统一格式化为前端展示格式 'YYYY-MM-DD HH:mm:ss'。"""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")
