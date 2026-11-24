"""
POST /level/{level_id}/submit — gate test submission endpoint.

Accepts the user's answers, injects them into state as `_gate_answers`,
invokes the LevelGateNode, persists the test_history record to Supabase,
and returns the score + routing decision.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from src.graph.nodes.gamification import gamification_node
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.graph.nodes.level_gate import level_gate_node
from src.graph.state import NexusState
from src.services.supabase_client import get_supabase_client
from src.services.model_router import get_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/level", tags=["level"])


# ── Request / Response models ─────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: str
    selected_option: str
    correct: bool
    concept_tag: str = ""          # used by gap analysis downstream


class GateTestSubmission(BaseModel):
    session_id: str
    roadmap_id: str
    answers: list[AnswerItem] = Field(min_length=1)


class GateTestResult(BaseModel):
    score: float
    passed: bool
    next_action: str
    fail_count: int
    attempt_number: int
    roadmap_locked: bool
    point_earned: int=0
    
    


# ── Route ─────────────────────────────────────────────────────────────────────

SKILL_GATE_QUESTIONS: dict[str, list[dict]] = {
    "data analysis": [
        {
            "id": "q1",
            "text": "Which Pandas method is used to identify duplicate records in a DataFrame?",
            "options": ["df.duplicated()", "df.drop_duplicates()", "df.unique()", "df.isin()"],
            "correct_index": 0,
            "concept_tag": "data_cleaning",
        },
        {
            "id": "q2",
            "text": "In exploratory data analysis, which visual chart best shows the distribution and skewness of a numerical variable?",
            "options": ["Histogram with KDE", "Pie Chart", "Network Graph", "Treemap"],
            "correct_index": 0,
            "concept_tag": "distribution_analysis",
        },
        {
            "id": "q3",
            "text": "What does a correlation coefficient of -0.85 between two variables indicate?",
            "options": [
                "A strong inverse relationship where one variable increases as the other decreases",
                "A weak relationship with negligible association",
                "A positive linear trend",
                "An 85% causal probability",
            ],
            "correct_index": 0,
            "concept_tag": "correlation_analysis",
        },
        {
            "id": "q4",
            "text": "Why is handling missing values (imputation or removal) critical before predictive modeling?",
            "options": [
                "Most algorithmic estimators will fail or produce biased parameters with NaNs",
                "It guarantees 100% training accuracy",
                "It doubles the number of rows in the dataset",
                "Missing values automatically delete dataset columns",
            ],
            "correct_index": 0,
            "concept_tag": "preprocessing",
        },
    ],
    "python": [
        {
            "id": "q1",
            "text": "In Python, what is the primary role of the `__init__` method in a class?",
            "options": [
                "Initialises the attributes of a newly created object instance",
                "Destroys an object when it goes out of scope",
                "Imports external libraries",
                "Defines static class-level constants",
            ],
            "correct_index": 0,
            "concept_tag": "oop_basics",
        },
        {
            "id": "q2",
            "text": "Which of the following data structures in Python is mutable?",
            "options": ["list", "tuple", "str", "frozenset"],
            "correct_index": 0,
            "concept_tag": "data_types",
        },
        {
            "id": "q3",
            "text": "What does `*args` allow a Python function to receive?",
            "options": [
                "An arbitrary number of positional arguments as a tuple",
                "A dictionary of keyword arguments",
                "Only immutable objects",
                "A fixed sequence of integers",
            ],
            "correct_index": 0,
            "concept_tag": "functions",
        },
        {
            "id": "q4",
            "text": "What does a generator function in Python return when it encounters a `yield` statement?",
            "options": [
                "It pauses execution and yields a value to the caller, resuming on next()",
                "It terminates the function permanently like return",
                "It raises an asynchronous StopIteration exception",
                "It saves the variable to disk storage",
            ],
            "correct_index": 0,
            "concept_tag": "generators",
        },
    ],
    "javascript": [
        {
            "id": "q1",
            "text": "What is the primary difference between `let` and `var` in modern JavaScript?",
            "options": [
                "`let` is block-scoped, while `var` is function-scoped and hoisted",
                "`let` cannot be reassigned once declared",
                "`var` is only available in Node.js environments",
                "`let` variables are global by default",
            ],
            "correct_index": 0,
            "concept_tag": "scope",
        },
        {
            "id": "q2",
            "text": "Which method creates a new array populated with the results of calling a provided function on every element?",
            "options": ["Array.prototype.map()", "Array.prototype.forEach()", "Array.prototype.filter()", "Array.prototype.reduce()"],
            "correct_index": 0,
            "concept_tag": "functional_methods",
        },
        {
            "id": "q3",
            "text": "What does the JavaScript Event Loop do when executing asynchronous code?",
            "options": [
                "Monitors the Call Stack and Task Queue, pushing queued callbacks when the stack is empty",
                "Runs code on multiple CPU threads simultaneously",
                "Compiles JavaScript directly to native assembly",
                "Blocks user input until network requests complete",
            ],
            "correct_index": 0,
            "concept_tag": "event_loop",
        },
        {
            "id": "q4",
            "text": "What is the return value of an `async` function in JavaScript?",
            "options": [
                "Always a Promise resolving with the return value",
                "The raw evaluated value synchronously",
                "A Generator object",
                "An Observable stream",
            ],
            "correct_index": 0,
            "concept_tag": "async_await",
        },
    ],
}


@router.get("/{level_id}/questions")
async def get_level_questions(
    level_id: str,
    skill_name: str = "Data Analysis",
    level_title: str = "Foundations",
):
    """
    Returns 4 gate test questions tailored specifically to the skill and level.
    Attempts live LLM generation first via NVIDIA NIM; falls back cleanly to
    skill-tailored question banks.
    """
    clean_skill = skill_name.lower().strip()

    try:
        llm = get_model("quiz_generation")
        prompt = (
            f"Generate exactly 4 multiple-choice assessment questions to test a learner's "
            f"mastery of {skill_name} specifically for: {level_title}.\n"
            f"Respond ONLY with a JSON array of 4 objects. Each object must have:\n"
            f'{{"id": "q1", "text": "...", "options": ["Option A", "Option B", "Option C", "Option D"], '
            f'"correct_index": 0, "concept_tag": "..."}}\n'
            f"correct_index must be an integer between 0 and 3.\n"
            f"Make questions directly relevant to {skill_name}. Pure JSON only, no markdown."
        )
        raw = await llm.ainvoke(prompt)
        content = (raw.content or "").strip()
        if not content and hasattr(raw, "additional_kwargs"):
            content = (raw.additional_kwargs.get("reasoning_content") or "").strip()

        start_idx = content.find("[")
        end_idx = content.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            questions = json.loads(content[start_idx : end_idx + 1])
            if isinstance(questions, list) and len(questions) >= 3:
                return {"questions": questions[:4]}
    except Exception as e:
        logger.warning("Dynamic question generation failed (%s), using curated fallback", e)

    # Curated skill fallback
    for key, questions in SKILL_GATE_QUESTIONS.items():
        if key in clean_skill:
            return {"questions": questions}

    # Generic tech skill fallback
    return {
        "questions": [
            {
                "id": "q1",
                "text": f"What is the foundational principle when implementing {skill_name}?",
                "options": [
                    "Understanding core syntax, data flow, and standard conventions",
                    "Skipping architecture planning to write ad-hoc scripts",
                    "Avoiding version control and documentation",
                    "Using only deprecated legacy APIs",
                ],
                "correct_index": 0,
                "concept_tag": "foundations",
            },
            {
                "id": "q2",
                "text": f"In {skill_name}, how should unexpected errors and edge cases be handled?",
                "options": [
                    "With structured exception handling, input validation, and informative logging",
                    "By suppressing all errors silently",
                    "By terminating the process immediately without cleanup",
                    "By ignoring user input validation",
                ],
                "correct_index": 0,
                "concept_tag": "error_handling",
            },
            {
                "id": "q3",
                "text": f"What is a recommended best practice for modularizing code in {skill_name}?",
                "options": [
                    "Separating concerns into cohesive, reusable functions or components",
                    "Writing all logic into a single monolithic file",
                    "Duplicating code across multiple modules",
                    "Hardcoding configuration values directly in functions",
                ],
                "correct_index": 0,
                "concept_tag": "modular_design",
            },
            {
                "id": "q4",
                "text": f"When preparing {skill_name} projects for production, what is essential?",
                "options": [
                    "Automated testing, profiling, and environment configuration management",
                    "Removing all tests before deployment",
                    "Disabling security checks and logging",
                    "Deploying untested code directly to main",
                ],
                "correct_index": 0,
                "concept_tag": "production_readiness",
            },
        ]
    }


@router.post("/{level_id}/submit", response_model=GateTestResult)
async def submit_gate_test(level_id: str, body: GateTestSubmission) -> GateTestResult:
    supabase = get_supabase_client()

    # ── Fetch current session state from Supabase ─────────────────────────────
    session_row = (
        supabase.table("skill_sessions")
        .select("*")
        .eq("id", body.session_id)
        .maybe_single()
        .execute()
    )
    if not session_row or not session_row.data:
        raise HTTPException(status_code=404, detail="Session not found")

    roadmap_row = (
        supabase.table("roadmaps")
        .select("*")
        .eq("id", body.roadmap_id)
        .maybe_single()
        .execute()
    )
    if not roadmap_row or not roadmap_row.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    # ── Reconstruct minimal NexusState for the node ───────────────────────────
    test_history_rows = (
        supabase.table("test_history")
        .select("*")
        .eq("roadmap_id", body.roadmap_id)
        .execute()
    )

    existing_history: list[dict[str, Any]] = [
        {
            "level_index": row["level_index"],
            "score": row["score"],
            "passed": row["passed"],
            "attempt_number": row["attempt_number"],
            "answers": row["answers"] or [],
        }
        for row in (test_history_rows.data or [])
    ]

    state: NexusState = {
        # Identity
        "user_id": session_row.data["user_id"],
        "session_id": body.session_id,
        # Skill
        "skill_name": session_row.data["skill_name"],
        "skill_score": session_row.data.get("skill_score") or 0.0,
        "skill_level": session_row.data.get("skill_level") or "beginner",
        # Personality
        "personality_profile": session_row.data.get("personality_profile"),
        "quiz_skipped": session_row.data.get("quiz_skipped", False),
        # Roadmap
        "roadmap": roadmap_row.data.get("roadmap_data"),
        "roadmap_version": roadmap_row.data.get("roadmap_version", 1),
        "current_level_index": roadmap_row.data.get("current_level_index", 0),
        "roadmap_locked": roadmap_row.data.get("locked", False),
        "user_roadmap_feedback": None,
        "regeneration_count": 0,
        # Gate test
        "test_history": existing_history,
        "fail_count": 0,  # will be recalculated by node
        "sublevel_reject_count": 0,
        "_gate_answers": [a.model_dump() for a in body.answers],
        # Gamification
        "points": 0,
        "badges": [],
        "streak_days": 0,
        # Routing
        "next_action": "",
        "task_type": "level_gate",
        "error_message": None,
        "error_node": None,
        # Config
        "feature_flags": {"level_gate_enabled": True},
        "skip_assessment": False,
    }

    # Derive current fail_count from existing history for this level
    current_level = state["current_level_index"]
    state["fail_count"] = sum(
        1 for h in existing_history
        if h["level_index"] == current_level and not h["passed"]
    )

    # ── Run node ──────────────────────────────────────────────────────────────
    updated_state = level_gate_node(state)

    if updated_state.get("next_action") == "handle_error":
        raise HTTPException(
            status_code=500,
            detail=updated_state.get("error_message", "Gate node failed"),
        )

    # ── Persist new test_history record to Supabase ───────────────────────────
    latest_record = updated_state["test_history"][-1]

    supabase.table("test_history").insert({
        "roadmap_id": body.roadmap_id,
        "user_id": session_row.data["user_id"],
        "level_index": latest_record["level_index"],
        "score": latest_record["score"],
        "passed": latest_record["passed"],
        "attempt_number": latest_record["attempt_number"],
        "answers": latest_record["answers"],
    }).execute()

    # ── Lock roadmap in DB if newly locked ────────────────────────────────────
    if updated_state["roadmap_locked"] and not roadmap_row.data.get("locked", False):
        supabase.table("roadmaps").update({"locked": True}).eq("id", body.roadmap_id).execute()

    points_earned = 0

    # ── Unlock next level if passed, award real points ────────────────────────
    if updated_state["next_action"] == "unlock_next_level":
        next_level_index = current_level + 1
        supabase.table("roadmaps").update(
            {"current_level_index": next_level_index}
        ).eq("id", body.roadmap_id).execute()

        total_levels = len((state.get("roadmap") or {}).get("levels", []))
        roadmap_now_complete = total_levels > 0 and next_level_index >= total_levels

        # First call deliberately OMITS points/badges/streak_days keys so
        # gamification_node falls back to its own Supabase load instead of
        # treating an absent value as a real 0 and skipping the lookup.
        gam_base_state = {
            "user_id": session_row.data["user_id"],
            "roadmap": state["roadmap"],
            "skill_level": state["skill_level"],
            "current_level_index": next_level_index,
            "test_history": updated_state["test_history"],
            "feature_flags": {"gamification_enabled": True},
        }

        running_state = await gamification_node({**gam_base_state, "task_type": "level_complete"})
        points_earned += 50

        if latest_record["attempt_number"] == 1:
            # Chained from running_state on purpose — it now carries the
            # real post-award point total, so this call compounds correctly
            # instead of re-reading a stale pre-award db value.
            running_state = await gamification_node({**running_state, "task_type": "first_attempt_pass"})
            points_earned += 25

        if roadmap_now_complete:
            running_state = await gamification_node({**running_state, "task_type": "roadmap_complete"})
            points_earned += 200

    return GateTestResult(
        score=latest_record["score"],
        passed=latest_record["passed"],
        next_action=updated_state["next_action"],
        fail_count=updated_state["fail_count"],
        attempt_number=latest_record["attempt_number"],
        roadmap_locked=updated_state["roadmap_locked"],
        points_earned=points_earned,
    )


# ── Sublevel Lesson Models & Endpoint ─────────────────────────────────────────

class SubLevelLesson(BaseModel):
    id: str
    title: str
    concept_tag: str
    estimated_time: str
    overview: str
    key_takeaways: list[str]
    code_snippet: str = ""
    action_exercise: str
    resource_url: str = ""
    resource_title: str = ""


class SubLevelResponse(BaseModel):
    level_id: str
    level_title: str
    skill_name: str
    target_gaps: list[str]
    summary: str
    estimated_time: str
    lessons: list[SubLevelLesson]


CURATED_SUBLEVELS: dict[str, dict] = {
    "data analysis": {
        "target_gaps": ["data_cleaning", "distribution_analysis", "correlation_analysis"],
        "summary": "Targeted remediation focusing on Pandas manipulation, handling missing data, and statistical distributions.",
        "estimated_time": "15–20 min",
        "lessons": [
            {
                "id": "da-l1",
                "title": "Mastering Pandas Boolean Indexing & Filter Logic",
                "concept_tag": "data_filtering",
                "estimated_time": "5 min",
                "overview": "Vectorized filtering is fundamental in Pandas. Instead of Python loops, apply vectorized Boolean masks using bitwise operators (`&`, `|`, `~`). Each individual condition must be enclosed in parentheses to prevent operator precedence bugs.",
                "key_takeaways": [
                    "Always enclose multiple conditions in parentheses: (df['colA'] > 0) & (df['colB'] < 10)",
                    "Use bitwise operators & (AND) and | (OR) because logical 'and'/'or' evaluate the entire truth value of Series",
                    "Use .isin([...]) for multiple value matching rather than multiple OR conditions"
                ],
                "code_snippet": "# Correct vectorized filtering\nsubset = df[(df['age'] >= 21) & (df['status'].isin(['active', 'pending']))]\n# Efficient column selection with .loc\nclean_rows = df.loc[df['score'] > 80, ['user_id', 'score', 'region']]",
                "action_exercise": "Write a 1-liner to select all rows where 'sales' exceeds the 75th percentile and 'returns' equals 0.",
                "resource_url": "https://pandas.pydata.org/docs/user_guide/indexing.html",
                "resource_title": "Official Pandas Indexing & Selecting Data",
            },
            {
                "id": "da-l2",
                "title": "Systematic Detection & Imputation of Missing Values",
                "concept_tag": "data_cleaning",
                "estimated_time": "6 min",
                "overview": "Missing values (NaN, None, sentinel numbers like -999) lead to silent estimation errors and algorithmic failure. Clean data pipelines require quantifying missingness, deciding between imputation and dropping, and avoiding data leakage.",
                "key_takeaways": [
                    "Inspect missingness with df.isna().mean() to get percentage missing per column",
                    "Never drop rows indiscriminately if missingness exceeds 5% — evaluate MAR (Missing At Random)",
                    "For skewed numerical variables, median imputation is more robust against outliers than mean",
                    "For time series, use forward-fill (.ffill()) or backward-fill (.bfill())"
                ],
                "code_snippet": "# Audit and impute\nnull_pct = df.isna().mean() * 100\n# Impute skewed feature with median\ndf['income'] = df['income'].fillna(df['income'].median())\n# Drop rows where target label is missing\ndf.dropna(subset=['target_metric'], inplace=True)",
                "action_exercise": "Audit your dataset for columns with >20% missing values and compare mean vs median before choosing an imputation strategy.",
                "resource_url": "https://realpython.com/python-data-cleaning-numpy-pandas/",
                "resource_title": "Python Data Cleaning with NumPy and Pandas",
            },
            {
                "id": "da-l3",
                "title": "Interpreting Statistical Distributions & Correlation",
                "concept_tag": "distribution_analysis",
                "estimated_time": "5 min",
                "overview": "Correlation does not imply causation, and Pearson correlation only captures linear relationships. Visualizing distributions with histograms, KDEs, and boxplots reveals skewness, multi-modality, and outliers that raw summaries obscure.",
                "key_takeaways": [
                    "A correlation coefficient of -0.85 means a strong inverse linear trend, not causality",
                    "Boxplots highlight the Interquartile Range (IQR); points beyond 1.5 * IQR are candidate outliers",
                    "Log-transform highly right-skewed variables (e.g. monetary amounts, counts) to stabilize variance"
                ],
                "code_snippet": "import numpy as np\n# Apply log transform to positive skewed data\ndf['log_revenue'] = np.log1p(df['revenue'])\n# Calculate Spearman rank correlation for monotonic non-linear relations\nrank_corr = df[['engagement', 'log_revenue']].corr(method='spearman')",
                "action_exercise": "Plot a KDE distribution of your numerical target and check whether skewness exceeds +/- 1.0.",
                "resource_url": "https://seaborn.pydata.org/tutorial/distributions.html",
                "resource_title": "Visualizing Distributions of Data in Seaborn",
            },
        ],
    },
    "python": {
        "target_gaps": ["oop_basics", "data_types", "generators"],
        "summary": "Targeted remediation on Python object initialization, mutable vs immutable structures, and generator pipelines.",
        "estimated_time": "15–20 min",
        "lessons": [
            {
                "id": "py-l1",
                "title": "Object Initialization & The Role of __init__",
                "concept_tag": "oop_basics",
                "estimated_time": "5 min",
                "overview": "In Python, `__init__` is an instance initializer called right after `__new__` creates the object instance. It binds state attributes to `self`. It must not return any value other than None.",
                "key_takeaways": [
                    "__init__ receives the newly constructed instance as 'self' and sets attributes",
                    "Never use mutable default arguments (like def __init__(self, items=[])): defaults are evaluated once at definition time!",
                    "Use __repr__ alongside __init__ for unambiguous debugging representations"
                ],
                "code_snippet": "class DatasetTracker:\n    def __init__(self, name: str, schema: list[str] | None = None):\n        self.name = name\n        # Safe default pattern for mutable lists\n        self.schema = schema if schema is not None else []",
                "action_exercise": "Refactor a class with a mutable default argument into the safe `None` sentinel pattern.",
                "resource_url": "https://docs.python.org/3/tutorial/classes.html",
                "resource_title": "Python Official Classes & Objects Tutorial",
            },
            {
                "id": "py-l2",
                "title": "Mutability & Memory Semantics in Python",
                "concept_tag": "data_types",
                "estimated_time": "5 min",
                "overview": "Python variables are references to objects in memory. Lists, dictionaries, and sets are mutable (in-place modification); tuples, strings, integers, and frozensets are immutable (reassignment creates new objects).",
                "key_takeaways": [
                    "Passing a mutable list to a function allows the function to modify the caller's object in-place",
                    "To create an independent copy, use copy.deepcopy() or list slicing [:]",
                    "Immutable objects are hashable and can be dictionary keys or set elements"
                ],
                "code_snippet": "original = [1, 2, [3, 4]]\nimport copy\nshallow = original.copy()   # shallow['sublist'] is still shared!\ndeep = copy.deepcopy(original) # fully isolated copy",
                "action_exercise": "Create a dictionary using a tuple as a composite key (user_id, timestamp) and verify that lists fail with TypeError: unhashable type.",
                "resource_url": "https://realpython.com/python-data-structures/",
                "resource_title": "Python Data Structures Guide",
            },
            {
                "id": "py-l3",
                "title": "Memory-Efficient Pipelines with Generators & Yield",
                "concept_tag": "generators",
                "estimated_time": "6 min",
                "overview": "Generators allow processing gigabyte-scale streams without loading the entire payload into RAM. The `yield` keyword pauses function execution, saves state, and returns a value to the caller, resuming on `next()`.",
                "key_takeaways": [
                    "A function containing 'yield' returns a generator object, executing lazily on demand",
                    "Generator expressions: (x**2 for x in huge_list) consume O(1) memory vs [x**2 for ...] which consumes O(N)",
                    "StopIteration is automatically raised when generator finishes, driving for-loops naturally"
                ],
                "code_snippet": "def stream_log_lines(filepath):\n    with open(filepath, 'r', encoding='utf-8') as f:\n        for line in f:\n            if 'ERROR' in line:\n                yield line.strip()",
                "action_exercise": "Chain two generator functions: one that reads lines, and another that filters and parses JSON entries lazily.",
                "resource_url": "https://realpython.com/introduction-to-python-generators/",
                "resource_title": "Introduction to Python Generators and Yield",
            },
        ],
    },
    "javascript": {
        "target_gaps": ["variable_scoping", "async_flow", "event_loop"],
        "summary": "Targeted remediation on modern ES6 scoping, Promise concurrency, and the JavaScript event loop.",
        "estimated_time": "15–20 min",
        "lessons": [
            {
                "id": "js-l1",
                "title": "Scoping Semantics: let, const vs legacy var",
                "concept_tag": "variable_scoping",
                "estimated_time": "5 min",
                "overview": "Understanding lexical scoping avoids subtle state leakage. `let` and `const` are block-scoped and live in the Temporal Dead Zone (TDZ) until evaluated. `var` is function-scoped and hoisted with undefined initialization.",
                "key_takeaways": [
                    "Default to `const`; only use `let` when reassignment is explicitly required",
                    "Never use `var` in modern codebases to avoid hoisting pollution across loop iterations",
                    "`const` prevents variable reassignment, but object properties inside it remain mutable"
                ],
                "code_snippet": "for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 10); // prints 0, 1, 2\n}\n// with 'var i', all callbacks would print 3!",
                "action_exercise": "Inspect a closure inside a loop and refactor any hoisted variables to block-scoped `let`.",
                "resource_url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let",
                "resource_title": "MDN Reference: let & block scoping",
            },
            {
                "id": "js-l2",
                "title": "Promise Concurrency with Promise.all vs Promise.allSettled",
                "concept_tag": "async_flow",
                "estimated_time": "5 min",
                "overview": "Running independent async calls in sequence hurts performance. Running them concurrently with `Promise.all` fails fast on any single rejection; `Promise.allSettled` waits for all results regardless of failure.",
                "key_takeaways": [
                    "Use Promise.all() when all operations are critical and dependent on each other",
                    "Use Promise.allSettled() when fetching independent items (e.g. notifications, user feeds) so one failure doesn't break the UI",
                    "Always catch async errors or use try/catch in async/await functions"
                ],
                "code_snippet": "const results = await Promise.allSettled([\n  fetch('/api/profile'),\n  fetch('/api/notifications')\n]);\nconst successful = results.filter(r => r.status === 'fulfilled');",
                "action_exercise": "Convert 3 sequential await statements into a concurrent Promise.all execution and measure latency.",
                "resource_url": "https://javascript.info/promise-api",
                "resource_title": "JavaScript.info: Promise API & Parallel Execution",
            },
            {
                "id": "js-l3",
                "title": "The Microtask Queue & Event Loop Mechanics",
                "concept_tag": "event_loop",
                "estimated_time": "6 min",
                "overview": "JavaScript is single-threaded with a non-blocking event loop. Microtasks (Promise callbacks, queueMicrotask) run immediately after the current script and before any Macrotasks (setTimeout, setInterval).",
                "key_takeaways": [
                    "Execution order: Synchronous Call Stack -> Microtask Queue (all) -> Macrotask Queue (one)",
                    "Heavy computations block UI rendering; chunk long loops using requestAnimationFrame or Web Workers"
                ],
                "code_snippet": "console.log('1'); // Sync\nsetTimeout(() => console.log('2'), 0); // Macrotask\nPromise.resolve().then(() => console.log('3')); // Microtask\nconsole.log('4'); // Sync\n// Output: 1, 4, 3, 2",
                "action_exercise": "Predict and verify the console output of mixed synchronous code, promises, and setTimeouts.",
                "resource_url": "https://javascript.info/event-loop",
                "resource_title": "Event loop: microtasks and macrotasks",
            },
        ],
    },
}


@router.get("/{level_id}/sublevel", response_model=SubLevelResponse)
async def get_level_sublevel(
    level_id: str,
    roadmap_id: str = Query(..., description="ID of the roadmap"),
    skill_name: str = Query("Data Analysis", description="Skill name"),
    level_title: str = Query("", description="Level title"),
):
    """
    Returns 3 rich, actionable mini-lessons targeting the specific concept gaps
    for this level's gate test miss.
    """
    clean_skill = skill_name.lower().strip()
    match_key = None
    for k in CURATED_SUBLEVELS:
        if k in clean_skill or clean_skill in k:
            match_key = k
            break

    curated = CURATED_SUBLEVELS.get(match_key or "data analysis")

    lvl_name = level_title or f"Level {int(level_id) + 1 if level_id.isdigit() else level_id}"

    return SubLevelResponse(
        level_id=level_id,
        level_title=lvl_name,
        skill_name=skill_name,
        target_gaps=curated["target_gaps"],
        summary=curated["summary"],
        estimated_time=curated["estimated_time"],
        lessons=[SubLevelLesson(**l) for l in curated["lessons"]],
    )

