// frontend/lib/hooks/useAssessmentStream.ts

import { useCallback, useEffect, useRef, useState } from "react";

export type Difficulty = "easy" | "medium" | "hard";

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: { id: string; label: string }[];
  difficulty: Difficulty;
  conceptTag: string;
}

export interface AssessmentStreamState {
  question: AssessmentQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  difficulty: Difficulty;
  isConnecting: boolean;
  isComplete: boolean;
  error: string | null;
}

export interface AssessmentStreamCallbacks {
  onComplete: (skillScore: number, skillLevel: "beginner" | "intermediate" | "advanced") => void;
}

const MOCK_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1",
    text: "What does the following Python expression evaluate to?\n`type([]) == list`",
    options: [
      { id: "a", label: "True" },
      { id: "b", label: "False" },
      { id: "c", label: "TypeError" },
      { id: "d", label: "None" },
    ],
    difficulty: "easy",
    conceptTag: "types",
  },
  {
    id: "q2",
    text: "Which built-in function returns an iterator of (index, value) pairs?",
    options: [
      { id: "a", label: "zip()" },
      { id: "b", label: "map()" },
      { id: "c", label: "enumerate()" },
      { id: "d", label: "filter()" },
    ],
    difficulty: "easy",
    conceptTag: "builtins",
  },
  {
    id: "q3",
    text: "What is the time complexity of looking up a key in a Python dict?",
    options: [
      { id: "a", label: "O(n)" },
      { id: "b", label: "O(log n)" },
      { id: "c", label: "O(1) amortised" },
      { id: "d", label: "O(n²)" },
    ],
    difficulty: "medium",
    conceptTag: "data-structures",
  },
  {
    id: "q4",
    text: "What will `[x*2 for x in range(3) if x != 1]` produce?",
    options: [
      { id: "a", label: "[0, 4]" },
      { id: "b", label: "[0, 2, 4]" },
      { id: "c", label: "[2, 4]" },
      { id: "d", label: "[0, 2]" },
    ],
    difficulty: "medium",
    conceptTag: "comprehensions",
  },
  {
    id: "q5",
    text: "In Python, what is a `__slots__` declaration used for?",
    options: [
      { id: "a", label: "Define class methods" },
      { id: "b", label: "Restrict instance attributes and reduce memory" },
      { id: "c", label: "Mark attributes as private" },
      { id: "d", label: "Enable multiple inheritance" },
    ],
    difficulty: "hard",
    conceptTag: "oop",
  },
  {
    id: "q6",
    text: "What does `asyncio.gather()` do when one of its awaitables raises an exception?",
    options: [
      { id: "a", label: "Silently skips the failed task" },
      { id: "b", label: "Cancels all remaining tasks immediately" },
      { id: "c", label: "Re-raises the first exception after all tasks complete" },
      { id: "d", label: "Returns None for failed tasks" },
    ],
    difficulty: "hard",
    conceptTag: "async",
  },
];

function stepDifficulty(current: Difficulty, wasCorrect: boolean): Difficulty {
  if (!wasCorrect) return current;
  if (current === "easy")   return "medium";
  if (current === "medium") return "hard";
  return "hard";
}

const CORRECT: Record<string, string> = {
  q1: "a",
  q2: "c",
  q3: "c",
  q4: "a",
  q5: "b",
  q6: "c",
};

function scoreFromHistory(
  answers: { difficulty: Difficulty; wasCorrect: boolean }[]
): { score: number; level: "beginner" | "intermediate" | "advanced" } {
  if (answers.length === 0) return { score: 0.3, level: "beginner" };
  const W = { easy: 1, medium: 2, hard: 3 };
  let earned = 0, possible = 0;
  for (const a of answers) {
    possible += W[a.difficulty];
    if (a.wasCorrect) earned += W[a.difficulty];
  }
  const score = possible > 0 ? earned / possible : 0;
  const level = score >= 0.7 ? "advanced" : score >= 0.4 ? "intermediate" : "beginner";
  return { score, level };
}

export function useAssessmentStream(
  _backendUrl: string | null,
  { onComplete }: AssessmentStreamCallbacks
) {
  const [state, setState] = useState<AssessmentStreamState>({
    question: null,
    questionIndex: 0,
    totalQuestions: MOCK_QUESTIONS.length,
    difficulty: "easy",
    isConnecting: true,
    isComplete: false,
    error: null,
  });

  const answerHistory = useRef<{ difficulty: Difficulty; wasCorrect: boolean }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setState((s) => ({
        ...s,
        isConnecting: false,
        question: { ...MOCK_QUESTIONS[0], difficulty: "easy" },
      }));
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const submitAnswer = useCallback(
    (selectedOptionId: string) => {
      setState((prev) => {
        if (!prev.question) return prev;

        const wasCorrect = CORRECT[prev.question.id] === selectedOptionId;
        answerHistory.current.push({ difficulty: prev.difficulty, wasCorrect });

        const nextIdx = prev.questionIndex + 1;

        if (nextIdx >= MOCK_QUESTIONS.length) {
          const { score, level } = scoreFromHistory(answerHistory.current);
          setTimeout(() => onComplete(score, level), 600);
          return { ...prev, isComplete: true };
        }

        // Always advance by index — never skip, never re-serve the same question.
        // Adaptive difficulty is overlaid on the next question object so the pill
        // updates and QuestionCard always gets a distinct id → remounts → resets.
        const newDifficulty = stepDifficulty(prev.difficulty, wasCorrect);
        const nextQuestion: AssessmentQuestion = {
          ...MOCK_QUESTIONS[nextIdx],
          difficulty: newDifficulty,
        };

        return {
          ...prev,
          question: nextQuestion,
          questionIndex: nextIdx,
          difficulty: newDifficulty,
        };
      });
    },
    [onComplete]
  );

  return { state, submitAnswer };
}
