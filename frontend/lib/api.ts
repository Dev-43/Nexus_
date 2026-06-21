// frontend/lib/api.ts
// Typed API client for all Nexus backend endpoints.
// All functions currently return mock data.
// To wire up the real backend: replace the `return MOCK_...` line in each
// function with the `fetch(...)` block shown in the comment above it.

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface Resource {
  title: string;
  type: "article" | "video" | "exercise" | "project" | "documentation";
  url?: string;
  description?: string;
}
 
export interface Level {
  index: number;
  title: string;
  description: string;
  locked: boolean;
  resources: Resource[];
}


export interface Roadmap {
  id: string;
  skill_name: string;
  skill_level: SkillLevel;
  total_levels: number;
  levels: Level[];
  roadmap_version: number;
  current_level_index: number;
  roadmap_locked: boolean;
  regeneration_count: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizResult {
  skill_score: number;
  skill_level: SkillLevel;
  total_questions: number;
  correct_answers: number;
}

export interface PersonalityProfile {
  learning_style: "visual" | "text";
  pace: "structured" | "exploratory";
  feedback_preference: "frequent" | "minimal";
  goal_type: "career" | "hobby" | "academic";
  session_length: "short" | "long";
}

export interface UserStats {
  points: number;
  badges: string[];
  streak_days: number;
  last_active: string;
}

export interface SessionStartResponse {
  session_id: string;
  user_id: string;
  feature_flags: Record<string, boolean>;
  skill_name: string;
  skill_level: SkillLevel;
}

export interface GateTestAnswer {
  question_id: string;
  selected_option: string;
}

export interface GateTestResult {
  score: number;
  passed: boolean;
  partial_credit: boolean;
  fail_count: number;
  concept_gaps: string[];
}

export type SublevelDecision = "accept" | "reject" | "challenge" | "reassess" | "microlesson";

export interface SublevelResponse {
  sublevel_reject_count: number;
  next_action: string;
  mini_roadmap?: {
    title: string;
    lessons: { title: string; description: string }[];
  };
}

const MOCK_LEVELS: Level[] = [
  {
    index: 0,
    title: "Python Fundamentals",
    description: "Variables, data types, control flow, and basic functions.",
    resources: [
      { title: "Python Crash Course — Ch. 1–3", url: "#", type: "article" },
      { title: "Automate the Boring Stuff — Ch. 1", url: "#", type: "video" },
      { title: "FizzBuzz & basic loops exercise", url: "#", type: "exercise" },
    ],
    locked: false,
  },
  {
    index: 1,
    title: "Functions & Modules",
    description: "Writing reusable functions, scope, imports, and the standard library.",
    resources: [
      { title: "Real Python — Functions deep dive", url: "#", type: "article" },
      { title: "Corey Schafer — Python modules", url: "#", type: "video" },
      { title: "Build a CLI calculator", url: "#", type: "exercise" },
    ],
    locked: true,
  },
  {
    index: 2,
    title: "OOP & Project Structure",
    description: "Classes, inheritance, encapsulation, and laying out a real project.",
    resources: [
      { title: "Python OOP — Real Python", url: "#", type: "article" },
      { title: "Corey Schafer — OOP series", url: "#", type: "video" },
      { title: "Build a bank account class", url: "#", type: "exercise" },
    ],
    locked: true,
  },
];

const MOCK_ROADMAP: Roadmap = {
  id: "mock-roadmap-001",
  skill_name: "Python",
  skill_level: "beginner",
  total_levels: 3,
  levels: MOCK_LEVELS,
  roadmap_version: 1,
  current_level_index: 0,
  roadmap_locked: false,
  regeneration_count: 0,
};

const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "What does `len([1, 2, 3])` return?",
    options: ["2", "3", "4", "undefined"],
    difficulty: "easy",
  },
  {
    id: "q2",
    text: "Which keyword is used to define a function in Python?",
    options: ["func", "def", "fn", "function"],
    difficulty: "easy",
  },
  {
    id: "q3",
    text: "What is the output of `list(range(2, 8, 2))`?",
    options: ["[2, 4, 6]", "[2, 4, 6, 8]", "[2, 3, 4, 5, 6, 7]", "[0, 2, 4, 6]"],
    difficulty: "medium",
  },
];

const MOCK_USER_STATS: UserStats = {
  points: 50,
  badges: ["⭐ First skill"],
  streak_days: 1,
  last_active: new Date().toISOString(),
};

const MOCK_SESSION: SessionStartResponse = {
  session_id: "mock-session-001",
  user_id: "mock-user-001",
  feature_flags: {
    personality_quiz: true,
    adaptive_sublevel: true,
    gamification: true,
    email_job: false,
  },
  skill_name: "Python",
  skill_level: "beginner",
};


export async function startSession(payload: {
  user_id: string;
  skill_name: string;
  skill_level?: string;
  skip_assessment?: boolean;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json();
}

export async function submitPersonalityQuiz(
  userId: string,
  payload: { skipped: true } | { skipped: false; profile: PersonalityProfile }
): Promise<{ success: boolean; personality_profile: PersonalityProfile | null; quiz_skipped: boolean }> {
  const body = payload.skipped
    ? { user_id: userId, skipped: true }
    : { user_id: userId, skipped: false, ...payload.profile };

  const res = await fetch(`${BACKEND_URL}/quiz/personality/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submitPersonalityQuiz failed: ${res.status}`);
  return res.json();
}

export async function getPersonalityQuizStatus(
  userId: string
): Promise<{ has_completed: boolean; personality_profile: PersonalityProfile | null }> {
  const res = await fetch(
    `${BACKEND_URL}/quiz/personality/status?user_id=${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error(`getPersonalityQuizStatus failed: ${res.status}`);
  return res.json();
}

export function getAssessmentStreamUrl(session_id: string): string {
  return `${BACKEND_URL}/stream/assessment?session_id=${session_id}`;
}

export async function submitAssessmentAnswer(params: {
  session_id: string;
  question_id: string;
  answer: string;
}): Promise<{ next_question: Question | null; result: QuizResult | null }> {
  const isLastQuestion = params.question_id === "q3";
  if (isLastQuestion) {
    return {
      next_question: null,
      result: { skill_score: 0.6, skill_level: "beginner", total_questions: 3, correct_answers: 2 },
    };
  }
  return { next_question: MOCK_QUESTIONS[1] ?? null, result: null };
}

export function getRoadmapStreamUrl(sessionId: string): string {
  return `${BACKEND_URL}/stream/roadmap?session_id=${sessionId}`;
}

export async function getRoadmap(roadmapId: string): Promise<Roadmap> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/roadmap/${roadmapId}`);
  if (!res.ok) throw new Error(`getRoadmap failed: ${res.status}`);
  return res.json();
}

export async function regenerateRoadmap(id: string, feedback: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/roadmap/${id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `regenerateRoadmap failed: ${res.status}`);
  }
  return res.json(); // { message, roadmap_id, regeneration_count, session_id }
}

// Mock — returns immediately so SubLevelModal works without a live backend
export async function submitSublevelDecision(
  decision: SublevelDecision
): Promise<{ success: boolean; next_action: string }> {
  await new Promise((r) => setTimeout(r, 400)); // simulate network
  const nextActionMap: Record<SublevelDecision, string> = {
    accept: "sublevel_active",
    reject: "gate_test_retry",
    challenge: "challenge_mode",
    reassess: "reassess",
    microlesson: "microlesson",
  };
  return { success: true, next_action: nextActionMap[decision] };
}


export async function getUserStats(userId: string): Promise<UserStats> {
  const res = await fetch(
    `${BACKEND_URL}/user/stats?user_id=${encodeURIComponent(userId)}`,
    {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error(`GET /user/stats failed: ${res.status}`);
  return res.json();
}

// ── Gate test ──────────────────────────────────────────────────────────────

interface AnswerRecord {
  question_id: string;
  selected_index: number;
  concept_tag?: string;
}

export interface GateAnswerSubmission {
  question_id: string;
  selected_option: string;
  correct: boolean;
  concept_tag?: string;
}

export interface GateTestSubmitResult {
  score: number;            // 0.0-1.0, NOT a percentage
  passed: boolean;
  next_action: "unlock_next_level" | "partial_retry" | "offer_sublevel";
  fail_count: number;
  attempt_number: number;
  roadmap_locked: boolean;
  points_earned: number;
}

export async function submitGateTest(
  levelId: string,
  sessionId: string,
  roadmapId: string,
  answers: GateAnswerSubmission[]
): Promise<GateTestSubmitResult> {
  const res = await fetch(`${BACKEND_URL}/level/${levelId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      roadmap_id: roadmapId,
      answers,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Gate test submit failed: ${res.status}`);
  }
  return res.json();
}