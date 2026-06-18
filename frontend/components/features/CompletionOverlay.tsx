"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { colors } from "@/design/tokens";

// One object controls the entire progression logic
const NEXT_LEVEL = {
  beginner: "intermediate",
  intermediate: "advanced",
  advanced: null, // show mastery message instead
} as const;

type SkillLevel = keyof typeof NEXT_LEVEL;

interface CompletionOverlayProps {
  skillName: string;
  skillLevel: SkillLevel;
  pointsEarned: number;
  totalPoints: number;
  badgeEarned: string; // e.g. "Bronze"
  onLevelUp: (nextLevel: string) => Promise<void>;
  onDismiss: () => void;
}

export default function CompletionOverlay({
  skillName,
  skillLevel,
  pointsEarned,
  totalPoints,
  badgeEarned,
  onLevelUp,
  onDismiss,
}: CompletionOverlayProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [badgeIn, setBadgeIn] = useState(false);
  const [statsIn, setStatsIn] = useState(false);
  const [ctaIn, setCtaIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const nextLevel = NEXT_LEVEL[skillLevel];
  const isMastery = nextLevel === null;

  // Orchestrated entrance — staggered so each element lands separately
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setBadgeIn(true), 300);
    const t3 = setTimeout(() => setStatsIn(true), 700);
    const t4 = setTimeout(() => setCtaIn(true), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const handleLevelUp = async () => {
    if (!nextLevel) return;
    setLoading(true);
    try {
      await onLevelUp(nextLevel);
      router.push("/loading");
    } catch (err) {
      console.error("Level-up failed:", err);
      setLoading(false);
    }
  };

  const handleDashboard = () => {
    onDismiss();
    router.push("/");
  };

  const levelLabel =
    skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);
  const nextLevelLabel = nextLevel
    ? nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1)
    : null;

  return (
    <>
      <style>{`
        @keyframes scrimIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes cardRise {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        @keyframes badgeScaleIn {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { transform: scale(1.08); }
          80%  { transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 32px 8px var(--glow-color); }
          50%       { box-shadow: 0 0 56px 20px var(--glow-color); }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pointsPop {
          0%   { transform: scale(0.8); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }

        .co-scrim {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .co-scrim.visible {
          opacity: 1;
        }

        .co-card {
          background: ${colors.surface};
          border: 1px solid ${colors.border};
          border-radius: 24px;
          padding: 48px 40px 40px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          position: relative;
          overflow: hidden;
          opacity: 0;
        }
        .co-card.in {
          animation: cardRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }

        .co-card::before {
          content: '';
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--badge-bg-glow) 0%, transparent 70%);
          pointer-events: none;
        }

        .co-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: ${colors.textMuted};
          margin-bottom: 24px;
        }

        .co-badge-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          padding: 4px;
          opacity: 0;
          margin-bottom: 28px;
        }
        .co-badge-wrap.in {
          animation: badgeScaleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both,
                     badgeGlow 2.8s ease-in-out 0.9s infinite;
        }

        .co-badge-wrap[data-tier="Bronze"]   { --glow-color: rgba(180, 115, 60, 0.45); }
        .co-badge-wrap[data-tier="Silver"]   { --glow-color: rgba(160, 175, 195, 0.45); }
        .co-badge-wrap[data-tier="Gold"]     { --glow-color: rgba(215, 175, 55, 0.50); }
        .co-badge-wrap[data-tier="Diamond"]  { --glow-color: rgba(100, 210, 240, 0.50); }

        .co-card[data-tier="Bronze"]  { --badge-bg-glow: rgba(180, 115, 60, 0.12); }
        .co-card[data-tier="Silver"]  { --badge-bg-glow: rgba(160, 175, 195, 0.12); }
        .co-card[data-tier="Gold"]    { --badge-bg-glow: rgba(215, 175, 55, 0.12); }
        .co-card[data-tier="Diamond"] { --badge-bg-glow: rgba(100, 210, 240, 0.12); }

        .co-headline {
          font-size: 26px;
          font-weight: 700;
          line-height: 1.2;
          color: ${colors.textPrimary};
          margin-bottom: 8px;
          opacity: 0;
        }
        .co-headline.in {
          animation: fadeSlideUp 0.4s ease 0.72s both;
        }

        .co-sub {
          font-size: 15px;
          color: ${colors.textMuted};
          margin-bottom: 28px;
          opacity: 0;
        }
        .co-sub.in {
          animation: fadeSlideUp 0.4s ease 0.82s both;
        }

        .co-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 20px 0;
          border-top: 1px solid ${colors.border};
          border-bottom: 1px solid ${colors.border};
          margin-bottom: 28px;
          opacity: 0;
        }
        .co-stats.in {
          animation: fadeSlideUp 0.4s ease both;
        }

        .co-stat-value {
          font-size: 28px;
          font-weight: 800;
          color: ${colors.textPrimary};
          line-height: 1;
          opacity: 0;
        }
        .co-stat-value.in {
          animation: pointsPop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .co-stat-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.textMuted};
          margin-top: 4px;
        }
        .co-stat-divider {
          width: 1px;
          height: 36px;
          background: ${colors.border};
        }

        .co-mastery-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(100, 210, 240, 0.15), rgba(180, 120, 255, 0.15));
          border: 1px solid rgba(100, 210, 240, 0.3);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          color: ${colors.textPrimary};
          margin-bottom: 24px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .co-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          opacity: 0;
        }
        .co-actions.in {
          animation: fadeSlideUp 0.4s ease both;
        }

        .co-next-hint {
          font-size: 12px;
          color: ${colors.textMuted};
          margin-top: 4px;
        }

        @media (max-width: 480px) {
          .co-card { padding: 36px 24px 32px; }
          .co-headline { font-size: 22px; }
          .co-stat-value { font-size: 24px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .co-badge-wrap.in,
          .co-headline.in, .co-sub.in, .co-stats.in,
          .co-actions.in, .co-card.in {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

      <div className={`co-scrim${visible ? " visible" : ""}`} role="dialog" aria-modal="true" aria-label="Roadmap completed">
        <div className={`co-card${visible ? " in" : ""}`} data-tier={badgeEarned}>

          <div className="co-eyebrow">{skillName} · {levelLabel}</div>

          <div
            className={`co-badge-wrap${badgeIn ? " in" : ""}`}
            data-tier={badgeEarned}
          >
            <Badge tier={badgeEarned as any} size="xl" />
          </div>

          {isMastery ? (
            <>
              <div className={`co-headline${badgeIn ? " in" : ""}`}>
                You've mastered {skillName}
              </div>
              <div className={`co-sub${badgeIn ? " in" : ""}`}>
                Beginner → Intermediate → Advanced. All three levels complete.
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
                <span className="co-mastery-tag">💎 Full mastery unlocked</span>
              </div>
            </>
          ) : (
            <>
              <div className={`co-headline${badgeIn ? " in" : ""}`}>
                {levelLabel} complete
              </div>
              <div className={`co-sub${badgeIn ? " in" : ""}`}>
                You earned the {badgeEarned} badge. Ready to take it further?
              </div>
            </>
          )}

          <div className={`co-stats${statsIn ? " in" : ""}`}>
            <div style={{ textAlign: "center" }}>
              <div
                className={`co-stat-value${statsIn ? " in" : ""}`}
                style={{ animationDelay: "0.75s" }}
              >
                +{pointsEarned}
              </div>
              <div className="co-stat-label">Points earned</div>
            </div>
            <div className="co-stat-divider" />
            <div style={{ textAlign: "center" }}>
              <div
                className={`co-stat-value${statsIn ? " in" : ""}`}
                style={{ animationDelay: "0.85s" }}
              >
                {totalPoints}
              </div>
              <div className="co-stat-label">Total points</div>
            </div>
          </div>

          <div className={`co-actions${ctaIn ? " in" : ""}`}>
            {!isMastery && nextLevel && (
              <>
                <Button
                  variant="primary"
                  onClick={handleLevelUp}
                  loading={loading}
                  disabled={loading}
                >
                  Start {nextLevelLabel} {skillName}
                </Button>
                <div className="co-next-hint">
                  Your {nextLevelLabel} roadmap will be personalised to your progress
                </div>
              </>
            )}
            <Button
              variant={isMastery ? "primary" : "secondary"}
              onClick={handleDashboard}
              disabled={loading}
            >
              Go to Dashboard
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}
