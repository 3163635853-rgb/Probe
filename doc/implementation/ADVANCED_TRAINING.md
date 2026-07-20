# Probe 高级训练系统

更新时间：2026-07-20

## 目标

训练室把原有“面试 → 追问 → 报告 → 成长”主链路延伸为可重复的训练闭环：

1. 用简历与 STAR 故事建立候选人证据库。
2. 在报告内直接重答，并对比分数、量化表达和结构变化。
3. 用短时专项训练提高打开频率。
4. 用录像回看补充内容评分之外的表达反馈。
5. 为教练、学校、培训机构和企业提供标准化管理能力。

## 已实现能力

### 候选人证据库

- `POST /api/career/resumes`：PDF、DOCX、TXT、Markdown 上传与解析。
- 自动提取技能、时间线提示、量化成果和简历完整度。
- 量化成果可自动生成初始 STAR 素材。
- STAR 故事 CRUD、质量检查和按面试问题推荐。
- 开始面试时可绑定简历；Planner、出题器和 Evaluator 均读取结构化证据，报告显示匹配故事、待核实事实和潜在冲突。

### 复练和证据化评分

- Evaluator 输出 `evidence` 和 `structure`，报告展示引用原回答的评分依据。
- `POST /api/practice/rounds/{round_id}/retry` 保存每次重答、重新评分并生成前后对比。
- 对比包括分数变化、量化信息增量、关键表达和已解决弱点。
- 答案优化提供结构版、60 秒版、STAR 版、提纲与事实边界提醒；提示词禁止虚构经历和数字。
- Web 与 App 报告均提供“立即重答”。

### 专项训练

- 10 类 3–8 分钟快练：自我介绍、STAR、量化成果、压力追问、反问、薪资、空窗期、失败、领导力和 Case。
- 可按岗位、公司、难度与弱项生成定制题。
- Web/App 训练室均可完成回答评分、保存、历史对比和答案优化；每天首次完成专项任务自动发放成长 XP。

### 视频和表达分析

- Web 使用浏览器 `MediaRecorder` 直接录制；App 使用系统摄像头录制或选择已有媒体。
- 支持 MP4、MOV、WebM、MKV、MP3、M4A、WAV，单文件上限 150MB。
- 指标包括回答时长、语速、填充词、长句、重复表达；生产镜像内置 ffmpeg，可提取真实停顿、开场沉默、静默比例和音量稳定性。
- OpenCV 抽帧提供面部出现、眼部可见和面部居中比例；这些指标仅用于训练参考，不宣称进行情绪或心理诊断。
- 原录像可鉴权回放；关联面试后，报告同时展示内容分、表达分和综合分。

### 真人教练

- 用户可把已完成面试和指定录像提交到教练队列，并明确授予限时录像访问权限。
- 教练/管理员可领取任务、在授权期内播放录像、给出 1–10 分、长评和逐题批注；用户可取消任务并立即撤销媒体权限。
- 完成后写入站内通知并尝试推送。

### 企业训练空间

- 组织与成员管理，支持 owner/admin/coach/member 角色。
- 自定义题库、自定义 Rubric、自动归一化权重和合格线；组织训练优先从组织题库出题，并把通过结果写入报告。
- 90 天团队看板只统计明确绑定该组织的训练，提供成员次数、均分、能力维度和 Rubric 通过率，避免私人面试泄露到企业看板。
- SSO 提供方、企业域名、数据保留天数和成员导出策略配置。
- 审计日志记录组织、成员、题库、Rubric、设置、导出和数据保留执行；管理员可预览并执行到期训练数据删除。
- 组织数据 JSON 导出。

> SSO 身份源握手仍需要部署方提供 OIDC/SAML 客户端配置和回调域名；代码当前完成组织级策略与配置面，不内置任何第三方企业身份凭据。

### 技术面工具

- Python AST 静态分析：语法、函数、分支、危险调用、循环深度和复杂度提示；服务端不执行用户 Python 代码。
- 只读 SQL 沙箱：仅允许单条 `SELECT` / `WITH`，在内存 SQLite 示例库执行。
- 系统设计白板：结构化节点、连线和考虑项分析。
- Debug、Code Review 与架构方案对比题。
- 可绑定组织 Rubric 并保存历史提交。

## 数据模型

新增表：

- `resumes`
- `experience_stories`
- `practice_attempts`
- `drill_attempts`
- `video_analyses`
- `coach_reviews`
- `organizations`
- `organization_members`
- `organization_questions`
- `organization_audit_logs`
- `scoring_rubrics`
- `technical_submissions`

迁移：`c42f91a7e6d4_add_advanced_training_features.py` 与 `e91d6a7b3c20_close_advanced_training_loops.py`。

## 验证命令

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic upgrade head --sql

cd ..\web
npm run lint
npm run build

cd ..\mobile
npm run check
npm run bundle:check
```

真实数据库迁移需要 MySQL 可用；静态 SQL 生成可在无数据库环境下验证迁移链和 DDL。
