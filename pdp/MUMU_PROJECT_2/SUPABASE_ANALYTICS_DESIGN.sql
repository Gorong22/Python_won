-- ============================================================
-- MUMU ANALYTICS ARCHITECTURE: USER BEHAVIOR & NSM
-- ============================================================

-- 1. ANALYTICS SCHEMA
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Firebase UID
    session_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    target_type TEXT, -- feed, moodboard, cut, creator
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexing for high-performance derivation
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_name ON public.user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);

-- RLS: Only Insert (Authenticated), No Select/Update/Delete from Client
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_events_insert_own" ON public.user_events;
CREATE POLICY "user_events_insert_own" ON public.user_events FOR INSERT 
WITH CHECK (
    user_id = COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'uid'
    )
);

-- ============================================================
-- 2. USER BEHAVIORAL MODEL DERIVATION (SQL VIEW)
-- ============================================================
CREATE OR REPLACE VIEW public.v_user_profiles AS
WITH session_metrics AS (
    SELECT 
        user_id,
        session_id,
        MIN(created_at) as start_time,
        MAX(created_at) as end_time,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_sec,
        COUNT(*) FILTER (WHERE event_name = 'content_view') as views,
        COUNT(*) FILTER (WHERE event_name IN ('content_save', 'content_interaction')) as interactions
    FROM public.user_events
    GROUP BY user_id, session_id
),
user_agg AS (
    SELECT 
        user_id,
        AVG(duration_sec / NULLIF(views, 0)) as avg_dwell_per_view,
        AVG(interactions::float / NULLIF(views, 0)) as interaction_density
    FROM session_metrics
    GROUP BY user_id
)
SELECT 
    user_id,
    CASE 
        WHEN avg_dwell_per_view < 15 AND interaction_density < 0.1 THEN 'Tempo-type'
        WHEN avg_dwell_per_view >= 30 AND interaction_density >= 0.2 THEN 'Mood-type'
        ELSE 'Mixed'
    END as behavior_class
FROM user_agg;

-- ============================================================
-- 3. NSM / KPI DEFINITIONS
-- ============================================================

-- NSM: Total Content Retention Value (TCRV)
-- Definition: (Total Saves + Total Moodboard Blocks) / Unique Active Users
CREATE OR REPLACE VIEW public.analytics_nsm AS
SELECT 
    CURRENT_DATE as report_date,
    (
        (SELECT COUNT(*) FROM public.reader_folder_cuts) + 
        (SELECT COUNT(*) FROM public.moodboards) -- Simplified proxy for MB blocks
    )::float / NULLIF((SELECT COUNT(DISTINCT user_id) FROM public.user_events WHERE created_at > NOW() - INTERVAL '7 days'), 0) as nsm_tcrv;

-- KPI: Stickiness (DAU/MAU)
CREATE OR REPLACE VIEW public.analytics_kpi_stickiness AS
WITH daily AS (SELECT COUNT(DISTINCT user_id) as dau FROM public.user_events WHERE created_at > NOW() - INTERVAL '1 day'),
     monthly AS (SELECT COUNT(DISTINCT user_id) as mau FROM public.user_events WHERE created_at > NOW() - INTERVAL '30 days')
SELECT (dau::float / NULLIF(mau, 0)) * 100 as stickiness_percentage FROM daily, monthly;
