-- 크리에이터 프로필 설정 관련 컬럼 확인 및 추가 쿼리

-- 1. creators 테이블에 필요한 컬럼이 있는지 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'creators' 
AND column_name IN ('pen_name', 'introduction', 'profile_image_url', 'contact_email', 'sns_links', 'firebase_uid');

-- 2. 필요한 컬럼이 없다면 추가 (이미 있으면 에러 발생하므로 선택적으로 실행)
-- pen_name 컬럼 추가 (작가명)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS pen_name TEXT;

-- introduction 컬럼 추가 (작가소개)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS introduction TEXT;

-- profile_image_url 컬럼 추가 (프로필 이미지)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- contact_email 컬럼 추가 (연락 이메일)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- sns_links 컬럼 추가 (SNS 링크)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS sns_links TEXT;

-- 3. creator_posts 테이블 확인 (is_deleted 컬럼 제거 권장)
-- 실제 삭제를 사용하므로 is_deleted 컬럼은 선택사항
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'creator_posts';

-- 4. works 테이블에 is_published 컬럼 확인 및 추가
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'works' 
AND column_name = 'is_published';

-- is_published 컬럼 추가 (아직 없다면)
ALTER TABLE works ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- 5. 기존 작품들의 is_published 값 설정 (status가 approved 또는 published인 경우)
UPDATE works 
SET is_published = true 
WHERE status IN ('approved', 'published') AND is_public = true;

-- 6. 가입 시 입력한 작가명과 작가소개가 creators 테이블에 저장되었는지 확인
SELECT firebase_uid, pen_name, introduction, profile_image_url 
FROM creators 
LIMIT 5;

-- 7. RLS (Row Level Security) 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('creators', 'creator_posts', 'works');

-- 8. creators 테이블에 대한 UPDATE 권한 확인 및 RLS 정책 추가 (필요시)
-- 크리에이터가 자신의 프로필을 수정할 수 있도록 허용
-- 기존 정책이 있다면 먼저 삭제 (에러 발생 시 무시)
DROP POLICY IF EXISTS "Creators can update own profile" ON creators;

-- 새 정책 생성 (타입 캐스팅 추가)
CREATE POLICY "Creators can update own profile"
ON creators
FOR UPDATE
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);

-- 9. creator-images 스토리지 버킷 확인
-- Supabase 대시보드에서 확인 필요:
-- - creator-images 버킷이 존재하는지
-- - Public 접근이 허용되어 있는지
-- - 업로드 권한이 설정되어 있는지

-- 10. 테스트 쿼리: 특정 사용자의 프로필 정보 조회
-- {YOUR_FIREBASE_UID}를 실제 Firebase UID로 교체
SELECT 
    firebase_uid,
    pen_name,
    introduction,
    profile_image_url,
    contact_email,
    sns_links,
    background_image_url,
    bg_scale,
    bg_x,
    bg_y,
    created_at,
    updated_at
FROM creators
WHERE firebase_uid = '{YOUR_FIREBASE_UID}';
