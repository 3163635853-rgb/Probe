import inspect

import httpx
import pytest

from api.interview_stream import interview_stream
from main import app


EXPECTED_ROUTES = {
    ("POST", "/api/auth/wechat"), ("POST", "/api/auth/register"),
    ("POST", "/api/auth/login"), ("GET", "/api/auth/me"),
    ("PUT", "/api/auth/profile"), ("POST", "/api/auth/ticket"),
    ("GET", "/api/config/industries"), ("GET", "/api/config/positions"),
    ("GET", "/api/config/modes"), ("GET", "/api/config/difficulties"),
    ("GET", "/api/config/app-version"), ("GET", "/api/quota/status"),
    ("POST", "/api/interview/start"), ("POST", "/api/interview/{uuid}/answer"),
    ("POST", "/api/interview/{uuid}/skip"), ("POST", "/api/interview/{uuid}/end"),
    ("GET", "/api/interview/{uuid}/report"), ("GET", "/api/interview/history"),
    ("GET", "/api/interview/active"), ("GET", "/api/interview/stats"),
    ("GET", "/api/interview/{uuid}/stream"), ("POST", "/api/feedback"),
    ("GET", "/api/payment/plans"), ("POST", "/api/payment/create"),
    ("POST", "/api/payment/webhook"), ("GET", "/api/payment/orders"),
    ("GET", "/api/subscription/current"), ("PUT", "/api/subscription/auto-renew"),
    ("POST", "/api/speech/transcribe"), ("GET", "/api/speech/tts"),
    ("GET", "/api/invite/my-code"), ("POST", "/api/invite/redeem"),
    ("POST", "/api/invite/retry-reward"),
    ("GET", "/api/invite/records"), ("GET", "/api/notification/list"),
    ("GET", "/api/notification/unread-count"),
    ("PUT", "/api/notification/{notification_id}/read"),
    ("PUT", "/api/notification/read-all"), ("GET", "/api/coupon/mine"),
    ("POST", "/api/coupon/redeem"), ("GET", "/api/achievement/list"),
    ("POST", "/api/share/generate-image"),
    ("GET", "/api/share/image/{share_uuid}.png"),
    ("POST", "/api/share/record"), ("GET", "/api/share/callback/{share_id}"),
    ("POST", "/api/file/upload"), ("GET", "/api/file/{file_uuid}"),
    ("POST", "/api/user/push-token"),
    ("GET", "/api/growth/overview"),
    ("POST", "/api/growth/tasks/{task_id}/complete"),
    ("PUT", "/api/growth/weekly-goal"),
    ("GET", "/api/career/presets"), ("GET", "/api/career/resumes"),
    ("GET", "/api/career/resumes/{resume_uuid}"), ("POST", "/api/career/resumes"),
    ("PUT", "/api/career/resumes/{resume_uuid}/activate"), ("DELETE", "/api/career/resumes/{resume_uuid}"),
    ("GET", "/api/career/stories"), ("POST", "/api/career/stories"),
    ("GET", "/api/career/stories/recommend"),
    ("PUT", "/api/career/stories/{story_uuid}"), ("DELETE", "/api/career/stories/{story_uuid}"),
    ("GET", "/api/practice/drills"), ("POST", "/api/practice/drills/{drill_code}/generate"),
    ("POST", "/api/practice/rounds/{round_id}/retry"), ("GET", "/api/practice/rounds/{round_id}/attempts"),
    ("POST", "/api/practice/optimize"), ("POST", "/api/video/analyze"),
    ("GET", "/api/video/analyses"), ("GET", "/api/video/{analysis_uuid}"),
    ("GET", "/api/video/{analysis_uuid}/media"), ("POST", "/api/coach/reviews"),
    ("GET", "/api/coach/reviews"), ("GET", "/api/coach/queue"),
    ("POST", "/api/coach/reviews/{review_uuid}/claim"), ("PUT", "/api/coach/reviews/{review_uuid}"),
    ("GET", "/api/enterprise/organizations"), ("POST", "/api/enterprise/organizations"),
    ("GET", "/api/enterprise/organizations/{org_uuid}/members"), ("POST", "/api/enterprise/organizations/{org_uuid}/members"),
    ("POST", "/api/enterprise/rubrics"), ("GET", "/api/enterprise/rubrics"),
    ("GET", "/api/enterprise/organizations/{org_uuid}/dashboard"),
    ("PUT", "/api/enterprise/organizations/{org_uuid}/settings"),
    ("PUT", "/api/enterprise/organizations/{org_uuid}/members/{user_uuid}"),
    ("GET", "/api/enterprise/organizations/{org_uuid}/questions"),
    ("POST", "/api/enterprise/organizations/{org_uuid}/questions"),
    ("GET", "/api/enterprise/organizations/{org_uuid}/audit-logs"),
    ("GET", "/api/enterprise/organizations/{org_uuid}/export"),
    ("GET", "/api/technical/exercises"), ("POST", "/api/technical/evaluate"),
    ("GET", "/api/technical/submissions"),
    ("GET", "/health"),
}


def test_complete_route_contract():
    actual = set()
    for route in app.routes:
        if route.path.startswith("/api") or route.path == "/health":
            for method in route.methods or set():
                actual.add((method, route.path))
    assert actual == EXPECTED_ROUTES


def test_sse_accepts_header_auth_fallback():
    assert "authorization" in inspect.signature(interview_stream).parameters


@pytest.mark.asyncio
async def test_public_and_protected_smoke_contracts():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        plans = await client.get("/api/payment/plans")
        assert plans.status_code == 200
        assert len(plans.json()["data"]) == 3

        unauthenticated = await client.get("/api/auth/me")
        assert unauthenticated.status_code == 401
        assert unauthenticated.json()["code"] == 40001

        invalid_file = await client.get("/api/file/not-a-uuid")
        assert invalid_file.status_code == 400
