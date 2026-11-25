"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRoadmap,
  fetchLevelSublevel,
  type Roadmap,
  type SubLevelDataResponse,
  type SubLevelLessonData,
} from "@/lib/api";
import Button from "@/components/ui/Button";

// Resilient default fallback lessons so the user NEVER sees an empty screen
const FALLBACK_LESSONS: Record<string, SubLevelLessonData[]> = {
  "data analysis": [
    {
      id: "da-fb-1",
      title: "Mastering Pandas Boolean Indexing & Filter Logic",
      concept_tag: "data_filtering",
      estimated_time: "5 min",
      overview:
        "Vectorized filtering in Pandas requires bitwise operators (&, |) rather than Python's logical 'and'/'or'. Every condition must be individually wrapped in parentheses.",
      key_takeaways: [
        "Wrap each condition in parentheses: (df['colA'] > 0) & (df['colB'] < 10)",
        "Use bitwise & and | because standard 'and'/'or' evaluate the entire Series truth value",
        "Use .isin([...]) for multi-value membership checks",
      ],
      code_snippet:
        "# Correct conditional row selection\nfiltered_df = df[(df['age'] >= 21) & (df['status'] == 'active')]\n# Efficient column filtering with .loc\nresult = df.loc[df['score'] > 80, ['user_id', 'score', 'region']]",
      action_exercise:
        "Write a 1-liner to select all rows where 'sales' exceeds the 75th percentile and 'returns' equals 0.",
      resource_url: "https://pandas.pydata.org/docs/user_guide/indexing.html",
      resource_title: "Official Pandas Indexing & Selecting Data",
    },
    {
      id: "da-fb-2",
      title: "Systematic Detection & Imputation of Missing Values",
      concept_tag: "data_cleaning",
      estimated_time: "6 min",
      overview:
        "Missing values (NaN, sentinel numbers like -999) corrupt statistical calculations and predictive models. Quantify missingness before choosing between median imputation and row exclusion.",
      key_takeaways: [
        "Audit percentage missing per column with df.isna().mean() * 100",
        "Median imputation is robust against outliers in skewed numerical features",
        "Avoid data leakage: compute imputation statistics strictly on training subsets",
      ],
      code_snippet:
        "# Audit missing values\nnull_pct = df.isna().mean() * 100\n# Robust median imputation\ndf['income'] = df['income'].fillna(df['income'].median())\n# Drop rows where target label is missing\ndf.dropna(subset=['target_metric'], inplace=True)",
      action_exercise:
        "Audit your dataset for columns with >20% missing values and compare mean vs median before choosing an imputation strategy.",
      resource_url: "https://realpython.com/python-data-cleaning-numpy-pandas/",
      resource_title: "Python Data Cleaning with NumPy and Pandas",
    },
    {
      id: "da-fb-3",
      title: "Interpreting Statistical Distributions & Correlation",
      concept_tag: "distribution_analysis",
      estimated_time: "5 min",
      overview:
        "Correlation measures association, not causality. Pearson measures linear relationships only; examine KDEs, histograms, and boxplots to detect outliers and non-linear trends.",
      key_takeaways: [
        "A correlation of -0.85 denotes a strong inverse relationship, not a causal link",
        "Boxplots highlight the Interquartile Range (IQR); points beyond 1.5 * IQR are outlier candidates",
        "Apply log1p transformations to right-skewed revenue or count distributions",
      ],
      code_snippet:
        "import numpy as np\n# Log transform for positive right-skewed data\ndf['log_revenue'] = np.log1p(df['revenue'])\n# Spearman rank correlation for monotonic relations\nrank_corr = df[['engagement', 'log_revenue']].corr(method='spearman')",
      action_exercise:
        "Plot a KDE distribution of your numerical target and check whether skewness exceeds +/- 1.0.",
      resource_url: "https://seaborn.pydata.org/tutorial/distributions.html",
      resource_title: "Visualizing Distributions of Data in Seaborn",
    },
  ],
};

export default function SubLevelPage() {
  const params = useParams();
  const router = useRouter();

  const roadmapId = params?.id as string;
  const levelIndex = parseInt((params?.lid as string) ?? "0", 10);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [sublevelData, setSublevelData] = useState<SubLevelDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const rm = await getRoadmap(roadmapId);
        if (cancelled) return;
        setRoadmap(rm);

        const currentLevel = rm?.levels?.[levelIndex];
        const skillName = rm?.skill_name || "Data Analysis";
        const levelTitle = currentLevel?.title || `Level ${levelIndex + 1}`;

        const sub = await fetchLevelSublevel(
          levelIndex.toString(),
          roadmapId,
          skillName,
          levelTitle
        );

        if (!cancelled) {
          if (sub && sub.lessons && sub.lessons.length > 0) {
            setSublevelData(sub);
            setExpandedLessonId(sub.lessons[0].id);
          } else {
            // Curated fallback
            const fallbackKey = Object.keys(FALLBACK_LESSONS).find((k) =>
              skillName.toLowerCase().includes(k)
            ) || "data analysis";
            const fbLessons = FALLBACK_LESSONS[fallbackKey];
            setSublevelData({
              level_id: levelIndex.toString(),
              level_title: levelTitle,
              skill_name: skillName,
              target_gaps: ["data_cleaning", "distribution_analysis"],
              summary: "Targeted remediation focusing on core concepts and practical workflows.",
              estimated_time: "15–20 min",
              lessons: fbLessons,
            });
            setExpandedLessonId(fbLessons[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load sublevel data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roadmapId, levelIndex]);

  const toggleLessonComplete = (lessonId: string) => {
    setCompletedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const handleReturnToGateTest = () => {
    router.push(`/roadmap/${roadmapId}/level/${levelIndex}`);
  };

  const lessons = sublevelData?.lessons || [];
  const completedCount = completedLessonIds.size;
  const totalCount = lessons.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
        <p style={{ color: "var(--color-text-secondary, #94A3B8)", fontSize: 16 }}>
          Synthesizing targeted review lessons for your gate test gaps…
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/roadmap/${roadmapId}/level/${levelIndex}`)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--color-text-secondary, #94A3B8)",
          fontSize: "14px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "color 0.15s ease",
        }}
      >
        ← Back to level
      </button>

      {/* Header Banner */}
      <div
        style={{
          background: "#090A0D",
          boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.3)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-warn, #F59E0B)",
            }}
          >
            Targeted Remediation
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-text-primary, #F8FAFC)",
            lineHeight: 1.3,
          }}
        >
          {sublevelData?.level_title || "Level Review"}: Focused Lessons
        </h1>

        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "14px",
            color: "var(--color-text-secondary, #94A3B8)",
            lineHeight: 1.6,
          }}
        >
          {sublevelData?.summary ||
            "Master the core concepts that caused the gate test miss before retrying."}
        </p>

        {/* Concept gaps chips */}
        {sublevelData?.target_gaps && sublevelData.target_gaps.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted, #64748B)", fontWeight: 500 }}>
              Identified Gaps:
            </span>
            {sublevelData.target_gaps.map((gap) => (
              <span
                key={gap}
                style={{
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.28)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FBBF24",
                }}
              >
                {gap.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress Card */}
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
              {completedCount} of {totalCount} lessons completed
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary, #94A3B8)" }}>
              Estimated time: {sublevelData?.estimated_time || "15–20 min"}
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
                width: `${progressPct}%`,
                background: "var(--color-brand, #3B82F6)",
                borderRadius: 9999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
        {lessons.map((lesson, idx) => {
          const isCompleted = completedLessonIds.has(lesson.id);
          const isExpanded = expandedLessonId === lesson.id;

          return (
            <div
              key={lesson.id}
              style={{
                background: isCompleted ? "rgba(16, 185, 129, 0.03)" : "var(--color-surface, #090A0D)",
                boxShadow: isCompleted
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
              {/* Lesson Card Header */}
              <div
                onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLessonComplete(lesson.id);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isCompleted ? "var(--color-success, #10B981)" : "var(--color-surface-raised, #121520)",
                      border: `2px solid ${isCompleted ? "var(--color-success, #10B981)" : "var(--color-border, #1E2330)"}`,
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
                    title={isCompleted ? "Mark incomplete" : "Mark completed"}
                  >
                    {isCompleted ? "✓" : String(idx + 1).padStart(2, "0")}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 600,
                          color: isCompleted ? "var(--color-text-secondary, #94A3B8)" : "var(--color-text-primary, #F8FAFC)",
                          textDecoration: isCompleted ? "line-through" : "none",
                        }}
                      >
                        {lesson.title}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 8px",
                          borderRadius: 9999,
                          background: "var(--color-surface-raised, #121520)",
                          color: "var(--color-brand, #3B82F6)",
                        }}
                      >
                        {lesson.concept_tag.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted, #64748B)" }}>
                      Estimated {lesson.estimated_time}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: 16, color: "var(--color-text-muted, #64748B)", marginLeft: 12 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded Lesson Content */}
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
                    {lesson.overview}
                  </p>

                  {/* Core Takeaways */}
                  {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
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
                        Core Insights & Rules
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                        {lesson.key_takeaways.map((point, pIdx) => (
                          <li
                            key={pIdx}
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary, #94A3B8)",
                              lineHeight: 1.5,
                            }}
                          >
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Code snippet */}
                  {lesson.code_snippet && (
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
                        Practical Code Example
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
                        <code>{lesson.code_snippet}</code>
                      </pre>
                    </div>
                  )}

                  {/* Action exercise */}
                  {lesson.action_exercise && (
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
                        {lesson.action_exercise}
                      </div>
                    </div>
                  )}

                  {/* Footer actions inside card */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    {lesson.resource_url ? (
                      <a
                        href={lesson.resource_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 13,
                          color: "var(--color-brand, #3B82F6)",
                          textDecoration: "none",
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        📖 {lesson.resource_title || "Official Resource"} ↗
                      </a>
                    ) : <span />}

                    <button
                      onClick={() => toggleLessonComplete(lesson.id)}
                      style={{
                        background: isCompleted ? "rgba(16, 185, 129, 0.12)" : "var(--color-surface-raised, #121520)",
                        border: `1px solid ${isCompleted ? "var(--color-success, #10B981)" : "var(--color-border, #1E2330)"}`,
                        color: isCompleted ? "var(--color-success, #10B981)" : "var(--color-text-secondary, #94A3B8)",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isCompleted ? "✓ Lesson Reviewed" : "Mark as Reviewed"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Retest CTA Card */}
      <div
        style={{
          background: "var(--color-surface, #090A0F)",
          border: "1px solid var(--color-border, #1E2330)",
          borderRadius: "16px",
          padding: "24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 24 }}>🎯</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text-primary, #F8FAFC)" }}>
          Ready to verify your understanding?
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary, #94A3B8)", maxWidth: 480 }}>
          {completedCount >= totalCount
            ? "Great job! All focused review lessons are complete. Head back and retry the gate test."
            : `You have reviewed ${completedCount} of ${totalCount} lessons. You can retry now or finish the remaining drills.`}
        </p>
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={handleReturnToGateTest}>
            Return to Level & Retry Gate Test →
          </Button>
        </div>
      </div>
    </div>
  );
}
