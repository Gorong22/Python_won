# MUMU 프로젝트 DB 연동 & 버그 수정 완료 보고서 (v2)

## 📅 작업 일시

2025-12-26 15:41

## 🎯 해결된 문제

### ✅ 1. `toggleGenre is not defined` 에러

- **원인**: `toggleGenre` 함수가 전역으로 노출되지 않음
- **해결**: `window.toggleGenre = toggleGenre` 추가
- **파일**: `public/js/mypage_reader.js` (Line 7383)

### ✅ 2. 닉네임 "@user_7ktwhZ" 표시 문제

- **원인**: DB 컬럼명이 `reader_id`인데 코드에서 `uid`를 먼저 시도
- **해결**: `reader_id`를 우선으로 조회하도록 순서 변경
- **파일**: `public/js/mypage_reader.js` (Line 41-64)

### ✅ 3. 누락된 DB 테이블

- **확인된 테이블**:
  - ❌ `user_likes` - **없음** (기존 `likes` 테이블은 있음)
  - ❌ `follows` - **없음** (독자-독자 팔로우용)
  - ✅ `comments` - 있음
  - ✅ `reader_public_profiles` - 있음
- **해결**: 새 SQL 스크립트 생성

---

## 📊 확인된 DB 스키마

### `reader_public_profiles` 테이블

```sql
PRIMARY KEY: reader_id (text)
Columns:
  - reader_id (text, NOT NULL)
  - nickname (text, NOT NULL)
  - profile_image_url (text, NULL)
  - created_at (timestamptz)
  - updated_at (timestamptz)

RLS Policies:
  - public read: SELECT (true)
  - owner update: UPDATE (reader_id = auth.uid())
```

### `comments` 테이블

```sql
PRIMARY KEY: id (uuid)
Columns:
  - id (uuid)
  - user_id (text, NOT NULL)
  - target_type (text, NOT NULL)
  - target_id (uuid, NOT NULL)
  - content (text, NOT NULL)
  - created_at (timestamptz)
  - is_deleted (boolean, DEFAULT false)

RLS Policies:
  - read comments: SELECT (true)
  - comments_insert: INSERT (user_id = auth.jwt() ->> 'sub')
  - comments_update: UPDATE (user_id = auth.jwt() ->> 'sub')
  - comments_delete: DELETE (user_id = auth.jwt() ->> 'sub')
```

### 기존 테이블 확인

- ✅ `likes` - 좋아요 정보 (기존)
- ✅ `reader_follows` - 독자-크리에이터 팔로우 (기존)
- ✅ `creator_follows` - 크리에이터 팔로우 (기존)
- ✅ `moodboards` - 무드보드 정보

---

## 🔧 수정된 코드

### 1. 닉네임 조회 함수 수정

**파일**: `public/js/mypage_reader.js`

```javascript
// ✅ BEFORE: uid를 먼저 시도
const result1 = await supabase
  .from("reader_public_profiles")
  .select("nickname, profile_image_url")
  .eq("uid", firebaseUid) // ❌ 잘못된 컬럼명
  .maybeSingle();

// ✅ AFTER: reader_id를 먼저 시도 (DB 스키마 확인 완료)
const result1 = await supabase
  .from("reader_public_profiles")
  .select("nickname, profile_image_url")
  .eq("reader_id", firebaseUid) // ✅ 올바른 컬럼명
  .maybeSingle();
```

### 2. toggleGenre 함수 전역 노출

**파일**: `public/js/mypage_reader.js`

```javascript
/**
 * 장르 토글
 */
async function toggleGenre(genreId) {
  const index = selectedGenres.indexOf(genreId);
  if (index > -1) {
    selectedGenres.splice(index, 1);
  } else {
    selectedGenres.push(genreId);
  }

  renderGenreChips(selectedGenres);
  await saveGenrePreferences();
}

// ✅ 전역으로 노출 (HTML onclick에서 사용)
window.toggleGenre = toggleGenre;
```

---

## 🗄️ SQL 스크립트 (실행 필요)

### 1️⃣ `SUPABASE_MISSING_TABLES.sql` (신규)

**목적**: 누락된 테이블 생성 및 데이터 마이그레이션

**생성할 테이블**:

1. **`user_likes`** - 독자의 좋아요 정보

   - 기존 `likes` 테이블과 별개로 독자 전용 좋아요 관리
   - `UNIQUE(user_id, target_type, target_id)` 제약 조건
   - RLS: 자신의 좋아요만 읽고 쓸 수 있음

2. **`follows`** - 독자-독자 팔로우
   - 기존 `reader_follows`, `creator_follows`와 별개
   - `UNIQUE(follower_id, following_id)` 제약 조건
   - `CHECK (follower_id != following_id)` - 자기 자신 팔로우 방지
   - RLS: 모두 읽기 가능, 자신의 팔로우만 추가/삭제 가능

**데이터 마이그레이션**:

- ✅ `likes` → `user_likes`: 기존 좋아요 데이터 복사
- ⚠️ `reader_follows` → `follows`: 스키마 확인 후 수동 실행

**실행 방법**:

```bash
1. Supabase Dashboard 접속
2. SQL Editor 선택
3. SUPABASE_MISSING_TABLES.sql 파일 내용 복사하여 실행
4. 성공 메시지 확인
```

---

## 🚀 다음 단계

### 1. SQL 실행

```sql
-- Supabase SQL Editor에서 실행
-- 파일: SUPABASE_MISSING_TABLES.sql
```

### 2. 닉네임 확인

현재 로그인한 사용자의 닉네임이 DB에 있는지 확인:

```sql
-- 특정 사용자 닉네임 확인
SELECT reader_id, nickname
FROM reader_public_profiles
WHERE reader_id = '7ktwhZGuwpaUnUE9RslganDDbLI2';

-- 모든 사용자 닉네임 확인
SELECT reader_id, nickname
FROM reader_public_profiles
ORDER BY created_at DESC;
```

**예상 결과**:

- ✅ 닉네임이 있으면: 실제 닉네임 표시
- ❌ 닉네임이 없으면: `@user_7ktwhZ` 형태로 표시

### 3. 테스트

1. **마이페이지 접속**

   - http://localhost:5505/mypage_reader.html

2. **취향 설정 클릭**

   - 장르 버튼 클릭 시 `toggleGenre is not defined` 에러 없어야 함
   - 선택한 장르가 토글되어야 함

3. **프로필 확인**
   - 닉네임이 올바르게 표시되는지 확인
   - "@user_xxx" 대신 실제 닉네임이 보여야 함

---

## 📝 확인된 DB 데이터

### `reader_public_profiles` 샘플 데이터

```sql
reader_id: 7ktwhZGuwpaUnUE9RslganDDbLI2
nickname: (확인 필요)
```

**조회 쿼리**:

```sql
SELECT * FROM reader_public_profiles
WHERE reader_id = '7ktwhZGuwpaUnUE9RslganDDbLI2';
```

만약 이 사용자의 데이터가 없다면, 수동으로 추가:

```sql
INSERT INTO reader_public_profiles (reader_id, nickname, created_at, updated_at)
VALUES (
  '7ktwhZGuwpaUnUE9RslganDDbLI2',
  '테스트사용자',  -- 원하는 닉네임
  NOW(),
  NOW()
);
```

---

## ✅ 수정 완료된 파일

1. ✅ `public/js/mypage_reader.js`

   - `getReaderNickname()` 함수: reader_id 우선 조회
   - `toggleGenre()` 함수: 전역 노출

2. ✅ `SUPABASE_MISSING_TABLES.sql` (신규)
   - user_likes 테이블 생성
   - follows 테이블 생성
   - 데이터 마이그레이션 스크립트

---

## 🐛 추가로 발견된 이슈

### 콘솔 에러 분석

```
[Nick] No nickname in reader_public_profiles for 7ktwhZGuwpaUnUE9RslganDDbLI2
```

**가능한 원인**:

1. ❌ 해당 사용자의 프로필이 DB에 없음
2. ❌ 닉네임 컬럼이 NULL
3. ❌ Firebase UID가 잘못됨

**해결 방법**:

```sql
-- 1. 사용자 존재 여부 확인
SELECT * FROM reader_public_profiles
WHERE reader_id = '7ktwhZGuwpaUnUE9RslganDDbLI2';

-- 2. 없으면 생성
INSERT INTO reader_public_profiles (reader_id, nickname, created_at, updated_at)
VALUES ('7ktwhZGuwpaUnUE9RslganDDbLI2', '기본닉네임', NOW(), NOW())
ON CONFLICT (reader_id) DO UPDATE SET updated_at = NOW();

-- 3. 닉네임이 NULL이면 업데이트
UPDATE reader_public_profiles
SET nickname = '기본닉네임', updated_at = NOW()
WHERE reader_id = '7ktwhZGuwpaUnUE9RslganDDbLI2' AND nickname IS NULL;
```

---

## 🎉 완료!

### 해결된 문제

1. ✅ `toggleGenre is not defined` 에러 해결
2. ✅ 닉네임 조회 컬럼명 수정 (uid → reader_id)
3. ✅ 누락된 테이블 생성 SQL 작성

### 남은 작업

1. ⚠️ **SQL 실행 필요**: `SUPABASE_MISSING_TABLES.sql`
2. ⚠️ **닉네임 데이터 확인**: 사용자 프로필에 닉네임이 있는지 확인
3. ⚠️ **UI 렌더링**: `displayLikesAndFollows()` 함수에 실제 HTML 렌더링 로직 추가

---

## 💡 참고사항

### reader_public_profiles 테이블 RLS 정책

- **SELECT**: 누구나 읽기 가능 (`true`)
- **UPDATE**: 본인만 수정 가능 (`reader_id = auth.uid()`)

**주의**: Firebase Custom JWT를 사용하고 있으므로, `auth.jwt() ->> 'sub'`가 Firebase UID와 일치해야 합니다.

### 테스트 시나리오

1. **로그인**: Firebase Auth로 로그인
2. **마이페이지 접속**: MY MOOD 탭 클릭
3. **취향 설정**: 장르 버튼 클릭하여 토글 동작 확인
4. **프로필 확인**: 닉네임이 올바르게 표시되는지 확인
5. **콘솔 확인**: 에러가 없는지 확인

---

## 🔗 관련 파일

- `public/js/mypage_reader.js` - 메인 수정 파일
- `SUPABASE_MISSING_TABLES.sql` - 테이블 생성 스크립트
- `SUPABASE_TABLES_SETUP.sql` - 이전 스크립트 (참고용)

문제가 있거나 추가 도움이 필요하시면 언제든 말씀해주세요! 🚀
