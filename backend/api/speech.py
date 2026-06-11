import tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse

from api.deps import get_current_user

router = APIRouter(prefix="/api/speech", tags=["speech"])

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_FORMATS = {"wav", "mp3", "webm", "m4a"}


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    auth: tuple = Depends(get_current_user),
):
    """语音转文字 (Whisper API)"""
    user, _ = auth

    # 校验
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": f"不支持的音频格式，允许: {', '.join(ALLOWED_FORMATS)}"})

    content = await file.read()
    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "音频文件不能超过 25MB"})

    # 调 Whisper API (OpenAI 兼容)
    from openai import AsyncOpenAI
    from config import settings

    client = AsyncOpenAI(
        api_key=settings.DEEPSEEK_API_KEY or "sk-placeholder",
        base_url=settings.DEEPSEEK_BASE_URL,
    )

    # 写临时文件
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        return {
            "code": 0,
            "data": {"text": transcript.text, "duration_sec": None},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": 50001, "message": f"语音识别失败: {str(e)}"})
    finally:
        try:
            Path(tmp_path).unlink()
        except OSError:
            pass


@router.get("/tts")
async def tts(
    text: str = Query(..., max_length=500),
    voice: str = Query("zh-CN-XiaoxiaoNeural"),
    auth: tuple = Depends(get_current_user),
):
    """文字转语音 (Edge TTS)"""
    if not text.strip():
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "文本不能为空"})

    import edge_tts

    communicate = edge_tts.Communicate(text, voice)

    async def audio_stream():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )
