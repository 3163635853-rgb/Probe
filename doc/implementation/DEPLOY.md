# 部署与运维

---

## 架构 (Phase 1)

```
┌─ DO Droplet 4C 8G ──────────────────────────────┐
│  Caddy (网关, HTTPS, 反代)                        │
│  Backend (FastAPI) ─ 2G 内存限制                  │
│  Web (Next.js) ─ 512M                            │
│  MySQL 8.0 ─ 2G                                  │
│  Redis 7 ─ 512M                                  │
└──────────────────────────────────────────────────┘

向量检索: FAISS 本地 (Phase 1 无需 Milvus)
Embedding: 调用 API 或 bge-m3-small 本地 CPU 推理
```

---

## Docker Compose

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=mysql+asyncmy://probe:${MYSQL_PASSWORD}@mysql:3306/probe
      - REDIS_URL=redis://redis:6379/0
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - WX_APP_ID=${WX_APP_ID}
      - WX_APP_SECRET=${WX_APP_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
    restart: unless-stopped

  web:
    build: ./web
    environment:
      - NEXT_PUBLIC_API_URL=https://api.probe.app
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=probe
      - MYSQL_USER=probe
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    restart: unless-stopped

volumes:
  caddy_data:
  mysql_data:
  redis_data:
```

---

## 环境管理

| 环境 | 部署 |
|------|------|
| local | docker-compose.dev.yml (热重载, 端口暴露) |
| production | docker-compose.yml + .env.production |

---

## CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_IP }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/probe
            git pull origin main
            docker compose build --no-cache backend web
            docker compose up -d
            docker compose exec backend alembic upgrade head
```

回滚: `git revert HEAD && git push` 触发重新部署

---

## 监控与告警

### 健康检查

```
GET /health → {"status":"ok","mysql":"ok","redis":"ok","uptime_sec":86400}
```

### 日志

- 结构化 JSON 日志 → stdout → `docker compose logs`
- 每条含: timestamp, level, request_id, user_id, latency_ms
- LLM 调用单独记录 token 消耗

### 告警 (DO Monitoring)

| 指标 | 阈值 | 通知 |
|------|------|------|
| CPU > 80% | 5min | 邮件 |
| 内存 > 85% | 即时 | 邮件 |
| 磁盘 > 80% | 即时 | 邮件 |
| 5xx > 5% | 5min | 微信 |
| LLM 延迟 P95 > 10s | 5min | 微信 |

---

## 备份

| 数据 | 频率 | 保留 | 方式 |
|------|------|------|------|
| MySQL | 每日 3:00 | 7天 | mysqldump + gzip |
| Redis AOF | 每日 4:00 | 3天 | 文件拷贝 |
| FAISS 索引 | 每日 4:00 | 7天 | tar 打包 |

灾恢目标: RTO 2h, RPO 24h

---

## 性能目标

| 指标 | 目标 |
|------|------|
| API 响应 (非 LLM) | P95 < 200ms |
| LLM 首 token | < 2s |
| SSE 建连 | < 500ms |
| 并发面试 | 20/单机 |
| 单次面试 LLM 成本 | ~¥0.05 |

### 连接池

```python
# MySQL
pool_size=10, max_overflow=20, pool_timeout=30

# Redis
max_connections=50
```

---

## 安全

| 层面 | 措施 |
|------|------|
| 传输 | Caddy HTTPS + HSTS |
| 认证 | JWT HS256, 7天有效, 自动续签 |
| 限流 | Redis 30 req/min/user |
| 输入 | Pydantic, answer ≤ 5000字 |
| LLM | 用户输入不入 system prompt |
| 支付 | 微信签名验证 + 幂等 |
| 数据 | ORM 参数化, 日志脱敏 |
| 服务器 | SSH key-only, UFW 只开 80/443 |

---

## 错误处理与降级

### LLM 失败

```
超时 30s → 重试 1 次 (2s 退避) → 仍失败 → SSE event:error → 
30s 后仍无 → 从题库取兜底题
```

### 组件降级

| 组件 | 降级 |
|------|------|
| FAISS | 跳过向量检索，Agent 自行出题 |
| Redis | 内存 dict 临时存（单次有效） |
| MySQL | 面试继续(Redis 状态)，结束后重试写入 |

---

## 扩展路径

```
Phase 1 (0-1000):  单机 4C8G
Phase 2 (1000+):   MySQL 拆独立, backend x2
Phase 3 (5000+):   上 Milvus, 考虑 K8s
```
