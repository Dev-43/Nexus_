"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import GateTest from "@/components/features/GateTest";
import SubLevelModal, { type SublevelSuggestion } from "@/components/features/SubLevelModal";
import { getRoadmap, type Roadmap, type Level, type Resource } from "@/lib/api";

// ---------------------------------------------------------------------------
// Resource type icon & estimated duration
// ---------------------------------------------------------------------------
const RESOURCE_META: Record<
  Resource["type"],
  { icon: string; defaultTime: string; label: string }
> = {
  documentation: { icon: "📚", defaultTime: "10 min read", label: "Documentation" },
  article: { icon: "📄", defaultTime: "8 min guide", label: "Architecture Guide" },
  exercise: { icon: "💻", defaultTime: "15 min drill", label: "Hands-on Exercise" },
  project: { icon: "🛠️", defaultTime: "25 min project", label: "Practical Project" },
  video: { icon: "🎥", defaultTime: "12 min tutorial", label: "Video Tutorial" },
};

// ---------------------------------------------------------------------------
// Domain Knowledge Base for Rich Learning Content
// ---------------------------------------------------------------------------
interface EnrichedDetails {
  estimatedTime: string;
  overview: string;
  keyInsights: string[];
  codeSnippet: string;
  actionDrill: string;
}

function getResourceEnrichment(
  resource: Resource,
  skillName: string,
  index: number
): EnrichedDetails {
  const sLow = (skillName || "").toLowerCase();
  const tLow = (resource.title || "").toLowerCase();
  const type = resource.type || "documentation";
  const meta = RESOURCE_META[type] || RESOURCE_META.documentation;

  // 1. SQL Domain Knowledge
  if (sLow.includes("sql") || sLow.includes("database") || sLow.includes("postgres")) {
    if (index === 0 || tLow.includes("doc") || tLow.includes("official")) {
      return {
        estimatedTime: "10 min read",
        overview:
          "Master the declarative execution order of SQL: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Filtering early in WHERE drastically reduces intermediate memory footprint.",
        keyInsights: [
          "SQL evaluates clauses logically before SELECT; column aliases defined in SELECT cannot be referenced in WHERE.",
          "Use inner joins when matching records are mandatory; use left joins to retain all primary entities with NULL fallbacks.",
          "HAVING filters aggregated groups; WHERE filters raw rows before aggregation.",
        ],
        codeSnippet:
          "-- Efficient grouped aggregation with filtering\nSELECT u.id, u.email, COUNT(o.id) AS total_orders\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.status = 'active'\nGROUP BY u.id, u.email\nHAVING COUNT(o.id) >= 3\nORDER BY total_orders DESC\nLIMIT 20;",
        actionDrill:
          "Write a query calculating total revenue per product category, filtering out categories with less than $5,000 in sales.",
      };
    }
    if (index === 1 || tLow.includes("best") || tLow.includes("pattern")) {
      return {
        estimatedTime: "8 min guide",
        overview:
          "Sargable queries (Search Argument Able) allow database engines to utilize B-tree indexes rather than performing full table scans. Wrapping indexed columns in functions disables index lookup.",
        keyInsights: [
          "Avoid function calls on indexed fields in WHERE: use `created_at >= '2026-01-01'` instead of `DATE(created_at) = '2026-01-01'`.",
          "Select only required columns: `SELECT *` creates unnecessary network overhead and prevents index-only covering scans.",
          "Use `EXPLAIN ANALYZE` to inspect actual execution plans, identifying seq scans and nested loop spikes.",
        ],
        codeSnippet:
          "-- Non-sargable (slow full table scan):\n-- SELECT id FROM orders WHERE YEAR(created_at) = 2026;\n\n-- Sargable (uses B-tree index on created_at):\nSELECT id, user_id, amount \nFROM orders \nWHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';",
        actionDrill:
          "Inspect an existing query with `EXPLAIN` and rewrite any non-sargable WHERE condition to enable index scanning.",
      };
    }
    if (index === 2 || tLow.includes("exercise") || tLow.includes("practice")) {
      return {
        estimatedTime: "15 min drill",
        overview:
          "Window functions perform analytical calculations across rows related to the current row without collapsing the result set like GROUP BY does.",
        keyInsights: [
          "`ROW_NUMBER()` assigns unique sequential integers; `DENSE_RANK()` handles ties without skipping ranking gaps.",
          "Use `PARTITION BY` to divide the dataset into isolated analytical windows (e.g. by region or department).",
          "Use `LEAD()` and `LAG()` to compute delta changes and growth rates across preceding/subsequent rows.",
        ],
        codeSnippet:
          "-- Top 3 highest earning employees per department\nWITH RankedStaff AS (\n  SELECT department_id, full_name, salary,\n    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank_num\n  FROM employees\n)\nSELECT * FROM RankedStaff WHERE rank_num <= 3;",
        actionDrill:
          "Calculate month-over-month growth by combining `LAG(revenue) OVER (ORDER BY month)` with current revenue.",
      };
    }
    return {
      estimatedTime: "25 min project",
      overview:
        "Relational schema design requires adhering to Normal Forms (1NF, 2NF, 3NF), establishing declarative foreign keys with ON DELETE policies, and enclosing multi-step mutations in ACID transactions.",
      keyInsights: [
        "Third Normal Form (3NF) eliminates transitive functional dependencies, ensuring data integrity.",
        "Always define explicit foreign key cascades (`ON DELETE CASCADE` or `ON DELETE RESTRICT`) to prevent orphaned rows.",
        "Enclose balance transfers or inventory adjustments in `BEGIN ... COMMIT` with proper isolation levels.",
      ],
      codeSnippet:
        "-- Transactional atomic transfer\nBEGIN TRANSACTION;\nUPDATE accounts SET balance = balance - 150 WHERE id = 'acc_source';\nUPDATE accounts SET balance = balance + 150 WHERE id = 'acc_dest';\nINSERT INTO audit_logs (event, amount) VALUES ('transfer', 150);\nCOMMIT;",
      actionDrill:
        "Design a relational schema with Users, Orders, and Items in 3NF and test transaction rollback on simulated error.",
    };
  }

  // 2. Data Analysis / Pandas Domain Knowledge
  if (sLow.includes("data") || sLow.includes("pandas") || sLow.includes("analys")) {
    if (index === 0 || tLow.includes("doc") || tLow.includes("10-minute") || tLow.includes("pandas")) {
      return {
        estimatedTime: "10 min read",
        overview:
          "Pandas Series and DataFrames utilize contiguous memory buffers. Vectorized boolean masking and indexing via `.loc` and `.iloc` execute at C-speed, avoiding costly Python bytecode loops.",
        keyInsights: [
          "Always wrap compound conditions in parentheses: `(df['age'] > 25) & (df['active'] == True)`.",
          "Use `.loc[row_mask, [col1, col2]]` for safe label-based slicing and assignment without `SettingWithCopyWarning`.",
          "Check memory usage with `df.info(memory_usage='deep')` and cast low-cardinality strings to `category`.",
        ],
        codeSnippet:
          "# Vectorized conditional selection and assignment\nmask = (df['status'] == 'completed') & (df['amount'] > 100)\nclean_df = df.loc[mask, ['user_id', 'amount', 'timestamp']].copy()\nclean_df['tier'] = np.where(clean_df['amount'] > 500, 'VIP', 'Standard')",
        actionDrill:
          "Filter a dataset to rows where sales exceed the 80th percentile and assign a new column using `.loc`.",
      };
    }
    if (index === 1 || tLow.includes("clean") || tLow.includes("article") || tLow.includes("missing")) {
      return {
        estimatedTime: "8 min guide",
        overview:
          "Systematic data sanitization involves distinguishing Missing Completely at Random (MCAR) from Missing at Random (MAR), removing duplicate records, and choosing robust imputation strategies.",
        keyInsights: [
          "Median imputation is preferred over mean imputation for right-skewed variables containing outliers.",
          "Audit duplicates using `df.duplicated(subset=['key_cols']).sum()` before aggregations.",
          "Normalize text columns with `.str.strip().str.lower()` and cast timestamps with `pd.to_datetime()`.",
        ],
        codeSnippet:
          "# Audit and impute\nnull_rates = df.isna().mean() * 100\ndf['salary'] = df['salary'].fillna(df['salary'].median())\ndf.drop_duplicates(subset=['transaction_id'], keep='first', inplace=True)",
        actionDrill:
          "Compute missingness rates per column and write a pipeline step to impute numerical columns with their median.",
      };
    }
    if (index === 2 || tLow.includes("exercise") || tLow.includes("visual") || tLow.includes("seaborn")) {
      return {
        estimatedTime: "15 min drill",
        overview:
          "Visual data exploration relies on choosing the appropriate chart grammar: KDEs for density, boxplots for skewness and IQR outliers, and scatter matrices for correlation detection.",
        keyInsights: [
          "Pearson correlation captures linear relationships only; examine scatterplots to detect non-linear curves.",
          "Points beyond 1.5 * IQR on boxplots represent potential outliers requiring domain verification.",
          "Apply `np.log1p` transformations to heavily right-skewed metrics to stabilize variance.",
        ],
        codeSnippet:
          "import seaborn as sns\nimport matplotlib.pyplot as plt\n\n# Distribution & correlation matrix\ncorr = df[['tenure', 'monthly_charges', 'total_charges']].corr()\nsns.heatmap(corr, annot=True, cmap='coolwarm', vmin=-1, vmax=1)",
        actionDrill:
          "Generate a correlation heatmap and identify two variables with correlation coefficient magnitude > 0.7.",
      };
    }
    return {
      estimatedTime: "25 min project",
      overview:
        "Building production exploratory pipelines involves chaining feature scaling, one-hot encoding, and aggregation into reusable Scikit-Learn transformers and automated summary reports.",
      keyInsights: [
        "Use `ColumnTransformer` to route numerical columns to `StandardScaler` and categorical columns to `OneHotEncoder`.",
        "Never fit preprocessors on testing sets; fit strictly on training splits to prevent data leakage.",
        "Export cleaned analytical datasets to Parquet format for 10x faster I/O and column-pruned queries.",
      ],
      codeSnippet:
        "from sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\n\npreprocessor = ColumnTransformer([\n    ('num', StandardScaler(), ['age', 'income']),\n    ('cat', OneHotEncoder(drop='first'), ['region', 'plan'])\n])",
      actionDrill:
        "Construct a ColumnTransformer pipeline that standardizes numerical features and exports the processed array.",
    };
  }

  // 3. Python Domain Knowledge
  if (sLow.includes("python")) {
    if (index === 0 || tLow.includes("doc") || tLow.includes("tutorial")) {
      return {
        estimatedTime: "10 min read",
        overview:
          "Python's data model revolves around objects, types, and references. Understanding list comprehensions, dictionary lookups, and built-in protocols sets the foundation for clean code.",
        keyInsights: [
          "Lists, dicts, and sets are mutable; tuples, strings, and ints are immutable.",
          "Dictionary lookups execute in O(1) average time via hash tables; list membership checks are O(N).",
          "Use list and dict comprehensions for expressive, performant collection transformations.",
        ],
        codeSnippet:
          "# Idiomatic dictionary comprehension with filtering\nuser_lookup = {\n    u['id']: u['profile']\n    for u in raw_users\n    if u.get('is_active', False)\n}",
        actionDrill:
          "Transform a list of raw transaction dictionaries into a keyed dictionary grouped by user ID using a comprehension.",
      };
    }
    if (index === 1 || tLow.includes("oop") || tLow.includes("class") || tLow.includes("pattern")) {
      return {
        estimatedTime: "8 min guide",
        overview:
          "Object-oriented Python leverages the dunder protocol (`__init__`, `__repr__`, `__enter__`). Encapsulation and composition provide robust architecture without excessive inheritance hierarchies.",
        keyInsights: [
          "Never use mutable default arguments like `def __init__(self, items=[])`: defaults evaluate once at import!",
          "Implement `__repr__` to provide an unambiguous string representation for debugging.",
          "Use `@property` decorators to expose managed attributes without breaking public API contracts.",
        ],
        codeSnippet:
          "class Account:\n    def __init__(self, owner: str, initial_deposit: float = 0.0):\n        self.owner = owner\n        self._balance = initial_deposit\n\n    @property\n    def balance(self) -> float:\n        return self._balance",
        actionDrill:
          "Refactor a class with a mutable default argument to use the safe `None` sentinel pattern.",
      };
    }
    if (index === 2 || tLow.includes("generator") || tLow.includes("exercise") || tLow.includes("test")) {
      return {
        estimatedTime: "15 min drill",
        overview:
          "Generators and iterators enable streaming processing of massive files and datasets with O(1) memory overhead. The `yield` keyword yields control lazily to the consumer.",
        keyInsights: [
          "Generator functions pause on `yield`, saving local execution context and resuming on `next()`.",
          "Generator expressions `(x for x in data)` consume negligible RAM compared to list comprehensions `[x for x in data]`.",
          "Write unit tests with `pytest` fixtures for clean, isolated state setup and teardown.",
        ],
        codeSnippet:
          "def stream_large_log(filepath):\n    with open(filepath, 'r', encoding='utf-8') as f:\n        for line in f:\n            if 'CRITICAL' in line:\n                yield line.strip()",
        actionDrill:
          "Write a generator function that reads lines from a file and yields only valid parsed JSON objects.",
      };
    }
    return {
      estimatedTime: "25 min project",
      overview:
        "Building production Python backends combines `asyncio` non-blocking I/O, FastAPI asynchronous route handlers, and Pydantic schema validation.",
      keyInsights: [
        "Asynchronous functions (`async def`) run on a single-threaded event loop and yield control during I/O awaits.",
        "CPU-bound tasks block the event loop; offload heavy computations to a `ProcessPoolExecutor`.",
        "Use Pydantic models for strict runtime type enforcement and automatic OpenAPI documentation.",
      ],
      codeSnippet:
        "from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\n@app.get('/items/{item_id}')\nasync def get_item(item_id: int):\n    data = await db.fetch_item(item_id)\n    return {'item_id': item_id, 'data': data}",
      actionDrill:
        "Create an asynchronous FastAPI endpoint with Pydantic validation that handles concurrent database reads.",
    };
  }

  // 4. JavaScript / Web Domain Knowledge
  if (sLow.includes("javascript") || sLow.includes("web") || sLow.includes("react")) {
    if (index === 0 || tLow.includes("doc") || tLow.includes("fundamental")) {
      return {
        estimatedTime: "10 min read",
        overview:
          "Modern JavaScript (ES6+) relies on block-scoping (`let`, `const`), lexical closures, destructuring, and arrow functions that inherit the surrounding `this` context.",
        keyInsights: [
          "Always default to `const`; use `let` only when variable reassignment is required.",
          "`const` prevents reassignment of the variable binding, but object properties inside remain mutable.",
          "Closures capture the lexical environment at creation, enabling private state and factory functions.",
        ],
        codeSnippet:
          "// Block-scoped let inside asynchronous loop\nfor (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log('Index:', i), 100); // Prints 0, 1, 2\n}",
        actionDrill:
          "Refactor an old function-scoped script to use block-scoped `const`/`let` and object destructuring.",
      };
    }
    if (index === 1 || tLow.includes("component") || tLow.includes("react") || tLow.includes("hook")) {
      return {
        estimatedTime: "12 min guide",
        overview:
          "React component architecture models UI as a pure projection of state and props. Managing re-renders with `useMemo`, `useCallback`, and atomic state prevents laggy interfaces.",
        keyInsights: [
          "Never mutate state directly: always return new object copies using spread syntax or updater functions.",
          "Use `useCallback` when passing callback functions to memoized child components (`React.memo`).",
          "Keep effects focused: each `useEffect` should synchronize one specific external subscription or side-effect.",
        ],
        codeSnippet:
          "import { useState, useCallback } from 'react';\n\nexport function FilterBar({ onFilterChange }) {\n  const [query, setQuery] = useState('');\n  const handleSearch = useCallback((e) => {\n    setQuery(e.target.value);\n    onFilterChange(e.target.value);\n  }, [onFilterChange]);\n  return <input value={query} onChange={handleSearch} />;\n}",
        actionDrill:
          "Build a controlled input component that debounces state updates before firing an external search query.",
      };
    }
    if (index === 2 || tLow.includes("async") || tLow.includes("exercise") || tLow.includes("promise")) {
      return {
        estimatedTime: "15 min drill",
        overview:
          "The JavaScript event loop executes synchronous scripts on the Call Stack, drains all pending Microtasks (Promises), and then evaluates Macrotasks (setTimeout, I/O).",
        keyInsights: [
          "Use `Promise.all()` for fail-fast concurrent operations; use `Promise.allSettled()` when independent results are needed.",
          "Always catch rejected promises or wrap `await` calls in `try ... catch` blocks to avoid unhandled rejections.",
          "Avoid running independent API calls sequentially when they can be dispatched concurrently.",
        ],
        codeSnippet:
          "// Concurrent non-blocking requests\nconst [userData, analyticsData] = await Promise.all([\n  fetch('/api/user').then(r => r.json()),\n  fetch('/api/analytics').then(r => r.json())\n]);",
        actionDrill:
          "Rewrite two sequential `await fetch()` calls into a concurrent `Promise.all()` execution.",
      };
    }
    return {
      estimatedTime: "25 min project",
      overview:
        "Full-stack Next.js applications leverage the App Router, Server Components for zero-bundle data fetching, Server Actions for mutations, and Streaming UI for fast First Contentful Paint.",
      keyInsights: [
        "Server Components render strictly on the server, eliminating client-side JavaScript for static content.",
        "Add `'use client'` directive only at the leaves of the component tree that require hooks (`useState`, `useEffect`).",
        "Use Next.js Server Actions with Zod validation to mutate database state securely without manual API routes.",
      ],
      codeSnippet:
        "// Server Action in Next.js App Router\nexport async function updateProfile(formData: FormData) {\n  'use server';\n  const name = formData.get('name');\n  await db.user.update({ where: { id: userId }, data: { name } });\n  revalidatePath('/profile');\n}",
      actionDrill:
        "Build a Server Action form with optimistic UI updates and server-side data revalidation.",
    };
  }

  // 5. General / Default Enriched Fallback
  return {
    estimatedTime: meta.defaultTime,
    overview:
      resource.description ||
      `Master core engineering patterns, syntax conventions, and architectural best practices for ${resource.title}.`,
    keyInsights: [
      `Understand foundational design principles and industry conventions for ${resource.title}.`,
      "Apply defensive error handling and validation before processing external payloads.",
      "Profile performance bottlenecks and adhere to idiomatic style guidelines.",
    ],
    codeSnippet:
      `// Practical execution pattern for ${resource.title}\nfunction executeTask(payload) {\n  if (!payload || !payload.id) throw new Error('Invalid payload');\n  return processEntity(payload);\n}`,
    actionDrill:
      `Review ${resource.title} and write a short practical script or command verifying its core functionality.`,
  };
}

// ---------------------------------------------------------------------------
// Main Level Content Page
// ---------------------------------------------------------------------------
export default function LevelContentPage() {
  const params = useParams();
  const router = useRouter();

  const roadmapId = params?.id as string;
  const levelIndex = parseInt((params?.lid as string) ?? "0", 10);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks which resources the user has reviewed
  const [openedResources, setOpenedResources] = useState<Set<number>>(new Set());
  // Tracks which card is currently expanded in the rich accordion
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const [showGateTest, setShowGateTest] = useState(false);
  const [showSublevel, setShowSublevel] = useState(false);
  const [sublevelRejectCount, setSublevelRejectCount] = useState(0);

  useEffect(() => {
    if (!roadmapId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getRoadmap(roadmapId);
        if (!cancelled) setRoadmap(data);
      } catch (err) {
        console.error("Failed to load roadmap:", err);
        if (!cancelled)
          setLoadError("Couldn't load this roadmap. Try going back and re-entering the level.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roadmapId]);

  const level: Level | undefined = roadmap?.levels[levelIndex];
  const skillName = roadmap?.skill_name || "General Tech";
  const sessionId = roadmap?.id || "";

  const toggleReviewed = useCallback((idx: number) => {
    setOpenedResources((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const totalResources = level?.resources.length ?? 0;
  const reviewedCount = openedResources.size;
  const progressPercent =
    totalResources > 0 ? Math.round((reviewedCount / totalResources) * 100) : 0;
  const allReviewed = totalResources === 0 || reviewedCount >= totalResources;

  const sublevelSuggestion: SublevelSuggestion = {
    title: `${level?.title ?? "This level"}: targeted review`,
    description: "A short focused lesson for the concepts that caused the gate test miss.",
    lessonCount: 3,
    conceptGaps: [],
  };

  function handleTestResult(score: number, passed: boolean, pointsEarned: number) {
    if (!passed) {
      setSublevelRejectCount(0);
      setShowSublevel(true);
      return;
    }

    const isFinalLevel = roadmap
      ? levelIndex === roadmap.total_levels - 1
      : false;

    if (isFinalLevel) {
      router.push(`/roadmap/${roadmapId}?complete=true&points=${pointsEarned}`);
    } else {
      router.push(`/roadmap/${roadmapId}`);
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 0",
          color: "var(--color-text-secondary, #94A3B8)",
          fontSize: 16,
        }}
      >
        Loading level curriculum…
      </div>
    );
  }

  if (loadError || !level) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          color: "var(--color-text-secondary, #94A3B8)",
        }}
      >
        <span style={{ fontSize: 18 }}>{loadError || "Level not found"}</span>
        <Button variant="secondary" onClick={() => router.push(`/roadmap/${roadmapId}`)}>
          ← Back to roadmap
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px" }}>
      {/* Breadcrumb Navigation */}
      <button
        onClick={() => router.push(`/roadmap/${roadmapId}`)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--color-text-secondary, #94A3B8)",
          fontSize: 14,
          marginBottom: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "color 0.15s ease",
        }}
      >
        ← Back to {skillName} Roadmap
      </button>

      {/* Header Banner */}
      <div
        style={{
          background: "#090A0D",
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-brand, #3B82F6)",
            }}
          >
            Level {levelIndex + 1} of {roadmap?.total_levels || 3} • Stage Curriculum
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 10px 0",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--color-text-primary, #F8FAFC)",
            lineHeight: 1.3,
          }}
        >
          {level.title}
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--color-text-secondary, #94A3B8)",
            lineHeight: 1.6,
          }}
        >
          {level.description}
        </p>
      </div>

      {/* Sticky Progress & Study Tracker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderRadius: "12px",
          background: "var(--color-surface, #090A0F)",
          border: "1px solid var(--color-border, #1E2330)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📚</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary, #F8FAFC)", fontVariantNumeric: "tabular-nums" }}>
              {reviewedCount} of {totalResources} resources reviewed
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary, #94A3B8)" }}>
              {allReviewed ? "Ready for Gate Test" : "Review each resource before taking the gate test"}
            </div>
          </div>
        </div>

        <div style={{ width: 140 }}>
          <div
            style={{
              height: 6,
              width: "100%",
              borderRadius: 9999,
              background: "var(--color-surface-raised, #121520)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                background: allReviewed
                  ? "var(--color-success, #10B981)"
                  : "var(--color-brand, #3B82F6)",
                borderRadius: 9999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Rich Expandable Resource Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {level.resources.map((resource, i) => {
          const isReviewed = openedResources.has(i);
          const isExpanded = expandedIndex === i;
          const meta = RESOURCE_META[resource.type] || RESOURCE_META.documentation;
          const details = getResourceEnrichment(resource, skillName, i);

          return (
            <div
              key={`${resource.title}-${i}`}
              style={{
                background: isReviewed
                  ? "rgba(16, 185, 129, 0.03)"
                  : "var(--color-surface, #090A0D)",
                boxShadow: isReviewed
                  ? "0 0 0 1px rgba(16, 185, 129, 0.35)"
                  : isExpanded
                  ? "0 0 0 1.5px rgba(59, 130, 246, 0.55)"
                  : "0 0 0 1px rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                overflow: "hidden",
                transitionProperty: "box-shadow, background-color",
                transitionDuration: "180ms",
                transitionTimingFunction: "ease-out",
              }}
            >
              {/* Card Header (Click to Expand / Collapse) */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleReviewed(i);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isReviewed
                        ? "var(--color-success, #10B981)"
                        : "var(--color-surface-raised, #121520)",
                      border: `2px solid ${
                        isReviewed ? "var(--color-success, #10B981)" : "var(--color-border, #1E2330)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      transition: "all 0.2s ease",
                    }}
                    title={isReviewed ? "Mark unreviewed" : "Mark reviewed"}
                  >
                    {isReviewed ? "✓" : String(i + 1).padStart(2, "0")}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 600,
                          color: isReviewed
                            ? "var(--color-text-secondary, #94A3B8)"
                            : "var(--color-text-primary, #F8FAFC)",
                          textDecoration: isReviewed ? "line-through" : "none",
                        }}
                      >
                        {resource.title}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 8px",
                          borderRadius: 9999,
                          background: "var(--color-surface-raised, #121520)",
                          color: "var(--color-brand, #3B82F6)",
                          textTransform: "capitalize",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted, #64748B)" }}>
                      Estimated {details.estimatedTime}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: 16, color: "var(--color-text-muted, #64748B)", marginLeft: 12 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded Rich Learning Content */}
              {isExpanded && (
                <div
                  style={{
                    padding: "0 20px 20px",
                    borderTop: "1px solid var(--color-border, #1E2330)",
                    marginTop: 4,
                    paddingTop: 16,
                  }}
                >
                  {/* Overview */}
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "var(--color-text-primary, #F8FAFC)",
                    }}
                  >
                    {details.overview}
                  </p>

                  {/* Core Insights & Rules */}
                  {details.keyInsights && details.keyInsights.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--color-brand, #3B82F6)",
                          marginBottom: 8,
                        }}
                      >
                        Core Principles & Best Practices
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                        {details.keyInsights.map((insight, idx) => (
                          <li
                            key={idx}
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary, #94A3B8)",
                              lineHeight: 1.5,
                            }}
                          >
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Practical Code Example / Syntax */}
                  {details.codeSnippet && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--color-text-muted, #64748B)",
                          marginBottom: 6,
                        }}
                      >
                        Practical Code / Query Pattern
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          background: "#030406",
                          border: "1px solid #1A1F2C",
                          fontSize: 12,
                          color: "#E2E8F0",
                          fontFamily: "var(--font-mono, monospace)",
                          overflowX: "auto",
                          lineHeight: 1.5,
                        }}
                      >
                        <code>{details.codeSnippet}</code>
                      </pre>
                    </div>
                  )}

                  {/* Action Drill */}
                  {details.actionDrill && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "rgba(59, 130, 246, 0.06)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
                      <div style={{ fontSize: 13, color: "var(--color-text-secondary, #94A3B8)", lineHeight: 1.5 }}>
                        <strong style={{ color: "var(--color-text-primary, #F8FAFC)" }}>Action Drill: </strong>
                        {details.actionDrill}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!isReviewed) toggleReviewed(i);
                        }}
                        style={{
                          fontSize: 13,
                          color: "var(--color-brand, #3B82F6)",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        📖 Open Official Resource ↗
                      </a>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => toggleReviewed(i)}
                      style={{
                        background: isReviewed
                          ? "rgba(16, 185, 129, 0.12)"
                          : "var(--color-surface-raised, #121520)",
                        border: `1px solid ${
                          isReviewed ? "var(--color-success, #10B981)" : "var(--color-border, #1E2330)"
                        }`,
                        color: isReviewed
                          ? "var(--color-success, #10B981)"
                          : "var(--color-text-secondary, #94A3B8)",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isReviewed ? "✓ Reviewed" : "Mark as Reviewed"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gate Test CTA or Active Inline Gate Test */}
      {!showGateTest ? (
        <div
          style={{
            background: "var(--color-surface, #090A0D)",
            boxShadow: allReviewed
              ? "0 0 0 1.5px rgba(59, 130, 246, 0.5)"
              : "0 0 0 1px rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "28px 24px",
            textAlign: "center",
            transitionProperty: "box-shadow, background-color",
            transitionDuration: "200ms",
            transitionTimingFunction: "ease-out",
          }}
        >
          <div
            style={{
              fontSize: 36,
              marginBottom: 12,
              filter: allReviewed ? "none" : "grayscale(1) opacity(0.4)",
              transition: "filter 0.3s ease",
            }}
          >
            🎯
          </div>

          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: 20,
              fontWeight: 700,
              color: allReviewed
                ? "var(--color-text-primary, #F8FAFC)"
                : "var(--color-text-secondary, #94A3B8)",
            }}
          >
            {allReviewed ? "Ready for the Level Gate Test!" : "Review all resources to unlock"}
          </h2>

          <p
            style={{
              margin: "0 0 20px 0",
              fontSize: 14,
              color: "var(--color-text-secondary, #94A3B8)",
              lineHeight: 1.6,
            }}
          >
            {allReviewed
              ? "Score 70% or higher on the gate test to unlock the next level and earn progression XP."
              : `Review ${totalResources - reviewedCount} more resource${
                  totalResources - reviewedCount === 1 ? "" : "s"
                } to unlock the gate test.`}
          </p>

          <Button
            variant={allReviewed ? "primary" : "secondary"}
            disabled={!allReviewed}
            onClick={() => setShowGateTest(true)}
          >
            Take Gate Test →
          </Button>
        </div>
      ) : (
        <GateTest
          levelId={levelIndex.toString()}
          sessionId={sessionId}
          roadmapId={roadmapId}
          skillName={skillName}
          levelTitle={level.title}
          onResult={handleTestResult}
          onSubLevel={() => setShowSublevel(true)}
        />
      )}

      {/* Sublevel Modal */}
      <SubLevelModal
        isOpen={showSublevel}
        suggestion={sublevelSuggestion}
        rejectCount={sublevelRejectCount}
        onDecision={(decision) => {
          if (decision === "accept") {
            router.push(`/roadmap/${roadmapId}/level/${levelIndex}/sublevel`);
            return;
          }
          if (decision === "reject") {
            setSublevelRejectCount((count) => count + 1);
            setShowSublevel(false);
            return;
          }
          setShowSublevel(false);
        }}
      />
    </div>
  );
}
