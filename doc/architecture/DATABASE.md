# 数据库设计

> 最后更新: 2026-06-12
> 状态: 19 张表全部建成（含 alembic_version），Alembic 管理迁移

**已建成的表：** users, industries, positions, interview_modes, difficulty_configs, interview_sessions, interview_rounds, knowledge_questions, feedbacks, payments, subscriptions, invite_codes, invite_records, notifications, coupons, user_coupons, achievements, user_achievements

---

## ER 关系

```
users ─┬── interview_sessions ─── interview_rounds
       ├── subscriptions ─── subscription_payments
       ├── payments
       ├── user_coupons ─── coupons
       ├── invite_records ─── invite_codes
       ├── user_achievements ─── achievements
       ├── share_records
       ├── notifications
       └── feedbacks

industries ─── positions
interview_modes (独立配置)
difficulty_configs (独立配置)
knowledge_questions (industry_id FK, position_id FK, vector_id → FAISS/Milvus)
```

---

## 设计原则

| 原则 | 做法 |
|------|------|
| 主键 | BIGINT AUTO_INCREMENT（内部 JOIN 高效） |
| 外部 ID | `uuid CHAR(36)` 列 + UNIQUE 索引（API 暴露，防枚举） |
| FK 关联 | industry/position 用 ID 关联配置表，不用字符串 |
| 可扩展字段 | 高频变化的分类用 VARCHAR + 应用校验，不用 ENUM |
| 时间 | 所有表有 created_at，需要修改追踪的加 updated_at |
| 软删除 | 用户相关表加 deleted_at（PIPL 合规） |
| 字符集 | utf8mb4_unicode_ci（中文+emoji） |

---

## MySQL 表

### users — 用户表

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  openid VARCHAR(64) UNIQUE NOT NULL,
  union_id VARCHAR(64),
  nickname VARCHAR(64),
  avatar VARCHAR(512),
  phone VARCHAR(20),
  membership_type VARCHAR(16) DEFAULT 'free',   -- free/monthly/yearly
  membership_expire_at DATETIME,
  total_interviews INT DEFAULT 0,
  weak_points JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,

  UNIQUE INDEX uk_uuid (uuid),
  INDEX idx_openid (openid),
  INDEX idx_membership (membership_type, membership_expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### industries — 行业配置

```sql
CREATE TABLE industries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(32) UNIQUE NOT NULL,
  icon VARCHAR(256),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(256),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### positions — 岗位配置

```sql
CREATE TABLE positions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  industry_id INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  category VARCHAR(16) NOT NULL,              -- tech/product/design/operation/management/sales
  level VARCHAR(16) DEFAULT 'mid',            -- junior/mid/senior/lead/director
  icon VARCHAR(256),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  default_difficulty TINYINT DEFAULT 3,
  default_mode VARCHAR(16) DEFAULT 'mixed',
  description VARCHAR(256),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (industry_id) REFERENCES industries(id),
  UNIQUE KEY uk_industry_position (industry_id, name),
  INDEX idx_category (category, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### interview_modes — 面试模式配置

```sql
CREATE TABLE interview_modes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) UNIQUE NOT NULL,           -- tech/behavior/scenario/stress/mixed
  name VARCHAR(32) NOT NULL,
  description VARCHAR(256),
  icon VARCHAR(256),
  applicable_categories JSON,                 -- ["tech","product"]
  default_rounds TINYINT DEFAULT 10,
  default_duration_min TINYINT DEFAULT 30,
  dimension_weights JSON,                     -- {"专业知识":0.35,...}
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### difficulty_configs — 难度配置

```sql
CREATE TABLE difficulty_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level TINYINT UNIQUE NOT NULL,              -- 1-5
  name VARCHAR(16) NOT NULL,                  -- 入门/初级/中级/高级/专家
  description VARCHAR(128),
  question_complexity VARCHAR(128),           -- Agent 出题参考
  expected_answer_depth VARCHAR(256),         -- 评估器参考
  probe_aggressiveness VARCHAR(8) DEFAULT 'medium',  -- low/medium/high
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### interview_sessions — 面试场次

```sql
CREATE TABLE interview_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  industry_id INT,
  position_id INT,
  mode_code VARCHAR(16) NOT NULL,             -- 关联 interview_modes.code
  jd_text TEXT,
  difficulty TINYINT DEFAULT 3,
  status VARCHAR(16) DEFAULT 'ongoing',       -- ongoing/completed/abandoned
  total_rounds INT DEFAULT 0,
  final_score TINYINT,
  duration_sec INT,
  report_json JSON,
  report_version TINYINT DEFAULT 1,           -- 报告格式版本号
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (industry_id) REFERENCES industries(id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  UNIQUE INDEX uk_uuid (uuid),
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_time (user_id, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**report_json 结构 (v1)**:
```json
{
  "version": 1,
  "overall_score": 72,
  "dimensions": {"专业知识": 8, "逻辑表达": 7, "问题解决": 6, "沟通能力": 8, "抗压能力": 7},
  "summary": "整体表现中上...",
  "strengths": ["表达清晰", "案例具体"],
  "improvements": ["缺少量化数据", "系统设计深度不够"],
  "next_focus": ["系统设计", "数据驱动思维"]
}
```

### interview_rounds — 每轮对答

```sql
CREATE TABLE interview_rounds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  round_num SMALLINT NOT NULL,
  question_type VARCHAR(16) DEFAULT 'initial', -- initial/probe/followup
  probe_depth TINYINT DEFAULT 0,               -- 追问层级：0=首问，1=第一层追问，2=第二层
  question TEXT NOT NULL,
  question_source VARCHAR(16) DEFAULT 'ai',    -- knowledge_base/ai/jd_based
  knowledge_question_id BIGINT,
  answer TEXT,
  answer_duration_sec INT,
  skipped BOOLEAN DEFAULT FALSE,               -- 用户是否跳过
  evaluation JSON,
  score TINYINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  INDEX idx_session_round (session_id, round_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**evaluation JSON 结构**:
```json
{
  "score": 7,
  "strengths": ["提到了具体方案"],
  "weaknesses": ["缺少性能考量"],
  "suggestion": "可以补充 QPS 预估和瓶颈分析",
  "dimension": "问题解决"
}
```

### knowledge_questions — 题库

```sql
CREATE TABLE knowledge_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  industry_id INT NOT NULL,
  position_id INT,
  question_type VARCHAR(16) NOT NULL,          -- tech/behavior/scenario/stress
  question TEXT NOT NULL,
  reference_answer TEXT,
  scoring_criteria TEXT,
  difficulty TINYINT DEFAULT 3,
  tags JSON,
  vector_id VARCHAR(64),
  source VARCHAR(16) DEFAULT 'manual',         -- manual/ai/user_shared/crawled
  usage_count INT DEFAULT 0,
  avg_score DECIMAL(3,1),
  status VARCHAR(16) DEFAULT 'active',         -- active/disabled/pending_review
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (industry_id) REFERENCES industries(id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  INDEX idx_search (industry_id, position_id, question_type, difficulty, status),
  INDEX idx_vector (vector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### payments — 支付记录

```sql
CREATE TABLE payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  order_no VARCHAR(64) UNIQUE NOT NULL,
  wx_transaction_id VARCHAR(64),
  product_type VARCHAR(16) NOT NULL,           -- monthly/yearly/single
  original_amount DECIMAL(10,2) NOT NULL,      -- 原价
  discount_amount DECIMAL(10,2) DEFAULT 0,     -- 优惠金额
  pay_amount DECIMAL(10,2) NOT NULL,           -- 实付
  coupon_id BIGINT,                            -- 使用的优惠券
  status VARCHAR(16) DEFAULT 'pending',        -- pending/paid/refunded/failed
  refund_reason VARCHAR(256),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE INDEX uk_uuid (uuid),
  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_order_no (order_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### subscriptions — 订阅记录

```sql
CREATE TABLE subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan VARCHAR(16) NOT NULL,                   -- monthly/yearly
  status VARCHAR(16) DEFAULT 'active',         -- active/expired/cancelled
  started_at DATETIME NOT NULL,
  expire_at DATETIME NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_expire (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### subscription_payments — 订阅与支付关联（多对多）

```sql
CREATE TABLE subscription_payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  subscription_id BIGINT NOT NULL,
  payment_id BIGINT NOT NULL,
  action VARCHAR(16) NOT NULL,                 -- create/renew/upgrade
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  INDEX idx_subscription (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### coupons — 优惠券模板

```sql
CREATE TABLE coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  coupon_type VARCHAR(16) NOT NULL,            -- discount/free_days/free_quota
  value INT NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  applicable_products JSON,                    -- ["monthly","yearly"]
  total_stock INT DEFAULT -1,
  issued_count INT DEFAULT 0,
  start_at DATETIME,
  expire_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### user_coupons — 用户持有优惠券

```sql
CREATE TABLE user_coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  coupon_id BIGINT NOT NULL,
  status VARCHAR(16) DEFAULT 'unused',         -- unused/used/expired
  used_at DATETIME,
  used_payment_id BIGINT,
  expire_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### invite_codes — 邀请码

```sql
CREATE TABLE invite_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) UNIQUE NOT NULL,
  inviter_user_id BIGINT,
  reward_type VARCHAR(16) NOT NULL,            -- quota/days/discount
  reward_value INT NOT NULL,
  max_uses INT DEFAULT -1,
  used_count INT DEFAULT 0,
  expire_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (inviter_user_id) REFERENCES users(id),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### invite_records — 邀请记录

```sql
CREATE TABLE invite_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invite_code_id BIGINT NOT NULL,
  inviter_user_id BIGINT,
  invitee_user_id BIGINT NOT NULL,
  reward_given BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id),
  FOREIGN KEY (inviter_user_id) REFERENCES users(id),
  FOREIGN KEY (invitee_user_id) REFERENCES users(id),
  UNIQUE KEY uk_invitee (invitee_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### achievements — 成就

```sql
CREATE TABLE achievements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(256),
  icon VARCHAR(256),
  condition_type VARCHAR(16) NOT NULL,         -- interview_count/score/streak/improvement/share
  condition_value INT NOT NULL,
  reward_type VARCHAR(16) DEFAULT 'badge',     -- quota/badge/coupon
  reward_value INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### user_achievements — 用户成就

```sql
CREATE TABLE user_achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  achievement_id INT NOT NULL,
  achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE KEY uk_user_achievement (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### share_records — 分享记录

```sql
CREATE TABLE share_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  session_id BIGINT,
  channel VARCHAR(16) NOT NULL,                -- wechat_moments/wechat_friend/xiaohongshu/douyin/link
  share_type VARCHAR(16) NOT NULL,             -- report/invite/achievement
  share_image_url VARCHAR(512),
  click_count INT DEFAULT 0,
  convert_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_channel (channel, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### notifications — 站内通知

```sql
CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT,
  type VARCHAR(16) NOT NULL,                   -- system/achievement/invite_reward/coupon/reminder
  is_read BOOLEAN DEFAULT FALSE,
  related_url VARCHAR(512),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_unread (user_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### feedbacks — 用户反馈

```sql
CREATE TABLE feedbacks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  session_id BIGINT,
  rating TINYINT NOT NULL,                     -- 1-5
  comment TEXT,
  feedback_type VARCHAR(16) DEFAULT 'interview', -- interview/bug/suggestion
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### agent_logs — Agent 决策日志

```sql
CREATE TABLE agent_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  round_num SMALLINT,
  agent_type VARCHAR(16) NOT NULL,             -- planner/prober/evaluator/reporter
  decision VARCHAR(64),                        -- ask_next/probe/end/report
  latency_ms INT,
  token_usage JSON,                            -- {"prompt":500,"completion":200}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  INDEX idx_session (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### files — 文件元数据

```sql
CREATE TABLE files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  session_id BIGINT,
  file_type VARCHAR(16) NOT NULL,              -- audio_input/audio_tts/avatar/report_image/share_image
  file_path VARCHAR(512) NOT NULL,
  file_size INT,
  duration_sec INT,
  mime_type VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  UNIQUE INDEX uk_uuid (uuid),
  INDEX idx_user_type (user_id, file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 向量存储 (Phase 1: FAISS → Phase 2+: Milvus)

Phase 1 数据量小（几百题 + 少量用户记忆），用 FAISS 本地文件即可，零运维。

### interview_knowledge — 题库向量

```
维度: 1024d (BGE-M3)
metric: cosine
metadata (JSON sidecar per vector):
  mysql_id       → knowledge_questions.id
  industry_id    → 标量过滤
  position_id    → 标量过滤
  question_type  → 标量过滤
  difficulty     → 标量过滤

Phase 1 存储: faiss.IndexFlatIP + metadata JSON 文件
Phase 2+ 迁移: Milvus IVF_FLAT, nlist=128, 按 industry 分区
```

### interview_memory — 用户记忆向量

```
维度: 1024d (BGE-M3)
metric: cosine
metadata:
  user_id        → 必选过滤
  session_id
  round_num
  content        → 问答片段原文
  context_type   → weakness/strength/pattern/key_answer
  dimension      → 能力维度
  timestamp

Phase 1: 按 user_id 分文件存储 FAISS index
Phase 2+: Milvus HNSW, M=16, ef=256, 按 user_id hash 分区
```

---

## Redis Key 设计

### 配额管理（唯一权威源）

```
# 用户月度配额 — String, TTL 到月底
# 初始化: 月初从 MySQL users.membership_type 计算写入
# 扣减: Lua 脚本原子操作
quota:{user_id}:{yyyy-mm} → 剩余次数 (int)
```

**原子扣减 Lua 脚本**:
```lua
-- KEYS[1] = quota:{user_id}:{month}
-- KEYS[2] = active_session:{user_id}
-- ARGV[1] = session_id
local quota = tonumber(redis.call('GET', KEYS[1]) or '0')
if quota <= 0 then return -1 end                    -- 配额不足
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end  -- 已有进行中面试
redis.call('DECR', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'EX', 7200)    -- 2h TTL
return quota - 1
```

### 面试会话

```
# 会话状态 — Hash, TTL 2h
session:{session_id}
  state       → PLANNING/QUESTIONING/EVALUATING/DECIDING/PROBING/REPORTING/DONE
  round       → 当前轮次
  plan        → JSON 面试大纲
  plan_index  → 当前执行位置
  started_at  → timestamp

# Agent 上下文 — String (JSON), TTL 2h
agent_ctx:{session_id}
  → {"recent_rounds":[...],"current_eval":{...},"user_profile":"..."}

# 已问题目 — Set, TTL 2h
asked:{session_id} → {question_id_1, question_id_2, ...}

# SSE 事件日志 — List, TTL 2h（重连恢复）
sse_log:{session_id} → ["id:seq|event_json", ...]
  每条格式: "{seq}|{event_type}|{json_data}"
```

### 用户维度

```
# 活跃 session — String, TTL 2h
active_session:{user_id} → session_id

# 限流 — 滑动窗口
rate:{user_id} → count (INCR + EXPIRE 60s)
```

### 全局

```
stats:active_interviews → count
```

---

## 数据生命周期

| 数据 | 策略 |
|------|------|
| users | 永久（deleted_at 标记软删） |
| interview_sessions / rounds | 永久 |
| payments / subscriptions | 永久（财务） |
| 配置表 (industries/positions/modes) | 永久 |
| knowledge_questions | 永久 |
| notifications | 90 天清理已读 |
| agent_logs | 90 天归档 |
| files (音频) | 30 天清理 |
| FAISS/Milvus memory | 90 天清理非 key_answer |
| Redis | TTL 自动过期 |

---

## 数据库迁移

使用 **Alembic**（SQLAlchemy 配套）管理 schema 版本：

```
backend/
  alembic/
    versions/         — 迁移文件
    env.py
  alembic.ini
```

规则：
- 每次改表结构必须生成迁移文件
- 迁移文件禁止手动编辑（除非修复）
- 生产环境通过 `alembic upgrade head` 执行
- 回滚脚本必须同步编写
