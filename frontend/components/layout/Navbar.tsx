"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { colors, radius, typography } from "@/design/tokens";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          const meta = user.user_metadata || {};
          setUserAvatar(meta.avatar_url || meta.picture || null);
          setUserName(meta.full_name || meta.name || user.email?.split("@")[0] || null);
        }
      } catch (err) {
        console.warn("Navbar auth user fetch error:", err);
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }

  const isHome = pathname === "/dashboard";
  const isLeaderboard = pathname === "/leaderboard";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${colors.border}`,
        height: "64px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          height: "100%",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Brand & Navigation Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link
            href={userEmail ? "/dashboard" : "/"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(59, 130, 246, 0.35)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "19px",
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
                fontSize: "11px",
                fontWeight: 600,
                color: colors.brand,
                background: "rgba(59, 130, 246, 0.12)",
                padding: "2px 7px",
                borderRadius: "999px",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              AI Engine
            </span>
          </Link>

          {/* Navigation links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: radius.md,
                fontSize: "13px",
                fontWeight: 550,
                color: isHome ? colors.brand : colors.textSecondary,
                backgroundColor: isHome ? "rgba(59, 130, 246, 0.08)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Roadmaps
            </Link>

            <Link
              href="/leaderboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: radius.md,
                fontSize: "13px",
                fontWeight: 550,
                color: isLeaderboard ? colors.brand : colors.textSecondary,
                backgroundColor: isLeaderboard ? "rgba(59, 130, 246, 0.08)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              Leaderboard
            </Link>
          </nav>
        </div>

        {/* Right: User Profile & Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          {userEmail ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "5px 12px 5px 6px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${colors.border}`,
                  cursor: "pointer",
                  color: colors.textPrimary,
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                }}
                title={userEmail}
              >
                {/* Avatar */}
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName || "User"}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3B82F6, #10B981)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#FFFFFF",
                    }}
                  >
                    {(userEmail[0] || "U").toUpperCase()}
                  </div>
                )}

                {/* Email text */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: colors.textPrimary,
                      maxWidth: "140px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.2,
                    }}
                  >
                    {userName || userEmail.split("@")[0]}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: colors.textMuted,
                      lineHeight: 1.1,
                    }}
                  >
                    {userEmail}
                  </span>
                </div>

                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    onClick={() => setDropdownOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 60 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "210px",
                      backgroundColor: "#0D1117",
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.lg,
                      padding: "8px",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
                      zIndex: 70,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${colors.border}`, marginBottom: "4px" }}>
                      <p style={{ margin: 0, fontSize: "11px", color: colors.textMuted }}>Signed in as</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: colors.textPrimary, fontWeight: 600, wordBreak: "break-all" }}>
                        {userEmail}
                      </p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        padding: "8px 10px",
                        fontSize: "13px",
                        color: colors.textSecondary,
                        borderRadius: radius.sm,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      All Roadmaps
                    </Link>

                    <button
                      onClick={handleSignOut}
                      style={{
                        padding: "8px 10px",
                        fontSize: "13px",
                        color: colors.danger,
                        background: "transparent",
                        border: "none",
                        borderRadius: radius.sm,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontSize: "13px",
                  color: colors.brand,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: radius.md,
                  border: `1px solid rgba(59, 130, 246, 0.4)`,
                  background: "rgba(59, 130, 246, 0.08)",
                }}
              >
                Sign In
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
