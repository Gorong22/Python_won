-- ==========================================
-- MUMU 신규 회원 시스템 (독립형) - SQL
-- ==========================================

-- 1. 비공개 독자 정보 테이블
CREATE TABLE IF NOT EXISTS public.readers (
  user_id TEXT PRIMARY KEY,           -- Firebase UID
  username TEXT UNIQUE NOT NULL,       -- 로그인 및 식별용 아이디
  email TEXT UNIQUE NOT NULL,          -- 이메일 (Firebase와 동기화용)
  full_name TEXT NOT NULL,             -- 실명
  dob_year INTEGER NOT NULL,           -- 출생년도
  dob_month INTEGER NOT NULL,          -- 출생월
  dob_day INTEGER NOT NULL,            -- 출생일
  gender TEXT NOT NULL,                -- 성별 (male, female)
  age INTEGER NOT NULL,                -- 만 나이
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS 활성화
ALTER TABLE public.readers ENABLE ROW LEVEL SECURITY;

-- 3. 정책 설정 (본인 데이터만 관리)
CREATE POLICY "Users can manage their own reader data" 
ON public.readers
FOR ALL 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 4. 인덱스 생성 (중복 체크 성능 향상)
CREATE INDEX IF NOT EXISTS idx_readers_username ON public.readers(username);
CREATE INDEX IF NOT EXISTS idx_readers_email ON public.readers(email);
