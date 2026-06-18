'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // If already signed in, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(dashboard)');
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, Supabase redirects automatically — no need to setLoading(false)
  };

  if (checkingSession) {
    return (
      <div style={styles.page}>
        <div style={styles.spinner} />
        <style>{spinKeyframes}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{spinKeyframes}{floatKeyframes}</style>

      {/* Background grid */}
      <div style={styles.gridOverlay} aria-hidden />

      {/* Glow orb */}
      <div style={styles.glowOrb} aria-hidden />

      <main style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logoMark} aria-hidden>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#6D5FFD" fillOpacity="0.15" />
            <path
              d="M20 8L32 14V22C32 28.627 26.627 34 20 34C13.373 34 8 28.627 8 22V14L20 8Z"
              stroke="#6D5FFD"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="20" cy="22" r="5" fill="#6D5FFD" fillOpacity="0.8" />
            <circle cx="20" cy="22" r="2.5" fill="#A78BFA" />
          </svg>
        </div>

        <h1 style={styles.wordmark}>Nexus</h1>
        <p style={styles.tagline}>Learn how you learn.</p>

        <div style={styles.divider} />

        <p style={styles.body}>
          Your AI learning partner. Nexus figures out your level, adapts to
          how you think, and builds a roadmap that actually fits you.
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            ...styles.googleButton,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          aria-label="Sign in with Google"
        >
          {loading ? (
            <>
              <div style={styles.buttonSpinner} />
              Connecting…
            </>
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>

        <p style={styles.footnote}>
          By signing in you agree to our terms. No data is shared with third
          parties. Your roadmap is yours.
        </p>
      </main>

      {/* Feature pills */}
      <div style={styles.pills} aria-hidden>
        {['Adapts to your level', 'Correctable by you', 'Tracks what you miss'].map((label) => (
          <span key={label} style={styles.pill}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0D0D12',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(109,95,253,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(109,95,253,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  glowOrb: {
    position: 'absolute',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '400px',
    background: 'radial-gradient(ellipse, rgba(109,95,253,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    background: '#16161F',
    border: '1px solid #2A2A40',
    borderRadius: '20px',
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  },
  logoMark: {
    animation: 'float 3s ease-in-out infinite',
  },
  wordmark: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#F0EFFB',
    letterSpacing: '-0.5px',
    marginTop: '-4px',
  },
  tagline: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#A78BFA',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginTop: '-8px',
  },
  divider: {
    width: '100%',
    height: '1px',
    background: '#2A2A40',
    margin: '4px 0',
  },
  body: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#A8A6C0',
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#F87171',
    textAlign: 'center',
  },
  googleButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '13px 20px',
    background: '#F0EFFB',
    color: '#0D0D12',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    transition: '120ms ease',
    marginTop: '4px',
  },
  footnote: {
    fontSize: '11px',
    color: '#4A4A6A',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #2A2A40',
    borderTopColor: '#6D5FFD',
    animation: 'spin 0.8s linear infinite',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid rgba(13,13,18,0.2)',
    borderTopColor: '#0D0D12',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  pills: {
    position: 'relative',
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    padding: '5px 12px',
    background: 'rgba(109,95,253,0.08)',
    border: '1px solid rgba(109,95,253,0.2)',
    borderRadius: '9999px',
    fontSize: '11px',
    color: '#A78BFA',
    fontWeight: '500',
  },
};

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;
const floatKeyframes = `@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}`;
