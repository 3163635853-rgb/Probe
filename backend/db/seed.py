"""种子数据：行业、岗位、面试模式、难度配置"""
import asyncio
from sqlalchemy import select
from db.mysql import AsyncSessionLocal
from models.config import Industry, Position, InterviewMode, DifficultyConfig
from models.achievement import Achievement

INDUSTRIES = [
    {"name": "互联网", "icon": "💻", "sort_order": 1, "description": "互联网/科技"},
    {"name": "金融", "icon": "💰", "sort_order": 2, "description": "银行/证券/基金"},
    {"name": "教育", "icon": "📚", "sort_order": 3, "description": "在线教育/培训"},
    {"name": "医疗", "icon": "🏥", "sort_order": 4, "description": "医疗健康/生物"},
    {"name": "电商", "icon": "🛒", "sort_order": 5, "description": "电商/零售"},
    {"name": "游戏", "icon": "🎮", "sort_order": 6, "description": "游戏/娱乐"},
    {"name": "制造", "icon": "🏭", "sort_order": 7, "description": "制造/工业"},
    {"name": "房地产", "icon": "🏠", "sort_order": 8, "description": "地产/建筑"},
    {"name": "咨询", "icon": "💼", "sort_order": 9, "description": "管理咨询/战略"},
    {"name": "新能源", "icon": "⚡", "sort_order": 10, "description": "新能源/环保"},
]

# industry_name -> positions
POSITIONS = {
    "互联网": [
        {"name": "后端工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "前端工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "算法工程师", "category": "tech", "level": "mid", "default_difficulty": 4},
        {"name": "产品经理", "category": "product", "level": "mid", "default_difficulty": 3},
        {"name": "数据分析师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "测试工程师", "category": "tech", "level": "mid", "default_difficulty": 2},
        {"name": "运维工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "项目经理", "category": "management", "level": "senior", "default_difficulty": 3},
    ],
    "金融": [
        {"name": "量化开发", "category": "tech", "level": "mid", "default_difficulty": 4},
        {"name": "风控分析师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "投行分析师", "category": "operation", "level": "junior", "default_difficulty": 3},
        {"name": "基金经理", "category": "management", "level": "senior", "default_difficulty": 5},
        {"name": "合规经理", "category": "management", "level": "mid", "default_difficulty": 3},
    ],
    "教育": [
        {"name": "教研产品经理", "category": "product", "level": "mid", "default_difficulty": 3},
        {"name": "课程设计师", "category": "design", "level": "mid", "default_difficulty": 2},
        {"name": "增长运营", "category": "operation", "level": "mid", "default_difficulty": 3},
        {"name": "后端工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "教育顾问", "category": "sales", "level": "junior", "default_difficulty": 2},
    ],
    "医疗": [
        {"name": "医疗AI工程师", "category": "tech", "level": "mid", "default_difficulty": 4},
        {"name": "临床数据分析", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "医学产品经理", "category": "product", "level": "mid", "default_difficulty": 3},
        {"name": "药物研发", "category": "tech", "level": "senior", "default_difficulty": 5},
        {"name": "市场推广", "category": "sales", "level": "mid", "default_difficulty": 2},
    ],
    "电商": [
        {"name": "后端工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "商品运营", "category": "operation", "level": "mid", "default_difficulty": 2},
        {"name": "供应链管理", "category": "management", "level": "senior", "default_difficulty": 3},
        {"name": "数据分析师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "产品经理", "category": "product", "level": "mid", "default_difficulty": 3},
    ],
    "游戏": [
        {"name": "游戏客户端", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "游戏服务端", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "游戏策划", "category": "design", "level": "mid", "default_difficulty": 2},
        {"name": "技术美术", "category": "design", "level": "mid", "default_difficulty": 3},
        {"name": "游戏运营", "category": "operation", "level": "mid", "default_difficulty": 2},
    ],
    "制造": [
        {"name": "工业软件工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "自动化工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "供应链经理", "category": "management", "level": "senior", "default_difficulty": 3},
        {"name": "质量工程师", "category": "tech", "level": "mid", "default_difficulty": 2},
        {"name": "生产主管", "category": "management", "level": "mid", "default_difficulty": 3},
    ],
    "房地产": [
        {"name": "投资分析师", "category": "operation", "level": "mid", "default_difficulty": 3},
        {"name": "项目经理", "category": "management", "level": "senior", "default_difficulty": 3},
        {"name": "营销总监", "category": "sales", "level": "senior", "default_difficulty": 4},
        {"name": "设计师", "category": "design", "level": "mid", "default_difficulty": 2},
        {"name": "成本管理", "category": "operation", "level": "mid", "default_difficulty": 3},
    ],
    "咨询": [
        {"name": "咨询顾问", "category": "operation", "level": "mid", "default_difficulty": 4},
        {"name": "高级分析师", "category": "tech", "level": "mid", "default_difficulty": 4},
        {"name": "项目经理", "category": "management", "level": "senior", "default_difficulty": 4},
        {"name": "行业研究员", "category": "operation", "level": "junior", "default_difficulty": 3},
        {"name": "合伙人助理", "category": "operation", "level": "junior", "default_difficulty": 3},
    ],
    "新能源": [
        {"name": "电池研发工程师", "category": "tech", "level": "mid", "default_difficulty": 4},
        {"name": "嵌入式工程师", "category": "tech", "level": "mid", "default_difficulty": 3},
        {"name": "产品经理", "category": "product", "level": "mid", "default_difficulty": 3},
        {"name": "项目经理", "category": "management", "level": "senior", "default_difficulty": 3},
        {"name": "市场BD", "category": "sales", "level": "mid", "default_difficulty": 2},
    ],
}

MODES = [
    {"code": "tech", "name": "技术面", "description": "考察技术深度与广度", "default_rounds": 10, "default_duration_min": 30, "applicable_categories": ["tech"], "dimension_weights": {"专业知识": 0.4, "问题解决": 0.3, "逻辑表达": 0.2, "沟通能力": 0.1}},
    {"code": "behavior", "name": "行为面", "description": "考察过往经历与软技能", "default_rounds": 8, "default_duration_min": 25, "applicable_categories": ["tech", "product", "design", "operation", "management", "sales"], "dimension_weights": {"沟通能力": 0.3, "逻辑表达": 0.3, "问题解决": 0.2, "抗压能力": 0.2}},
    {"code": "scenario", "name": "场景面", "description": "模拟实际工作场景", "default_rounds": 6, "default_duration_min": 30, "applicable_categories": ["product", "management", "operation"], "dimension_weights": {"问题解决": 0.35, "逻辑表达": 0.25, "专业知识": 0.25, "沟通能力": 0.15}},
    {"code": "stress", "name": "压力面", "description": "考察抗压能力与临场反应", "default_rounds": 8, "default_duration_min": 20, "applicable_categories": ["tech", "product", "sales", "management"], "dimension_weights": {"抗压能力": 0.4, "沟通能力": 0.25, "逻辑表达": 0.2, "问题解决": 0.15}},
    {"code": "mixed", "name": "综合面", "description": "综合考察多维能力", "default_rounds": 10, "default_duration_min": 35, "applicable_categories": ["tech", "product", "design", "operation", "management", "sales"], "dimension_weights": {"专业知识": 0.25, "问题解决": 0.25, "逻辑表达": 0.2, "沟通能力": 0.15, "抗压能力": 0.15}},
]


ACHIEVEMENTS = [
    {"code": "first_interview", "name": "初试啼声", "description": "完成第一次模拟面试", "icon": "trophy", "condition_type": "interview_count", "condition_value": 1},
    {"code": "three_interviews", "name": "渐入佳境", "description": "累计完成 3 次模拟面试", "icon": "flame", "condition_type": "interview_count", "condition_value": 3},
    {"code": "ten_interviews", "name": "百炼成钢", "description": "累计完成 10 次模拟面试", "icon": "medal", "condition_type": "interview_count", "condition_value": 10},
    {"code": "thirty_interviews", "name": "面试达人", "description": "累计完成 30 次模拟面试", "icon": "crown", "condition_type": "interview_count", "condition_value": 30},
    {"code": "score_80", "name": "优秀候选人", "description": "单场面试总分达到 80 分", "icon": "star", "condition_type": "score", "condition_value": 80},
    {"code": "score_90", "name": "Offer 收割机", "description": "单场面试总分达到 90 分", "icon": "sparkles", "condition_type": "score", "condition_value": 90},
]

DIFFICULTIES = [
    {"level": 1, "name": "入门", "description": "适合应届生/转行新人", "question_complexity": "基础概念、定义类问题", "expected_answer_depth": "能说出关键词和基本流程即可", "probe_aggressiveness": "low"},
    {"level": 2, "name": "初级", "description": "适合1年以内经验", "question_complexity": "基础原理、简单应用", "expected_answer_depth": "能解释原理并举简单例子", "probe_aggressiveness": "low"},
    {"level": 3, "name": "中级", "description": "适合1-3年经验", "question_complexity": "原理深入、方案设计", "expected_answer_depth": "能对比方案优劣并结合实际经验", "probe_aggressiveness": "medium"},
    {"level": 4, "name": "高级", "description": "适合3-5年经验", "question_complexity": "系统设计、复杂问题", "expected_answer_depth": "能从全局考量、量化分析、有深度见解", "probe_aggressiveness": "high"},
    {"level": 5, "name": "专家", "description": "适合5年+高级岗", "question_complexity": "架构决策、技术领导力", "expected_answer_depth": "能输出方法论、有行业洞察、能指导他人", "probe_aggressiveness": "high"},
]


async def seed():
    async with AsyncSessionLocal() as session:
        # 成就配置独立幂等补齐，兼容已经初始化过行业数据的旧环境。
        achievement_result = await session.execute(select(Achievement.code))
        existing_achievement_codes = {row[0] for row in achievement_result.all()}
        for data in ACHIEVEMENTS:
            if data["code"] not in existing_achievement_codes:
                session.add(Achievement(**data, reward_type="badge", reward_value=0, is_active=True))
        await session.commit()

        # Check if base config is already seeded
        result = await session.execute(select(Industry).limit(1))
        if result.scalar_one_or_none():
            print(f"Base config already seeded; achievements ensured: {len(ACHIEVEMENTS)}")
            return

        # Industries
        industry_map = {}
        for data in INDUSTRIES:
            ind = Industry(**data)
            session.add(ind)
            await session.flush()
            industry_map[ind.name] = ind.id

        # Positions
        for industry_name, positions in POSITIONS.items():
            industry_id = industry_map.get(industry_name)
            if not industry_id:
                continue
            for i, pos_data in enumerate(positions):
                pos = Position(industry_id=industry_id, sort_order=i + 1, **pos_data)
                session.add(pos)

        # Modes
        for data in MODES:
            mode = InterviewMode(**data)
            session.add(mode)

        # Difficulties
        for data in DIFFICULTIES:
            diff = DifficultyConfig(**data)
            session.add(diff)

        await session.commit()
        print(f"Seeded: {len(INDUSTRIES)} industries, {sum(len(v) for v in POSITIONS.values())} positions, {len(MODES)} modes, {len(DIFFICULTIES)} difficulties, {len(ACHIEVEMENTS)} achievements")


if __name__ == "__main__":
    asyncio.run(seed())
