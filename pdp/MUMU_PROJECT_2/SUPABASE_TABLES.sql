-- Supabase 테이블 생성 명령어

-- 1. reader_folders 테이블 생성
CREATE TABLE IF NOT EXISTS reader_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reader_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📁',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. reader_folder_cuts 테이블 생성 (폴더와 컷의 관계)
CREATE TABLE IF NOT EXISTS reader_folder_cuts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES reader_folders(id) ON DELETE CASCADE,
  cut_id UUID NOT NULL,
  reader_id TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, cut_id)
);

-- 3. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_reader_folders_reader_id ON reader_folders(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_folder_cuts_folder_id ON reader_folder_cuts(folder_id);
CREATE INDEX IF NOT EXISTS idx_reader_folder_cuts_cut_id ON reader_folder_cuts(cut_id);
CREATE INDEX IF NOT EXISTS idx_reader_folder_cuts_reader_id ON reader_folder_cuts(reader_id);

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE reader_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_folder_cuts ENABLE ROW LEVEL SECURITY;

-- reader_folders 정책: 자신의 폴더만 조회/수정 가능
CREATE POLICY "Readers can view their own folders"
  ON reader_folders FOR SELECT
  USING (reader_id = auth.uid()::text OR is_public = true);

CREATE POLICY "Readers can insert their own folders"
  ON reader_folders FOR INSERT
  WITH CHECK (reader_id = auth.uid()::text);

CREATE POLICY "Readers can update their own folders"
  ON reader_folders FOR UPDATE
  USING (reader_id = auth.uid()::text);

CREATE POLICY "Readers can delete their own folders"
  ON reader_folders FOR DELETE
  USING (reader_id = auth.uid()::text);

-- reader_folder_cuts 정책: 자신의 폴더 컷만 조회/수정 가능
CREATE POLICY "Readers can view their own folder cuts"
  ON reader_folder_cuts FOR SELECT
  USING (reader_id = auth.uid()::text);

CREATE POLICY "Readers can insert their own folder cuts"
  ON reader_folder_cuts FOR INSERT
  WITH CHECK (reader_id = auth.uid()::text);

CREATE POLICY "Readers can update their own folder cuts"
  ON reader_folder_cuts FOR UPDATE
  USING (reader_id = auth.uid()::text);

CREATE POLICY "Readers can delete their own folder cuts"
  ON reader_folder_cuts FOR DELETE
  USING (reader_id = auth.uid()::text);

-- 5. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_reader_folders_updated_at
  BEFORE UPDATE ON reader_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
