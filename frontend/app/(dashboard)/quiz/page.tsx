"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuizOption } from "@/components/ui/QuizOption";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { submitPersonalityQuiz, type PersonalityProfile } from "@/lib/api";

// ── Quiz content ──────────────────────────────────────────────
// Maps to PersonalityProfile fields:
//   learning_style | pace | feedback_preference | goal_type | session_length
const QUESTIONS = [
  {
    id: "learning_style" as const,
    text: "When you're learning something new, what clicks best for you?",
    options: [
      { label: "👁", text: "Diagrams & visuals" },
      { label: "📖", text: "Written explanations" },
    ],
  },
  {
    id: "pace" as const,
    text: "How do you like your learning path structured?",
    options: [
      { label: "🗂", text: "Step-by-step curriculum" },
      { label: "🧭", text: "Follow my curiosity" },
    ],
  },
  {
    id: "feedback_preference" as const,
    text: "How do you prefer to know you're on track?",
    options: [
      { label: "✅", text: "Frequent short quizzes" },
      { label: "🤫", text: "Minimal — I'll self-assess" },
    ],
  },
  {
    id: "goal_type" as const,
    text: "What's the main goal behind learning this skill?",
    options: [
      { label: "💼", text: "Career or job" },
      { label: "🎓", text: "Academic study" },
      { label: "🔭", text: "Hobby or curiosity" },
    ],
  },
  {
    id: "session_length" as const,
    text: "How long are you comfortable studying in one sitting?",
    options: [
      { label: "⚡", text: "Short bursts (under 30 min)" },
      { label: "🏋️", text: "Long sessions (1 hr+)" },
    ],
  },
] satisfies {
  id: keyof PersonalityProfile;
  text: string;
  options: { label: string; text: string }[];
}[];

// Map the text answer back to the typed PersonalityProfile value
const VALUE_MAP: Record<string, string> = {
  "Diagrams & visuals":      "visual",
  "Written explanations":    "text",
  "Step-by-step curriculum": "structured",
  "Follow my curiosity":     "exploratory",
  "Frequent short quizzes":  "frequent",
  "Minimal — I'll self-assess": "minimal",
  "Career or job":           "career",
  "Academic study":          "academic",
  "Hobby or curiosity":      "hobby",
  "Short bursts (under 30 min)": "short",
  "Long sessions (1 hr+)":   "long",
};

// ── Component ─────────────────────────────────────────────────
export default function PersonalityQuizPage() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  // Store the raw text answer per question id
  const [answers, setAnswers]     = useState<Partial<Record<keyof PersonalityProfile, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone]       = useState(false);

  const question    = QUESTIONS[step];
  const totalSteps  = QUESTIONS.length;
  const progressVal = Math.round((step / totalSteps) * 100);
  const isLastStep  = step === totalSteps - 1;

  // ── Build PersonalityProfile from collected answers ───────────
  const buildProfile = (
    finalAnswers: Partial<Record<keyof PersonalityProfile, string>>
  ): PersonalityProfile => ({
    learning_style:       (VALUE_MAP[finalAnswers.learning_style       ?? ""] as PersonalityProfile["learning_style"])       ?? "visual",
    pace:                 (VALUE_MAP[finalAnswers.pace                 ?? ""] as PersonalityProfile["pace"])                 ?? "structured",
    feedback_preference:  (VALUE_MAP[finalAnswers.feedback_preference  ?? ""] as PersonalityProfile["feedback_preference"])  ?? "frequent",
    goal_type:            (VALUE_MAP[finalAnswers.goal_type            ?? ""] as PersonalityProfile["goal_type"])            ?? "career",
    session_length:       (VALUE_MAP[finalAnswers.session_length       ?? ""] as PersonalityProfile["session_length"])       ?? "short",
  });

  // ── Handlers ──────────────────────────────────────────────────
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
      await submitPersonalityQuiz({
        skipped: false,
        profile: buildProfile(updatedAnswers),
      });
      setIsDone(true);
      setTimeout(() => router.push("/skill"), 900);
    } catch (err) {
      console.error("Quiz submit failed:", err);
      router.push("/skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await submitPersonalityQuiz({ skipped: true });
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
            background: var(--color-brand);
            color: #fff;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          }
          .quiz-done__label {
            color: var(--color-text-secondary);
            font-size: 15px;
            font-family: var(--font-body);
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
      {/* Header */}
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

      {/* Card */}
      <main className="quiz-card">
        {/* Progress bar — uses `value` prop */}
        <ProgressBar
          value={progressVal}
          max={100}
          size="xs"
          label={`Question ${step + 1} of ${totalSteps}`}
          animated
        />

        {/* Step pill */}
        <p className="quiz-step-label">Learning style · {step + 1} / {totalSteps}</p>

        {/* Question */}
        <h2 className="quiz-question">{question.text}</h2>

        {/* Options — `label` is the badge/emoji, `text` is the description */}
        <div className="quiz-options">
          {question.options.map((opt) => (
            <QuizOption
              key={opt.text}
              label={opt.label}
              text={opt.text}
              state={selected === opt.text ? "selected" : "default"}
              onClick={() => setSelected(opt.text)}
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

      {/* Step dots */}
      <nav className="quiz-dots" aria-label="Quiz progress">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`quiz-dot${i < step ? " quiz-dot--done" : i === step ? " quiz-dot--active" : ""}`}
          />
        ))}
      </nav>

      <style jsx>{`
        .quiz-page {
          min-height: 100vh;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 40px;
        }

        /* Header */
        .quiz-header {
          width: 100%;
          max-width: 560px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0 28px;
        }
        .quiz-header__brand {
          font-weight: 700;
          font-size: 18px;
          color: var(--color-text-primary);
          letter-spacing: -0.5px;
          font-family: var(--font-display);
        }
        .quiz-header__skip {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: var(--color-text-secondary);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          transition: color 0.15s;
          font-family: var(--font-body);
        }
        .quiz-header__skip:hover { color: var(--color-text-primary); }
        .quiz-header__skip:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Card */
        .quiz-card {
          width: 100%;
          max-width: 560px;
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: 28px;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Step label */
        .quiz-step-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin: 0;
          font-family: var(--font-body);
        }

        /* Question */
        .quiz-question {
          font-size: clamp(17px, 3vw, 21px);
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.35;
          margin: 0;
          font-family: var(--font-display);
        }

        /* Options */
        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* CTA */
        .quiz-cta { margin-top: 4px; }

        /* Step dots */
        .quiz-dots {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }
        .quiz-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-border);
          transition: background 0.2s, transform 0.2s;
        }
        .quiz-dot--done    { background: var(--color-brand); opacity: 0.35; }
        .quiz-dot--active  { background: var(--color-brand); transform: scale(1.35); }

        @media (max-width: 480px) {
          .quiz-card { padding: 20px; }
        }
      `}</style>
    </div>
  );
}
