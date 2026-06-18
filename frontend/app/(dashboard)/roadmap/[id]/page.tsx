"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { RoadmapRegenerate } from "@/components/features/RoadmapRegenerate";
import CompletionOverlay from "@/components/features/CompletionOverlay";
import { getRoadmap, getUserStats, startSession, type Roadmap as ApiRoadmap } from "@/lib/api";

interface Level {
  index: number;
  title: string;
  description: string;
  locked: boolean;
  completed: boolean;
}

interface Roadmap {
  id: string;
  skill_name: string;
  skill_level: "beginner" | "intermediate" | "advanced";
  total_levels: number;
  roadmap_locked: boolean;
  regeneration_count: number;
  levels: Level[];
}

interface UserStats {
  points: number;
  badges: string[];
  streak_days: number;
}

function getBadgeForLevel(skillLevel: string): string {
  const map: Record<string, string> = {
    beginner: "Bronze",
    intermediate: "Silver",
    advanced: "Gold",
  };
  return map[skillLevel] ?? "Bronze";
}

const LEVEL_COMPLETE_POINTS = 200;

export default function RoadmapOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const roadmapId = params.id as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  // Trigger overlay via ?complete=true (set by GateTest on final level pass)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("complete") === "true") setShowCompletion(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const rm = await getRoadmap(roadmapId);
        setRoadmap(toLocalRoadmap(rm));

        try {
          const stats = await getUserStats();
          setUserStats(stats);
        } catch (statsErr) {
          console.warn("Failed to load user stats, using defaults:", statsErr);
          setUserStats({ points: 0, badges: [], streak_days: 0 });
        }
      } catch (err) {
        console.error("Failed to load roadmap:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roadmapId]);

  function toLocalRoadmap(apiRoadmap: ApiRoadmap): Roadmap {
    return {
      ...apiRoadmap,
      levels: apiRoadmap.levels.map((level, index) => ({
        ...level,
        completed: index < apiRoadmap.current_level_index,
      })),
    };
  }

  const handleLevelUp = async (nextLevel: string) => {
    if (!roadmap) return;
    await startSession({
      skill_name: roadmap.skill_name,
      skill_level: nextLevel,
      skip_assessment: true,
    });
    // CompletionOverlay handles the router.push("/loading")
  };

  const completedCount = roadmap?.levels.filter((l) => l.completed).length ?? 0;
  const totalCount = roadmap?.total_levels ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const badgeEarned = roadmap ? getBadgeForLevel(roadmap.skill_level) : "Bronze";

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading roadmap…
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
        Roadmap not found.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .ro-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }
        .ro-header { margin-bottom: 32px; }
        .ro-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 8px;
        }
        .ro-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        .ro-level-tag {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          border-radius: 100px;
          padding: 3px 10px;
          color: var(--color-text-muted);
          margin-bottom: 20px;
        }
        .ro-progress-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .ro-progress-label {
          font-size: 12px;
          color: var(--color-text-muted);
          white-space: nowrap;
          min-width: 80px;
          text-align: right;
        }
        .ro-levels {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }
        .ro-level-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          transition: border-color 0.15s, transform 0.15s;
          cursor: pointer;
          text-decoration: none;
        }
        .ro-level-card:hover:not([aria-disabled="true"]) {
          border-color: var(--color-primary);
          transform: translateY(-1px);
        }
        .ro-level-card[aria-disabled="true"] {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        .ro-level-card.completed {
          border-color: var(--color-success, #22c55e);
          background: var(--color-success-surface, rgba(34,197,94,0.06));
        }
        .ro-level-num {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
          background: var(--color-surface-raised);
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }
        .ro-level-card.completed .ro-level-num {
          background: var(--color-success, #22c55e);
          color: #fff;
          border-color: transparent;
        }
        .ro-level-info { flex: 1; min-width: 0; }
        .ro-level-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ro-level-desc {
          font-size: 13px;
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ro-lock-icon { font-size: 16px; flex-shrink: 0; color: var(--color-text-muted); }
        .ro-check-icon { font-size: 16px; flex-shrink: 0; color: var(--color-success, #22c55e); }
        .ro-regen-section { margin-top: 8px; }
        @media (max-width: 480px) {
          .ro-page { padding: 24px 16px 64px; }
          .ro-title { font-size: 22px; }
        }
      `}</style>

      <div className="ro-page">
        <div className="ro-header">
          <div className="ro-eyebrow">Your personalised roadmap</div>
          <div className="ro-title">{roadmap.skill_name}</div>
          <span className="ro-level-tag">{roadmap.skill_level}</span>
        </div>

        <div className="ro-progress-row">
          <ProgressBar value={progressPercent} style={{ flex: 1 }} />
          <div className="ro-progress-label">{completedCount} / {totalCount} levels</div>
        </div>

        <div className="ro-levels">
          {roadmap.levels.map((level) => (
            <a
              key={level.index}
              href={level.locked ? undefined : `/roadmap/${roadmapId}/level/${level.index}`}
              className={["ro-level-card", level.completed ? "completed" : ""].join(" ")}
              aria-disabled={level.locked ? "true" : undefined}
              aria-label={
                level.locked
                  ? `Level ${level.index + 1}: ${level.title} — locked`
                  : `Level ${level.index + 1}: ${level.title}`
              }
            >
              <div className="ro-level-num">{level.completed ? "✓" : level.index + 1}</div>
              <div className="ro-level-info">
                <div className="ro-level-title">{level.title}</div>
                <div className="ro-level-desc">{level.description}</div>
              </div>
              {level.locked && <span className="ro-lock-icon">🔒</span>}
              {level.completed && <span className="ro-check-icon">✓</span>}
            </a>
          ))}
        </div>

        {!roadmap.roadmap_locked && (
          <div className="ro-regen-section">
            <RoadmapRegenerate
              roadmapId={roadmapId}
              roadmapLocked={roadmap.roadmap_locked}
              regenerationCount={roadmap.regeneration_count}
              onRegenerateStart={() => {}}
            />
          </div>
        )}
      </div>

      {showCompletion && (
        <CompletionOverlay
          skillName={roadmap.skill_name}
          skillLevel={roadmap.skill_level}
          pointsEarned={LEVEL_COMPLETE_POINTS}
          totalPoints={userStats?.points ?? LEVEL_COMPLETE_POINTS}
          badgeEarned={badgeEarned}
          onLevelUp={handleLevelUp}
          onDismiss={() => setShowCompletion(false)}
        />
      )}
    </>
  );
}

export { getBadgeForLevel };
