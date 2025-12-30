-- ============================================================
-- MUMU GROWTH ANALYTICS (v2): DISCOVERY-FIRST GROWTH ENGINE
-- ============================================================
-- Description: Supabase-first behavioral measurement & intervention system.
-- Focus: Discovery as the atomic unit, state-driven user classification, and contextual intervention.
-- Implementation: All growth logics are provable via Supabase alone.
-- ============================================================

-- 1️⃣ CORE MEASUREMENT TABLES (STRICT SCHEMATIC ENFORCEMENT)

-- 1.1 discovery_exposures (NSM Source of Truth)
CREATE TABLE IF NOT EXISTS public.discovery_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,        -- Firebase UID
  work_id uuid NOT NULL,        -- Content UUID
  creator_id text NOT NULL,     -- Firebase UID (Creator)

  exposed_at timestamptz DEFAULT now(),

  surface text NOT NULL CHECK (
    surface IN ('home_feed', 'explore', 'community', 'creator_page')
  ),

  algorithm_bucket text CHECK (
    algorithm_bucket IN ('rising', 'random', 'similar', 'following', 'editorial')
  ),

  -- Discovery is unique per User x Work lifetime
  CONSTRAINT unique_user_work UNIQUE (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_user_work ON public.discovery_exposures(user_id, work_id);
CREATE INDEX IF NOT EXISTS idx_discovery_creator ON public.discovery_exposures(creator_id);
CREATE INDEX IF NOT EXISTS idx_discovery_time ON public.discovery_exposures(exposed_at DESC);

-- 1.2 exposure_reactions (Atomic Engagement Mapping)
CREATE TABLE IF NOT EXISTS public.exposure_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  exposure_id uuid NOT NULL
    REFERENCES public.discovery_exposures(id)
    ON DELETE CASCADE,

  user_id text NOT NULL, -- Cached for performance
  work_id uuid NOT NULL, -- Cached for performance

  reaction_type text NOT NULL CHECK (
    reaction_type IN (
      'swipe_depth',
      'like',
      'comment',
      'save',
      'follow',
      'add_to_board'
    )
  ),

  reaction_value integer, -- e.g. depth count or simple flag (1)
  reacted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reactions_exposure ON public.exposure_reactions(exposure_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_type ON public.exposure_reactions(user_id, reaction_type);

-- 1.3 sessions (Raw Interaction Windows)
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz
);

-- 1.4 creator_growth_windows (Aggregated Output for Creator KPIs)
CREATE TABLE IF NOT EXISTS public.creator_growth_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id text NOT NULL,
  work_id uuid NOT NULL,

  window_type text NOT NULL CHECK (window_type IN ('24h', '7d')),

  exposures integer DEFAULT 0,
  reactions integer DEFAULT 0,
  unique_readers integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),

  CONSTRAINT unique_creator_work_window UNIQUE (creator_id, work_id, window_type)
);

-- 2️⃣ INTERVENTION LAYER (ACTION/CRM POLICY)

-- 2.1 intervention_queue (Contextual In-Product Messages)
CREATE TABLE IF NOT EXISTS public.intervention_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,

  state_type text NOT NULL,
  -- tempo_first_reaction | mood_saver | creator_first_discovery

  trigger_source text NOT NULL,
  -- exposure | reaction | growth_window

  trigger_id uuid NOT NULL,

  message_key text NOT NULL,
  -- Resolved in UI: 'INTERV_TEMPO_WELCOME', 'INTERV_MOOD_BOARD_SUGGEST', etc.

  allowed_surface text CHECK (
    allowed_surface IN ('home', 'board', 'creator_dashboard')
  ),

  is_consumed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  -- One type of intervention per user to avoid spam
  UNIQUE (user_id, state_type)
);

-- 3️⃣ RLS POLICIES (AUTHENTICATED ONLY)
ALTER TABLE public.discovery_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exposure_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_growth_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_queue ENABLE ROW LEVEL SECURITY;

-- Clients only allowed to INSERT behavior logs
CREATE POLICY "discovery_insert_own" ON public.discovery_exposures FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'sub')::text);
CREATE POLICY "reactions_insert_own" ON public.exposure_reactions FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'sub')::text);
CREATE POLICY "sessions_all_own" ON public.sessions FOR ALL USING (user_id = (auth.jwt() ->> 'sub')::text);

-- Intervention Queue: Select only for own user, update only is_consumed
CREATE POLICY "intervention_select_own" ON public.intervention_queue FOR SELECT USING (user_id = (auth.jwt() ->> 'sub')::text);
CREATE POLICY "intervention_update_own" ON public.intervention_queue FOR UPDATE USING (user_id = (auth.jwt() ->> 'sub')::text);

-- 4️⃣ DERIVED STATE LAYER (VIEWS)

-- 4.1 NSM Discovery View
CREATE OR REPLACE VIEW public.v_nsm_discovery AS
SELECT
  date_trunc('day', exposed_at) AS day,
  COUNT(*) AS total_first_exposures,
  COUNT(DISTINCT user_id) AS active_discoverers
FROM public.discovery_exposures
GROUP BY 1;

-- 4.2 v_session_state (Tempo vs Mood DNA)
CREATE OR REPLACE VIEW public.v_session_state AS
SELECT
  s.session_id,
  s.user_id,

  COUNT(de.id) AS total_exposures,
  COUNT(er.id) AS total_reactions,
  AVG(
    EXTRACT(EPOCH FROM (COALESCE(s.session_end, now()) - s.session_start))
  ) AS avg_dwell_seconds,

  CASE
    WHEN AVG(EXTRACT(EPOCH FROM (COALESCE(s.session_end, now()) - s.session_start))) < 10
         AND COUNT(er.id)::float / NULLIF(COUNT(de.id),0) < 0.2
      THEN 'tempo'
    WHEN AVG(EXTRACT(EPOCH FROM (COALESCE(s.session_end, now()) - s.session_start))) > 20
         OR BOOL_OR(er.reaction_type IN ('save','add_to_board'))
      THEN 'mood'
    ELSE 'mixed'
  END AS session_type

FROM public.sessions s
LEFT JOIN public.discovery_exposures de ON de.user_id = s.user_id 
     AND de.exposed_at BETWEEN s.session_start AND COALESCE(s.session_end, now())
LEFT JOIN public.exposure_reactions er ON er.exposure_id = de.id
GROUP BY s.session_id, s.user_id;

-- 4.3 OKR KR1: Discovery Velocity
CREATE OR REPLACE VIEW public.v_okr_discovery_velocity AS
SELECT
  date_trunc('day', exposed_at) AS day,
  COUNT(*)::float / NULLIF(COUNT(DISTINCT user_id),0) AS exposures_per_user
FROM public.discovery_exposures
GROUP BY 1;

-- 4.4 OKR KR2: Conversion Rate (First Exposure -> Any Reaction)
CREATE OR REPLACE VIEW public.v_okr_conversion_rate AS
SELECT
  date_trunc('day', de.exposed_at) AS day,
  COUNT(DISTINCT er.exposure_id)::float / NULLIF(COUNT(DISTINCT de.id),0) AS conv_rate
FROM public.discovery_exposures de
LEFT JOIN public.exposure_reactions er ON de.id = er.exposure_id
GROUP BY 1;

-- 5️⃣ AUTOMATION / TRIGGER LOGIC (SCHEMA ENFORCEMENT)

-- Function to queue interventions based on behavioral state
CREATE OR REPLACE FUNCTION public.proc_detect_interventions()
RETURNS trigger AS $$
BEGIN
  -- Logic for Mood Saver intervention
  IF NEW.reaction_type = 'save' THEN
    DECLARE
      save_count integer;
    BEGIN
      SELECT COUNT(*) INTO save_count FROM public.exposure_reactions WHERE user_id = NEW.user_id AND reaction_type = 'save';
      IF save_count >= 3 THEN
        INSERT INTO public.intervention_queue (user_id, state_type, trigger_source, trigger_id, message_key, allowed_surface)
        VALUES (NEW.user_id, 'mood_saver', 'reaction', NEW.id, 'INTERV_MOOD_BOARD_SUGGEST', 'board')
        ON CONFLICT DO NOTHING;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on reaction to find intervention moments
DROP TRIGGER IF EXISTS trg_reaction_intervention ON public.exposure_reactions;
CREATE TRIGGER trg_reaction_intervention
  AFTER INSERT ON public.exposure_reactions
  FOR EACH ROW EXECUTE FUNCTION public.proc_detect_interventions();

-- 6️⃣ FINAL PRINCIPLE: TRUTH OF DISCOVERY
/*
| Question | SQL Proof Path |
|----------|----------------|
| Who discovered what? | discovery_exposures (user_id, work_id) |
| Why did growth happen? | discovery_exposures.algorithm_bucket -> reactions |
| Is creator growth fair? | creator_growth_windows (exposures / creator_age) |
| Did we respect user? | intervention_queue (is_consumed, message_key) |
*/
