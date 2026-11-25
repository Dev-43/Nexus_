"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { typography } from "@/design/tokens";

type SpecimenTab = "calibrate" | "study" | "gate";

const SPECIMEN_CONTENT: Record<
  SpecimenTab,
  {
    label: string;
    meta: string;
    title: string;
    body: string;
    code?: string;
    metrics: { label: string; value: string }[];
  }
> = {
  calibrate: {
    label: "Diagnostic",
    meta: "ADAPTIVE ASSESSMENT · Q2 OF 5",
    title: "Calibrates to your current depth in real time",
    body: "Questions adjust difficulty after every answer. Skip fundamentals you already know and start your roadmap at the right tier.",
    code: "score = 0.80  # → Intermediate tier unlocked\nfocus_gaps = ['window_functions', 'query_plans']",
    metrics: [
      { label: "Calibration", value: "80%" },
      { label: "Tier placed", value: "Intermediate" },
      { label: "Time spent", value: "2m 10s" },
    ],
  },
  study: {
    label: "Stage Study",
    meta: "LEVEL 01 · 4 RESOURCES",
    title: "Structured documentation, rules, and code drills",
    body: "Every stage organizes official docs, key engineering rules, runnable patterns, and a focused drill instead of a single generic link.",
    code: "SELECT user_id, COUNT(o.id) AS orders\nFROM users u LEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at >= '2026-01-01'\nGROUP BY user_id HAVING COUNT(o.id) >= 3;",
    metrics: [
      { label: "Reviewed", value: "3 / 4" },
      { label: "Est. time", value: "15m" },
      { label: "Regenerate", value: "Steerable" },
    ],
  },
  gate: {
    label: "Gate & Sublevel",
    meta: "GATE THRESHOLD · 70% TO UNLOCK",
    title: "Targeted remediation when a concept trips you up",
    body: "Score 70% or higher to unlock the next level and earn XP. Miss a concept and Nexus builds focused micro-lessons for those exact gaps.",
    code: "missed_tags = ['data_cleaning', 'distribution_analysis']\n# Spawns 3 focused micro-lessons + code examples",
    metrics: [
      { label: "Pass bar", value: "70%" },
      { label: "XP reward", value: "+75 XP" },
      { label: "Gap lessons", value: "3" },
    ],
  },
};

const ARCHITECTURE_ROWS = [
  {
    index: "01",
    title: "Adaptive baseline, not a fixed syllabus",
    detail:
      "A 5-question adaptive diagnostic maps your actual score before generating levels, so experienced developers don't start at hello world.",
  },
  {
    index: "02",
    title: "Steerable roadmaps you can correct",
    detail:
      "If a generated level misses what you want to focus on, describe what to change in plain English and rebuild the curriculum around your goal.",
  },
  {
    index: "03",
    title: "Gate checks backed by gap remediation",
    detail:
      "Each stage ends with a gate test. Failing a topic generates targeted mini-lessons on the specific concepts you missed before your next attempt.",
  },
];

const TRACKS = [
  "Data Analysis",
  "Python",
  "SQL",
  "JavaScript",
  "React & Next.js",
  "System Design",
];

export default function LandingPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SpecimenTab>("calibrate");

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!cancelled && session?.user) {
          setIsSignedIn(true);
          setUserEmail(session.user.email || null);
        }
      } catch {
        // Non-blocking auth check
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryHref = isSignedIn ? "/dashboard" : "/login";
  const currentSpecimen = SPECIMEN_CONTENT[activeTab];

  return (
    <div className="lp-root">
      {/* ── Top Bar ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link href="/" className="lp-brand">
            <span className="lp-brand-mark" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F8FAFC"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </span>
            <span className="lp-brand-name">Nexus</span>
          </Link>

          <nav className="lp-nav" aria-label="Primary">
            <a href="#architecture" className="lp-nav-link">
              Architecture
            </a>
            <a href="#tracks" className="lp-nav-link">
              Tracks
            </a>
          </nav>

          <div className="lp-header-actions">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="lp-btn-primary lp-btn-sm"
                title={userEmail || "Open dashboard"}
              >
                <span>Dashboard</span>
                <ArrowRightIcon />
              </Link>
            ) : (
              <>
                <Link href="/login" className="lp-btn-ghost">
                  Sign in
                </Link>
                <Link href="/login" className="lp-btn-primary lp-btn-sm">
                  <span>Get started</span>
                  <ArrowRightIcon />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="lp-main">
        {/* ── Editorial Hero + Interactive Product Specimen ── */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow lp-stagger-1">
              Adaptive curriculum engine
            </p>
            <h1 className="lp-h1 lp-stagger-2">
              Master technical skills without relearning what you already know.
            </h1>
            <p className="lp-lead lp-stagger-3">
              Nexus diagnoses your real skill level, generates a structured roadmap with
              curated docs and code drills, and targets the exact concepts you miss on
              gate tests.
            </p>
            <div className="lp-cta-row lp-stagger-4">
              <Link href={primaryHref} className="lp-btn-primary lp-btn-lg">
                <span>
                  {isSignedIn ? "Open your dashboard" : "Start your assessment"}
                </span>
                <ArrowRightIcon />
              </Link>
              <a href="#architecture" className="lp-btn-secondary lp-btn-lg">
                How it adapts
              </a>
            </div>
          </div>

          {/* Interactive Specimen (concentric radii: outer 16px, padding 8px -> inner 8px) */}
          <div className="lp-specimen lp-stagger-4">
            <div className="lp-tab-list" role="tablist" aria-label="Product workflow">
              {(["calibrate", "study", "gate"] as SpecimenTab[]).map((key) => {
                const isSelected = activeTab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(key)}
                    className={`lp-tab ${isSelected ? "lp-tab--active" : ""}`}
                  >
                    {SPECIMEN_CONTENT[key].label}
                  </button>
                );
              })}
            </div>

            <div className="lp-specimen-panel" role="tabpanel">
              <div className="lp-specimen-meta">{currentSpecimen.meta}</div>
              <h2 className="lp-specimen-title">{currentSpecimen.title}</h2>
              <p className="lp-specimen-body">{currentSpecimen.body}</p>

              {currentSpecimen.code && (
                <pre className="lp-code">
                  <code>{currentSpecimen.code}</code>
                </pre>
              )}

              <div className="lp-metrics-row">
                {currentSpecimen.metrics.map((m) => (
                  <div key={m.label} className="lp-metric-cell">
                    <div className="lp-metric-val tabular-nums">{m.value}</div>
                    <div className="lp-metric-lbl">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Architectural Breakdown ── */}
        <section id="architecture" className="lp-section">
          <div className="lp-section-head">
            <p className="lp-eyebrow">Workflow</p>
            <h2 className="lp-h2">Built around measurement and feedback</h2>
          </div>

          <div className="lp-arch-list">
            {ARCHITECTURE_ROWS.map((row) => (
              <div key={row.index} className="lp-arch-row">
                <span className="lp-arch-num tabular-nums">{row.index}</span>
                <h3 className="lp-arch-title">{row.title}</h3>
                <p className="lp-arch-detail">{row.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tracks & Closing Action ── */}
        <section id="tracks" className="lp-section lp-section--last">
          <div className="lp-closing">
            <div className="lp-closing-copy">
              <h2 className="lp-h2">Pick a track or enter any custom skill</h2>
              <p className="lp-closing-sub">
                Choose a curated engineering domain or generate a roadmap for your own
                topic after signing in.
              </p>
              <div className="lp-track-list">
                {TRACKS.map((track) => (
                  <span key={track} className="lp-track-item">
                    {track}
                  </span>
                ))}
              </div>
            </div>

            <Link href={primaryHref} className="lp-btn-primary lp-btn-lg">
              <span>{isSignedIn ? "Go to dashboard" : "Sign in with Google"}</span>
              <ArrowRightIcon />
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>Nexus</span>
          <span>Adaptive technical skill progression</span>
        </div>
      </footer>

      <style>{`
        .lp-root {
          min-height: 100vh;
          background: #000000;
          color: #F8FAFC;
          font-family: ${typography.fontBody};
        }

        .lp-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lp-header-inner {
          max-width: 1120px;
          margin: 0 auto;
          height: 64px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .lp-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          min-height: 40px;
        }

        .lp-brand-mark {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: #141418;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .lp-brand-name {
          font-family: ${typography.fontDisplay};
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #F8FAFC;
        }

        .lp-nav {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .lp-nav-link {
          font-size: 14px;
          color: #94A3B8;
          text-decoration: none;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          transition-property: color;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .lp-nav-link:hover {
          color: #F8FAFC;
        }

        .lp-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lp-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #94A3B8;
          text-decoration: none;
          transition-property: color, background-color, transform;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .lp-btn-ghost:hover {
          color: #F8FAFC;
          background: rgba(255, 255, 255, 0.05);
        }

        .lp-btn-ghost:active {
          transform: scale(0.96);
        }

        .lp-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #F8FAFC;
          color: #09090B;
          border-radius: 10px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
          transition-property: opacity, transform, box-shadow;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
          white-space: nowrap;
        }

        .lp-btn-primary:hover {
          opacity: 0.92;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
        }

        .lp-btn-primary:active {
          transform: scale(0.96);
        }

        /* Optical alignment: icon-side padding = text-side padding - 2px */
        .lp-btn-sm {
          min-height: 40px;
          padding: 0 12px 0 14px;
          font-size: 13px;
        }

        .lp-btn-lg {
          min-height: 46px;
          padding: 0 18px 0 20px;
          font-size: 15px;
        }

        .lp-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 20px;
          border-radius: 10px;
          background: #0B0C10;
          color: #E2E8F0;
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
          transition-property: background-color, box-shadow, transform;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
          white-space: nowrap;
        }

        .lp-btn-secondary:hover {
          background: #12141B;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16);
        }

        .lp-btn-secondary:active {
          transform: scale(0.96);
        }

        .lp-main {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .lp-hero {
          padding: 72px 0 64px;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 48px;
          align-items: center;
        }

        .lp-eyebrow {
          font-family: ${typography.fontMono};
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748B;
          margin: 0 0 14px 0;
        }

        .lp-h1 {
          font-family: ${typography.fontDisplay};
          font-size: clamp(2.1rem, 4vw, 3rem);
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.03em;
          color: #F8FAFC;
          margin: 0 0 18px 0;
          text-wrap: balance;
        }

        .lp-lead {
          font-size: 16px;
          line-height: 1.65;
          color: #94A3B8;
          margin: 0 0 28px 0;
          max-width: 500px;
          text-wrap: pretty;
        }

        .lp-cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Concentric outer container: 16px radius + 8px padding -> 8px inner items */
        .lp-specimen {
          background: #090A0D;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.09);
        }

        .lp-tab-list {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .lp-tab {
          min-height: 40px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #94A3B8;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition-property: background-color, color, transform;
          transition-duration: 150ms;
          transition-timing-function: ease-out;
        }

        .lp-tab:hover {
          color: #F8FAFC;
          background: rgba(255, 255, 255, 0.04);
        }

        .lp-tab:active {
          transform: scale(0.96);
        }

        .lp-tab--active {
          background: #14161D;
          color: #F8FAFC;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .lp-specimen-panel {
          background: #0D0E13;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .lp-specimen-meta {
          font-family: ${typography.fontMono};
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #3B82F6;
          margin-bottom: 8px;
        }

        .lp-specimen-title {
          font-family: ${typography.fontDisplay};
          font-size: 17px;
          font-weight: 600;
          color: #F8FAFC;
          margin: 0 0 8px 0;
          text-wrap: balance;
        }

        .lp-specimen-body {
          font-size: 13.5px;
          line-height: 1.6;
          color: #94A3B8;
          margin: 0 0 16px 0;
          text-wrap: pretty;
        }

        .lp-code {
          margin: 0 0 16px 0;
          padding: 12px 14px;
          border-radius: 6px;
          background: #050507;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
          font-family: ${typography.fontMono};
          font-size: 12px;
          line-height: 1.55;
          color: #CBD5E1;
          overflow-x: auto;
        }

        .lp-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lp-metric-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .lp-metric-val {
          font-size: 15px;
          font-weight: 600;
          color: #F8FAFC;
        }

        .lp-metric-lbl {
          font-size: 11px;
          color: #64748B;
        }

        .lp-section {
          padding: 56px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .lp-section--last {
          padding-bottom: 80px;
        }

        .lp-section-head {
          margin-bottom: 32px;
        }

        .lp-h2 {
          font-family: ${typography.fontDisplay};
          font-size: clamp(1.5rem, 2.8vw, 2rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #F8FAFC;
          margin: 0;
          text-wrap: balance;
        }

        .lp-arch-list {
          display: flex;
          flex-direction: column;
        }

        .lp-arch-row {
          display: grid;
          grid-template-columns: 56px minmax(0, 0.9fr) minmax(0, 1.3fr);
          gap: 24px;
          padding: 24px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          align-items: baseline;
        }

        .lp-arch-num {
          font-family: ${typography.fontMono};
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
        }

        .lp-arch-title {
          font-family: ${typography.fontDisplay};
          font-size: 16px;
          font-weight: 600;
          color: #F8FAFC;
          margin: 0;
          text-wrap: balance;
        }

        .lp-arch-detail {
          font-size: 14px;
          line-height: 1.65;
          color: #94A3B8;
          margin: 0;
          text-wrap: pretty;
        }

        .lp-closing {
          background: #090A0D;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .lp-closing-copy {
          max-width: 580px;
        }

        .lp-closing-sub {
          font-size: 14px;
          line-height: 1.6;
          color: #94A3B8;
          margin: 8px 0 18px 0;
          text-wrap: pretty;
        }

        .lp-track-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .lp-track-item {
          font-size: 12px;
          font-weight: 500;
          color: #CBD5E1;
          padding: 5px 11px;
          border-radius: 6px;
          background: #111319;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
        }

        .lp-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px;
        }

        .lp-footer-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #64748B;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Staggered subtle entrance (100ms apart) */
        .lp-stagger-1,
        .lp-stagger-2,
        .lp-stagger-3,
        .lp-stagger-4 {
          opacity: 0;
          transform: translateY(10px);
          filter: blur(4px);
          animation: lpFadeUp 360ms ease-out forwards;
        }
        .lp-stagger-1 { animation-delay: 0ms; }
        .lp-stagger-2 { animation-delay: 90ms; }
        .lp-stagger-3 { animation-delay: 180ms; }
        .lp-stagger-4 { animation-delay: 270ms; }

        @keyframes lpFadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @media (max-width: 860px) {
          .lp-hero {
            grid-template-columns: 1fr;
            padding: 48px 0 40px;
          }
          .lp-arch-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        @media (max-width: 600px) {
          .lp-nav {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-stagger-1,
          .lp-stagger-2,
          .lp-stagger-3,
          .lp-stagger-4 {
            animation: none;
            opacity: 1;
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8h9" />
      <path d="M8.5 4l4 4-4 4" />
    </svg>
  );
}
