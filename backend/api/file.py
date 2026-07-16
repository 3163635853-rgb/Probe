import asyncio
import re
import uuid as uuid_lib
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from api.deps import get_current_user
from config import settings
from utils.jwt import decode_token

router = APIRouter(prefix="/api/file", tags=["file"])

UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_AVATAR_SIZE = 5 * 1024 * 1024
MAX_AUDIO_SIZE = 25 * 1024 * 1024
ALLOWED_TYPES = {
    "avatar": {"jpg", "jpeg", "png", "webp"},
    "audio_input": {"wav", "mp3", "webm", "m4a"},
}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = Query(...),
    auth: tuple = Depends(get_current_user),
):
    user, _ = auth
    if type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": f"不支持的文件类型: {type}"})
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_TYPES[type]:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": f"不支持的文件格式: .{ext}"})
    content = await file.read()
    max_size = MAX_AVATAR_SIZE if type == "avatar" else MAX_AUDIO_SIZE
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": f"文件过大，最大 {max_size // 1024 // 1024}MB"})

    file_uuid = str(uuid_lib.uuid4())
    type_dir = UPLOAD_DIR / type
    type_dir.mkdir(parents=True, exist_ok=True)
    file_path = type_dir / f"{file_uuid}.{ext}"
    await asyncio.to_thread(file_path.write_bytes, content)
    url = f"{settings.PUBLIC_API_URL.rstrip('/')}/api/file/{file_uuid}"
    return {"code": 0, "data": {"file_uuid": file_uuid, "url": url}}


def _find_file(file_uuid: str, type_name: str) -> Path | None:
    type_dir = UPLOAD_DIR / type_name
    for ext in ALLOWED_TYPES[type_name]:
        candidate = type_dir / f"{file_uuid}.{ext}"
        if candidate.is_file():
            return candidate
    return None


@router.get("/{file_uuid}")
async def get_file(file_uuid: str, authorization: str | None = Header(None)):
    if not re.fullmatch(r"[a-f0-9-]{36}", file_uuid):
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "无效的文件 ID"})

    avatar = _find_file(file_uuid, "avatar")
    if avatar:
        return FileResponse(
            avatar,
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )

    audio = _find_file(file_uuid, "audio_input")
    if audio:
        token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
        if not token or not decode_token(token):
            raise HTTPException(status_code=401, detail={"code": 40001, "message": "认证失败"})
        return FileResponse(audio, headers={"Cache-Control": "private, no-store"})

    raise HTTPException(status_code=404, detail={"code": 40401, "message": "文件不存在"})
