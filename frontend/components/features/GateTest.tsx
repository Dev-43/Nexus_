// ── frontend/components/features/GateTest.tsx ───────────────────────────
// FULL REPLACEMENT. Changes from the previous version:
//
//   1. New required props: sessionId, roadmapId — backend's
//      GateTestSubmission requires both, component had neither.
//   2. Answers now include `correct: boolean`, computed from
//      question.correct_index — matches what level_gate_node actually
//      reads (a.get("correct", False)). Field renamed selected_index ->
//      selected_option per the backend's AnswerItem shape (sent as the
//      option label, e.g. "A"/"B"/"C"/"D", since that's what
//      selected_option as a string most naturally represents — adjust
//      if your real backend-generated questions use a different option
//      identifier scheme).
//   3. Removed the silent mock-scoring fallback entirely — a failed
//      submit now surfaces as a visible error, full stop.
//   4. Reveal state now comes from the backend's `next_action`
//      ("unlock_next_level" | "partial_retry" | "offer_sublevel"),
//      not re-derived from a raw score on the client. The node's
//      retry-vs-fail logic depends on attempt_number, which the client
//      can't reliably reproduce.
//   5. Score is displayed as score*100, since the backend returns
//      0.0-1.0, not a percentage.

"use client";

import { useState } from "react";
import QuizOption from "@/components/ui/QuizOption";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { submitGateTest, type GateAnswerSubmission, type GateTestSubmitResult } from "@/lib/api";

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
  questions?: GateTestQuestion[];
  onResult: (score: number, passed: boolean,pointsEarned: number) => void;
  /** Called specifically when the fail CTA "View sublevel suggestion" is clicked */
  onSubLevel?: () => void;
}

// Maps backend next_action directly to the reveal UI state — single
// source of truth lives on the backend now, not re-derived from score.
function revealStateFromNextAction(nextAction: string): RevealState {
  if (nextAction === "unlock_next_level") return "pass";
  if (nextAction === "partial_retry") return "partial";
  return "fail"; // offer_sublevel, or any unrecognised value — fail-safe
}

const MOCK_QUESTIONS: GateTestQuestion[] = [
  {
    id: "q1",
    text: "In Python, what does the `__init__` method do?",
    options: [
      "Destroys an object when it goes out of scope",
      "Initialises a new instance of a class",
      "Imports external modules",
      "Defines a class method",
    ],
    correct_index: 1,
    concept_tag: "oop_basics",
  },
  {
    id: "q2",
    text: "Which of these is a mutable data type in Python?",
    options: ["tuple", "string", "list", "integer"],
    correct_index: 2,
    concept_tag: "data_types",
  },
  {
    id: "q3",
    text: "What does `*args` allow a function to accept?",
    options: [
      "A fixed number of keyword arguments",
      "Any number of positional arguments",
      "Only integer arguments",
      "A dictionary of named arguments",
    ],
    correct_index: 1,
    concept_tag: "functions",
  },
  {
    id: "q4",
    text: "What is the output of `type([])`?",
    options: [
      "<class 'array'>",
      "<class 'list'>",
      "<class 'tuple'>",
      "<class 'sequence'>",
    ],
    correct_index: 1,
    concept_tag: "data_types",
  },
  {
    id: "q5",
    text: "Which keyword creates a generator function in Python?",
    options: ["return", "async", "yield", "generate"],
    correct_index: 2,
    concept_tag: "advanced_functions",
  },
];

interface RevealProps {
  score: number; // 0.0-1.0
  state: RevealState;
  onContinue: () => void;
  onSubLevel?: () => void;
}

function ScoreReveal({ score, state, onContinue, onSubLevel }: RevealProps) {
  const displayScore = Math.round(score * 100);

  const config = {
    pass: {
      icon: "🏆",
      headline: "Level complete",
      sub: "You passed. The next level is unlocked — you've clearly got this.",
      cta: "Go to next level",
      barColor: "#1D9E75",
      scoreColor: "#085041",
      bgColor: "#E1F5EE",
      thresholdLabel: "✓ 70% pass",
      thresholdColor: "#0F6E56",
    },
    partial: {
      icon: "🔥",
      headline: "Almost there",
      sub: "You're in the 60–69% range. One more attempt available — no penalty for trying again.",
      cta: "Retry test",
      barColor: "#EF9F27",
      scoreColor: "#633806",
      bgColor: "#FAEEDA",
      thresholdLabel: "↑ 70% to pass",
      thresholdColor: "#BA7517",
    },
    fail: {
      icon: "⚠️",
      headline: "Some concepts need work",
      sub: "Nexus found gaps in your answers. A short targeted lesson covers only what tripped you up.",
      cta: "View sublevel suggestion",
      barColor: "#D85A30",
      scoreColor: "#712B13",
      bgColor: "#FAECE7",
      thresholdLabel: "↑ 70% to pass",
      thresholdColor: "#D85A30",
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
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6"
        style={{ background: config.bgColor }}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      <p className="text-6xl font-medium mb-1 leading-none" style={{ color: config.scoreColor }}>
        {displayScore}%
      </p>
      <p className="text-xs tracking-widest uppercase text-secondary mb-3">your score</p>

      <p className="text-xl font-medium text-primary mb-2">{config.headline}</p>
      <p className="text-sm text-secondary leading-relaxed max-w-sm mb-8">{config.sub}</p>

      <div className="w-full max-w-xs mb-8">
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--color-border-tertiary)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${displayScore}%`, background: config.barColor }}
          />
        </div>
        <div className="flex justify-between text-xs text-tertiary">
          <span>0%</span>
          <span style={{ color: config.thresholdColor, fontWeight: 500 }}>{config.thresholdLabel}</span>
          <span>100%</span>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button variant="primary" onClick={handleCta}>{config.cta}</Button>
        <Button variant="ghost" onClick={() => window.history.back()}>Back to content</Button>
      </div>
    </div>
  );
}

export default function GateTest({
  levelId,
  sessionId,
  roadmapId,
  questions = MOCK_QUESTIONS,
  onResult,
  onSubLevel,
}: GateTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<GateAnswerSubmission[]>([]);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0); // 0.0-1.0
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalPointsEarned, setFinalPointsEarned] = useState<number>(0);
  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercent = (currentIndex / questions.length) * 100;
  const OPTION_LABELS = ["A", "B", "C", "D"];

  function handleSelect(optionIndex: number) {
    if (revealed) return;
    setSelectedOption(optionIndex);
    setRevealed(true);
  }

  async function handleNext() {
    if (selectedOption === null) return;

    // correct is computed client-side from correct_index for now — this
    // matches the backend's actual contract (level_gate_node trusts the
    // submitted `correct` flag as-is), not a new design decision made
    // here. Flagged separately as a real grading-integrity gap, not
    // something this change attempts to fix.
    const record: GateAnswerSubmission = {
      question_id: question.id,
      selected_option: OPTION_LABELS[selectedOption] ?? String(selectedOption),
      correct: question.correct_index === selectedOption,
      concept_tag: question.concept_tag,
    };

    const nextAnswers = [...answers, record];
    setAnswers(nextAnswers);

    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result: GateTestSubmitResult = await submitGateTest(
        levelId,
        sessionId,
        roadmapId,
        nextAnswers
      );
      setFinalScore(result.score);
      setFinalPointsEarned(result.points_earned ?? 0);
      setRevealState(revealStateFromNextAction(result.next_action));
    } catch (err) {
      console.error("Gate test submit failed:", err);
      setError("Something went wrong submitting your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRevealContinue() {
    if (revealState === null) return;
    onResult(finalScore, revealState === "pass", finalPointsEarned);
  }

  function getOptionState(optIndex: number): "default" | "selected" | "correct" | "wrong" {
    if (!revealed) {
      return optIndex === selectedOption ? "selected" : "default";
    }
    const correctIndex = question.correct_index ?? -1;
    if (optIndex === correctIndex) return "correct";
    if (optIndex === selectedOption && optIndex !== correctIndex) return "wrong";
    return "default";
  }

  if (revealState !== null) {
    return (
      <ScoreReveal
        score={finalScore}
        state={revealState}
        onContinue={handleRevealContinue}
        onSubLevel={onSubLevel}
      />
    );
  }

  return (
    <div className="max-w-xl">
      <ProgressBar value={progressPercent} label={`Question ${currentIndex + 1} of ${questions.length}`} />

      <p className="text-lg font-medium text-primary leading-snug mb-6">{question.text}</p>

      <div className="flex flex-col gap-2.5 mb-8">
        {question.options.map((opt, i) => (
          <QuizOption
            key={i}
            label={OPTION_LABELS[i]}
            text={opt}
            state={getOptionState(i)}
            onClick={() => handleSelect(i)}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <Button
        variant="primary"
        onClick={handleNext}
        disabled={selectedOption === null || submitting}
        loading={submitting}
      >
        {submitting ? "Submitting…" : isLastQuestion ? "See results" : "Next question →"}
      </Button>
    </div>
  );
}