-- ========================================
-- MUMU 프로젝트 누락된 테이블 생성 스크립트
-- ========================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- ========================================
-- 1. USER_LIKES 테이블 생성 (기존 likes 테이블과 별개)
-- ========================================
-- 기존 'likes' 테이블이 있지만, reader의 좋아요를 별도로 관리
CREATE TABLE IF NOT EXISTS public.user_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Firebase UID (reader_id)
  target_type TEXT NOT NULL CHECK (target_type IN ('feed', 'moodboard', 'work', 'cut', 'comment', 'reply')),
  target_id UUID NOT NULL, -- 좋아요한 대상의 UUID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 중복 방지: 같은 사용자가 같은 대상에 여러 번 좋아요할 수 없음
  UNIQUE(user_id, target_type, target_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON public.user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_target ON public.user_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_created_at ON public.user_likes(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 자신의 좋아요만 읽고 쓸 수 있음
DROP POLICY IF EXISTS "user_likes_select_own" ON public.user_likes;
CREATE POLICY "user_likes_select_own" ON public.user_likes
  FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'::text));

DROP POLICY IF EXISTS "user_likes_insert_own" ON public.user_likes;
CREATE POLICY "user_likes_insert_own" ON public.user_likes
  FOR INSERT
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'::text));

DROP POLICY IF EXISTS "user_likes_delete_own" ON public.user_likes;
CREATE POLICY "user_likes_delete_own" ON public.user_likes
  FOR DELETE
  USING (user_id = (auth.jwt() ->> 'sub'::text));

-- ========================================
-- 2. FOLLOWS 테이블 생성 (독자 간 팔로우)
-- ========================================
-- 기존 reader_follows와 creator_follows가 있지만, 독자-독자 팔로우는 별도
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL, -- 팔로우하는 사람의 Firebase UID
  following_id TEXT NOT NULL, -- 팔로우 당하는 사람의 Firebase UID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 중복 방지
  UNIQUE(follower_id, following_id),
  
  -- 자기 자신을 팔로우할 수 없음
  CHECK (follower_id != following_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- RLS 활성화
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사람이 팔로우 관계를 볼 수 있음 (공개 정보)
DROP POLICY IF EXISTS "follows_select_all" ON public.follows;
CREATE POLICY "follows_select_all" ON public.follows
  FOR SELECT
  USING (true);

-- RLS 정책: 자신의 팔로우만 추가/삭제 가능
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT
  WITH CHECK (follower_id = (auth.jwt() ->> 'sub'::text));

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE
  USING (follower_id = (auth.jwt() ->> 'sub'::text));

-- ========================================
-- 3. MOODBOARDS 테이블 확인 및 업데이트
-- ========================================
-- 이미 있을 수 있으니 ALTER TABLE로 컬럼 추가
DO $$
BEGIN
  -- is_public 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'moodboards' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.moodboards ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;
  
  -- is_featured 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'moodboards' 
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.moodboards ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_moodboards_public ON public.moodboards(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_moodboards_featured ON public.moodboards(is_featured) WHERE is_featured = true;

-- ========================================
-- 4. 기존 데이터 마이그레이션 (likes -> user_likes)
-- ========================================
-- 기존 likes 테이블의 데이터를 user_likes로 복사
INSERT INTO public.user_likes (user_id, target_type, target_id, created_at)
SELECT 
  user_id,
  target_type,
  target_id,
  created_at
FROM public.likes
WHERE target_type IN ('feed', 'moodboard', 'work', 'cut')
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

-- ========================================
-- 5. 기존 데이터 마이그레이션 (reader_follows -> follows)
-- ========================================
-- reader_follows 테이블이 독자-독자 팔로우 정보가 있다면 복사
-- (스키마 확인 후 필요시 실행)
-- INSERT INTO public.follows (follower_id, following_id, created_at)
-- SELECT 
--   follower_id, 
--   following_id,
--   created_at
-- FROM public.reader_follows
-- ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ========================================
-- 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ 누락된 테이블 생성 완료!';
  RAISE NOTICE '- user_likes: 좋아요 테이블 (기존 likes와 별개)';
  RAISE NOTICE '- follows: 독자-독자 팔로우 테이블';
  RAISE NOTICE '- moodboards: is_public, is_featured 컬럼 추가';
  RAISE NOTICE '';
  RAISE NOTICE '📊 데이터 마이그레이션:';
  RAISE NOTICE '- likes -> user_likes: 기존 좋아요 데이터 복사 완료';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  확인 필요:';
  RAISE NOTICE '- reader_follows 테이블 구조 확인 후 follows로 마이그레이션';
END $$;
