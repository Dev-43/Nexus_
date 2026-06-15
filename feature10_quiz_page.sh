#!/bin/bash
# Feature 10 — Personality Quiz Page
# Run this from the nexus/ root folder

mkdir -p frontend/app/\(dashboard\)/quiz
mkdir -p frontend/components/features

# ─────────────────────────────────────────────────────────────
# 1. Personality Quiz Page
# ─────────────────────────────────────────────────────────────
cat > "frontend/app/(dashboard)/quiz/page.tsx" << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuizOption } from "@/components/ui/QuizOption";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { submitPersonalityQuiz } from "@/lib/api";

// ── Quiz content ──────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "learning_format",
    text: "When you're learning something new, what clicks best for you?",
    options: [
      { value: "visual",    label: "Diagrams & visuals",       emoji: "🎨" },
      { value: "text",      label: "Written explanations",     emoji: "📖" },
      { value: "video",     label: "Video walkthroughs",       emoji: "🎬" },
      { value: "hands_on",  label: "Jumping straight in",      emoji: "⚡" },
    ],
  },
  {
    id: "structure",
    text: "How do you like your learning path structured?",
    options: [
      { value: "structured",   label: "Step-by-step curriculum", emoji: "🗂️" },
      { value: "exploratory",  label: "Follow my curiosity",      emoji: "🧭" },
      { value: "project",      label: "Build things as I go",     emoji: "🔨" },
      { value: "mixed",        label: "Mix of both",              emoji: "🔀" },
    ],
  },
  {
    id: "pace",
    text: "How fast do you want to move through material?",
    options: [
      { value: "deep",    label: "Deep dives, I want mastery",  emoji: "🎯" },
      { value: "steady",  label: "Steady & consistent",         emoji: "🚶" },
      { value: "fast",    label: "Fast & efficient",            emoji: "🚀" },
      { value: "flex",    label: "Depends on the topic",        emoji: "🌊" },
    ],
  },
  {
    id: "feedback",
    text: "How do you prefer to know if you're on track?",
    options: [
      { value: "quizzes",    label: "Frequent short quizzes",     emoji: "✅" },
      { value: "projects",   label: "Build something real",       emoji: "🏗️" },
      { value: "discussion", label: "Explain it back to someone", emoji: "💬" },
      { value: "self",       label: "I know when I get it",       emoji: "🧠" },
    ],
  },
  {
    id: "goal",
    text: "What's the main goal behind learning this skill?",
    options: [
      { value: "career",   label: "Land a job or promotion",    emoji: "💼" },
      { value: "project",  label: "Build a specific project",   emoji: "🛠️" },
      { value: "curious",  label: "Pure curiosity",             emoji: "🔭" },
      { value: "side",     label: "Freelance or side income",   emoji: "💰" },
    ],
  },
];

type Answers = Record<string, string>;

// ── Component ──────────────────────────────────────────────────
export default function PersonalityQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progressPercent = Math.round((step / totalSteps) * 100);
  const isLastStep = step === totalSteps - 1;

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelect = (value: string) => {
    setSelected(value);
  };

  const handleNext = async () => {
    if (!selected) return;

    const updatedAnswers = { ...answers, [question.id]: selected };
    setAnswers(updatedAnswers);

    if (!isLastStep) {
      setStep((s) => s + 1);
      setSelected(null);
      return;
    }

    // Final step — submit
    setIsSubmitting(true);
    try {
      const profile = await submitPersonalityQuiz({
        skipped: false,
        answers: updatedAnswers,
      });
      console.log("Personality profile saved:", profile);
      setIsDone(true);
      // Small pause so the user sees the completion state, then navigate
      setTimeout(() => router.push("/skill"), 900);
    } catch (err) {
      console.error("Quiz submit failed:", err);
      // Navigate anyway — don't block the user
      router.push("/skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await submitPersonalityQuiz({ skipped: true, answers: {} });
    } catch (err) {
      console.error("Skip failed:", err);
    } finally {
      setIsSubmitting(false);
      router.push("/skill");
    }
  };

  // ── Done state ────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="quiz-done">
        <div className="quiz-done__icon">✓</div>
        <p className="quiz-done__label">Got it — building your profile…</p>
        <style jsx>{`
          .quiz-done {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: var(--color-bg);
          }
          .quiz-done__icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--color-accent);
            color: #fff;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          }
          .quiz-done__label {
            color: var(--color-text-muted);
            font-size: 15px;
          }
          @keyframes pop {
            from { transform: scale(0.6); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <div className="quiz-page">
      {/* ── Header ── */}
      <header className="quiz-header">
        <span className="quiz-header__brand">Nexus</span>
        <button
          className="quiz-header__skip"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip quiz
        </button>
      </header>

      {/* ── Card ── */}
      <main className="quiz-card">
        {/* Progress */}
        <div className="quiz-progress">
          <ProgressBar
            percent={progressPercent}
            label={`${step + 1} of ${totalSteps}`}
          />
        </div>

        {/* Step indicator */}
        <p className="quiz-step-label">
          {step + 1} / {totalSteps} &nbsp;·&nbsp; Learning style
        </p>

        {/* Question */}
        <h2 className="quiz-question">{question.text}</h2>

        {/* Options */}
        <div className="quiz-options">
          {question.options.map((opt) => (
            <QuizOption
              key={opt.value}
              label={`${opt.emoji}  ${opt.label}`}
              state={selected === opt.value ? "selected" : "default"}
              onClick={() => handleSelect(opt.value)}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="quiz-cta">
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!selected || isSubmitting}
            loading={isSubmitting}
          >
            {isLastStep ? "Build my roadmap" : "Next"}
          </Button>
        </div>
      </main>

      {/* ── Step dots ── */}
      <nav className="quiz-dots" aria-label="Quiz progress">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`quiz-dot ${
              i < step ? "quiz-dot--done" : i === step ? "quiz-dot--active" : ""
            }`}
          />
        ))}
      </nav>

      {/* ── Styles ── */}
      <style jsx>{`
        /* ─ Layout ─────────────────────────────────────────── */
        .quiz-page {
          min-height: 100vh;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 40px;
        }

        /* ─ Header ──────────────────────────────────────────── */
        .quiz-header {
          width: 100%;
          max-width: 600px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0 32px;
        }
        .quiz-header__brand {
          font-weight: 700;
          font-size: 18px;
          color: var(--color-text);
          letter-spacing: -0.5px;
        }
        .quiz-header__skip {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: var(--color-text-muted);
          padding: 6px 10px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .quiz-header__skip:hover {
          color: var(--color-text);
          background: var(--color-surface-hover, rgba(0,0,0,0.04));
        }
        .quiz-header__skip:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ─ Card ─────────────────────────────────────────────── */
        .quiz-card {
          width: 100%;
          max-width: 600px;
          background: var(--color-surface);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 24px rgba(0,0,0,0.06);
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ─ Progress ─────────────────────────────────────────── */
        .quiz-progress {
          /* ProgressBar component handles its own layout */
        }

        /* ─ Step label ───────────────────────────────────────── */
        .quiz-step-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin: 0;
        }

        /* ─ Question ─────────────────────────────────────────── */
        .quiz-question {
          font-size: clamp(18px, 3vw, 22px);
          font-weight: 700;
          color: var(--color-text);
          line-height: 1.35;
          margin: 0;
        }

        /* ─ Options grid ─────────────────────────────────────── */
        .quiz-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 480px) {
          .quiz-options {
            grid-template-columns: 1fr;
          }
        }

        /* ─ CTA ──────────────────────────────────────────────── */
        .quiz-cta {
          margin-top: 8px;
        }

        /* ─ Step dots ────────────────────────────────────────── */
        .quiz-dots {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }
        .quiz-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-border, #e2e8f0);
          transition: background 0.2s, transform 0.2s;
        }
        .quiz-dot--done {
          background: var(--color-accent);
          opacity: 0.4;
        }
        .quiz-dot--active {
          background: var(--color-accent);
          transform: scale(1.3);
        }
      `}</style>
    </div>
  );
}
EOF

echo "✅  frontend/app/(dashboard)/quiz/page.tsx created"

# ─────────────────────────────────────────────────────────────
# 2. Update api.ts — add submitPersonalityQuiz (mock return)
#    Only adds the function if it doesn't already exist.
# ─────────────────────────────────────────────────────────────
API_FILE="frontend/lib/api.ts"

if ! grep -q "submitPersonalityQuiz" "$API_FILE" 2>/dev/null; then
  cat >> "$API_FILE" << 'EOF'

// ── Personality quiz ──────────────────────────────────────────
export interface PersonalityQuizPayload {
  skipped: boolean;
  answers: Record<string, string>;
}

export interface PersonalityProfile {
  learning_format: string;
  structure: string;
  pace: string;
  feedback: string;
  goal: string;
  skipped: boolean;
}

export async function submitPersonalityQuiz(
  payload: PersonalityQuizPayload
): Promise<PersonalityProfile> {
  // TODO: replace with real fetch when A's backend is live
  // return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/quiz/personality/submit`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // }).then((r) => r.json());

  await new Promise((r) => setTimeout(r, 400)); // simulate network

  if (payload.skipped) {
    return {
      learning_format: "",
      structure: "",
      pace: "",
      feedback: "",
      goal: "",
      skipped: true,
    };
  }

  return {
    learning_format: payload.answers.learning_format ?? "visual",
    structure:       payload.answers.structure       ?? "structured",
    pace:            payload.answers.pace            ?? "steady",
    feedback:        payload.answers.feedback        ?? "quizzes",
    goal:            payload.answers.goal            ?? "career",
    skipped: false,
  };
}
EOF
  echo "✅  submitPersonalityQuiz added to frontend/lib/api.ts"
else
  echo "ℹ️  submitPersonalityQuiz already exists in api.ts — skipped"
fi

echo ""
echo "────────────────────────────────────────────────────────"
echo "Feature 10 complete. Verify with:"
echo "  cd frontend && npm run dev"
echo "  Open http://localhost:3000/quiz"
echo ""
echo "Checklist:"
echo "  [ ] All 5 questions render one at a time"
echo "  [ ] Selecting an option highlights it (QuizOption selected state)"
echo "  [ ] Progress bar advances each step"
echo "  [ ] Step dots update correctly"
echo "  [ ] 'Next' disabled until an option is selected"
echo "  [ ] Final step button says 'Build my roadmap'"
echo "  [ ] Skip navigates straight to /skill"
echo "  [ ] On completion, green checkmark → navigates to /skill"
echo "────────────────────────────────────────────────────────"
