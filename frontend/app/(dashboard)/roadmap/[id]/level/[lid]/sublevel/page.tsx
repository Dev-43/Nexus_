"use client";

// frontend/app/(dashboard)/roadmap/[id]/level/[lid]/sublevel/page.tsx
//
// STATIC PAGE ONLY, per explicit scope decision:
//   - No call to adaptive_sublevel_node
//   - No new backend endpoint
//   - No persistence/schema changes
//   - Reuses the same hardcoded suggestion content already shown in
//     SubLevelModal.tsx ("3 focused lessons, 15-20 min" etc) rather
//     than generating anything new
//
// Real generation (NVIDIA NIM, gap analysis, mini-roadmap persistence)
// is tracked separately — see backlog item "Real adaptive sublevel
// generation — Feature 19 backend".
//
// This page exists solely to stop the 404 when a user clicks
// "Start mini-lesson" from SubLevelModal, and to give them a way back
// to the gate test.

import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

// Same static content as SubLevelModal.tsx's sublevelSuggestion object.
// Kept here as a separate literal rather than imported, since the modal
// builds its suggestion per-level (title includes the level name) and
// this page doesn't have that context wired in yet — duplicating the
// static strings is the smaller, lower-risk change for now.
const STATIC_SUGGESTION = {
  description:
    "A short focused lesson for the concepts that caused the gate test miss.",
  lessonCount: 3,
  estimate: "15–20 min",
};

export default function SubLevelPage() {
  const params = useParams();
  const router = useRouter();

  const roadmapId = params?.id as string;
  const levelIndex = parseInt((params?.lid as string) ?? "0", 10);

  function handleMarkComplete() {
    router.push(`/roadmap/${roadmapId}/level/${levelIndex}`);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "var(--space-10) var(--space-4)" }}>
      <button
        onClick={() => router.push(`/roadmap/${roadmapId}/level/${levelIndex}`)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--color-text-secondary)",
          fontSize: "var(--text-sm)",
          marginBottom: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ← Back to level
      </button>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-3)",
          }}
        >
          <span style={{ fontSize: 20 }}>🔍</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Gap Identified
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 var(--space-4) 0",
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.3,
          }}
        >
          Targeted review
        </h1>

        <p
          style={{
            margin: "0 0 var(--space-6) 0",
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {STATIC_SUGGESTION.description}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            marginBottom: "var(--space-8)",
          }}
        >
          <span style={{ fontSize: 16 }}>📚</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>
              {STATIC_SUGGESTION.lessonCount} focused lessons
            </strong>{" "}
            — estimated {STATIC_SUGGESTION.estimate}
          </span>
        </div>

        <Button variant="primary" onClick={handleMarkComplete}>
          Mark complete and retry gate test →
        </Button>
      </div>
    </div>
  );
}