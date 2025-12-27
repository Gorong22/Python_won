-- ========================================
-- MUMU 프로젝트 Sup abase 테이블 생성 스크립트
-- ========================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- ========================================
-- 1. USER_LIKES 테이블 (좋아요한 피드/무드보드)
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Firebase UID
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
CREATE POLICY "user_likes_select_own" ON public.user_likes
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "user_likes_insert_own" ON public.user_likes
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "user_likes_delete_own" ON public.user_likes
  FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- 2. FOLLOWS 테이블 (팔로워/팔로잉)
-- ========================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL, -- 팔로우하는 사람의 Firebase UID
  following_id TEXT NOT NULL, -- 팔로우 당하는 사람의 Firebase UID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 중복 방지
  UNIQUE(follower_id, following_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- RLS 활성화
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사람이 팔로우 관계를 볼 수 있음 (공개 정보)
CREATE POLICY "follows_select_all" ON public.follows
  FOR SELECT
  USING (true);

-- RLS 정책: 자신의 팔로우만 추가/삭제 가능
CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT
  WITH CHECK (follower_id = current_setting('request.jwt.claims', true)::json->>'sub');

 CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE
  USING (follower_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- 3. COMMENTS 테이블 (댓글)
-- ========================================
-- 이미 있을 수 있으니 확인 후 생성
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('feed', 'moodboard')),
  target_id UUID NOT NULL, -- 피드 또는 무드보드 ID
  user_id TEXT NOT NULL, -- Firebase UID
  content TEXT NOT NULL,
  parent_comment_id UUID,  -- 대댓글인 경우 부모 댓글 ID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- RLS 활성화
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사람이 댓글을 볼 수 있음
CREATE POLICY "comments_select_all" ON public.comments
  FOR SELECT
  USING (true);

-- RLS 정책: 로그인한 사용자만 댓글을 작성할 수 있음
CREATE POLICY "comments_insert_authenticated" ON public.comments
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS 정책: 자신의 댓글만 수정/삭제 가능
CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- 4. READER_PUBLIC_PROFILES 테이블 (독자 프로필)
-- ========================================
-- 이미 있을 수 있으니 확인만 함
-- 닉네임 컬럼이 있는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reader_public_profiles' 
    AND column_name = 'nickname'
  ) THEN
    ALTER TABLE public.reader_public_profiles ADD COLUMN nickname TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reader_public_profiles' 
    AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE public.reader_public_profiles ADD COLUMN profile_image_url TEXT;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reader_public_profiles_uid ON public.reader_public_profiles(uid);

-- ========================================
-- 5. MOODBOARDS 테이블 (무드보드)
-- ========================================
-- 이미 있을 수 있으니 확인 후 생성
CREATE TABLE IF NOT EXISTS public.moodboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id TEXT NOT NULL, -- Firebase UID
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_moodboards_owner ON public.moodboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_moodboards_public ON public.moodboards(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_moodboards_featured ON public.moodboards(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_moodboards_created_at ON public.moodboards(created_at DESC);

-- RLS 활성화
ALTER TABLE public.moodboards ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 공개 무드보드는 모두 볼 수 있음
CREATE POLICY "moodboards_select_public" ON public.moodboards
  FOR SELECT
  USING (is_public = true OR owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS 정책: 자신의 무드보드만 생성/수정/삭제 가능
CREATE POLICY "moodboards_insert_own" ON public.moodboards
  FOR INSERT
  WITH CHECK (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "moodboards_update_own" ON public.moodboards
  FOR UPDATE
  USING (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "moodboards_delete_own" ON public.moodboards
  FOR DELETE
  USING (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- 완료 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ MUMU Supabase 테이블 생성 완료!';
  RAISE NOTICE '- user_likes: 좋아요 테이블';
  RAISE NOTICE '- follows: 팔로우/팔로잉 테이블';
  RAISE NOTICE '- comments: 댓글 테이블';
  RAISE NOTICE '- reader_public_profiles: 독자 프로필 (확인)';
  RAISE NOTICE '- moodboards: 무드보드 테이블';
END $$;
