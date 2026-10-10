from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AegisException
from app.core.logger import logger


async def aegis_exception_handler(request: Request, exc: AegisException):
    logger.warning(f"{exc.code}: {exc.message} ({request.url.path})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


async def general_exception_handler(request: Request, exc: Exception):
    # Full detail goes to the log only; clients get a generic message so
    # internals (SQL, paths, stack traces) never leak.
    logger.exception(f"Unhandled error at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "Something went wrong"},
        },
    )
