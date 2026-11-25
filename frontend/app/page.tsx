"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { colors, typography } from "@/design/tokens";

export default function LandingPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
        // Non-blocking check — landing page stays public
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryHref = isSignedIn ? "/dashboard" : "/login";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: colors.textPrimary,
        fontFamily: typography.fontBody,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Subtle architectural background grid & top cobalt glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-180px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "520px",
          background:
            "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.16) 0%, rgba(139, 92, 246, 0.06) 45%, transparent 72%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Public Top Navbar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            height: "68px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 18px rgba(59, 130, 246, 0.4)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: colors.textPrimary,
                letterSpacing: "-0.03em",
                fontFamily: typography.fontDisplay,
              }}
            >
              Nexus
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: colors.brand,
                background: "rgba(59, 130, 246, 0.12)",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid rgba(59, 130, 246, 0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              AI Engine
            </span>
          </Link>

          {/* Center links */}
          <nav
            className="landing-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
              fontSize: "14px",
              color: colors.textSecondary,
            }}
          >
            <a href="#how-it-works" style={{ color: "inherit", textDecoration: "none" }}>
              How it works
            </a>
            <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
              Features
            </a>
            <a href="#tracks" style={{ color: "inherit", textDecoration: "none" }}>
              Tracks
            </a>
          </nav>

          {/* Right CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.35)",
                }}
                title={userEmail || "Go to Dashboard"}
              >
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    padding: "8px 14px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: colors.textSecondary,
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "0 0 20px rgba(59, 130, 246, 0.32)",
                  }}
                >
                  Get Started →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ position: "relative", zIndex: 1 }}>
        {/* ── Hero Section ── */}
        <section
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "84px 24px 64px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Hero Copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 12px",
                borderRadius: "999px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.28)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#60A5FA",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  boxShadow: "0 0 8px #10B981",
                }}
              />
              Adaptive Skill Mastery · Real-Time Curriculum Engine
            </div>

            <h1
              style={{
                fontFamily: typography.fontDisplay,
                fontSize: "clamp(2.25rem, 4.5vw, 3.35rem)",
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
                color: colors.textPrimary,
                margin: "0 0 20px 0",
              }}
            >
              Learn how you learn.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 45%, #10B981 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Master skills faster.
              </span>
            </h1>

            <p
              style={{
                fontSize: "17px",
                lineHeight: 1.65,
                color: colors.textSecondary,
                margin: "0 0 32px 0",
                maxWidth: "540px",
              }}
            >
              Stop grinding generic tutorials. Nexus diagnoses your real skill level in minutes,
              generates a structured roadmap with live code drills, and adapts automatically when
              you hit a knowledge gap.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <Link
                href={primaryHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "13px 26px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 8px 28px rgba(59, 130, 246, 0.35)",
                }}
              >
                {isSignedIn ? "Continue to Dashboard →" : "Start Your Roadmap →"}
              </Link>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "13px 22px",
                  borderRadius: "12px",
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                See how it works
              </a>
            </div>

            {/* Trust / Metrics Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "28px",
                marginTop: "36px",
                paddingTop: "24px",
                borderTop: `1px solid ${colors.border}`,
                flexWrap: "wrap",
              }}
            >
              {[
                { val: "Adaptive", lbl: "Real-time skill calibration" },
                { val: "70% Gate", lbl: "Verified mastery unlocks" },
                { val: "Sublevels", lbl: "Auto-generated gap fixes" },
              ].map((stat) => (
                <div key={stat.val}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: colors.textPrimary,
                      fontFamily: typography.fontDisplay,
                    }}
                  >
                    {stat.val}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textMuted }}>{stat.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual Product Preview Card */}
          <div
            style={{
              background: "#090A0F",
              border: `1px solid ${colors.border}`,
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 24px 72px rgba(0, 0, 0, 0.85), 0 0 40px rgba(59, 130, 246, 0.08)",
              position: "relative",
            }}
          >
            {/* Window Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                marginBottom: "18px",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    color: colors.textMuted,
                    fontFamily: typography.fontMono,
                  }}
                >
                  roadmap // data-analysis
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#10B981",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.28)",
                  padding: "2px 9px",
                  borderRadius: "999px",
                }}
              >
                80% Calibrated
              </span>
            </div>

            {/* Preview Stage 1 */}
            <div
              style={{
                background: colors.surfaceRaised,
                border: "1px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#60A5FA" }}>
                  STAGE 01 · UNLOCKED
                </span>
                <span style={{ fontSize: "11px", color: colors.textMuted }}>4 resources · 15m</span>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: colors.textPrimary,
                  marginBottom: "10px",
                }}
              >
                Data Wrangling & Vectorized Pandas
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#030406",
                  border: "1px solid #1A1F2C",
                  fontSize: "11px",
                  color: "#CBD5E1",
                  fontFamily: typography.fontMono,
                  overflowX: "auto",
                }}
              >
                <code>{`mask = (df['status'] == 'active') & (df['score'] >= 75)\nclean_df = df.loc[mask, ['user_id', 'score']]`}</code>
              </pre>
            </div>

            {/* Preview Stage 2 & Remediation Pill */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "#050608",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#F59E0B", fontWeight: 700, marginBottom: 4 }}>
                  🎯 GATE TEST
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
                  4 Adaptive Questions
                </div>
                <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: 2 }}>
                  70%+ unlocks Stage 02
                </div>
              </div>

              <div
                style={{
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#FBBF24", fontWeight: 700, marginBottom: 4 }}>
                  🔍 SUBLEVEL FIX
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
                  Targeted Micro-Lessons
                </div>
                <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: 2 }}>
                  Triggered on missed concepts
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works (3-Step Adaptive Loop) ── */}
        <section
          id="how-it-works"
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "64px 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: colors.brand,
                marginBottom: "10px",
              }}
            >
              The Adaptive Loop
            </div>
            <h2
              style={{
                fontFamily: typography.fontDisplay,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                fontWeight: 700,
                margin: "0 0 12px 0",
                letterSpacing: "-0.02em",
              }}
            >
              Built to respect what you already know
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: colors.textSecondary,
                maxWidth: "560px",
                margin: "0 auto",
              }}
            >
              Every roadmap starts from your diagnostic baseline and evolves based on your gate test
              performance and direct feedback.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              {
                num: "01",
                title: "Diagnostic Calibration",
                desc: "Answer a short adaptive assessment that scales difficulty in real time based on your responses, pinpointing your Beginner, Intermediate, or Advanced starting tier.",
                accent: "#3B82F6",
              },
              {
                num: "02",
                title: "Multi-Resource Stages",
                desc: "Each level pairs curated documentation, architecture guides, runnable code patterns, and hands-on action drills—and you can regenerate any roadmap with feedback.",
                accent: "#8B5CF6",
              },
              {
                num: "03",
                title: "Gate Tests & Gap Sublevels",
                desc: "Prove mastery with a 70%+ gate test to earn XP and badges. If a concept trips you up, Nexus generates focused mini-lessons targeting that exact gap.",
                accent: "#10B981",
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "16px",
                  padding: "28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: typography.fontMono,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: step.accent,
                    background: `${step.accent}1A`,
                    border: `1px solid ${step.accent}40`,
                    padding: "4px 10px",
                    borderRadius: "8px",
                    alignSelf: "flex-start",
                  }}
                >
                  STEP {step.num}
                </span>
                <h3
                  style={{
                    fontFamily: typography.fontDisplay,
                    fontSize: "19px",
                    fontWeight: 600,
                    margin: 0,
                    color: colors.textPrimary,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: colors.textSecondary,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features & Tracks ── */}
        <section
          id="features"
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "48px 24px 64px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              {
                icon: "🎯",
                title: "Learning-Style Aware",
                desc: "Quick onboarding calibrates pace, explanation depth, and resource format to match how you retain complex ideas.",
              },
              {
                icon: "✍️",
                title: "Steerable Roadmaps",
                desc: "Doesn't look right? Give plain-English feedback and rebuild your curriculum around your specific goals.",
              },
              {
                icon: "💻",
                title: "Code & Action Drills",
                desc: "Every level card breaks down key engineering rules, syntax examples, and practical exercises before you test.",
              },
              {
                icon: "🏆",
                title: "XP, Streaks & Tiers",
                desc: "Earn progression XP, unlock Bronze through Diamond badges, and climb the live learner leaderboard.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: "#05060A",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "14px",
                  padding: "22px",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>{feat.icon}</div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: "0 0 8px 0",
                    color: colors.textPrimary,
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: colors.textSecondary,
                    margin: 0,
                  }}
                >
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Popular Tracks Strip ── */}
        <section
          id="tracks"
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "24px 24px 80px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.06) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "20px",
              padding: "40px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "24px",
            }}
          >
            <div style={{ maxWidth: "560px" }}>
              <h2
                style={{
                  fontFamily: typography.fontDisplay,
                  fontSize: "24px",
                  fontWeight: 700,
                  margin: "0 0 10px 0",
                  color: colors.textPrimary,
                }}
              >
                Ready to build your personalised roadmap?
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: colors.textSecondary,
                  margin: "0 0 16px 0",
                }}
              >
                Pick from Data Analysis, Python, SQL, JavaScript, React, or enter any custom skill.
                Takes less than 2 minutes to calibrate.
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["Data Analysis", "Python", "SQL", "JavaScript", "System Design"].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "rgba(0, 0, 0, 0.45)",
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={primaryHref}
              style={{
                padding: "14px 28px",
                borderRadius: "12px",
                background: "#F8FAFC",
                color: "#000000",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
              }}
            >
              {isSignedIn ? "Go to My Dashboard →" : "Sign In with Google →"}
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "28px 24px",
          textAlign: "center",
          fontSize: "13px",
          color: colors.textMuted,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: "1160px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <span>Nexus · Adaptive AI Skill Mastery Platform</span>
          <span>Built with Next.js, LangGraph &amp; Supabase</span>
        </div>
      </footer>

      <style>{`
        @media (max-width: 680px) {
          .landing-nav-links { display: none !important; }
        }
      `}</style>
    </div>
  );
}
