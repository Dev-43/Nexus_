"use client";



import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import GateTest from "@/components/features/GateTest";
import SubLevelModal, { type SublevelSuggestion } from "@/components/features/SubLevelModal";
import { getRoadmap, type Roadmap, type Level, type Resource } from "@/lib/api";

// ---------------------------------------------------------------------------
// Resource type icon — small visual cue per resource kind
// ---------------------------------------------------------------------------
const RESOURCE_ICON: Record<Resource["type"], string> = {
  article: "📄",
  video: "🎥",
  exercise: "💻",
  project: "🛠️",
  documentation: "📚",
};

// ---------------------------------------------------------------------------
// ResourceCard — replaces the old fabricated LessonCard
// ---------------------------------------------------------------------------
function ResourceCard({
  resource,
  index,
  isOpened,
  onOpen,
}: {
  resource: Resource;
  index: number;
  isOpened: boolean;
  onOpen: () => void;
}) {
  const icon = RESOURCE_ICON[resource.type] ?? "📄";

  return (
    <div
      style={{
        background: isOpened ? "rgba(99, 102, 241, 0.04)" : "var(--color-surface)",
        border: `1.5px solid ${isOpened ? "rgba(99,102,241,0.25)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        transition: "border-color 0.3s ease, background 0.3s ease",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: isOpened ? "var(--color-primary)" : "var(--color-surface-raised)",
          border: `2px solid ${isOpened ? "var(--color-primary)" : "var(--color-border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 14,
        }}
      >
        {isOpened ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {resource.title}
          </h3>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
              textTransform: "capitalize",
              padding: "1px 8px",
              borderRadius: 999,
              background: "var(--color-surface-raised)",
              flexShrink: 0,
            }}
          >
            {resource.type}
          </span>
        </div>

        {resource.description && (
          <p style={{ margin: "0 0 var(--space-2) 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {resource.description}
          </p>
        )}

        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            onClick={onOpen}
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Open resource ↗
          </a>
        ) : (
          <button
            onClick={onOpen}
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-primary)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {isOpened ? "Marked as reviewed ✓" : "Mark as reviewed"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LevelContentPage() {
  const params = useParams();
  const router = useRouter();

  const roadmapId = params?.id as string;
  const levelIndex = parseInt((params?.lid as string) ?? "0", 10);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    const id = localStorage.getItem("nexus_session_id") ?? "";
    setSessionId(id);
  }, []);

  // ── Fetch the REAL roadmap — replaces MOCK_ROADMAP entirely ──────────────
  useEffect(() => {
    if (!roadmapId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getRoadmap(roadmapId);
        if (!cancelled) setRoadmap(data);
      } catch (err) {
        console.error("Failed to load roadmap:", err);
        if (!cancelled) setLoadError("Couldn't load this roadmap. Try going back and re-entering the level.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [roadmapId]);

  const level: Level | undefined = roadmap?.levels[levelIndex];

  const [openedResources, setOpenedResources] = useState<Set<number>>(new Set());
  const [showGateTest, setShowGateTest] = useState(false);
  const [showSublevel, setShowSublevel] = useState(false);
  const [sublevelRejectCount, setSublevelRejectCount] = useState(0);

  const markOpened = useCallback((idx: number) => {
    setOpenedResources((prev) => new Set([...prev, idx]));
  }, []);

  const sublevelSuggestion: SublevelSuggestion = {
    title: `${level?.title ?? "This level"}: targeted review`,
    description: "A short focused lesson for the concepts that caused the gate test miss.",
    lessonCount: 3,
    conceptGaps: [],
  };

  function handleTestResult(score: number, passed: boolean, pointsEarned: number) {
  if (!passed) {
    setSublevelRejectCount(0);
    setShowSublevel(true);
    return;
  }

  const isFinalLevel = roadmap
    ? levelIndex === roadmap.total_levels - 1
    : false;

  if (isFinalLevel) {
    router.push(`/roadmap/${roadmapId}?complete=true&points=${pointsEarned}`);
  } else {
    router.push(`/roadmap/${roadmapId}`);
  }
} 

  const totalResources = level?.resources.length ?? 0;
  const progressPercent = totalResources > 0 ? Math.round((openedResources.size / totalResources) * 100) : 0;
  // No resources at all (real AI output sometimes returns an empty
  // resources array for a level) shouldn't permanently block the gate
  // test — treat zero resources as "nothing to review", not "can't proceed".
  const allReviewed = totalResources === 0 || openedResources.size >= totalResources;

  // ── Loading / error / not-found states ───────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-16) 0", color: "var(--color-text-secondary)" }}>
        Loading level…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "var(--space-4)", color: "var(--color-text-secondary)" }}>
        <span style={{ fontSize: "var(--text-base)" }}>{loadError}</span>
        <Button variant="secondary" onClick={() => router.push(`/roadmap/${roadmapId}`)}>
          ← Back to roadmap
        </Button>
      </div>
    );
  }

  if (!level) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "var(--space-4)", color: "var(--color-text-secondary)" }}>
        <span style={{ fontSize: "var(--text-xl)" }}>Level not found</span>
        <Button variant="secondary" onClick={() => router.back()}>
          ← Back to roadmap
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-6) var(--space-4) var(--space-16)" }}>
      {/* Sticky progress header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--color-bg)",
          paddingTop: "var(--space-4)",
          paddingBottom: "var(--space-4)",
          marginBottom: "var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <button
            onClick={() => router.push(`/roadmap/${roadmapId}`)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: 4 }}
          >
            ← {roadmap?.skill_name}
          </button>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>/</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>
            Level {levelIndex + 1}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--color-text-primary)" }}>
            {level.title}
          </h1>
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: progressPercent === 100 ? "var(--color-success, #10b981)" : "var(--color-text-secondary)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {totalResources === 0 ? "No resources" : `${openedResources.size}/${totalResources} reviewed`}
          </span>
        </div>

        <ProgressBar value={progressPercent} label={`${progressPercent}% complete`} />
      </div>

      {/* Level description — this IS the real AI-generated content for this level */}
      <p style={{ fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "var(--space-8)" }}>
        {level.description}
      </p>

      {/* Resource cards */}
      {totalResources > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-10)" }}>
          {level.resources.map((resource, i) => (
            <ResourceCard
              key={`${resource.title}-${i}`}
              resource={resource}
              index={i}
              isOpened={openedResources.has(i)}
              onOpen={() => markOpened(i)}
            />
          ))}
        </div>
      )}

      {/* Gate test CTA or inline gate test */}
      {!showGateTest ? (
        <div
          style={{
            background: allReviewed
              ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)"
              : "var(--color-surface)",
            border: `2px solid ${allReviewed ? "var(--color-primary)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-8)",
            textAlign: "center",
            transition: "all 0.4s ease",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: "var(--space-3)", filter: allReviewed ? "none" : "grayscale(1) opacity(0.4)", transition: "filter 0.4s ease" }}>
            🎯
          </div>
          <h2 style={{ margin: "0 0 var(--space-2) 0", fontSize: "var(--text-xl)", fontWeight: 700, color: allReviewed ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
            {allReviewed ? "Ready for the gate test?" : "Review all resources first"}
          </h2>
          <p style={{ margin: "0 0 var(--space-6) 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {allReviewed
              ? "Score 70% or higher to unlock the next level."
              : `Review ${totalResources - openedResources.size} more resource${totalResources - openedResources.size === 1 ? "" : "s"} to unlock the gate test.`}
          </p>
          <Button variant={allReviewed ? "primary" : "secondary"} disabled={!allReviewed} onClick={() => setShowGateTest(true)}>
            Take gate test →
          </Button>
        </div>
      ) : (
        // Uses GateTest's own built-in static questions (real correct_index
        // values, won't score 0% by construction). Real backend-generated
        // gate-test content from level resources is a separate, larger
        // feature not yet built — deliberately deferred per Option 1.
        <GateTest
          levelId={levelIndex.toString()}
          sessionId={sessionId}
          roadmapId={roadmapId}
          onResult={handleTestResult}
          onSubLevel={() => setShowSublevel(true)}
        />
      )}

      <SubLevelModal
        isOpen={showSublevel}
        suggestion={sublevelSuggestion}
        rejectCount={sublevelRejectCount}
        onDecision={(decision) => {
          if (decision === "accept") {
            router.push(`/roadmap/${roadmapId}/level/${levelIndex}/sublevel`);
            return;
          }
          if (decision === "reject") {
            setSublevelRejectCount((count) => count + 1);
            setShowSublevel(false);
            return;
          }
          setShowSublevel(false);
        }}
      />
    </div>
  );
}