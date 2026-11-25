'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
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
      <style>{spinKeyframes}{buttonCss}</style>

      <main style={styles.card}>
        <Link href="/" style={styles.brandRow} aria-label="Back to Nexus home">
          <div style={styles.logoMark} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span style={styles.wordmark}>Nexus</span>
        </Link>

        <h1 style={styles.heading}>Sign in to continue</h1>
        <p style={styles.body}>
          Access your personalised skill roadmaps, gate tests, and progress history.
        </p>

        {error && (
          <div style={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="login-google-btn"
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
              <span>Connecting…</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p style={styles.footnote}>
          Your progress and roadmaps remain private to your account.
        </p>
      </main>
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
    background: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '390px',
    background: '#090A0D',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.09)',
    borderRadius: '16px',
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  brandRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    marginBottom: '6px',
  },
  logoMark: {
    width: '36px',
    height: '36px',
    borderRadius: '9px',
    background: '#14161D',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: '-0.02em',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#F8FAFC',
    margin: 0,
    textAlign: 'center',
  },
  body: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#94A3B8',
    textAlign: 'center',
    margin: '0 0 6px 0',
  },
  errorBox: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(239,68,68,0.1)',
    boxShadow: '0 0 0 1px rgba(239,68,68,0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#F87171',
    textAlign: 'center',
  },
  googleButton: {
    width: '100%',
    minHeight: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 20px',
    background: '#F8FAFC',
    color: '#09090B',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14.5px',
    fontWeight: '600',
    marginTop: '4px',
  },
  footnote: {
    fontSize: '12px',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: '1.5',
    margin: '4px 0 0 0',
  },
  spinner: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.12)',
    borderTopColor: '#F8FAFC',
    animation: 'spin 0.8s linear infinite',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000000',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
};

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;
const buttonCss = `
  .login-google-btn {
    transition-property: opacity, transform;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  .login-google-btn:hover:not(:disabled) {
    opacity: 0.92 !important;
  }
  .login-google-btn:active:not(:disabled) {
    transform: scale(0.96);
  }
`;
