"""
Roadmap Generator Node

Owned state fields (read):
    skill_name, skill_level, skill_score, personality_profile,
    user_roadmap_feedback, regeneration_count, roadmap_version,
    session_id, feature_flags, task_type

Owned state fields (write):
    roadmap, roadmap_version, error_message, error_node, next_action
"""

import json
import logging
import re
from src.models.roadmap import Roadmap, Level, Resource
from src.services.model_router import get_model
from src.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


PROMPT_TEMPLATE = """You are an expert curriculum designer.

Build a personalised learning roadmap for the skill: {skill_name}

User's current skill level: {skill_level}
User's assessment score: {skill_score:.2f} (0.0 = total beginner, 1.0 = expert)

{personality_section}

{feedback_section}

Requirements:
- Produce exactly 3 levels progressing logically from {skill_level} upward.
- Each level MUST contain between 3 and 4 distinct resources (mix of documentation, article, video, exercise, and project).
- Keep descriptions clear and concise (1-2 sentences). Do NOT use nested unescaped quotes.

Return ONLY a valid JSON object matching the required schema."""


# ---------------------------------------------------------------------------
# Curated multi-resource roadmaps (3-4 rich resources per level)
# ---------------------------------------------------------------------------
CURATED_ROADMAPS: dict[str, dict] = {
    "data analysis": {
        "total_levels": 3,
        "levels": [
            {
                "index": 0,
                "title": "Data Wrangling & Core Manipulation with Pandas",
                "description": "Master dataset structures, indexing, filtering, handling missing values, and aggregation in Python.",
                "locked": False,
                "resources": [
                    {
                        "title": "Pandas 10-Minute Walkthrough & Core API",
                        "type": "documentation",
                        "url": "https://pandas.pydata.org/docs/user_guide/10min.html",
                        "description": "Essential Series and DataFrame structures, slicing, Boolean indexing, and operations.",
                    },
                    {
                        "title": "Data Cleaning & Handling Missing Values Guide",
                        "type": "article",
                        "url": "https://realpython.com/python-data-cleaning-numpy-pandas/",
                        "description": "Practical patterns to detect NaNs, duplicates, string normalization, and type casting.",
                    },
                    {
                        "title": "Interactive Pandas Data Wrangling Exercises",
                        "type": "exercise",
                        "url": "https://www.kaggle.com/learn/pandas",
                        "description": "Hands-on browser-based exercises for indexing, grouping, sorting, and data reshaping.",
                    },
                    {
                        "title": "Real-World Exploratory Data Analysis Project",
                        "type": "project",
                        "url": "https://github.com/awesomedata/awesome-public-datasets",
                        "description": "Clean, reshape, and profile an end-to-end dataset with statistical summaries.",
                    },
                ],
            },
            {
                "index": 1,
                "title": "Exploratory Visual Analysis & Statistical Insight",
                "description": "Deep-dive into distributions, correlation matrices, multi-variable visualization, and SQL queries.",
                "locked": True,
                "resources": [
                    {
                        "title": "Seaborn & Matplotlib Visual Grammar Guide",
                        "type": "documentation",
                        "url": "https://seaborn.pydata.org/tutorial.html",
                        "description": "Scatterplots, histograms, KDE, boxplots, and heatmaps for variable relationship analysis.",
                    },
                    {
                        "title": "Statistical Thinking & Correlation Analysis",
                        "type": "article",
                        "url": "https://towardsdatascience.com/statistical-thinking-for-data-analysis-9b5edbcfe8b8",
                        "description": "Interpreting Pearson/Spearman coefficients, standard deviations, and skewness.",
                    },
                    {
                        "title": "Interactive SQL & Aggregations Lab",
                        "type": "exercise",
                        "url": "https://sqlzoo.net/",
                        "description": "Master GROUP BY, HAVING, subqueries, and window functions on tabular databases.",
                    },
                    {
                        "title": "Interactive Dashboard Mini-Project",
                        "type": "project",
                        "url": "https://plotly.com/python/",
                        "description": "Construct dynamic interactive charts and KPIs using Plotly and Streamlit.",
                    },
                ],
            },
            {
                "index": 2,
                "title": "Advanced Analytics, Pipelines & Machine Learning Readiness",
                "description": "Feature engineering, scaling, scikit-learn preprocessing pipelines, and automated reporting.",
                "locked": True,
                "resources": [
                    {
                        "title": "Scikit-Learn Preprocessing & Pipeline Documentation",
                        "type": "documentation",
                        "url": "https://scikit-learn.org/stable/modules/compose.html",
                        "description": "One-hot encoding, standard scalers, ColumnTransformer, and pipeline chaining.",
                    },
                    {
                        "title": "Feature Engineering Strategies for Predictive Analytics",
                        "type": "article",
                        "url": "https://machinelearningmastery.com/discover-feature-engineering-how-to-engineer-features-and-how-to-get-good-at-it/",
                        "description": "Creating date components, interaction features, polynomial transformations, and binned values.",
                    },
                    {
                        "title": "Time-Series & Trend Forecasting Workshop",
                        "type": "exercise",
                        "url": "https://www.kaggle.com/learn/time-series",
                        "description": "Moving averages, seasonal decomposition, and autoregressive models.",
                    },
                    {
                        "title": "Production Data Analysis Portfolio Capstone",
                        "type": "project",
                        "url": "https://github.com/topics/data-analysis-project",
                        "description": "End-to-end analytical pipeline from raw ingestion to automated executive insights.",
                    },
                ],
            },
        ],
    },
    "python": {
        "total_levels": 3,
        "levels": [
            {
                "index": 0,
                "title": "Python Core Architecture & Idiomatic Syntax",
                "description": "Foundational data structures, control flow, functions, scope, and clean environment setup.",
                "locked": False,
                "resources": [
                    {
                        "title": "Python Official Tutorial & Core Language Reference",
                        "type": "documentation",
                        "url": "https://docs.python.org/3/tutorial/",
                        "description": "Official guide to Python syntax, control structures, and standard library basics.",
                    },
                    {
                        "title": "Python Data Structures: Lists, Tuples, Dicts & Sets",
                        "type": "article",
                        "url": "https://realpython.com/python-data-structures/",
                        "description": "Deep-dive into mutability, performance complexity, and lookup patterns.",
                    },
                    {
                        "title": "Interactive Python Practice Drills",
                        "type": "exercise",
                        "url": "https://www.practicepython.org/",
                        "description": "Short beginner exercises to drill loops, functions, and string formatting.",
                    },
                    {
                        "title": "Modular CLI Utility Project",
                        "type": "project",
                        "url": "https://realpython.com/command-line-interfaces-python-argparse/",
                        "description": "Build a command-line tool with argparse, file I/O, and custom error handling.",
                    },
                ],
            },
            {
                "index": 1,
                "title": "Object-Oriented Programming, Generators & Modern Patterns",
                "description": "Classes, dunder methods, inheritance, generators, decorators, and context managers.",
                "locked": True,
                "resources": [
                    {
                        "title": "Python Data Model & Special Methods Documentation",
                        "type": "documentation",
                        "url": "https://docs.python.org/3/reference/datamodel.html",
                        "description": "Master __init__, __str__, __repr__, and operator overloading mechanics.",
                    },
                    {
                        "title": "Python Generators and Yield Statements Explained",
                        "type": "article",
                        "url": "https://realpython.com/introduction-to-python-generators/",
                        "description": "Memory-efficient data pipelines using generator expressions and yield.",
                    },
                    {
                        "title": "Unit Testing with Pytest Interactive Lab",
                        "type": "exercise",
                        "url": "https://docs.pytest.org/en/stable/getting-started.html",
                        "description": "Write fixtures, parameterised tests, and assertions for clean code verification.",
                    },
                    {
                        "title": "Object-Oriented Banking or Inventory Simulator",
                        "type": "project",
                        "url": "https://github.com/topics/python-oop-project",
                        "description": "Design an extensible domain model with encapsulation and polymorphism.",
                    },
                ],
            },
            {
                "index": 2,
                "title": "Production Python: Concurrency, Architecture & Performance",
                "description": "Asyncio event loops, multiprocessing, profiling, FastAPI microservices, and packaging.",
                "locked": True,
                "resources": [
                    {
                        "title": "Asyncio Concurrent Programming in Python",
                        "type": "documentation",
                        "url": "https://docs.python.org/3/library/asyncio.html",
                        "description": "Coroutines, event loops, tasks, and asynchronous I/O execution.",
                    },
                    {
                        "title": "High-Performance Python: Profiling & Memory Optimization",
                        "type": "article",
                        "url": "https://realpython.com/python-profiling/",
                        "description": "cProfile, memory_profiler, and identifying algorithmic bottlenecks.",
                    },
                    {
                        "title": "Asynchronous REST API Workshop with FastAPI",
                        "type": "exercise",
                        "url": "https://fastapi.tiangolo.com/tutorial/",
                        "description": "Build typed async endpoints, dependency injection, and Pydantic validation.",
                    },
                    {
                        "title": "Full-Stack Microservice Capstone with Docker",
                        "type": "project",
                        "url": "https://github.com/tiangolo/full-stack-fastapi-template",
                        "description": "Containerized production backend with PostgreSQL, migrations, and health checks.",
                    },
                ],
            },
        ],
    },
    "javascript": {
        "total_levels": 3,
        "levels": [
            {
                "index": 0,
                "title": "Modern JavaScript (ES6+) & DOM Engineering",
                "description": "Scope, closures, arrow functions, destructuring, promises, and interactive DOM manipulation.",
                "locked": False,
                "resources": [
                    {
                        "title": "MDN Web Docs: JavaScript Fundamentals",
                        "type": "documentation",
                        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
                        "description": "The definitive reference for JavaScript syntax, scopes, and browser APIs.",
                    },
                    {
                        "title": "JavaScript Event Loop and Microtask Queue",
                        "type": "article",
                        "url": "https://javascript.info/event-loop",
                        "description": "Understanding asynchronous callbacks, promises, and the call stack.",
                    },
                    {
                        "title": "Interactive Modern JavaScript Drills",
                        "type": "exercise",
                        "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
                        "description": "Hands-on algorithm and array methods drills in the browser.",
                    },
                    {
                        "title": "Interactive Task Board Project",
                        "type": "project",
                        "url": "https://github.com/topics/javascript-project",
                        "description": "Build a responsive Kanban board with drag-and-drop and local storage persistence.",
                    },
                ],
            },
            {
                "index": 1,
                "title": "Component Architecture & State Management with React",
                "description": "Component lifecycles, hooks (useState, useEffect, useMemo), props, and API integration.",
                "locked": True,
                "resources": [
                    {
                        "title": "React.dev: Quick Start & Interactive Tutorials",
                        "type": "documentation",
                        "url": "https://react.dev/learn",
                        "description": "Official modern guide to thinking in components, state, and rendering.",
                    },
                    {
                        "title": "Mastering React Hooks & Performance Pitfalls",
                        "type": "article",
                        "url": "https://kentcdodds.com/blog/usememo-and-usecallback",
                        "description": "When and how to optimize re-renders without premature over-engineering.",
                    },
                    {
                        "title": "TypeScript with React Interactive Lab",
                        "type": "exercise",
                        "url": "https://www.typescriptlang.org/docs/handbook/react.html",
                        "description": "Typing props, event handlers, and custom hooks safely.",
                    },
                    {
                        "title": "E-Commerce Filter & Cart Application",
                        "type": "project",
                        "url": "https://github.com/topics/react-project",
                        "description": "Real-time faceted search, cart state persistence, and responsive UI.",
                    },
                ],
            },
            {
                "index": 2,
                "title": "Full-Stack Web Engineering: Next.js & Production Systems",
                "description": "Server components, server actions, caching strategies, auth, and database integration.",
                "locked": True,
                "resources": [
                    {
                        "title": "Next.js App Router Architecture Guide",
                        "type": "documentation",
                        "url": "https://nextjs.org/docs/app",
                        "description": "Server vs Client Components, routing, layouts, and streaming UI.",
                    },
                    {
                        "title": "Web Performance & Core Web Vitals Optimization",
                        "type": "article",
                        "url": "https://web.dev/vitals/",
                        "description": "LCP, FID/INP, and CLS tuning for sub-second page loads.",
                    },
                    {
                        "title": "Server Actions & Database Mutations Lab",
                        "type": "exercise",
                        "url": "https://nextjs.org/learn",
                        "description": "Build end-to-end forms, validation with Zod, and database updates.",
                    },
                    {
                        "title": "Production SaaS Platform Capstone",
                        "type": "project",
                        "url": "https://github.com/vercel/nextjs-subscription-payments",
                        "description": "Full-stack application with authentication, database models, and deployment.",
                    },
                ],
            },
        ],
    },
}


def _get_curated_fallback(skill_name: str, skill_level: str) -> dict:
    """Return a rich 3-level fallback tailored to the skill, with at least 3-4 resources per level."""
    s_clean = skill_name.lower().strip()
    match = None
    for key, curated in CURATED_ROADMAPS.items():
        if key in s_clean or s_clean in key:
            match = curated
            break

    if not match:
        # High quality generic fallback
        match = {
            "total_levels": 3,
            "levels": [
                {
                    "index": 0,
                    "title": f"{skill_name} Foundations & Core Architecture",
                    "description": f"Master core concepts, fundamentals, and environment setup for {skill_name}.",
                    "locked": False,
                    "resources": [
                        {"title": f"Official {skill_name} Documentation", "type": "documentation", "url": "https://docs.python.org", "description": f"Comprehensive language and framework specification for {skill_name}."},
                        {"title": f"{skill_name} Best Practices & Design Patterns", "type": "article", "url": "https://medium.com", "description": "Idiomatic patterns and foundational conventions."},
                        {"title": f"Hands-on {skill_name} Practice Lab", "type": "exercise", "url": "https://exercism.org", "description": "Interactive exercises covering core mechanics."},
                        {"title": f"Introductory {skill_name} Utility Project", "type": "project", "url": "https://github.com", "description": f"Build a practical utility project applying {skill_name} fundamentals."},
                    ],
                },
                {
                    "index": 1,
                    "title": f"Applied {skill_name} & Intermediate Engineering",
                    "description": f"Hands-on implementation, intermediate workflows, and architecture in {skill_name}.",
                    "locked": True,
                    "resources": [
                        {"title": f"{skill_name} Intermediate Architecture Guide", "type": "article", "url": "https://medium.com", "description": "Structuring complex workflows and multi-module systems."},
                        {"title": "Testing, Tooling & Debugging Patterns", "type": "documentation", "url": "https://docs.pytest.org", "description": "Automated testing, linters, and quality assurance."},
                        {"title": "Real-World Workflow Exercises", "type": "exercise", "url": "https://leetcode.com", "description": "Problem-solving and algorithmic implementation."},
                        {"title": f"End-to-End {skill_name} Implementation Project", "type": "project", "url": "https://github.com", "description": "Complete functional project solving a realistic engineering problem."},
                    ],
                },
                {
                    "index": 2,
                    "title": f"Advanced {skill_name} & Production Systems",
                    "description": f"Expert optimization, scaling, performance, security, and best practices in {skill_name}.",
                    "locked": True,
                    "resources": [
                        {"title": f"High-Performance {skill_name} Optimization", "type": "article", "url": "https://medium.com", "description": "Deep dive into profiling, bottlenecks, and latency minimization."},
                        {"title": "Production Deployment & Monitoring Guide", "type": "documentation", "url": "https://kubernetes.io", "description": "Containerization, telemetry, and distributed architectures."},
                        {"title": "Architecture Design & Benchmark Suite", "type": "exercise", "url": "https://github.com", "description": "Load-testing and system resilience exercises."},
                        {"title": "Production-Grade Capstone Deployment", "type": "project", "url": "https://github.com", "description": "Enterprise-ready solution with CI/CD, documentation, and monitoring."},
                    ],
                },
            ],
        }

    return {
        "skill_name": skill_name,
        "skill_level": skill_level,
        "total_levels": match["total_levels"],
        "levels": match["levels"],
    }


def _clean_and_parse_roadmap_json(raw_text: str, skill_name: str, skill_level: str) -> Roadmap | None:
    """Robust extractor and sanitizer for JSON roadmap data from LLM output."""
    if not raw_text:
        return None

    # 1. Strip think / thought tags from reasoning models
    content = re.sub(r'<think(?:ing)?>.*?</think(?:ing)?>', '', raw_text, flags=re.DOTALL)
    content = content.strip()

    # 2. Extract JSON between first '{' and last '}'
    start_idx = content.find("{")
    end_idx = content.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        content = content[start_idx : end_idx + 1]

    # 3. Clean trailing commas: ,\s*([}\]]) -> \1
    content_clean = re.sub(r',\s*([}\]])', r'\1', content)

    # 4. Attempt parsing cleaned JSON
    try:
        parsed = json.loads(content_clean)
        # Ensure levels have at least 1 resource each
        if "levels" in parsed and isinstance(parsed["levels"], list):
            for lvl in parsed["levels"]:
                if not lvl.get("resources"):
                    lvl["resources"] = [
                        {"title": f"{skill_name} Core Guide", "type": "documentation", "url": "https://docs.python.org", "description": "Core reference material."}
                    ]
        return Roadmap.model_validate(parsed)
    except Exception as err_clean:
        # Fallback attempt on original substring
        try:
            parsed = json.loads(content)
            return Roadmap.model_validate(parsed)
        except Exception as err_orig:
            logger.warning("Roadmap JSON parsing failed (%s / %s)", err_clean, err_orig)
            return None


def _build_personality_section(personality_profile: dict | None) -> str:
    if not personality_profile:
        return "Personality profile: not provided. Use a balanced, general-purpose teaching style."

    return (
        "User's learning style preferences (use these to shape resource types, "
        f"pacing, and explanation style):\n{personality_profile}"
    )


def _build_feedback_section(user_roadmap_feedback: str | None) -> str:
    if not user_roadmap_feedback:
        return ""

    return (
        "IMPORTANT — The user has reviewed a previous version of this roadmap "
        "and provided the following correction. You MUST incorporate this "
        "feedback into the new roadmap:\n"
        f'"{user_roadmap_feedback}"'
    )


async def roadmap_generator_node(state: dict) -> dict:
    """
    Generates (or regenerates) a personalised Roadmap using LLM router
    with structured output and resilient parsing.
    """
    try:
        # --- Regeneration guard ---
        regeneration_count = state.get("regeneration_count", 0)
        user_roadmap_feedback = state.get("user_roadmap_feedback")

        if user_roadmap_feedback is not None and regeneration_count >= 2:
            return {
                **state,
                "error_message": "Regeneration limit reached (max 2). Returning existing roadmap.",
                "error_node": "roadmap_generator",
                "next_action": "roadmap_ready",
            }

        # --- Build prompt ---
        personality_section = _build_personality_section(
            state.get("personality_profile")
        )
        feedback_section = _build_feedback_section(user_roadmap_feedback)

        prompt = PROMPT_TEMPLATE.format(
            skill_name=state["skill_name"],
            skill_level=state["skill_level"],
            skill_score=state.get("skill_score", 0.0),
            personality_section=personality_section,
            feedback_section=feedback_section,
        )

        llm = get_model("roadmap_generation")
        roadmap: Roadmap | None = None

        # 1. First attempt: with_structured_output (supported on Gemini/OpenAI)
        try:
            structured_llm = llm.with_structured_output(Roadmap)
            roadmap = await structured_llm.ainvoke(prompt)
        except Exception as err:
            if "guided_json" in str(err).lower() or "400" in str(err) or "not supported" in str(err).lower():
                logger.info("Structured output fallback triggered: %s", err)
                # 2. Fallback to direct JSON prompting
                json_prompt = (
                    f"{prompt}\n\n"
                    "Respond ONLY with a single valid JSON object matching this schema:\n"
                    "{\n"
                    f'  "skill_name": "{state["skill_name"]}",\n'
                    f'  "skill_level": "{state["skill_level"]}",\n'
                    '  "total_levels": 3,\n'
                    '  "levels": [\n'
                    '    {\n'
                    '      "index": 0,\n'
                    '      "title": "Level Title",\n'
                    '      "description": "Level description",\n'
                    '      "locked": false,\n'
                    '      "resources": [\n'
                    '        {"title": "Resource Name", "type": "documentation", "url": "https://...", "description": "Short description"},\n'
                    '        {"title": "Resource Name 2", "type": "article", "url": "https://...", "description": "Short description"},\n'
                    '        {"title": "Resource Name 3", "type": "exercise", "url": "https://...", "description": "Short description"},\n'
                    '        {"title": "Resource Name 4", "type": "project", "url": "https://...", "description": "Short description"}\n'
                    '      ]\n'
                    '    }\n'
                    '  ]\n'
                    "}\n"
                    "No markdown formatting, no backticks, no explanations. Valid JSON only."
                )
                try:
                    raw = await llm.ainvoke(json_prompt)
                    content = (raw.content or "").strip()
                    if not content and hasattr(raw, "additional_kwargs"):
                        content = (raw.additional_kwargs.get("reasoning_content") or "").strip()

                    roadmap = _clean_and_parse_roadmap_json(
                        content, state["skill_name"], state["skill_level"]
                    )
                except Exception as direct_err:
                    logger.warning("Direct LLM call failed: %s", direct_err)
                    roadmap = None
            else:
                raise

        if roadmap is None:
            # High-fidelity curated fallback (3-4 resources per level, domain tailored)
            logger.info("Using curated multi-resource fallback roadmap for %s", state["skill_name"])
            roadmap_dict = _get_curated_fallback(state["skill_name"], state["skill_level"])
        else:
            roadmap_dict = roadmap.model_dump()

        # Ensure all levels have index, title, description, resources
        for i, lvl in enumerate(roadmap_dict.get("levels", [])):
            lvl["index"] = i
            lvl["locked"] = False if i == 0 else True
            if not lvl.get("resources"):
                lvl["resources"] = [
                    {"title": f"{state['skill_name']} Resource", "type": "documentation", "url": "https://docs.python.org", "description": "Official reference guide."}
                ]

        # --- Versioning ---
        new_version = state.get("roadmap_version", 0) + 1
        new_regeneration_count = (
            regeneration_count + 1 if user_roadmap_feedback is not None else regeneration_count
        )

        # --- Persist to Supabase ---
        supabase = get_supabase_client()
        supabase.table("roadmaps").insert({
            "session_id": state["session_id"],
            "user_id": state["user_id"],
            "roadmap_data": roadmap_dict,
            "roadmap_version": new_version,
            "current_level_index": 0,
            "locked": state.get("roadmap_locked", False),
        }).execute()

        return {
            **state,
            "roadmap": roadmap_dict,
            "roadmap_version": new_version,
            "regeneration_count": new_regeneration_count,
            "user_roadmap_feedback": None,  # consumed
            "error_message": None,
            "error_node": None,
            "next_action": "roadmap_ready",
        }

    except Exception as exc:
        logger.exception("Unexpected error in roadmap_generator_node")
        return {
            **state,
            "error_message": str(exc),
            "error_node": "roadmap_generator",
            "next_action": "error",
        }

    except Exception as exc:
        return {
            **state,
            "error_message": str(exc),
            "error_node": "roadmap_generator",
            "next_action": "error",
        }
