-- ========================================
-- 현재 로그인한 사용자의 프로필 생성
-- ========================================
-- Firebase UID: 7ktwhZGuwpaUnUE9RsIganDDbLI2 (I가 대문자)

-- 1. 프로필 생성 또는 업데이트
INSERT INTO reader_public_profiles (reader_id, nickname, created_at, updated_at)
VALUES (
  '7ktwhZGuwpaUnUE9RsIganDDbLI2',
  '원하는닉네임',  -- 원하는 닉네임으로 변경하세요
  NOW(),
  NOW()
)
ON CONFLICT (reader_id) 
DO UPDATE SET 
  nickname = '원하는닉네임', 
  updated_at = NOW();

-- 2. 생성된 프로필 확인
SELECT reader_id, nickname, profile_image_url, created_at, updated_at
FROM reader_public_profiles
WHERE reader_id = '7ktwhZGuwpaUnUE9RsIganDDbLI2';

-- ========================================
-- 메시지
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ 프로필 생성 완료!';
  RAISE NOTICE 'Firebase UID: 7ktwhZGuwpaUnUE9RsIganDDbLI2';
  RAISE NOTICE '닉네임: 원하는닉네임';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  주의: 이전에 추가한 사용자는 UID가 다릅니다!';
  RAISE NOTICE '- 이전: 7ktwhZGuwpaUnUE9RslganDDbLI2 (l = 소문자 엘)';
  RAISE NOTICE '- 현재: 7ktwhZGuwpaUnUE9RsIganDDbLI2 (I = 대문자 아이)';
END $$;
