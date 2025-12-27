-- ========================================
-- MUMU 시리즈 시스템 DB 구조 설정
-- ========================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 전체 실행

-- 1. SERIES 테이블 생성
CREATE TABLE IF NOT EXISTS public.series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id TEXT NOT NULL,              -- 작가 Firebase UID
  title TEXT NOT NULL,                   -- 시리즈 제목
  description TEXT,                      -- 시리즈 설명
  thumbnail_url TEXT,                    -- 대표 이미지
  genre TEXT[],                          -- 장르 배열
  is_public BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,    -- 완결 여부
  total_episodes INTEGER DEFAULT 0,      -- 총 에피소드 수
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORKS 테이블 컬럼 추가
DO $$
BEGIN
  -- series_id 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'series_id'
  ) THEN
    ALTER TABLE public.works ADD COLUMN series_id UUID REFERENCES public.series(id) ON DELETE SET NULL;
  END IF;

  -- episode_number 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'episode_number'
  ) THEN
    ALTER TABLE public.works ADD COLUMN episode_number INTEGER DEFAULT 1;
  END IF;

  -- is_standalone 추가 (에러 발생했던 컬럼)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'is_standalone'
  ) THEN
    ALTER TABLE public.works ADD COLUMN is_standalone BOOLEAN DEFAULT true;
  END IF;

  -- genre_scores 추가 (추천 엔진용)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'genre_scores'
  ) THEN
    ALTER TABLE public.works ADD COLUMN genre_scores JSONB;
  END IF;

  -- memo 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'works' AND column_name = 'memo'
  ) THEN
    ALTER TABLE public.works ADD COLUMN memo TEXT;
  END IF;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_series_creator ON public.series(creator_id);
CREATE INDEX IF NOT EXISTS idx_works_series ON public.works(series_id, episode_number);

-- 4. RLS 정책 설정
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- 4-1. 모든 사용자가 공개된 시리즈 조회 가능
DROP POLICY IF EXISTS "series_select_public" ON public.series;
CREATE POLICY "series_select_public" ON public.series
  FOR SELECT
  USING (is_public = true OR creator_id = (auth.jwt() ->> 'sub'::text));

-- 4-2. 자신의 시리즈만 생성 가능
DROP POLICY IF EXISTS "series_insert_own" ON public.series;
CREATE POLICY "series_insert_own" ON public.series
  FOR INSERT
  WITH CHECK (creator_id = (auth.jwt() ->> 'sub'::text));

-- 4-3. 자신의 시리즈만 수정 가능
DROP POLICY IF EXISTS "series_update_own" ON public.series;
CREATE POLICY "series_update_own" ON public.series
  FOR UPDATE
  USING (creator_id = (auth.jwt() ->> 'sub'::text))
  WITH CHECK (creator_id = (auth.jwt() ->> 'sub'::text));

-- 4-4. 자신의 시리즈만 삭제 가능
DROP POLICY IF EXISTS "series_delete_own" ON public.series;
CREATE POLICY "series_delete_own" ON public.series
  FOR DELETE
  USING (creator_id = (auth.jwt() ->> 'sub'::text));

-- ========================================
-- 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ MUMU 시리즈 시스템 설정 완료!';
  RAISE NOTICE '- series: 시리즈 관리 테이블 생성';
  RAISE NOTICE '- works: series_id, episode_number, is_standalone 컬럼 추가 완료';
END $$;
