-- =========================
-- Supabase RLS Policies for reader_folders
-- =========================
-- 
-- 이 파일은 Supabase SQL Editor에서 실행하세요.
-- 
-- 목적: reader_folders 테이블에 대한 Row Level Security 정책 설정
-- - 현재 로그인한 사용자(reader_id)만 자신의 폴더를 생성/조회/수정/삭제 가능
-- - 공개 폴더(is_public = true)는 모든 사용자가 조회 가능
--
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor 열기
-- 2. 이 파일의 내용을 복사하여 붙여넣기
-- 3. 실행 버튼 클릭
--

-- =========================
-- 1. RLS 활성화
-- =========================
ALTER TABLE reader_folders ENABLE ROW LEVEL SECURITY;

-- =========================
-- 2. 기존 정책 삭제 (있는 경우)
-- =========================
DROP POLICY IF EXISTS "Users can insert their own folders" ON reader_folders;
DROP POLICY IF EXISTS "Users can view their own folders" ON reader_folders;
DROP POLICY IF EXISTS "Users can view public folders" ON reader_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON reader_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON reader_folders;

-- =========================
-- 3. INSERT 정책: 자신의 폴더만 생성 가능
-- =========================
CREATE POLICY "Users can insert their own folders"
ON reader_folders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = reader_id
);

-- =========================
-- 4. SELECT 정책: 자신의 폴더 또는 공개 폴더 조회 가능
-- =========================
CREATE POLICY "Users can view their own folders"
ON reader_folders
FOR SELECT
TO authenticated
USING (
  auth.uid()::text = reader_id
);

CREATE POLICY "Users can view public folders"
ON reader_folders
FOR SELECT
TO authenticated
USING (
  is_public = true
);

-- =========================
-- 5. UPDATE 정책: 자신의 폴더만 수정 가능
-- =========================
CREATE POLICY "Users can update their own folders"
ON reader_folders
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = reader_id
)
WITH CHECK (
  auth.uid()::text = reader_id
);

-- =========================
-- 6. DELETE 정책: 자신의 폴더만 삭제 가능
-- =========================
CREATE POLICY "Users can delete their own folders"
ON reader_folders
FOR DELETE
TO authenticated
USING (
  auth.uid()::text = reader_id
);

-- =========================
-- 참고사항
-- =========================
-- 
-- 1. auth.uid()는 Supabase Auth의 현재 사용자 ID를 반환합니다.
-- 2. reader_id는 text 타입이므로 auth.uid()::text로 변환합니다.
-- 3. authenticated 역할만 이 정책을 사용할 수 있습니다.
-- 4. anon(익명) 사용자는 이 정책을 사용할 수 없습니다.
--
-- 테이블 구조 확인:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'reader_folders';
--
-- 정책 확인:
-- SELECT * FROM pg_policies WHERE tablename = 'reader_folders';
--







