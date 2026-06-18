'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate — wraps any protected page.
 * Checks for an active Supabase session.
 * Redirects to / (login) if no session found.
 * Shows nothing while checking (prevents flash of protected content).
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.replace('/login');
      }
    });

    // Listen for auth changes (sign in / sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Still checking — render nothing to prevent flash
  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D0D12',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid #2A2A40',
            borderTopColor: '#6D5FFD',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // No session — router.replace already called, render nothing
  if (!session) return null;

  return <>{children}</>;
}
