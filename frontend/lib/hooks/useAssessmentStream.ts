"use client";

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

export interface AssessmentStreamParams {
  sessionId: string;
  skillName: string;
}

const TOTAL_QUESTIONS = 6;

// ─── Flip to true for offline/dev work without a live backend ─────────────
const MOCK_MODE = false;

const MOCK_QUESTIONS: AssessmentQuestion[] = [
  { id: "q1", text: "What does the following Python expression evaluate to?\n`type([]) == list`",
    options: [{ id: "a", label: "True" }, { id: "b", label: "False" }, { id: "c", label: "TypeError" }, { id: "d", label: "None" }],
    difficulty: "easy", conceptTag: "types" },
  { id: "q2", text: "Which built-in function returns an iterator of (index, value) pairs?",
    options: [{ id: "a", label: "zip()" }, { id: "b", label: "map()" }, { id: "c", label: "enumerate()" }, { id: "d", label: "filter()" }],
    difficulty: "easy", conceptTag: "builtins" },
  { id: "q3", text: "What is the time complexity of looking up a key in a Python dict?",
    options: [{ id: "a", label: "O(n)" }, { id: "b", label: "O(log n)" }, { id: "c", label: "O(1) amortised" }, { id: "d", label: "O(n²)" }],
    difficulty: "medium", conceptTag: "data-structures" },
  { id: "q4", text: "What will `[x*2 for x in range(3) if x != 1]` produce?",
    options: [{ id: "a", label: "[0, 4]" }, { id: "b", label: "[0, 2, 4]" }, { id: "c", label: "[2, 4]" }, { id: "d", label: "[0, 2]" }],
    difficulty: "medium", conceptTag: "comprehensions" },
  { id: "q5", text: "In Python, what is a `__slots__` declaration used for?",
    options: [{ id: "a", label: "Define class methods" }, { id: "b", label: "Restrict instance attributes and reduce memory" }, { id: "c", label: "Mark attributes as private" }, { id: "d", label: "Enable multiple inheritance" }],
    difficulty: "hard", conceptTag: "oop" },
  { id: "q6", text: "What does `asyncio.gather()` do when one of its awaitables raises an exception?",
    options: [{ id: "a", label: "Silently skips the failed task" }, { id: "b", label: "Cancels all remaining tasks immediately" }, { id: "c", label: "Re-raises the first exception after all tasks complete" }, { id: "d", label: "Returns None for failed tasks" }],
    difficulty: "hard", conceptTag: "async" },
];
const MOCK_CORRECT: Record<string, string> = { q1: "a", q2: "c", q3: "c", q4: "a", q5: "b", q6: "c" };

function stepDifficulty(current: Difficulty, wasCorrect: boolean): Difficulty {
  if (!wasCorrect) return current;
  if (current === "easy") return "medium";
  if (current === "medium") return "hard";
  return "hard";
}

function scoreFromHistory(answers: { difficulty: Difficulty; wasCorrect: boolean }[]) {
  if (answers.length === 0) return { score: 0.3, level: "beginner" as const };
  const W = { easy: 1, medium: 2, hard: 3 };
  let earned = 0, possible = 0;
  for (const a of answers) {
    possible += W[a.difficulty];
    if (a.wasCorrect) earned += W[a.difficulty];
  }
  const score = possible > 0 ? earned / possible : 0;
  const level = score >= 0.7 ? "advanced" : score >= 0.4 ? "intermediate" : "beginner";
  return { score, level: level as "beginner" | "intermediate" | "advanced" };
}

export function useAssessmentStream(
  params: AssessmentStreamParams | null,
  { onComplete }: AssessmentStreamCallbacks
) {
  const [state, setState] = useState<AssessmentStreamState>({
    question: null,
    questionIndex: 0,
    totalQuestions: TOTAL_QUESTIONS,
    difficulty: "easy",
    isConnecting: true,
    isComplete: false,
    error: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const questionCountRef = useRef(0);
  const mockHistoryRef = useRef<{ difficulty: Difficulty; wasCorrect: boolean }[]>([]);

  const cleanup = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── MOCK PATH ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MOCK_MODE) return;
    const t = setTimeout(() => {
      setState((s) => ({ ...s, isConnecting: false, question: { ...MOCK_QUESTIONS[0], difficulty: "easy" } }));
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // ── REAL SSE PATH ──────────────────────────────────────────────────────
  useEffect(() => {
    if (MOCK_MODE || !params) return;
    cleanup();
    questionCountRef.current = 0;

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/assessment?session_id=${params.sessionId}&skill_name=${encodeURIComponent(params.skillName)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "question") {
          const idx = questionCountRef.current;
          questionCountRef.current += 1;
          setState((s) => ({
            ...s,
            isConnecting: false,
            question: data.question,
            questionIndex: idx,
            difficulty: data.question.difficulty,
          }));
        } else if (data.type === "done") {
          setState((s) => ({ ...s, isComplete: true }));
          cleanup();
          onComplete(data.skill_score, data.skill_level);
        }
      } catch {
        // ignore non-JSON keepalive lines, if any
      }
    };

    es.onerror = () => {
      setState((s) => ({ ...s, error: "Connection lost during assessment." }));
      cleanup();
    };

    return cleanup;
  }, [params?.sessionId, params?.skillName]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswerMock = useCallback(
    (selectedOptionId: string) => {
      setState((prev) => {
        if (!prev.question) return prev;
        const wasCorrect = MOCK_CORRECT[prev.question.id] === selectedOptionId;
        mockHistoryRef.current.push({ difficulty: prev.difficulty, wasCorrect });
        const nextIdx = prev.questionIndex + 1;
        if (nextIdx >= MOCK_QUESTIONS.length) {
          const { score, level } = scoreFromHistory(mockHistoryRef.current);
          setTimeout(() => onComplete(score, level), 600);
          return { ...prev, isComplete: true };
        }
        const newDifficulty = stepDifficulty(prev.difficulty, wasCorrect);
        return {
          ...prev,
          question: { ...MOCK_QUESTIONS[nextIdx], difficulty: newDifficulty },
          questionIndex: nextIdx,
          difficulty: newDifficulty,
        };
      });
    },
    [onComplete]
  );

  const submitAnswerReal = useCallback(
    (selectedOptionId: string) => {
      const prev = stateRef.current;
      if (!prev.question || !params) return;
      const selectedIndex = prev.question.options.findIndex((o) => o.id === selectedOptionId);
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/quiz/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: params.sessionId,
          question_index: prev.questionIndex,
          selected_index: selectedIndex,
        }),
      }).catch((err) => console.error("submitAnswer failed:", err));
      // next question/done arrives via the open SSE connection — no state change here
    },
    [params]
  );

  return { state, submitAnswer: MOCK_MODE ? submitAnswerMock : submitAnswerReal };
}