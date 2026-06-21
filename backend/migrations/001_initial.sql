-- Nexus — Initial Migration
-- Creates all 5 core tables for the Nexus adaptive skill development platform.
-- Run this in Supabase → SQL Editor.

-- ============================================================
-- Table: skill_sessions
-- ============================================================
create table if not exists skill_sessions (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid references auth.users(id) on delete cascade,
    skill_name           text not null,
    skill_score          float,
    skill_level          text,                        -- beginner | intermediate | advanced
    personality_profile  jsonb,                       -- null if quiz skipped
    quiz_skipped         boolean default false,
    status               text default 'active',       -- active | paused | completed
    created_at           timestamp default now(),
    updated_at           timestamp default now()
);

-- ============================================================
-- Table: roadmaps
-- ============================================================
create table if not exists roadmaps (
    id                   uuid primary key default gen_random_uuid(),
    session_id           uuid references skill_sessions(id) on delete cascade,
    user_id              uuid references auth.users(id) on delete cascade,
    roadmap_data         jsonb not null,
    roadmap_version      int default 1,               -- increments on every regeneration
    current_level_index  int default 0,
    locked               boolean default false,       -- true once user enters Level 1
    created_at           timestamp default now()
);

-- ============================================================
-- Table: test_history
-- ============================================================
create table if not exists test_history (
    id                   uuid primary key default gen_random_uuid(),
    roadmap_id           uuid references roadmaps(id) on delete cascade,
    user_id              uuid references auth.users(id) on delete cascade,
    level_index          int not null,
    score                float,
    passed               boolean,
    attempt_number       int default 1,
    answers              jsonb,                       -- full answer record for gap analysis
    created_at           timestamp default now()
);

-- ============================================================
-- Table: user_stats
-- ============================================================
create table if not exists user_stats (
    user_id              uuid primary key references auth.users(id) on delete cascade,
    points               int default 0,
    badges               text[] default '{}',
    streak_days          int default 0,
    last_active          timestamp default now()
);

-- ============================================================
-- Table: feature_flags
-- ============================================================
create table if not exists feature_flags (
    flag_name            text primary key,
    enabled              boolean default true,
    description          text,
    updated_at           timestamp default now()
);

-- ============================================================
-- Seed default feature flags
-- ============================================================
insert into feature_flags (flag_name, enabled, description) values
    ('personality_quiz',   true, 'Optional personality/learning-style quiz before roadmap generation'),
    ('roadmap_regenerate', true, 'Allow up to 2 free-text roadmap regenerations'),
    ('adaptive_sublevel',  true, 'Generate targeted mini-roadmap after gate test failure'),
    ('gamification',       true, 'Points, badges, and streak tracking'),
    ('inactivity_email',   true, 'Send AI-generated re-engagement emails to inactive users')
on conflict (flag_name) do nothing;

-- ============================================================
-- Indexes for common lookups
-- ============================================================
create index if not exists idx_skill_sessions_user_id on skill_sessions(user_id);
create index if not exists idx_roadmaps_session_id on roadmaps(session_id);
create index if not exists idx_roadmaps_user_id on roadmaps(user_id);
create index if not exists idx_test_history_roadmap_id on test_history(roadmap_id);
create index if not exists idx_test_history_user_id on test_history(user_id);
