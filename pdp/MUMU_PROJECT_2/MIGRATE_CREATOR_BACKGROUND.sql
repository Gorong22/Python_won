-- creators 테이블에 배경 이미지 관련 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='creators' AND column_name='background_image_url') THEN
        ALTER TABLE public.creators ADD COLUMN background_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='creators' AND column_name='bg_scale') THEN
        ALTER TABLE public.creators ADD COLUMN bg_scale FLOAT DEFAULT 1.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='creators' AND column_name='bg_x') THEN
        ALTER TABLE public.creators ADD COLUMN bg_x FLOAT DEFAULT 50.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='creators' AND column_name='bg_y') THEN
        ALTER TABLE public.creators ADD COLUMN bg_y FLOAT DEFAULT 50.0;
    END IF;
END $$;

-- creator-images 스토리지 버킷 생성 (이미 있다면 무시)
-- 주의: 이 부분은 서비스 롤에서 실행하거나 대시보드에서 직접 설정해야 할 수도 있습니다.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('creator-images', 'creator-images', true) ON CONFLICT (id) DO NOTHING;

-- RLS 정책 추가 (본인 컬럼만 수정 가능하도록)
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creators_select_all" ON public.creators;
CREATE POLICY "creators_select_all" ON public.creators FOR SELECT USING (true);

DROP POLICY IF EXISTS "creators_update_own" ON public.creators;
CREATE POLICY "creators_update_own" ON public.creators FOR UPDATE 
USING (firebase_uid = (auth.jwt() ->> 'sub'))
WITH CHECK (firebase_uid = (auth.jwt() ->> 'sub'));

-- 🔹 대표 작품 설정을 위한 테이블 추가
CREATE TABLE IF NOT EXISTS public.creator_featured_works (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_firebase_uid TEXT NOT NULL,
    work_id UUID NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 추가
ALTER TABLE public.creator_featured_works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "featured_works_select_all" ON public.creator_featured_works;
CREATE POLICY "featured_works_select_all" ON public.creator_featured_works FOR SELECT USING (true);

DROP POLICY IF EXISTS "featured_works_modify_own" ON public.creator_featured_works;
CREATE POLICY "featured_works_modify_own" ON public.creator_featured_works FOR ALL 
USING (creator_firebase_uid = (auth.jwt() ->> 'sub'))
WITH CHECK (creator_firebase_uid = (auth.jwt() ->> 'sub'));
