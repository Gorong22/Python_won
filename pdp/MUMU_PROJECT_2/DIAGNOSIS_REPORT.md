# MUMU 웹 프로젝트 사전 진단 보고서

**작성일**: 2024년  
**목적**: 현재 코드 상태 분석 및 수정 전략 수립  
**범위**: 프론트엔드 코드 (JS/HTML/CSS) vs Supabase DB 스키마

---

## 1️⃣ 시스템 개요 (요약)

### 인증 흐름

**현재 구조**:
- ✅ **Firebase Auth**: 사용자 인증의 유일한 소스
  - `firebase_init.js`에서 초기화
  - `window.getCurrentFirebaseUser()` 함수로 전역 접근
  - UID는 Firebase UID (문자열) 그대로 사용
  
- ✅ **Supabase Auth**: 사용하지 않음
  - `creator_studio.js`의 `initializeSupabase()`에서 이미 제거됨
  - `supabase.auth.getUser()` 호출 없음
  - Supabase는 데이터베이스 클라이언트로만 사용

**인증 데이터 흐름**:
```
Firebase Auth (UID) → Supabase 테이블 (creator_id, owner_id, user_id)
```

### 주요 도메인 및 테이블 매핑

| 도메인 | 주요 파일 | 사용 테이블 | 인증 방식 |
|--------|-----------|-------------|-----------|
| **Creator Studio** | `creator_studio.js` | `works`, `cuts`, `creators` | Firebase UID → `creator_id` |
| **Moodboard** | `moodboard_editor.js`, `moodboard_detail.js` | `moodboards`, `moodboard_blocks` | Firebase UID → `owner_id` |
| **Community** | `community.js` | `moodboards`, `comments`, `reader_follows` | Firebase UID → `user_id` |
| **Reader Profile** | `mypage_reader.js` | `reader_follows`, `moodboards` | Firebase UID → `follower_id`/`following_id` |

---

## 2️⃣ DB 스키마 vs 코드 사용 현황 매핑

| 테이블명 | 실제 컬럼 | 코드에서 사용 중인 컬럼 | 불일치 여부 | 문제 영향도 |
|---------|----------|----------------------|------------|------------|
| **moodboards** | `id` (uuid) | `id` (uuid) | ✅ 일치 | - |
| **moodboards** | `title` (text) | `title` | ✅ 일치 | - |
| **moodboards** | `owner_id` (text) | `owner_id` | ✅ 일치 | - |
| **moodboards** | `is_public` (boolean) | `is_public` | ✅ 일치 | - |
| **moodboards** | `name` (없음) | ❌ 사용 안 함 | ✅ 정상 | - |
| **moodboards** | `blocks` (없음) | ❌ 사용 안 함 | ✅ 정상 | - |
| **moodboards** | `background_color` (없음) | ❌ 사용 안 함 | ✅ 정상 | - |
| **moodboard_blocks** | `moodboard_id` (uuid) | `moodboard_id` | ✅ 일치 | - |
| **moodboard_blocks** | `block_type` (text) | `block_type` | ✅ 일치 | - |
| **moodboard_blocks** | `meta` (jsonb) | `meta` | ✅ 일치 | - |
| **comments** | `target_type` (text) | `target_type` | ✅ 일치 | - |
| **comments** | `target_id` (uuid) | `target_id` | ✅ 일치 | - |
| **comments** | `user_id` (text) | `user_id` | ✅ 일치 | - |
| **comments** | `moodboard_id` (없음) | ❌ 사용 안 함 | ✅ 정상 | - |
| **comments** | `nickname` (없음) | ❌ 사용 안 함 | ✅ 정상 | - |
| **reader_follows** | `follower_id` (text) | `follower_id` | ✅ 일치 | - |
| **reader_follows** | `following_id` (text) | `following_id` | ✅ 일치 | - |
| **works** | `creator_id` (text) | `creator_id` | ✅ 일치 | - |
| **creators** | `id` (text) | `id` | ✅ 일치 | - |

**결론**: 현재 코드는 DB 스키마와 **대부분 일치**하고 있음. 과거 수정으로 인해 불일치 문제는 해결된 상태.

---

## 3️⃣ UUID 관련 오류 원인 분석

### UUID 검증 현황

**현재 구현 상태**:
- ✅ `moodboard_detail.js` (97-100줄): `isValidUUID()` 함수 존재
- ✅ `moodboard_editor.js` (157-161줄): `isValidUUID()` 함수 존재
- ✅ URL 파라미터 검증: `loadMoodboardFromURL()`에서 UUID 검증 수행

**UUID 생성 경로**:
```
moodboard_editor.js:createNewMoodboard() 
  → supabaseClient.from("moodboards").insert() 
  → DB가 UUID 자동 생성 (PostgreSQL uuid_generate_v4())
  → data.id 반환 (UUID)
```

**잘못된 ID가 들어올 수 있는 경로**:
1. ❌ **과거 데이터**: 이전에 생성된 문자열 ID가 DB에 남아있을 수 있음
2. ❌ **직접 URL 입력**: 사용자가 `?id=moodboard_123` 같은 잘못된 형식 입력
3. ✅ **현재 코드**: 잘못된 ID는 `isValidUUID()`로 차단됨

**URL 파라미터 → DB 쿼리 흐름**:
```
URL (?id=xxx)
  ↓
loadMoodboardFromURL() 
  ↓
isValidUUID(id) 검증
  ↓ (통과 시)
loadMoodboard(id) 
  ↓
supabaseClient.from("moodboards").select().eq("id", id)
  ↓
DB 쿼리 실행
```

**잠재적 문제점**:
- `moodboard_detail.js:625`에서 새 블록 생성 시 `moodboard_id: currentMoodboardId` 사용
  - `currentMoodboardId`가 UUID가 아닐 경우 블록 저장 실패 가능
  - 하지만 `loadMoodboardFromURL()`에서 이미 검증하므로 실질적 문제는 낮음

---

## 4️⃣ 인증/Auth 충돌 분석

### Firebase Auth 흐름

**초기화 위치**:
- `firebase_init.js`: Firebase 앱 초기화
- 각 파일에서 `import { auth } from "./firebase_init.js"` 또는 `window.getCurrentFirebaseUser()` 사용

**사용 패턴**:
```javascript
// 패턴 1: window 함수 사용 (권장)
const user = await window.getCurrentFirebaseUser();
if (user) {
  currentUserId = user.uid;
}

// 패턴 2: 직접 import
const { auth } = await import("./firebase_init.js");
const firebaseUser = auth.currentUser;
```

### Supabase Auth 호출 위치

**현재 상태**: ✅ **없음**
- `creator_studio.js:326-346`: `initializeSupabase()`에서 Supabase Auth 제거됨
- Firebase UID를 직접 사용하도록 수정됨

**과거 문제 (이미 해결됨)**:
- 이전에는 `supabase.auth.getUser()` 호출 시도
- Supabase Auth 세션이 없어서 `AuthSessionMissingError` 발생
- 현재는 Firebase Auth만 사용하므로 문제 없음

### "왜 SELECT는 되고 INSERT는 실패하는지" 구조적 설명

**RLS (Row Level Security) 정책 분석**:

1. **SELECT 쿼리**:
   - RLS 정책이 `auth.uid()`를 참조하지 않고 `public` 읽기 허용일 경우
   - 또는 `creator_id = current_user_id` 같은 직접 비교일 경우
   - → Firebase UID를 직접 비교하면 작동 가능

2. **INSERT/UPDATE 쿼리**:
   - RLS 정책이 `auth.uid()`를 참조하는 경우
   - Supabase Auth 세션이 없으면 `auth.uid()` = `null`
   - → INSERT/UPDATE 실패

**현재 해결 상태**:
- `creator_studio.js`에서 Firebase UID를 `creator_id`에 직접 저장
- RLS 정책이 `creator_id = current_user_id` 형태라면 작동 가능
- 하지만 RLS 정책이 `auth.uid()`를 참조한다면 여전히 실패 가능

**확인 필요 사항**:
- Supabase RLS 정책이 `auth.uid()`를 사용하는지 확인 필요
- 만약 사용한다면, Firebase UID를 Supabase Auth 세션으로 변환하는 로직 필요
- 또는 RLS 정책을 `creator_id = current_user_id` 형태로 변경 필요

---

## 5️⃣ 댓글 시스템 분석

### comments 테이블 실제 구조

**DB 스키마 (추정)**:
```sql
comments (
  id uuid PRIMARY KEY,
  target_type text,      -- 'moodboard', 'work' 등
  target_id uuid,        -- moodboards.id 또는 works.id
  user_id text,          -- Firebase UID
  content text,
  is_deleted boolean,
  created_at timestamp
)
```

**중요**: `moodboard_id` 컬럼은 **존재하지 않음**

### 현재 코드가 기대하는 구조

**올바른 사용**:
- ✅ `moodboard_detail.js:895-900`: `target_type='moodboard'`, `target_id=moodboardId` 사용
- ✅ `moodboard_detail.js:931-937`: 댓글 조회 시 `target_type`, `target_id` 사용
- ✅ `community.js:977-978`: 동일하게 `target_type`, `target_id` 사용

**잘못된 사용 (과거)**:
- ❌ `comments.moodboard_id` 접근 코드는 현재 없음 (이미 제거됨)

### target_type / target_id 설계 의도와 실제 사용

**설계 의도**:
- 범용 댓글 시스템: 무드보드, 작품 등 다양한 타겟에 댓글 가능
- `target_type`으로 타입 구분, `target_id`로 특정 레코드 참조

**실제 사용**:
- 현재는 `target_type='moodboard'`만 사용
- `target_id`는 `moodboards.id` (UUID) 사용

**결론**: ✅ 설계 의도대로 올바르게 사용 중

---

## 6️⃣ 닉네임 표시 실패 원인

### Firestore user 문서 로드 위치

**현재 구현**:
- ✅ `mypage_reader.js:8720-8731`: `firebase.firestore().collection("users").doc(uid).get()`
- ✅ `moodboard_detail.js:208-217`: 동일한 패턴
- ✅ `community.js:246-256`: 동일한 패턴
- ✅ `mypage_reader.js:8605-8614`: `loadProfileDisplay()`에서도 사용

**로드 패턴**:
```javascript
const userDoc = await firebase
  .firestore()
  .collection("users")
  .doc(firebaseUser.uid)
  .get();
if (userDoc.exists()) {
  const userData = userDoc.data();
  nickname = userData.nickname || null;
}
```

### nickname 필드가 있음에도 화면에 반영되지 않는 이유

**가능한 원인**:

1. **타이밍 이슈**:
   - Firestore 비동기 로드가 완료되기 전에 렌더링
   - `await` 사용 중이므로 가능성 낮음

2. **DOM 요소 미존재**:
   - `document.getElementById("mypageMoodNickname")`가 `null` 반환
   - HTML에 해당 ID가 없을 수 있음

3. **조건부 렌더링**:
   - `if (nicknameEl)` 체크 후에만 업데이트
   - 요소가 없으면 업데이트 안 됨

4. **Fallback 로직**:
   - `nickname`이 `null`이면 `displayName` 또는 UID 축약 사용
   - Firestore에 `nickname` 필드가 없을 수 있음

**코드 근거**:
- `mypage_reader.js:8738-8744`: 닉네임이 있으면 표시, 없으면 fallback
- `loadProfileDisplay()`도 동일한 로직

**확인 필요**:
- HTML에 `id="mypageMoodNickname"` 요소가 존재하는지
- Firestore `users/{uid}` 문서에 `nickname` 필드가 실제로 있는지

### Supabase / Firebase 혼용 여부 분석

**현재 상태**: ✅ **혼용 없음**
- 모든 닉네임 조회는 Firestore `users` 컬렉션 사용
- Supabase `readers` 테이블에서 닉네임 조회하는 코드 없음

---

## 7️⃣ 팔로우/팔로잉 카운트 문제

### reader_follows 테이블 기준 설계

**테이블 구조**:
```sql
reader_follows (
  follower_id text,    -- 팔로우하는 사람 (Firebase UID)
  following_id text    -- 팔로우받는 사람 (Firebase UID)
)
```

**의미**:
- `follower_id = A`, `following_id = B` → A가 B를 팔로우
- 팔로워 수: 나를 팔로우하는 사람 수 = `following_id = 내UID` COUNT
- 팔로잉 수: 내가 팔로우하는 사람 수 = `follower_id = 내UID` COUNT

### 현재 카운트 계산 방식

**구현 위치**: `mypage_reader.js:8747-8756`

```javascript
// 팔로워 수: 나를 팔로우하는 사람
const { count: followersCount } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", firebaseUser.uid);  // ✅ 올바름

// 팔로잉 수: 내가 팔로우하는 사람
const { count: followingCount } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("follower_id", firebaseUser.uid);   // ✅ 올바름
```

**결론**: ✅ 로직은 올바름

### 값이 갱신되지 않는 원인

**가능한 원인**:

1. **UI 업데이트 누락**:
   - `toggleFollowFromList()`에서 팔로우 후 `loadMyMoodProfile()` 호출 (8172줄)
   - 하지만 다른 곳에서 팔로우 시 업데이트 안 될 수 있음

2. **비동기 타이밍**:
   - COUNT 쿼리가 완료되기 전에 UI 업데이트
   - `await` 사용 중이므로 가능성 낮음

3. **DOM 요소 미존재**:
   - `mypageMoodFollowersCount`, `mypageMoodFollowingCount` 요소가 없을 수 있음

4. **캐싱 문제**:
   - Supabase 클라이언트 캐싱으로 인한 지연
   - `head: true` 옵션 사용 중이므로 가능성 낮음

**확인 필요**:
- HTML에 해당 ID 요소가 존재하는지
- 팔로우 후 실제로 COUNT 쿼리가 실행되는지 (콘솔 로그 확인)

---

## 8️⃣ UI/UX 구조 문제

### PC / 모바일 레이아웃 분기 지점

**현재 상태 분석**:
- CSS 파일 검색 결과: `style.css`만 존재
- 미디어 쿼리(`@media`) 검색 결과 없음
- 코드에서 PC/모바일 분기 로직 없음

**결론**: ✅ **단일 레이아웃 사용 중** (모바일 기준)

### "두 번째 화면 / 빈 화면"이 나타나는 이유

**moodboard_detail.js 분석**:
- `loadMoodboardFromURL()` (51-94줄):
  - `isNew` 또는 `isEdit` 파라미터가 있으면 `moodboard_editor.html`로 리다이렉트
  - 보기 모드만 지원

**moodboard_editor.js 분석**:
- `loadMoodboardFromURL()` (130-154줄):
  - `new=1`이면 새 무드보드 생성
  - `id`가 있으면 기존 무드보드 로드
  - UUID 검증 수행

**빈 화면 가능성**:
1. 무드보드 로드 실패 시 빈 상태
2. 블록이 없는 새 무드보드
3. 에러 발생 시 `alert()`만 표시하고 화면은 빈 상태

### moodboard_detail / editor 역할 혼선 분석

**역할 분리**:
- ✅ `moodboard_detail.js`: **보기 전용**
  - 편집/새로 만들기는 `moodboard_editor.html`로 리다이렉트
  - `isEditMode` 변수는 있지만 실제로는 사용 안 함 (143줄 주석)

- ✅ `moodboard_editor.js`: **편집/생성 전용**
  - 새 무드보드 생성 및 기존 무드보드 편집

**결론**: ✅ 역할 분리는 명확함

---

## 9️⃣ 에러 로그 분류표

### 치명적(Blocker)

| 에러 | 위치 | 원인 | 상태 |
|------|------|------|------|
| `AuthSessionMissingError` | `creator_studio.js` (과거) | Supabase Auth 세션 없음 | ✅ 해결됨 |
| `column moodboards.name does not exist` | `mypage_reader.js` (과거) | 잘못된 컬럼명 사용 | ✅ 해결됨 |
| `column moodboards.background_color does not exist` | `moodboard_editor.js` (과거) | 존재하지 않는 컬럼 | ✅ 해결됨 |

### 연쇄적(다른 에러 유발)

| 에러 | 연쇄 효과 | 상태 |
|------|----------|------|
| UUID 검증 실패 → 무드보드 로드 실패 → 블록 로드 실패 | 전체 기능 중단 | ✅ UUID 검증 추가됨 |
| 댓글 쿼리 실패 → 댓글 표시 안 됨 | 사용자 경험 저하 | ✅ target_type/target_id 사용 |

### 구조적(설계 불일치)

| 문제 | 설명 | 상태 |
|------|------|------|
| Supabase Auth vs Firebase Auth 혼용 | RLS 정책이 `auth.uid()` 참조 시 문제 | ⚠️ RLS 정책 확인 필요 |
| 닉네임 표시 실패 | Firestore 로드는 하지만 UI 반영 안 됨 | ⚠️ DOM 요소 확인 필요 |

### 파생적(위 에러로 인해 발생)

| 에러 | 원인 에러 | 상태 |
|------|----------|------|
| 팔로우 숫자 갱신 안 됨 | COUNT 쿼리 성공하지만 UI 업데이트 누락 | ⚠️ 확인 필요 |
| 무드보드 전시관 빈 화면 | 공개 무드보드 조회 실패 또는 데이터 없음 | ⚠️ 확인 필요 |

---

## 🔚 보고서 마무리 섹션

### 가장 먼저 고쳐야 할 "핵심 3개"

#### 1. **RLS 정책 확인 및 수정** (최우선)

**문제**:
- Supabase RLS 정책이 `auth.uid()`를 참조하는 경우
- Firebase Auth만 사용하므로 Supabase Auth 세션이 없음
- INSERT/UPDATE 쿼리 실패 가능

**해결 방안**:
- RLS 정책을 `creator_id = current_user_id` 형태로 변경
- 또는 Firebase UID를 Supabase Auth 세션으로 변환하는 로직 추가

**영향 범위**:
- `works` 테이블 INSERT/UPDATE
- `moodboards` 테이블 INSERT/UPDATE
- `comments` 테이블 INSERT

#### 2. **닉네임 표시 DOM 요소 확인** (중요)

**문제**:
- Firestore에서 닉네임을 정상적으로 로드하지만 UI에 반영 안 됨
- DOM 요소가 없거나 타이밍 이슈 가능

**해결 방안**:
- HTML에 `id="mypageMoodNickname"` 요소 존재 확인
- `loadMyMoodProfile()` 호출 시점 확인
- Firestore 문서에 실제로 `nickname` 필드 존재 확인

**영향 범위**:
- 마이페이지 프로필 닉네임 표시
- 무드보드 상세 작가명 표시
- 커뮤니티 카드 닉네임 표시

#### 3. **팔로우 숫자 갱신 로직 통합** (중요)

**문제**:
- `toggleFollowFromList()`에서는 갱신하지만 다른 팔로우 경로에서 누락 가능
- COUNT 쿼리는 성공하지만 UI 업데이트가 안 될 수 있음

**해결 방안**:
- 모든 팔로우/언팔로우 함수에서 `loadMyMoodProfile()` 호출 보장
- DOM 요소 존재 확인
- COUNT 쿼리 결과를 콘솔에 로그로 출력하여 디버깅

**영향 범위**:
- 마이페이지 팔로워/팔로잉 숫자 표시
- 팔로우 모달 내 숫자 갱신

### 이 3개를 고치면 사라질 에러 목록

1. **RLS 정책 수정 후**:
   - `works` INSERT 401 오류
   - `moodboards` INSERT 401 오류
   - `comments` INSERT 401 오류

2. **닉네임 DOM 확인 후**:
   - 닉네임이 로드되지만 표시 안 되는 문제
   - "독자"로 표시되는 문제

3. **팔로우 숫자 갱신 통합 후**:
   - 팔로우 후 숫자가 증가하지 않는 문제
   - 팔로우 모달에서 숫자 미갱신 문제

### 수정 순서 로드맵

#### Phase 1: 인증/권한 문제 해결 (1주차)

1. **RLS 정책 확인**
   - Supabase 대시보드에서 각 테이블의 RLS 정책 확인
   - `auth.uid()` 참조 여부 확인
   - 필요 시 정책 수정 또는 Firebase UID → Supabase Auth 변환 로직 추가

2. **INSERT/UPDATE 테스트**
   - `works` 테이블 INSERT 테스트
   - `moodboards` 테이블 INSERT 테스트
   - `comments` 테이블 INSERT 테스트

#### Phase 2: UI 표시 문제 해결 (2주차)

3. **DOM 요소 확인**
   - HTML 파일에서 닉네임 표시 요소 ID 확인
   - 팔로워/팔로잉 숫자 표시 요소 ID 확인
   - 없으면 추가, 있으면 로드 시점 확인

4. **닉네임 표시 로직 점검**
   - Firestore 문서에 `nickname` 필드 실제 존재 확인
   - 로드 완료 후 UI 업데이트 보장
   - Fallback 로직 개선

#### Phase 3: 기능 통합 및 테스트 (3주차)

5. **팔로우 숫자 갱신 통합**
   - 모든 팔로우/언팔로우 경로에서 갱신 함수 호출 보장
   - COUNT 쿼리 결과 로깅 추가
   - UI 업데이트 타이밍 확인

6. **전체 기능 테스트**
   - 무드보드 생성/편집/삭제 테스트
   - 댓글 작성/조회 테스트
   - 팔로우/언팔로우 테스트
   - 닉네임 표시 테스트

---

## 📊 종합 평가

### 현재 상태 요약

**✅ 잘 된 부분**:
- UUID 검증 로직 구현됨
- 댓글 시스템이 올바른 스키마 사용
- Firebase Auth만 사용하도록 정리됨
- DB 스키마와 코드 대부분 일치

**⚠️ 확인 필요**:
- RLS 정책이 `auth.uid()` 참조하는지 확인
- DOM 요소 존재 여부 확인
- Firestore 문서 구조 확인

**❌ 잠재적 문제**:
- RLS 정책이 Firebase UID를 직접 지원하지 않을 경우 INSERT 실패
- 닉네임 표시 DOM 요소가 없을 경우 표시 안 됨
- 팔로우 숫자 갱신이 일부 경로에서 누락될 수 있음

### 다음 단계 권장 사항

1. **즉시 확인**: Supabase RLS 정책 확인
2. **즉시 확인**: HTML DOM 요소 존재 여부 확인
3. **즉시 확인**: Firestore `users/{uid}` 문서 구조 확인
4. **수정 진행**: 확인 결과에 따라 위 로드맵대로 수정

---

**보고서 작성 완료**










