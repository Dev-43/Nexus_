"use client";

// frontend/app/(dashboard)/assessment/page.tsx
// Feature 12: Adaptive Assessment Quiz Page

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./assessment.module.css";


import {
  AssessmentQuestion,
  Difficulty,
  useAssessmentStream,
} from "@/lib/hooks/useAssessmentStream";

const tokens = {
  bg: "#0A0A0F",
  surface: "#13131A",
  surfaceRaised: "#1C1C28",
  border: "#2A2A3A",
  borderStrong: "#3D3D55",
  accent: "#7B6EF6",
  accentGlow: "#7B6EF620",
  accentHover: "#9B8FFF",
  easy: "#34D399",
  medium: "#FBBF24",
  hard: "#F87171",
  textPrimary: "#F0EFFF",
  textSecondary: "#8B8AA8",
  textMuted: "#5A5975",
  success: "#34D399",
  successBg: "#34D39915",
  error: "#F87171",
  errorBg: "#F8717115",
};


function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  const config: Record<Difficulty, { color: string; bg: string; label: string; bars: number }> = {
    easy:   { color: tokens.easy,   bg: tokens.easy   + "20", label: "Easy",   bars: 1 },
    medium: { color: tokens.medium, bg: tokens.medium + "20", label: "Medium", bars: 2 },
    hard:   { color: tokens.hard,   bg: tokens.hard   + "20", label: "Hard",   bars: 3 },
  };
  const c = config[difficulty];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 12px",
        borderRadius: "20px",
        background: c.bg,
        border: `1px solid ${c.color}40`,
        transition: "all 0.4s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px" }}>
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            style={{
              width: "3px",
              height: `${4 + bar * 3}px`,
              borderRadius: "2px",
              background: bar <= c.bars ? c.color : tokens.border,
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: c.color,
          fontFamily: "'DM Mono', 'Fira Code', monospace",
        }}
      >
        {c.label}
      </span>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "13px", color: tokens.textSecondary }}>
          Question {Math.min(current + 1, total)} of {total}
        </span>
        <span style={{ fontSize: "12px", color: tokens.accent, fontFamily: "'DM Mono', monospace" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: "4px", borderRadius: "2px", background: tokens.border, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "2px",
            background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.accentHover})`,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

type OptionState = "default" | "selected" | "correct" | "wrong";

function QuizOption({
  option,
  state,
  onClick,
  disabled,
}: {
  option: { id: string; label: string };
  state: OptionState;
  onClick: () => void;
  disabled: boolean;
}) {
  const stateStyles: Record<OptionState, { border: string; bg: string; color: string }> = {
    default:  { border: tokens.border,       bg: tokens.surfaceRaised, color: tokens.textPrimary },
    selected: { border: tokens.accent,       bg: tokens.accentGlow,    color: tokens.textPrimary },
    correct:  { border: tokens.success,      bg: tokens.successBg,     color: tokens.success },
    wrong:    { border: tokens.error,        bg: tokens.errorBg,       color: tokens.error },
  };
  const s = stateStyles[state];
  const letter = option.id.toUpperCase();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "12px",
        border: `1.5px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left" as const,
        transition: "all 0.2s ease",
        outline: "none",
      }}
    >
      <span
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          border: `1.5px solid ${s.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          flexShrink: 0,
          background: state === "selected" ? tokens.accent + "30" : "transparent",
          color: state === "default" ? tokens.textSecondary : s.color,
        }}
      >
        {letter}
      </span>
      <span style={{ fontSize: "15px", fontWeight: 450, lineHeight: 1.5 }}>
        {option.label}
      </span>
    </button>
  );
}

function ConnectingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "60px 0" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tokens.accent}60, transparent)`,
          border: `2px solid ${tokens.accent}`,
          animation: "assessmentPulse 1.5s ease-in-out infinite",
        }}
      />
      <p style={{ color: tokens.textSecondary, fontSize: "15px", margin: 0 }}>
        Calibrating your assessment…
      </p>
    </div>
  );
}

function CompleteState({
  skillScore,
  skillLevel,
  onContinue,
}: {
  skillScore: number;
  skillLevel: "beginner" | "intermediate" | "advanced";
  onContinue: () => void;
}) {
  const levelColors = { beginner: tokens.easy, intermediate: tokens.medium, advanced: tokens.hard };
  const levelLabels = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
  const color = levelColors[skillLevel];
  const circumference = 2 * Math.PI * 54;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", padding: "48px 0", textAlign: "center" }}>
      <div style={{ position: "relative", width: "120px", height: "120px" }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke={tokens.border} strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - skillScore)}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "26px", fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
            {Math.round(skillScore * 100)}%
          </span>
        </div>
      </div>
      <div>
        <p style={{ color: tokens.textSecondary, fontSize: "14px", margin: "0 0 8px" }}>Your skill level</p>
        <span style={{ fontSize: "22px", fontWeight: 700, color }}>{levelLabels[skillLevel]}</span>
      </div>
      <p style={{ color: tokens.textSecondary, fontSize: "15px", maxWidth: "340px", lineHeight: 1.6, margin: 0 }}>
        Your personalised roadmap is ready to generate. It'll be built around exactly where you are right now.
      </p>
      <button
        onClick={onContinue}
        style={{
          padding: "14px 40px",
          borderRadius: "12px",
          background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentHover})`,
          border: "none",
          color: "#fff",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        Build my roadmap →
      </button>
    </div>
  );
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: AssessmentQuestion;
  onAnswer: (optionId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [question.id]);

  const handleConfirm = () => {
    if (!selected || revealed) return;
    setRevealed(true);
    setTimeout(() => onAnswer(selected), 900);
  };

  const getOptionState = (optionId: string): OptionState =>
    selected === optionId ? "selected" : "default";

  const renderQuestionText = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code
          key={i}
          style={{
            fontFamily: "'DM Mono', 'Fira Code', monospace",
            fontSize: "0.9em",
            background: tokens.surfaceRaised,
            border: `1px solid ${tokens.border}`,
            borderRadius: "4px",
            padding: "1px 6px",
            color: tokens.accentHover,
          }}
        >
          {part.slice(1, -1)}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      className={styles.questionCard}
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: "20px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      <p style={{ fontSize: "18px", fontWeight: 500, color: tokens.textPrimary, lineHeight: 1.65, margin: 0 }}>
        {renderQuestionText(question.text)}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {question.options.map((opt) => (
          <QuizOption
            key={opt.id}
            option={opt}
            state={getOptionState(opt.id)}
            onClick={() => !revealed && setSelected(opt.id)}
            disabled={revealed}
          />
        ))}
      </div>
      <button
        onClick={handleConfirm}
        disabled={!selected || revealed}
        style={{
          alignSelf: "flex-end",
          padding: "12px 32px",
          borderRadius: "10px",
          background: selected && !revealed
            ? `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentHover})`
            : tokens.surfaceRaised,
          border: `1.5px solid ${selected && !revealed ? "transparent" : tokens.border}`,
          color: selected && !revealed ? "#fff" : tokens.textMuted,
          fontSize: "14px",
          fontWeight: 600,
          cursor: selected && !revealed ? "pointer" : "default",
          transition: "all 0.2s ease",
          letterSpacing: "0.02em",
        }}
      >
        {revealed ? "Moving on…" : "Confirm answer"}
      </button>
    </div>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const [skillScore, setSkillScore] = useState(0);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [showComplete, setShowComplete] = useState(false);
  const [prevDifficulty, setPrevDifficulty] = useState<Difficulty>("easy");
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    const id = localStorage.getItem("nexus_session_id") ?? "";
    setSessionId(id);
  }, []);

  const handleComplete = useCallback(
    (score: number, level: "beginner" | "intermediate" | "advanced") => {
      setSkillScore(score);
      setSkillLevel(level);
      setShowComplete(true);
    },
    []
  );

  const { state, submitAnswer } = useAssessmentStream(null, { onComplete: handleComplete });

  const handleAnswer = useCallback(
    (optionId: string) => {
      if (state.question) setPrevDifficulty(state.question.difficulty);
      submitAnswer(optionId);
    },
    [state.question, submitAnswer]
  );

  const difficultyWentUp =
    state.question &&
    ((prevDifficulty === "easy" && state.question.difficulty !== "easy") ||
     (prevDifficulty === "medium" && state.question.difficulty === "hard"));

  return (
    <div
      className={styles.page}
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        color: tokens.textPrimary,
        fontFamily: "'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px 80px",
      }}
    >
      {/* Header */}
      <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentHover})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            ⬡
          </div>
          <span style={{ fontSize: "18px", fontWeight: 700, color: tokens.textPrimary, letterSpacing: "-0.02em" }}>
            Nexus
          </span>
        </div>

        {/* Title + difficulty pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className={styles.title} style={{ fontSize: "24px", fontWeight: 700, color: tokens.textPrimary, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              Skill Assessment
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: tokens.textSecondary }}>
              Questions adapt to your answers in real time
            </p>
          </div>
          {!state.isConnecting && !showComplete && state.question && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <DifficultyPill difficulty={state.question.difficulty} />
              {difficultyWentUp && (
                <span style={{ fontSize: "11px", color: tokens.easy, fontFamily: "'DM Mono', monospace", animation: "assessmentFadeIn 0.3s ease" }}>
                  ↑ stepping up
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!state.isConnecting && !showComplete && (
          <ProgressBar current={state.questionIndex} total={state.totalQuestions} />
        )}
      </div>

      {/* Content */}
      <div style={{ width: "100%", maxWidth: "640px" }}>
        {state.isConnecting && <ConnectingState />}

        {!state.isConnecting && !showComplete && state.question && (
          <div style={{ animation: "assessmentSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
            <QuestionCard
              key={state.question.id}
              question={state.question}
              onAnswer={handleAnswer}
            />
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: "12px", color: tokens.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}>
                topic: {state.question.conceptTag}
              </span>
            </div>
          </div>
        )}

        {showComplete && (
          <CompleteState
            skillScore={skillScore}
            skillLevel={skillLevel}
            onContinue={() => router.push(`/roadmap/${sessionId}`)}
          />
        )}
      </div>

    </div>
  );
}
