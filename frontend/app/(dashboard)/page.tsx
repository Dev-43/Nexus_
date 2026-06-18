"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { colors, radius, typography } from "@/design/tokens";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const tokens = {
  colors: {
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    surface: colors.surface,
    surfaceSecondary: colors.surfaceRaised,
    border: colors.border,
    purple: colors.brand,
    success: colors.success,
  },
  fonts: {
    sans: typography.fontBody,
  },
  radii: {
    md: radius.md,
    lg: radius.lg,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillLevel = "beginner" | "intermediate" | "advanced";
type SkillStatus = "active" | "paused" | "completed";

interface SkillSession {
  id: string;
  skill_name: string;
  skill_level: SkillLevel;
  status: SkillStatus;
  created_at: string;
  updated_at: string;
  roadmap_id?: string;
  current_level_index?: number;
  total_levels?: number;
  xp?: number;
}

interface UserStats {
  points: number;
  badges: string[];
  streak_days: number;
}

// ─── Mock Data (replace with real Supabase queries at Integration Sync #2) ────

const MOCK_SESSIONS: SkillSession[] = [
  {
    id: "session-1",
    skill_name: "Python",
    skill_level: "intermediate",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    roadmap_id: "roadmap-1",
    current_level_index: 2,
    total_levels: 5,
    xp: 220,
  },
  {
    id: "session-2",
    skill_name: "UI Design",
    skill_level: "beginner",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    roadmap_id: "roadmap-2",
    current_level_index: 1,
    total_levels: 4,
    xp: 60,
  },
  {
    id: "session-3",
    skill_name: "Data Analysis",
    skill_level: "beginner",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    roadmap_id: "roadmap-3",
    current_level_index: 0,
    total_levels: 4,
    xp: 10,
  },
  {
    id: "session-4",
    skill_name: "JavaScript",
    skill_level: "beginner",
    status: "completed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    roadmap_id: "roadmap-4",
    current_level_index: 4,
    total_levels: 4,
    xp: 190,
  },
];

const MOCK_STATS: UserStats = {
  points: 480,
  badges: ["Bronze", "FirstSkill", "Streak7"],
  streak_days: 5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProgress(session: SkillSession): number {
  const idx = session.current_level_index ?? 0;
  const total = session.total_levels ?? 1;
  if (session.status === "completed") return 100;
  return Math.round((idx / total) * 100);
}

function getLevelLabel(session: SkillSession): string {
  const idx = session.current_level_index ?? 0;
  const total = session.total_levels ?? 0;
  if (session.status === "completed") return `All ${total} levels done`;
  const levelMap: Record<SkillLevel, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };
  return `${levelMap[session.skill_level]} · Level ${idx + 1} of ${total}`;
}

const STATUS_LABEL: Record<SkillStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<SkillSession[]>([]);
  const [stats, setStats] = useState<UserStats>(MOCK_STATS);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/");
          return;
        }

        // Swap for real Supabase query after Integration Sync #2:
        // const { data } = await supabase
        //   .from("skill_sessions")
        //   .select("*, roadmaps(id, current_level_index, roadmap_data)")
        //   .eq("user_id", user.id)
        //   .order("updated_at", { ascending: false });
        // setSessions(data ?? []);

        setSessions(MOCK_SESSIONS);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setSessions(MOCK_SESSIONS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, supabase]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const active = sessions.filter((s) => s.status === "active");
  const paused = sessions.filter((s) => s.status === "paused");
  const completed = sessions.filter((s) => s.status === "completed");

  // Pinned card always first in its group
  const orderedActive = pinnedId
    ? [
        ...active.filter((s) => s.id === pinnedId),
        ...active.filter((s) => s.id !== pinnedId),
      ]
    : active;

  function togglePin(id: string) {
    setPinnedId((prev) => (prev === id ? null : id));
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: tokens.colors.textSecondary, fontSize: 14 }}>
          Loading your skills…
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.h1}>Your skills</h1>
          <p style={styles.subtext}>
            {active.length} active · {completed.length} completed
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push("/skill")}
          aria-label="Add a new skill"
        >
          + Add skill
        </Button>
      </div>

      {/* ── Stats row ── */}
      <div style={styles.statsRow}>
        <StatCard label="Total XP" value={stats.points} sub="+50 this week" />
        <StatCard
          label="Streak"
          value={`${stats.streak_days} days`}
          sub="Keep going!"
        />
        <StatCard
          label="Badges"
          value={stats.badges.length}
          sub={stats.badges.slice(0, 3).join(" · ")}
        />
      </div>

      {/* ── Active skills ── */}
      <SectionLabel label="Active" />
      {orderedActive.length === 0 ? (
        <EmptySection message="No active skills yet — add one to get started." />
      ) : (
        <div style={styles.grid}>
          {orderedActive.map((session) => (
            <SkillCard
              key={session.id}
              session={session}
              pinned={pinnedId === session.id}
              onPin={() => togglePin(session.id)}
            />
          ))}
        </div>
      )}

      {/* ── Completed skills ── */}
      {completed.length > 0 && (
        <>
          <SectionLabel label="Completed" />
          <div style={styles.grid}>
            {completed.map((session) => (
              <SkillCard
                key={session.id}
                session={session}
                pinned={false}
                onPin={() => {}}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Paused skills ── */}
      <SectionLabel label="Paused" />
      {paused.length === 0 ? (
        <EmptySection message="No paused skills — skills you step away from appear here." />
      ) : (
        <div style={styles.grid}>
          {paused.map((session) => (
            <SkillCard
              key={session.id}
              session={session}
              pinned={false}
              onPin={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillCard({
  session,
  pinned,
  onPin,
}: {
  session: SkillSession;
  pinned: boolean;
  onPin: () => void;
}) {
  const progress = getProgress(session);
  const levelLabel = getLevelLabel(session);
  const isCompleted = session.status === "completed";
  const isPaused = session.status === "paused";

  return (
    <Link
      href={`/roadmap/${session.roadmap_id ?? session.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          ...styles.card,
          borderColor: pinned ? tokens.colors.purple : undefined,
          borderWidth: pinned ? 1.5 : undefined,
        }}
      >
        {pinned && <div style={styles.focusBadge}>Focus</div>}

        {/* Header */}
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.skillName}>{session.skill_name}</p>
            <p style={styles.skillMeta}>{levelLabel}</p>
          </div>
          {!isCompleted && !isPaused && (
            <button
              style={{
                ...styles.pinBtn,
                color: pinned ? tokens.colors.purple : tokens.colors.textSecondary,
              }}
              onClick={(e) => {
                e.preventDefault();
                onPin();
              }}
              aria-label={
                pinned
                  ? `Unpin ${session.skill_name} as focus skill`
                  : `Pin ${session.skill_name} as focus skill`
              }
            >
              📌
            </button>
          )}
          {isCompleted && <span style={{ fontSize: 18 }}>🏆</span>}
        </div>

        {/* Progress */}
        <ProgressBar
          value={progress}
          label={`${progress}%`}
          variant={isCompleted ? "success" : isPaused ? "default" : "default"}
        />

        {/* Footer */}
        <div style={styles.cardFooter}>
          <span style={styles.xpBadge}>{session.xp ?? 0} XP</span>
          <span
            style={{
              ...styles.statusBadge,
              ...(isCompleted
                ? styles.statusCompleted
                : isPaused
                ? styles.statusPaused
                : styles.statusActive),
            }}
          >
            {STATUS_LABEL[session.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statSub}>{sub}</p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p style={styles.sectionLabel}>{label}</p>;
}

function EmptySection({ message }: { message: string }) {
  return <div style={styles.emptySection}>{message}</div>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "2rem 1.5rem",
    fontFamily: tokens.fonts.sans,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "2rem",
  },
  h1: {
    fontSize: 22,
    fontWeight: 500,
    color: tokens.colors.textPrimary,
    margin: "0 0 4px",
  },
  subtext: {
    fontSize: 14,
    color: tokens.colors.textSecondary,
    margin: 0,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: "2rem",
  },
  statCard: {
    background: tokens.colors.surfaceSecondary,
    borderRadius: tokens.radii.md,
    padding: "1rem",
  },
  statLabel: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
    margin: "0 0 4px",
  },
  statValue: {
    fontSize: 22,
    fontWeight: 500,
    color: tokens.colors.textPrimary,
    margin: 0,
  },
  statSub: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
    margin: "2px 0 0",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: tokens.colors.textSecondary,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    margin: "0 0 12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
    marginBottom: "2rem",
  },
  card: {
    background: tokens.colors.surface,
    border: `0.5px solid ${tokens.colors.border}`,
    borderRadius: tokens.radii.lg,
    padding: "1rem 1.25rem",
    cursor: "pointer",
    position: "relative" as const,
    transition: "border-color 0.15s",
  },
  focusBadge: {
    position: "absolute" as const,
    top: -1,
    left: 16,
    fontSize: 10,
    fontWeight: 500,
    background: tokens.colors.purple,
    color: "#EEEDFE",
    padding: "2px 8px",
    borderRadius: "0 0 6px 6px",
    letterSpacing: "0.05em",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  skillName: {
    fontSize: 15,
    fontWeight: 500,
    color: tokens.colors.textPrimary,
    margin: "0 0 2px",
  },
  skillMeta: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
    margin: 0,
  },
  pinBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    fontSize: 16,
    lineHeight: 1,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTop: `0.5px solid ${tokens.colors.border}`,
  },
  xpBadge: {
    fontSize: 12,
    fontWeight: 500,
    color: "#3C3489",
    background: "#EEEDFE",
    padding: "3px 8px",
    borderRadius: 20,
  },
  statusBadge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 20,
    fontWeight: 500,
  },
  statusActive: {
    background: "#E1F5EE",
    color: "#085041",
  },
  statusPaused: {
    background: tokens.colors.surfaceSecondary,
    color: tokens.colors.textSecondary,
  },
  statusCompleted: {
    background: "#EAF3DE",
    color: "#27500A",
  },
  emptySection: {
    padding: "1.5rem",
    border: `0.5px dashed ${tokens.colors.border}`,
    borderRadius: tokens.radii.lg,
    textAlign: "center" as const,
    color: tokens.colors.textSecondary,
    fontSize: 14,
    marginBottom: "2rem",
  },
};
