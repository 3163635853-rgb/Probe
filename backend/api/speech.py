import tempfile
import edge_tts
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from config import settings
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

    # 语音识别使用独立的 OpenAI 兼容服务，避免误把音频请求发给纯文本模型端点。
    if not settings.TRANSCRIPTION_API_KEY:
        raise HTTPException(status_code=503, detail={"code": 50303, "message": "语音识别服务未配置"})
    client = AsyncOpenAI(
        api_key=settings.TRANSCRIPTION_API_KEY,
        base_url=settings.TRANSCRIPTION_BASE_URL,
    )

    # 写临时文件
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model=settings.TRANSCRIPTION_MODEL,
                file=audio_file,
            )

        # 提取音频时长
        duration_sec = None
        try:
            import mutagen
            audio_info = mutagen.File(tmp_path)
            if audio_info and audio_info.info:
                duration_sec = int(audio_info.info.length)
        except Exception:
            pass

        return {
            "code": 0,
            "data": {"text": transcript.text, "duration_sec": duration_sec},
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Transcribe failed: {e}")
        raise HTTPException(status_code=500, detail={"code": 50001, "message": "语音识别失败，请稍后重试"})
    finally:
        try:
            Path(tmp_path).unlink()
        except OSError:
            pass


VOICE_MAP = {
    "female": "zh-CN-XiaoxiaoNeural",
    "male": "zh-CN-YunxiNeural",
    "zh-CN-XiaoxiaoNeural": "zh-CN-XiaoxiaoNeural",
    "zh-CN-YunxiNeural": "zh-CN-YunxiNeural",
    "zh-CN-XiaoyiNeural": "zh-CN-XiaoyiNeural",
}


@router.get("/tts")
async def tts(
    text: str = Query(..., max_length=500),
    voice: str = Query("female"),
    auth: tuple = Depends(get_current_user),
):
    """文字转语音 (Edge TTS)"""
    if not text.strip():
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "文本不能为空"})

    resolved_voice = VOICE_MAP.get(voice, "zh-CN-XiaoxiaoNeural")
    communicate = edge_tts.Communicate(text, resolved_voice)

    async def audio_stream():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )
