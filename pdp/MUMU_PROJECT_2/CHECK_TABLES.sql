-- ========================================
-- 현재 Supabase 테이블 목록 조회
-- ========================================

-- 1. Public 스키마의 모든 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. user_likes 테이블이 있는지 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_likes'
) AS user_likes_exists;

-- 3. follows 테이블이 있는지 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'follows'
) AS follows_exists;

-- 4. likes 테이블 (기존) 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'likes'
) AS likes_exists;

-- 5. reader_follows 테이블 (기존) 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'reader_follows'
) AS reader_follows_exists;
