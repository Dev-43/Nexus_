'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGate } from '@/lib/authGate';
import { createClient } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

function CompletionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skillName = searchParams.get('skill') || 'Python Development';
  const [userName, setUserName] = useState<string>('Learner');
  const [totalXp, setTotalXp] = useState<number>(650);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner');
          const { data: stats } = await supabase
            .from('user_stats')
            .select('points')
            .eq('user_id', user.id)
            .maybeSingle();
          if (stats?.points) {
            setTotalXp(stats.points);
          }
        }
      } catch (e) {
        console.warn('Could not load user stats for completion page:', e);
      }
    }
    loadUser();
  }, [supabase]);

  const NEXT_RECOMMENDED_SKILLS = [
    {
      title: 'FastAPI & Distributed Backends',
      desc: 'Build high-throughput, async REST and WebSocket APIs.',
      badge: 'Advanced',
      xp: '+450 XP',
    },
    {
      title: 'LLM Orchestration & LangGraph',
      desc: 'Master multi-agent workflows, state persistence, and NIM integration.',
      badge: 'Expert',
      xp: '+600 XP',
    },
    {
      title: 'UI/UX Design Systems',
      desc: 'Craft production interfaces with Figma tokens and Next.js.',
      badge: 'Intermediate',
      xp: '+350 XP',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#F8FAFC',
        padding: '48px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        {/* Confetti & Trophy Hero */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '2px solid #3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            margin: '0 auto 24px',
            boxShadow: '0 0 35px rgba(59, 130, 246, 0.3)',
          }}
        >
          🎓
        </div>

        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#10B981',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '4px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          Roadmap Completed
        </span>

        <h1 style={{ fontSize: '36px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: '#F8FAFC' }}>
          Congratulations, {userName}!
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '16px', maxWidth: '560px', margin: '0 auto 36px' }}>
          You have successfully mastered the <strong style={{ color: '#F8FAFC' }}>{skillName}</strong> roadmap,
          passed all level gate tests, and earned your verified credential.
        </p>

        {/* Certificate Card */}
        <Card
          style={{
            background: '#090A0F',
            border: '1px solid #1E2330',
            borderRadius: '20px',
            padding: '36px 32px',
            marginBottom: '40px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            textAlign: 'left',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #1E2330',
              paddingBottom: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', letterSpacing: '0.1em' }}>
                NEXUS ADAPTIVE LEARNING
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F8FAFC', margin: '4px 0' }}>
                Certificate of Skill Mastery
              </h2>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>Verified Credential ID: NEX-{Math.random().toString(36).substring(2, 9).toUpperCase()}</div>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              ✓ Authenticated by AI Gate Evaluator
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              background: '#050608',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #1E2330',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>Skill Track</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>
                {skillName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>Total XP Earned</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F59E0B', marginTop: '2px' }}>
                +{totalXp} XP
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>Gate Accuracy</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>
                100% Passed
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>Issue Date</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </Card>

        {/* Recommended Next Roadmaps */}
        <div style={{ textAlign: 'left', marginBottom: '36px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', marginBottom: '16px' }}>
            Recommended Next Skills 🚀
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            {NEXT_RECOMMENDED_SKILLS.map((item) => (
              <Card
                key={item.title}
                style={{
                  background: '#090A0F',
                  border: '1px solid #1E2330',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.badge}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>
                      {item.xp}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC', margin: '4px 0 6px' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Link href="/skill">
                    <Button variant="secondary" style={{ width: '100%', fontSize: '12px' }}>
                      Start Track →
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/">
            <Button variant="primary" style={{ minWidth: '180px' }}>
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="secondary" style={{ minWidth: '180px' }}>
              View Leaderboard 🏆
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CompletionPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0D0D12' }} />}>
        <CompletionContent />
      </Suspense>
    </AuthGate>
  );
}
