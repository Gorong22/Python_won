# 🎯 MUMU 프로젝트 신규 기능 구현 계획서

## 📅 작성일: 2025-12-26

---

## ✅ 완료된 급한 버그 수정

### 1. 작가 팔로우 에러 수정

- ✅ `app_init.js`: `this.isUUID` → `window.App.utils.isUUID`
- ✅ Context 문제 해결

---

## 🎯 신규 기능 요구사항 정리

### 1️⃣ 좋아요한 작품 표시 기능

**현재 상태**:

- "좋아요 & 팔로우" 섹션이 비어있음
- 데이터는 로드되지만 UI에 표시 안됨

**요구사항**:

- ✅ 좋아요한 피드(작품)을 썸네일로 표시
- ✅ 썸네일 클릭 시 해당 작가의 피드로 이동
- ✅ 작품별로 구분하여 표시

**UI 구조**:

```
좋아요 & 팔로우
├─ 좋아요한 작품 (썸네일 그리드)
│   ├─ [작품 썸네일 1] → 클릭 시 작가 피드로
│   ├─ [작품 썸네일 2]
│   └─ ...
├─ 좋아요한 작가
├─ 팔로우한 독자
└─ 팔로우한 작가
```

---

### 2️⃣ 시리즈 기능 (정주행 시스템)

**현재 상태**:

- 작품을 올릴 수 있지만 시리즈 구분 불가
- 개별 피드로만 표시됨

**요구사항**:

1. **시리즈 생성**
   - 작가가 작품을 올릴 때 시리즈 선택/생성
   - 시리즈 제목, 설명, 썸네일 설정
2. **시리즈 그룹화**
   - 같은 시리즈의 작품들을 함께 표시
   - 시리즈 목록 페이지
3. **정주행 모드**
   - 시리즈 클릭 시 전체 에피소드 목록
   - 팝업 형태로 만화 보기
   - 이전/다음 에피소드 네비게이션

**DB 구조 (제안)**:

```sql
-- 시리즈 테이블
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,           -- 작가 Firebase UID
  title TEXT NOT NULL,                 -- 시리즈 제목
  description TEXT,                    -- 시리즈 설명
  thumbnail_url TEXT,                  -- 시리즈 대표 이미지
  genre TEXT[],                        -- 장르 태그
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- works 테이블에 series_id 추가
ALTER TABLE works ADD COLUMN series_id UUID REFERENCES series(id);
ALTER TABLE works ADD COLUMN episode_number INTEGER;  -- 에피소드 번호
```

---

### 3️⃣ 스튜디오 작품 업로드 개선

**현재 상태**:

- 장르 태그만 있음
- 제목 설정만 가능

**요구사항**:

- ✅ 시리즈 선택/생성 옵션 추가
- ✅ 기존 시리즈 목록에서 선택
- ✅ 새 시리즈 만들기
- ✅ 에피소드 번호 자동/수동 설정

**UI 구조**:

```
작품 업로드 폼
├─ 제목
├─ 장르 태그
├─ 시리즈 (NEW!)
│   ├─ [없음 (단편)]
│   ├─ [기존 시리즈 선택]
│   │   ├─ 시리즈 A
│   │   ├─ 시리즈 B
│   │   └─ ...
│   └─ [+ 새 시리즈 만들기]
├─ 에피소드 번호 (시리즈 선택 시)
└─ ...
```

---

## 📋 구현 단계

### Phase 1: DB 스키마 설정

1. ✅ `series` 테이블 생성
2. ✅ `works` 테이블에 `series_id`, `episode_number` 컬럼 추가
3. ✅ 인덱스 및 RLS 정책 설정

### Phase 2: 시리즈 관리 기능

1. ✅ 시리즈 생성 API
2. ✅ 시리즈 목록 조회 API
3. ✅ 시리즈 상세 조회 (에피소드 목록 포함)

### Phase 3: 스튜디오 UI 개선

1. ✅ 시리즈 선택 드롭다운 추가
2. ✅ 새 시리즈 생성 모달
3. ✅ 에피소드 번호 입력 필드

### Phase 4: 피드 화면 개선

1. ✅ 시리즈 표시 (배지 또는 아이콘)
2. ✅ 시리즈 페이지 생성
3. ✅ 정주행 모드 (에피소드 뷰어)

### Phase 5: 마이페이지 좋아요 표시

1. ✅ `displayLikesAndFollows` UI 렌더링
2. ✅ 썸네일 그리드 레이아웃
3. ✅ 작가 피드로 이동 로직

---

## 🗄️ SQL 스크립트 (Series)

```sql
-- ========================================
-- 시리즈 기능 DB 구조
-- ========================================

-- 1. series 테이블 생성
CREATE TABLE IF NOT EXISTS public.series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id TEXT NOT NULL,              -- Firebase UID
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

-- 2. works 테이블에 시리즈 관련 컬럼 추가
ALTER TABLE public.works
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.series(id) ON DELETE SET NULL;

ALTER TABLE public.works
ADD COLUMN IF NOT EXISTS episode_number INTEGER;

ALTER TABLE public.works
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT true;  -- 단편 여부

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_series_creator ON public.series(creator_id);
CREATE INDEX IF NOT EXISTS idx_works_series ON public.works(series_id, episode_number);

-- 4. RLS 정책
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능
DROP POLICY IF EXISTS "series_select_public" ON public.series;
CREATE POLICY "series_select_public" ON public.series
  FOR SELECT
  USING (is_public = true OR creator_id = (auth.jwt() ->> 'sub'::text));

-- 작가만 생성/수정/삭제
DROP POLICY IF EXISTS "series_insert_own" ON public.series;
CREATE POLICY "series_insert_own" ON public.series
  FOR INSERT
  WITH CHECK (creator_id = (auth.jwt() ->> 'sub'::text));

DROP POLICY IF EXISTS "series_update_own" ON public.series;
CREATE POLICY "series_update_own" ON public.series
  FOR UPDATE
  USING (creator_id = (auth.jwt() ->> 'sub'::text))
  WITH CHECK (creator_id = (auth.jwt() ->> 'sub'::text));

DROP POLICY IF EXISTS "series_delete_own" ON public.series;
CREATE POLICY "series_delete_own" ON public.series
  FOR DELETE
  USING (creator_id = (auth.jwt() ->> 'sub'::text));
```

---

## 🎨 UI/UX 구조

### 시리즈 페이지 (series_detail.html)

```
[시리즈 헤더]
  - 썸네일
  - 제목
  - 설명
  - 작가 정보
  - 완결 여부
  - 총 에피소드 수

[에피소드 목록]
  ├─ [에피소드 1] - 썸네일, 제목, 날짜
  ├─ [에피소드 2]
  └─ ...

[정주행 시작 버튼]
```

### 정주행 뷰어 (팝업/모달)

```
[네비게이션]
  [← 이전] [에피소드 1/10] [다음 →]

[작품 컨텐츠]
  - 이미지들 (세로 스크롤)

[하단 바]
  [목록으로] [다음 화 자동 재생 ON/OFF]
```

---

## 📝 다음 단계

1. **SQL 스크립트 실행** (위 SQL)
2. **시리즈 API 함수 작성** (JavaScript)
3. **스튜디오 UI 수정** (시리즈 선택 추가)
4. **피드 화면에 시리즈 표시**
5. **시리즈 상세 페이지 생성**
6. **정주행 뷰어 구현**
7. **마이페이지 좋아요 UI 렌더링**

---

## 💬 질문

이 계획이 맞나요? 다음 중 어떤 것부터 시작할까요?

1. **시리즈 DB 스키마 생성** (SQL 실행)
2. **마이페이지 좋아요 표시** (빠른 구현)
3. **스튜디오 시리즈 업로드** (작가 기능)

또는 더 구체적인 요구사항이 있으시면 말씀해주세요!
