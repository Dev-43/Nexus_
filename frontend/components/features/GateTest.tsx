// ── frontend/components/features/GateTest.tsx ───────────────────────────
"use client";

import { useEffect, useState } from "react";
import QuizOption from "@/components/ui/QuizOption";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { submitGateTest, fetchLevelQuestions, type GateAnswerSubmission, type GateTestSubmitResult } from "@/lib/api";
import { colors, radius, typography } from "@/design/tokens";

export interface GateTestQuestion {
  id: string;
  text: string;
  options: string[];
  correct_index?: number;
  concept_tag?: string;
}

type RevealState = "pass" | "partial" | "fail";

interface GateTestProps {
  levelId: string;
  sessionId: string;
  roadmapId: string;
  skillName?: string;
  levelTitle?: string;
  questions?: GateTestQuestion[];
  onResult: (score: number, passed: boolean, pointsEarned: number) => void;
  onSubLevel?: () => void;
}

function revealStateFromNextAction(nextAction: string): RevealState {
  if (nextAction === "unlock_next_level") return "pass";
  if (nextAction === "partial_retry") return "partial";
  return "fail";
}

function resolveCorrectIndex(q: GateTestQuestion): number {
  return typeof q.correct_index === "number" ? q.correct_index : 0;
}

// ── Curated fallback questions by skill domain ────────────────────────────────
function getSkillFallbackQuestions(skillName: string = ""): GateTestQuestion[] {
  const s = skillName.toLowerCase();

  if (s.includes("data") || s.includes("analys") || s.includes("pandas") || s.includes("sql")) {
    return [
      {
        id: "da-q1",
        text: "Which Pandas method is used to identify and filter duplicate rows in a DataFrame?",
        options: ["df.duplicated()", "df.drop_duplicates()", "df.unique()", "df.isin()"],
        correct_index: 0,
        concept_tag: "data_cleaning",
      },
      {
        id: "da-q2",
        text: "In exploratory data analysis, which chart best displays the distribution and skewness of a numerical variable?",
        options: ["Histogram with KDE", "Pie Chart", "Network Graph", "Treemap"],
        correct_index: 0,
        concept_tag: "distribution_analysis",
      },
      {
        id: "da-q3",
        text: "What does a Pearson correlation coefficient of -0.85 between two metrics signify?",
        options: [
          "A strong inverse linear relationship where one metric decreases as the other rises",
          "A weak association that should be disregarded as noise",
          "A positive linear trend with 85% statistical power",
          "A direct causal relationship proving one metric drives the other",
        ],
        correct_index: 0,
        concept_tag: "correlation_analysis",
      },
      {
        id: "da-q4",
        text: "Why is handling missing values (imputation or deletion) essential before model training?",
        options: [
          "Most statistical estimators will fail or produce biased parameters with NaNs",
          "It guarantees 100% test dataset accuracy",
          "It automatically doubles the sample size of the dataset",
          "Missing values automatically delete dataset columns",
        ],
        correct_index: 0,
        concept_tag: "data_preprocessing",
      },
    ];
  }

  if (s.includes("javascript") || s.includes("js") || s.includes("react") || s.includes("web") || s.includes("frontend")) {
    return [
      {
        id: "js-q1",
        text: "What is the key scoping difference between `let` and `var` in modern JavaScript?",
        options: [
          "`let` is block-scoped, whereas `var` is function-scoped and hoisted",
          "`let` cannot be mutated once initialized",
          "`var` cannot be used inside functions",
          "`let` creates immutable global constants",
        ],
        correct_index: 0,
        concept_tag: "scope_hoisting",
      },
      {
        id: "js-q2",
        text: "Which method creates a new array populated with the results of calling a function on each element?",
        options: ["Array.prototype.map()", "Array.prototype.forEach()", "Array.prototype.filter()", "Array.prototype.reduce()"],
        correct_index: 0,
        concept_tag: "functional_arrays",
      },
      {
        id: "js-q3",
        text: "How does the JavaScript event loop handle unresolved asynchronous callbacks?",
        options: [
          "They wait in the Task or Microtask queue until the Call Stack is empty",
          "They preempt synchronous execution immediately",
          "They run in background OS threads natively",
          "They cancel existing synchronous loops",
        ],
        correct_index: 0,
        concept_tag: "event_loop",
      },
      {
        id: "js-q4",
        text: "What does an `async` function always return in JavaScript?",
        options: ["A Promise that resolves with the function's returned value", "The raw returned value synchronously", "A Generator iterator", "An Observable event stream"],
        correct_index: 0,
        concept_tag: "async_await",
      },
    ];
  }

  if (s.includes("python")) {
    return [
      {
        id: "py-q1",
        text: "In Python, what is the primary role of the `__init__` method in a class?",
        options: [
          "Initialises the attributes of a newly created object instance",
          "Destroys an object when it goes out of scope",
          "Imports external modules",
          "Defines class-level static constants",
        ],
        correct_index: 0,
        concept_tag: "oop_basics",
      },
      {
        id: "py-q2",
        text: "Which of the following built-in Python data types is mutable?",
        options: ["list", "tuple", "str", "frozenset"],
        correct_index: 0,
        concept_tag: "data_types",
      },
      {
        id: "py-q3",
        text: "What does `*args` in a function signature allow?",
        options: [
          "Accepting an arbitrary number of positional arguments as a tuple",
          "Passing arbitrary keyword arguments as a dictionary",
          "Passing only immutable types",
          "Enforcing strict type checking at runtime",
        ],
        correct_index: 0,
        concept_tag: "functions",
      },
      {
        id: "py-q4",
        text: "What occurs when a Python generator encounters a `yield` statement?",
        options: [
          "It yields a value and pauses execution state until `next()` is called",
          "It terminates execution permanently like `return`",
          "It raises a StopIteration exception immediately",
          "It copies the generator object into memory",
        ],
        correct_index: 0,
        concept_tag: "generators",
      },
    ];
  }

  // General technology fallback
  return [
    {
      id: "gen-q1",
      text: `What is the core architectural foundation when designing in ${skillName || "this skill"}?`,
      options: [
        "Structuring modular, maintainable logic with clear separation of concerns",
        "Writing monolithic scripts without version control",
        "Avoiding error handling to optimize execution speed",
        "Hardcoding all configuration parameters",
      ],
      correct_index: 0,
      concept_tag: "architecture_foundations",
    },
    {
      id: "gen-q2",
      text: `In ${skillName || "software engineering"}, how should edge cases and exceptions be handled?`,
      options: [
        "With explicit error boundaries, input validation, and descriptive logging",
        "By suppressing all errors silently to prevent crashes",
        "By terminating application processes without state persistence",
        "By delegating error handling entirely to end-users",
      ],
      correct_index: 0,
      concept_tag: "error_resilience",
    },
    {
      id: "gen-q3",
      text: `Which practice is most effective for ensuring long-term code quality in ${skillName || "technical projects"}?`,
      options: [
        "Comprehensive automated testing, continuous integration, and peer reviews",
        "Deploying changes directly to production without testing",
        "Minimizing documentation to reduce file size",
        "Reusing copy-pasted code across modules",
      ],
      correct_index: 0,
      concept_tag: "code_quality",
    },
    {
      id: "gen-q4",
      text: `What is the recommended approach for optimizing performance in ${skillName || "production systems"}?`,
      options: [
        "Profiling bottlenecks with realistic workloads before applying targeted optimizations",
        "Prematurely refactoring every function without metrics",
        "Increasing server hardware without measuring utilization",
        "Removing logging and monitoring tools",
      ],
      correct_index: 0,
      concept_tag: "performance_profiling",
    },
  ];
}

interface RevealProps {
  score: number;
  state: RevealState;
  onContinue: () => void;
  onSubLevel?: () => void;
}

function ScoreReveal({ score, state, onContinue, onSubLevel }: RevealProps) {
  const displayScore = Math.round(score * 100);

  const config = {
    pass: {
      icon: "🏆",
      headline: "Level Mastered",
      sub: "You passed the gate test! The next level is unlocked and ready for exploration.",
      cta: "Proceed to Next Level",
      barColor: colors.success,
      scoreColor: colors.success,
      bgColor: "rgba(16, 185, 129, 0.12)",
      thresholdLabel: "✓ 70% pass",
      thresholdColor: colors.success,
    },
    partial: {
      icon: "⚡",
      headline: "Nearly There",
      sub: "You scored in the 60–69% threshold. You have a free retry attempt with no penalty.",
      cta: "Try Again",
      barColor: colors.warn,
      scoreColor: colors.warn,
      bgColor: "rgba(245, 158, 11, 0.12)",
      thresholdLabel: "Partial credit",
      thresholdColor: colors.warn,
    },
    fail: {
      icon: "🎯",
      headline: "Needs Reinforcement",
      sub: "We identified targeted concept gaps from your answers. A mini-sublevel has been tailored for you.",
      cta: onSubLevel ? "View Remedial Sublevel" : "Review Resources",
      barColor: colors.danger,
      scoreColor: colors.danger,
      bgColor: "rgba(239, 68, 68, 0.12)",
      thresholdLabel: "Below 70%",
      thresholdColor: colors.danger,
    },
  }[state];

  function handleCta() {
    if (state === "fail" && onSubLevel) {
      onSubLevel();
    } else {
      onContinue();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 24px",
        background: colors.surface,
        borderRadius: radius.xl,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          marginBottom: "20px",
          background: config.bgColor,
          border: `1px solid ${config.scoreColor}30`,
        }}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      <p style={{ fontSize: "56px", fontWeight: 800, margin: "0 0 4px 0", color: config.scoreColor, fontFamily: typography.fontMono, lineHeight: 1 }}>
        {displayScore}%
      </p>
      <p style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: colors.textSecondary, margin: "0 0 16px 0", fontWeight: 600 }}>
        Gate Test Score
      </p>

      <h3 style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, margin: "0 0 8px 0" }}>
        {config.headline}
      </h3>
      <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.6, maxWidth: "420px", margin: "0 0 28px 0" }}>
        {config.sub}
      </p>

      <div style={{ width: "100%", maxWidth: "340px", marginBottom: "32px" }}>
        <div style={{ height: "8px", borderRadius: "999px", background: colors.surfaceRaised, overflow: "hidden", marginBottom: "8px" }}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              width: `${displayScore}%`,
              background: config.barColor,
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: colors.textMuted }}>
          <span>0%</span>
          <span style={{ color: config.thresholdColor, fontWeight: 600 }}>{config.thresholdLabel}</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <Button variant="primary" onClick={handleCta}>
          {config.cta}
        </Button>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Back to Level Content
        </Button>
      </div>
    </div>
  );
}

export default function GateTest({
  levelId,
  sessionId,
  roadmapId,
  skillName = "Data Analysis",
  levelTitle = "Foundations",
  questions: initialQuestions,
  onResult,
  onSubLevel,
}: GateTestProps) {
  const [questions, setQuestions] = useState<GateTestQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    return getSkillFallbackQuestions(skillName);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<GateAnswerSubmission[]>([]);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalPointsEarned, setFinalPointsEarned] = useState<number>(0);

  // Fetch dynamic, skill-tailored questions on mount if none passed explicitly
  useEffect(() => {
    let cancelled = false;
    async function loadDynamicQuestions() {
      if (initialQuestions && initialQuestions.length > 0) return;
      try {
        const fetched = await fetchLevelQuestions(levelId, skillName, levelTitle);
        if (!cancelled && fetched && fetched.length > 0) {
          setQuestions(fetched);
        }
      } catch (err) {
        console.warn("Using curated skill fallback questions:", err);
      }
    }
    loadDynamicQuestions();
    return () => {
      cancelled = true;
    };
  }, [levelId, skillName, levelTitle, initialQuestions]);

  const question = questions[currentIndex] || questions[0];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const OPTION_LABELS = ["A", "B", "C", "D"];

  function handleSelect(index: number) {
    if (revealed || submitting) return;
    setSelectedOption(index);
    setError(null);
  }

  function handleNextQuestion() {
    if (selectedOption === null) {
      setError("Please select an answer before continuing.");
      return;
    }

    const correctIdx = resolveCorrectIndex(question);
    const isCorrect = selectedOption === correctIdx;
    const recordedAnswer: GateAnswerSubmission = {
      question_id: question.id,
      selected_option: OPTION_LABELS[selectedOption] ?? "A",
      correct: isCorrect,
      concept_tag: question.concept_tag || "general",
    };

    const nextAnswers = [...answers, recordedAnswer];
    setAnswers(nextAnswers);

    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setError(null);
    } else {
      finalizeTest(nextAnswers);
    }
  }

  async function finalizeTest(allAnswers: GateAnswerSubmission[]) {
    setSubmitting(true);
    setError(null);

    const correctCount = allAnswers.filter((a) => a.correct).length;
    const clientScore = correctCount / allAnswers.length;

    try {
      const result: GateTestSubmitResult = await submitGateTest(
        levelId,
        sessionId,
        roadmapId,
        allAnswers
      );

      setFinalScore(result.score);
      setFinalPointsEarned(result.points_earned || 50);
      setRevealState(revealStateFromNextAction(result.next_action));
      setRevealed(true);
    } catch (err) {
      console.warn("Backend submission failed, applying deterministic scoring:", err);
      const passed = clientScore >= 0.7;
      setFinalScore(clientScore);
      setFinalPointsEarned(passed ? 50 : 10);
      setRevealState(passed ? "pass" : clientScore >= 0.6 ? "partial" : "fail");
      setRevealed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    const passed = revealState === "pass";
    onResult(finalScore, passed, finalPointsEarned);
  }

  if (revealed && revealState) {
    return (
      <ScoreReveal
        score={finalScore}
        state={revealState}
        onContinue={handleContinue}
        onSubLevel={onSubLevel}
      />
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.xl,
        border: `1px solid ${colors.border}`,
        padding: "28px 24px",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Test Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: colors.brand,
                background: "rgba(59, 130, 246, 0.12)",
                padding: "3px 8px",
                borderRadius: "999px",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              Question {currentIndex + 1} of {questions.length}
            </span>
            {question.concept_tag && (
              <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "capitalize" }}>
                · {question.concept_tag.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: 500 }}>
            {skillName} Mastery Gate
          </span>
        </div>
        <ProgressBar value={progressPercent} label="" />
      </div>

      {/* Question Text */}
      <h3
        style={{
          fontSize: "17px",
          fontWeight: 600,
          color: colors.textPrimary,
          lineHeight: 1.6,
          margin: "0 0 24px 0",
        }}
      >
        {question.text}
      </h3>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {question.options.map((opt, index) => {
          const isSelected = selectedOption === index;
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={submitting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 16px",
                borderRadius: radius.md,
                background: isSelected ? "rgba(59, 130, 246, 0.12)" : colors.surfaceRaised,
                border: `1px solid ${isSelected ? colors.brand : colors.border}`,
                color: isSelected ? colors.textPrimary : colors.textSecondary,
                cursor: submitting ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: radius.sm,
                  background: isSelected ? colors.brand : "rgba(255, 255, 255, 0.05)",
                  color: isSelected ? "#FFFFFF" : colors.textSecondary,
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: typography.fontMono,
                }}
              >
                {OPTION_LABELS[index]}
              </span>
              <span style={{ fontSize: "14px", fontWeight: isSelected ? 600 : 450, lineHeight: 1.5, color: isSelected ? "#FFFFFF" : colors.textPrimary }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: radius.md, background: "rgba(239, 68, 68, 0.12)", border: `1px solid ${colors.danger}40`, color: colors.danger, fontSize: "13px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <Button
          variant="primary"
          onClick={handleNextQuestion}
          disabled={selectedOption === null || submitting}
        >
          {submitting ? "Scoring Test..." : isLastQuestion ? "Submit Gate Test →" : "Next Question →"}
        </Button>
      </div>
    </div>
  );
}
