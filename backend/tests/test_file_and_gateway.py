import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse

from api import file as file_api


@pytest.mark.asyncio
async def test_avatar_file_is_public_and_cacheable(tmp_path, monkeypatch):
    monkeypatch.setattr(file_api, "UPLOAD_DIR", tmp_path)
    file_uuid = str(uuid.uuid4())
    avatar_dir = tmp_path / "avatar"
    avatar_dir.mkdir()
    (avatar_dir / f"{file_uuid}.png").write_bytes(b"png")

    response = await file_api.get_file(file_uuid, authorization=None)
    assert isinstance(response, FileResponse)
    assert "public" in response.headers["cache-control"]
    assert "immutable" in response.headers["cache-control"]


@pytest.mark.asyncio
async def test_audio_file_requires_bearer_token(tmp_path, monkeypatch):
    monkeypatch.setattr(file_api, "UPLOAD_DIR", tmp_path)
    file_uuid = str(uuid.uuid4())
    audio_dir = tmp_path / "audio_input"
    audio_dir.mkdir()
    (audio_dir / f"{file_uuid}.m4a").write_bytes(b"audio")

    with pytest.raises(HTTPException) as exc_info:
        await file_api.get_file(file_uuid, authorization=None)
    assert exc_info.value.status_code == 401


def test_mobile_and_caddy_api_prefix_contract():
    repo_root = Path(__file__).resolve().parents[2]
    mobile_api = (repo_root / "mobile/lib/api.ts").read_text(encoding="utf-8")
    mobile_env = (repo_root / "mobile/.env.example").read_text(encoding="utf-8")
    caddy = (repo_root / "Caddyfile").read_text(encoding="utf-8")
    assert '"https://api.probe.app/api"' in mobile_api
    assert "EXPO_PUBLIC_API_URL=https://api.probe.app/api" in mobile_env
    assert "rewrite * /api{uri}" in caddy
