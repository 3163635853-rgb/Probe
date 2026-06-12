import uuid as uuid_lib
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from fastapi.responses import FileResponse

from api.deps import get_current_user

router = APIRouter(prefix="/api/file", tags=["file"])

UPLOAD_DIR = Path(__file__).parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB

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
    """上传文件"""
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

    # 保存
    file_uuid = str(uuid_lib.uuid4())
    filename = f"{file_uuid}.{ext}"
    type_dir = UPLOAD_DIR / type
    type_dir.mkdir(exist_ok=True)
    file_path = type_dir / filename
    file_path.write_bytes(content)

    return {
        "code": 0,
        "data": {
            "file_uuid": file_uuid,
            "url": f"/api/file/{file_uuid}",
        },
    }


@router.get("/{file_uuid}")
async def get_file(file_uuid: str):
    """获取文件"""
    # 遍历子目录查找
    for type_dir in UPLOAD_DIR.iterdir():
        if type_dir.is_dir():
            for f in type_dir.iterdir():
                if f.stem == file_uuid:
                    return FileResponse(f)

    raise HTTPException(status_code=404, detail={"code": 40401, "message": "文件不存在"})
