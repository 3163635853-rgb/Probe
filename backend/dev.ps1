$env:DATABASE_URL = "mysql+asyncmy://probe:probe@localhost:3308/probe"
$env:REDIS_URL = "redis://localhost:6379/0"
$env:DEBUG = "true"
$env:JWT_SECRET = "dev-secret"

Write-Host "Starting Probe backend..."
Write-Host "  MySQL: localhost:3308"
Write-Host "  Redis: localhost:6379"
Write-Host "  API:   http://localhost:8000"
Write-Host "  Docs:  http://localhost:8000/docs"
Write-Host ""

uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
