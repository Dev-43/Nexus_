"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RoadmapStream } from "@/components/features/RoadmapStream";
import { RoadmapRegenerate } from "@/components/features/RoadmapRegenerate";

import { getRoadmap, getRoadmapStreamUrl } from "@/lib/api";
import type { Roadmap, Level } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

type PagePhase = "streaming" | "ready" | "regenerating" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLevelState(
  level: Level,
  index: number,
  currentIndex: number
): "completed" | "current" | "locked" {
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "locked";
}

function completedCount(levels: Level[], currentIndex: number): number {
  return Math.max(0, currentIndex);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LevelStatusPill({
  state,
}: {
  state: "completed" | "current" | "locked";
}) {
  const labels = {
    completed: "Completed",
    current: "Ready to start",
    locked: "Locked",
  };
  return <span className={`level-status-pill level-status-pill--${state}`}>{labels[state]}</span>;
}

function LevelCard({
  level,
  index,
  state,
  onClick,
}: {
  level: Level;
  index: number;
  state: "completed" | "current" | "locked";
  onClick: () => void;
}) {
  const isClickable = state !== "locked";
  const lessonCount = level.resources?.length ?? 0;

  return (
    <div
      className={`level-card level-card--${state}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      aria-disabled={state === "locked"}
      aria-label={
        state === "locked"
          ? `Level ${index + 1}: ${level.title} — locked`
          : `Level ${index + 1}: ${level.title}`
      }
    >
      <div className={`level-num level-num--${state}`}>
        {state === "completed" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      <div className="level-body">
        <p className="level-title">{level.title}</p>
        {level.description && (
          <p className="level-desc">{level.description}</p>
        )}
        <div className="level-meta">
          <LevelStatusPill state={state} />
          {lessonCount > 0 && (
            <span className="level-lesson-count">
              {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {state === "locked" && (
        <svg
          className="level-lock"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoadmapOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<PagePhase>("streaming");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [roadmapLocked, setRoadmapLocked] = useState(false);
  const [streamKey, setStreamKey] = useState(0); // bump to re-mount RoadmapStream

  const handleStreamComplete = useCallback(async (roadmapId: string) => {
    try {
      const data = await getRoadmap(roadmapId || id);
      setRoadmap(data);
      setRegenerationCount((data.roadmap_version ?? 1) - 1); // version starts at 1
      setRoadmapLocked(data.roadmap_locked ?? false);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [id]);

  const handleStreamError = useCallback((_message: string) => {
    setPhase("error");
  }, []);

  // Triggered by RoadmapRegenerate after backend confirms the regen
  const handleRegenerate = useCallback(() => {
    setPhase("regenerating");
    setRoadmap(null);
    // Small delay so the streaming UI unmounts cleanly before remounting
    setTimeout(() => {
      setStreamKey((k) => k + 1);
      setPhase("streaming");
    }, 150);
  }, []);

  const handleLevelClick = (levelIndex: number) => {
    if (!roadmap) return;
    router.push(`/roadmap/${roadmap.id}/level/${levelIndex}`);
  };

  // ── Render: streaming / regenerating ───────────────────────────────────────

  if (phase === "streaming" || phase === "regenerating") {
    return (
      <div className="roadmap-page">
        <div className="roadmap-page__header">
          <p className="roadmap-page__eyebrow">Building your roadmap</p>
          <h1 className="roadmap-page__title">
            {phase === "regenerating" ? "Rebuilding…" : "Generating…"}
          </h1>
        </div>
        <RoadmapStream
          key={streamKey}
          streamUrl={getRoadmapStreamUrl(id)}
          onComplete={handleStreamComplete}
          onError={handleStreamError}
        />
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────

  if (phase === "error" || !roadmap) {
    return (
      <div className="roadmap-page roadmap-page--error">
        <p className="roadmap-page__eyebrow">Something went wrong</p>
        <h1 className="roadmap-page__title">Couldn't load your roadmap</h1>
        <p className="roadmap-page__subtitle">
          Try refreshing. If it keeps happening, regenerate from the previous screen.
        </p>
        <button className="btn-retry" onClick={() => router.push("/skill")}>
          Start over
        </button>
      </div>
    );
  }

  // ── Render: ready ──────────────────────────────────────────────────────────

  const currentIndex = roadmap.current_level_index ?? 0;
  const levels = roadmap.levels ?? [];
  const completed = completedCount(levels, currentIndex);
  const progressPct = levels.length > 0 ? Math.round((completed / levels.length) * 100) : 0;

  return (
    <div className="roadmap-page">
      {/* Header */}
      <div className="roadmap-page__header">
        <p className="roadmap-page__eyebrow">
          {roadmap.skill_name} · {roadmap.skill_level}
        </p>
        <h1 className="roadmap-page__title">Your learning roadmap</h1>
        <div className="roadmap-page__meta">
          <span>{levels.length} levels</span>
          <span aria-hidden="true">·</span>
          <span className="roadmap-version-badge">v{roadmap.roadmap_version ?? 1}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="roadmap-progress-section">
        <div className="roadmap-progress-section__info">
          <p className="roadmap-progress-section__label">Overall progress</p>
          <ProgressBar value={progressPct} label={`${progressPct}% complete`} />
        </div>
        <span className="roadmap-progress-section__pct" aria-label={`${progressPct} percent complete`}>
          {progressPct}%
        </span>
      </div>

      {/* Regenerate */}
      <RoadmapRegenerate
        roadmapId={roadmap.id}
        roadmapLocked={roadmapLocked}
        regenerationCount={regenerationCount}
        onRegenerateStart={handleRegenerate}
      />

      {/* Level list */}
      <div className="level-list" role="list" aria-label="Roadmap levels">
        {levels.map((level, index) => {
          const levelState = getLevelState(level, index, currentIndex);
          return (
            <div key={level.index ?? index} role="listitem">
              <LevelCard
                level={level}
                index={index}
                state={levelState}
                onClick={() => handleLevelClick(index)}
              />
              {index < levels.length - 1 && (
                <div className="level-connector" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
