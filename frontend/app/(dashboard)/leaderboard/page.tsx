'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGate } from '@/lib/authGate';
import { createClient } from '@/lib/supabase';
import { colors, radius } from '@/design/tokens';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  tier: 'Diamond' | 'Gold' | 'Silver' | 'Bronze';
  skills: string[];
  isCurrentUser?: boolean;
}

const SAMPLE_LEADERBOARD: LeaderboardUser[] = [
  {
    id: 'user-1',
    rank: 1,
    name: 'Aarav Sharma',
    avatar: '⚡',
    points: 2450,
    streak: 21,
    tier: 'Diamond',
    skills: ['Python', 'Data Analysis', 'Deep Learning'],
  },
  {
    id: 'user-2',
    rank: 2,
    name: 'Sofia Chen',
    avatar: '🌟',
    points: 2180,
    streak: 18,
    tier: 'Diamond',
    skills: ['UI Design', 'TypeScript', 'Next.js'],
  },
  {
    id: 'user-3',
    rank: 3,
    name: 'Rohan Mehta',
    avatar: '🚀',
    points: 1940,
    streak: 14,
    tier: 'Gold',
    skills: ['Python', 'FastAPI'],
  },
  {
    id: 'user-4',
    rank: 4,
    name: 'You (Current Learner)',
    avatar: '🎯',
    points: 1480,
    streak: 7,
    tier: 'Gold',
    skills: ['Python', 'UI Design'],
    isCurrentUser: true,
  },
  {
    id: 'user-5',
    rank: 5,
    name: 'Elena Rostova',
    avatar: '💡',
    points: 1290,
    streak: 9,
    tier: 'Silver',
    skills: ['JavaScript', 'React'],
  },
  {
    id: 'user-6',
    rank: 6,
    name: 'Marcus Vance',
    avatar: '🔥',
    points: 980,
    streak: 5,
    tier: 'Bronze',
    skills: ['Data Structures'],
  },
];

const TIER_COLORS = {
  Diamond: { bg: 'rgba(76, 177, 255, 0.15)', text: '#4CB1FF', border: 'rgba(76, 177, 255, 0.4)' },
  Gold: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)' },
  Silver: { bg: 'rgba(168, 166, 192, 0.15)', text: '#A8A6C0', border: 'rgba(168, 166, 192, 0.4)' },
  Bronze: { bg: 'rgba(217, 119, 6, 0.15)', text: '#D97706', border: 'rgba(217, 119, 6, 0.4)' },
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(SAMPLE_LEADERBOARD);
  const [filter, setFilter] = useState<'all' | 'weekly' | 'streak'>('all');
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: stats } = await supabase
            .from('user_stats')
            .select('points, streak_days, badges')
            .eq('user_id', user.id)
            .maybeSingle();

          if (stats) {
            setLeaderboard((prev) =>
              prev.map((item) =>
                item.isCurrentUser
                  ? {
                      ...item,
                      points: stats.points ?? item.points,
                      streak: stats.streak_days ?? item.streak,
                      name: user.email?.split('@')[0] || 'You (Learner)',
                    }
                  : item
              )
            );
          }
        }
      } catch (e) {
        console.warn('Could not load user stats for leaderboard, using sample data:', e);
      }
    }
    loadData();
  }, [supabase]);

  const sortedBoard = [...leaderboard].sort((a, b) => {
    if (filter === 'streak') return b.streak - a.streak;
    return b.points - a.points;
  });

  return (
    <AuthGate>
      <div
        style={{
          minHeight: '100vh',
          background: '#0D0D12',
          color: colors.textPrimary,
          padding: '40px 24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#A8A6C0',
                  fontSize: '13px',
                  textDecoration: 'none',
                  marginBottom: '10px',
                }}
              >
                ← Back to Dashboard
              </Link>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#F0EFFB', margin: 0 }}>
                Learner Leaderboard 🏆
              </h1>
              <p style={{ color: '#A8A6C0', fontSize: '14px', marginTop: '4px' }}>
                Track top performers, mastery consistency, and XP rankings across all adaptive roadmaps.
              </p>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#16161F',
                borderRadius: '10px',
                padding: '4px',
                border: '1px solid #2A2A40',
              }}
            >
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'weekly', label: 'This Week' },
                  { id: 'streak', label: 'Streak Masters 🔥' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    background: filter === tab.id ? '#6D5FFD' : 'transparent',
                    color: filter === tab.id ? '#FFFFFF' : '#A8A6C0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {sortedBoard.slice(0, 3).map((item, index) => {
              const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
              return (
                <Card
                  key={item.id}
                  style={{
                    background:
                      index === 0
                        ? 'linear-gradient(180deg, rgba(109, 95, 253, 0.18) 0%, #16161F 100%)'
                        : '#16161F',
                    border: index === 0 ? '1px solid #6D5FFD' : '1px solid #2A2A40',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#6D5FFD', marginBottom: '8px' }}>
                    {medals[index]}
                  </div>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>{item.avatar}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#F0EFFB' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#A8A6C0', marginTop: '2px' }}>
                    {item.skills.join(' · ')}
                  </div>
                  <div
                    style={{
                      marginTop: '16px',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#4CB1FF',
                        background: 'rgba(76, 177, 255, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {item.points.toLocaleString()} XP
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#F59E0B',
                        background: 'rgba(245, 158, 11, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {item.streak}d streak 🔥
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Full Standings List */}
          <div
            style={{
              background: '#16161F',
              borderRadius: '16px',
              border: '1px solid #2A2A40',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 140px 120px 110px',
                padding: '16px 20px',
                background: '#1A1A26',
                borderBottom: '1px solid #2A2A40',
                fontSize: '12px',
                fontWeight: 600,
                color: '#A8A6C0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Rank</span>
              <span>Learner</span>
              <span>Tier</span>
              <span>Streak</span>
              <span style={{ textAlign: 'right' }}>Points</span>
            </div>

            {sortedBoard.map((item, index) => {
              const tierStyle = TIER_COLORS[item.tier];
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 140px 120px 110px',
                    padding: '16px 20px',
                    borderBottom: index < sortedBoard.length - 1 ? '1px solid #222234' : 'none',
                    alignItems: 'center',
                    background: item.isCurrentUser ? 'rgba(109, 95, 253, 0.12)' : 'transparent',
                  }}
                >
                  <span style={{ fontWeight: '700', color: index < 3 ? '#6D5FFD' : '#A8A6C0', fontSize: '15px' }}>
                    #{index + 1}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{item.avatar}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EFFB' }}>
                        {item.name}
                        {item.isCurrentUser && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              padding: '2px 6px',
                              background: '#6D5FFD',
                              borderRadius: '4px',
                              color: '#FFFFFF',
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#A8A6C0' }}>{item.skills.join(' · ')}</div>
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: tierStyle.text,
                        background: tierStyle.bg,
                        border: `1px solid ${tierStyle.border}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {item.tier}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 600 }}>
                    {item.streak} days 🔥
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#F0EFFB',
                      textAlign: 'right',
                    }}
                  >
                    {item.points.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
