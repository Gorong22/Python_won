# [MUMU 시스템 현황 진단 보고서]

**작성일**: 2025-01-27  
**분석 대상**: MUMU 프로젝트 전체 시스템  
**분석 목적**: 현재 상태 객관적 확정 및 구조적 위험 요소 파악

---

## 0. 프로젝트 전제 (고정)

### 기술 스택

- **Frontend**: HTML / CSS / Vanilla JS (다중 페이지, 전역 함수 의존)
- **Auth**: Firebase Auth ONLY (Supabase Auth 미사용)
- **DB**: Supabase Postgres (Auth 미사용)
- **RLS**: 활성화됨 (정책 내용은 코드에서 확인 불가)
- **일부 Firebase Cloud Functions 사용** (Custom JWT 생성용)

### ID 규칙 (DB 기준)

- **사용자 식별자**: Firebase UID (text 타입)
  - `user_id`, `reader_id`, `creator_id`, `owner_id` 등
- **콘텐츠 식별자**: UUID
  - `works.id`, `cuts.id`, `moodboards.id`, `comments.id` 등

⚠️ **중요**: UID를 UUID 컬럼에 넣거나 UUID를 UID처럼 사용하는 모든 코드는 버그로 간주

---

## 1. 전체 구조 요약

### 1.1 인증 아키텍처

```
[사용자]
  ↓
[Firebase Auth] (로그인/인증)
  ↓
[Firebase Functions] (Custom JWT 생성)
  ↓
[Supabase Client] (Custom JWT로 인증)
  ↓
[Supabase Postgres] (RLS 정책 적용)
```

**확인된 사실**:

- `supabase-auth.js`: Firebase Functions의 `getSupabaseCustomToken` 호출하여 Custom JWT 획득
- Custom JWT를 Authorization 헤더로 사용하여 Supabase 클라이언트 생성
- Firebase Auth와 Supabase Auth는 완전히 분리됨

### 1.2 데이터 흐름

**사용자 역할 판별**:

- `app_init.js`의 `determineUserRole()` 함수가 Firebase UID로 `creators` 테이블 조회
- `creators.firebase_uid`와 일치하면 creator, 없으면 reader

**콘텐츠 ID 매핑**:

- `works.creator_id` → UUID (creators.id 참조)
- `feeds` 테이블은 코드에서 직접 사용되지 않음 (works 테이블 사용)
- `likes.target_id` → UUID (works.id, comments.id 등)
- `likes.user_id` → Firebase UID (text)

---

## 2. 사용자 ID 흐름 다이어그램

### 2.1 사용자 식별자 흐름 (텍스트)

```
[Firebase Auth]
  └─> user.uid (Firebase UID, 예: "abc123xyz")
      │
      ├─> [Supabase creators 테이블]
      │   └─> creators.firebase_uid (text) = user.uid
      │       └─> creators.id (UUID) = "uuid-here"
      │
      ├─> [Supabase likes 테이블]
      │   └─> likes.user_id (text) = user.uid (직접 사용)
      │
      ├─> [Supabase comments 테이블]
      │   └─> comments.user_id (text) = user.uid (직접 사용)
      │
      ├─> [Supabase comment_replies 테이블]
      │   └─> comment_replies.user_id (text) = user.uid (직접 사용)
      │
      └─> [Supabase moodboards 테이블]
          └─> moodboards.owner_id (text) = user.uid (직접 사용)
```

### 2.2 확인된 코드 근거

**Firebase UID 직접 사용**:

- `api-functions.js:57`: `likes.user_id: firebaseUid` (Firebase UID 직접 사용)
- `api-functions.js:153`: `comments.user_id: firebaseUid` (Firebase UID 직접 사용)
- `api-functions.js:327`: `comment_replies.user_id: firebaseUid` (Firebase UID 직접 사용)

**creators 테이블 조회**:

- `app_init.js:47-50`: `creators` 테이블에서 `firebase_uid`로 조회하여 역할 판별
- `feed.js:639-642`: `works.creator_id` (UUID)로 `creators` 테이블 조회하여 `firebase_uid` 가져오기

---

## 3. 콘텐츠 ID 흐름 다이어그램

### 3.1 콘텐츠 식별자 흐름 (텍스트)

```
[works 테이블]
  └─> works.id (UUID) = "work-uuid"
      │
      ├─> [cuts 테이블]
      │   └─> cuts.work_id (UUID) = works.id
      │       └─> cuts.id (UUID) = "cut-uuid"
      │
      ├─> [likes 테이블]
      │   └─> likes.target_id (UUID) = works.id
      │       └─> likes.target_type = "feed" | "work" | "cut"
      │
      ├─> [comments 테이블]
      │   └─> comments.target_id (UUID) = works.id
      │       └─> comments.target_type = "feed" | "work" | "cut"
      │
      └─> [moodboard_blocks 테이블]
          └─> moodboard_blocks.cut_id (UUID) = cuts.id

[comments 테이블]
  └─> comments.id (UUID) = "comment-uuid"
      │
      ├─> [comment_replies 테이블]
      │   └─> comment_replies.comment_id (UUID) = comments.id
      │
      └─> [likes 테이블]
          └─> likes.target_id (UUID) = comments.id
              └─> likes.target_type = "comment"

[moodboards 테이블]
  └─> moodboards.id (UUID) = "moodboard-uuid"
      └─> [moodboard_blocks 테이블]
          └─> moodboard_blocks.moodboard_id (UUID) = moodboards.id
```

### 3.2 확인된 코드 근거

**UUID 검증**:

- `api-functions.js:39-42`: UUID 검증 함수 사용
- `api-functions.js:44-47`: `target_id`가 UUID가 아니면 에러 반환
- `feed.js:1113-1146`: `feedIds` 배열에서 UUID 형식 검증 후 필터링

**works.creator_id → creators.id 매핑**:

- `feed.js:629-658`: `works.creator_id` (UUID)로 `creators` 테이블 조회하여 `firebase_uid` 가져오기

---

## 4. DB 구조 기반 위험 분석

### 4.1 필수 테이블 분석

#### creators 테이블

**사용자 ID 기준**: `firebase_uid` (text, Firebase UID), `id` (UUID)

**확인된 코드**:

- `app_init.js:47-50`: `creators.firebase_uid`로 조회
- `feed.js:639-642`: `creators.id`로 조회 (works.creator_id와 매칭)

**위험 요소**:

- ❌ **FK 제약 없음**: `works.creator_id`가 `creators.id`를 참조하지만 FK 제약 없음
- ❌ **RLS 충돌 가능**: `creators` 테이블 조회 시 RLS 정책이 `firebase_uid` 기반이 아닐 경우 실패 가능
- ⚠️ **ID 타입 혼용**: `creators.id` (UUID)와 `creators.firebase_uid` (text) 혼용 가능성

#### works 테이블

**사용자 ID 기준**: `creator_id` (UUID, creators.id 참조)

**확인된 코드**:

- `feed.js:576-595`: `works` 테이블 조회 시 `creator_id` 포함
- `feed.js:629-658`: `works.creator_id`로 `creators` 테이블 조회하여 `firebase_uid` 가져오기

**위험 요소**:

- ❌ **FK 제약 없음**: `works.creator_id`가 `creators.id`를 참조하지만 FK 제약 없음
- ❌ **존재하지 않는 creator_id 가능**: FK 제약 없어서 삭제된 creator 참조 가능
- ⚠️ **NULL 처리**: `works.creator_id`가 NULL일 경우 처리 로직 확인 필요

#### feeds 테이블

**확인된 사실**: 코드에서 직접 사용되지 않음 (works 테이블 사용)

**위험 요소**:

- ⚠️ **미사용 테이블**: `feeds` 테이블이 존재하지만 코드에서 사용되지 않음
- ❌ **데이터 불일치 가능**: `feeds` 테이블과 `works` 테이블 간 동기화 문제 가능

#### likes 테이블

**사용자 ID 기준**: `user_id` (text, Firebase UID)

**확인된 코드**:

- `api-functions.js:57`: `likes.user_id: firebaseUid` (Firebase UID 직접 사용)
- `feed.js:1278-1283`: `likes.user_id`로 현재 사용자 좋아요 상태 확인

**위험 요소**:

- ❌ **FK 제약 없음**: `likes.user_id`가 사용자 테이블을 참조하지 않음
- ❌ **RLS 충돌 가능**: RLS 정책이 `user_id` 기반이 아닐 경우 실패 가능
- ⚠️ **target_id 타입 검증**: `target_id`가 UUID인지 검증하지만 DB 제약 없음

#### comments 테이블

**사용자 ID 기준**: `user_id` (text, Firebase UID)

**확인된 코드**:

- `api-functions.js:153`: `comments.user_id: firebaseUid` (Firebase UID 직접 사용)
- `api-functions.js:175-180`: `comments` 테이블 조회 시 `user_id` 포함

**위험 요소**:

- ❌ **FK 제약 없음**: `comments.user_id`가 사용자 테이블을 참조하지 않음
- ❌ **target_id FK 없음**: `comments.target_id`가 `works.id` 등을 참조하지만 FK 제약 없음
- ⚠️ **target_type 검증**: 코드에서만 검증, DB 제약 없음

#### comment_replies 테이블

**사용자 ID 기준**: `user_id` (text, Firebase UID)

**확인된 코드**:

- `api-functions.js:327`: `comment_replies.user_id: firebaseUid` (Firebase UID 직접 사용)
- `api-functions.js:348-352`: `comment_replies` 테이블 조회 시 `comment_id`로 필터링

**위험 요소**:

- ❌ **FK 제약 없음**: `comment_replies.comment_id`가 `comments.id`를 참조하지만 FK 제약 없음
- ❌ **존재하지 않는 comment_id 가능**: FK 제약 없어서 삭제된 comment 참조 가능

#### creator_follows 테이블

**사용자 ID 기준**: `reader_id` (Firebase UID, text), `creator_id` (Firebase UID, text)

**확인된 코드**:

- `api-functions.js:807-889`: `followCreator()` - Firebase UID 직접 사용
- `api-functions.js:897-966`: `unfollowCreator()` - Firebase UID 직접 사용
- `api-functions.js:975-1066`: `__toggleCreatorFollowAPI()` - Firebase UID 직접 사용

**위험 요소**:

- ❌ **FK 제약 없음**: `creator_follows.reader_id`와 `creator_follows.creator_id` FK 제약 없음
- ✅ **ID 타입 명확**: 둘 다 Firebase UID (text)로 확인됨 - UUID 변환 없음

#### reader_follows 테이블

**확인된 사실**: 코드에서 사용되지 않음

**위험 요소**:

- ⚠️ **미사용 테이블**: `reader_follows` 테이블이 존재하지만 코드에서 사용되지 않음

#### moodboards 테이블

**사용자 ID 기준**: `owner_id` (text, Firebase UID)

**확인된 코드**:

- `moodboard_detail.js:313`: `moodboardData.owner_id` 사용
- `moodboard_detail.js:321-326`: `owner_id`로 독자 닉네임/크리에이터 펜네임 조회

**위험 요소**:

- ❌ **FK 제약 없음**: `moodboards.owner_id`가 사용자 테이블을 참조하지 않음
- ⚠️ **RLS 충돌 가능**: RLS 정책이 `owner_id` 기반이 아닐 경우 실패 가능

#### moodboard_blocks 테이블

**사용자 ID 기준**: 없음 (moodboard_id만 사용)

**확인된 코드**:

- `moodboard_detail.js:191-195`: `moodboard_blocks` 테이블에서 `moodboard_id`로 조회

**위험 요소**:

- ❌ **FK 제약 없음**: `moodboard_blocks.moodboard_id`가 `moodboards.id`를 참조하지만 FK 제약 없음
- ❌ **FK 제약 없음**: `moodboard_blocks.cut_id`가 `cuts.id`를 참조하지만 FK 제약 없음

#### cuts 테이블

**사용자 ID 기준**: 없음 (work_id만 사용)

**확인된 코드**:

- `feed.js:589`: `works` 조회 시 `cuts` 포함
- `moodboard_detail.js:361-365`: `cuts` 테이블에서 `cut_id`로 조회

**위험 요소**:

- ❌ **FK 제약 없음**: `cuts.work_id`가 `works.id`를 참조하지만 FK 제약 없음

---

## 5. 인증 & 실행 순서 분석

### 5.1 페이지별 Firebase Auth 확정 시점

#### feed.js (index.html)

**확인된 코드**:

- `feed.js:36-65`: `checkAuthStatus()` 함수가 `onAuthStateChanged` 사용
- `feed.js:67-75`: DOMContentLoaded 시 `checkAuthStatus()` 호출
- `feed.js:105-113`: `loadLiveFeed()` 호출 전 `ensureSupabaseReady()` 대기

**확정 시점**:

- ✅ `onAuthStateChanged` 콜백에서 확정
- ⚠️ **타이밍 문제**: `loadLiveFeed()`가 인증 확정 전에 호출될 수 있음

#### app_init.js (전역)

**확인된 코드**:

- `app_init.js:79-112`: `initializeAppUser()` 함수가 `getCurrentFirebaseUser()` 사용
- `app_init.js:152-167`: DOMContentLoaded 시 `initializeAppUser()` 호출 (500ms 지연)

**확정 시점**:

- ✅ `getCurrentFirebaseUser()` Promise에서 확정
- ⚠️ **타이밍 문제**: 500ms 지연 후에도 Firebase Auth가 준비되지 않을 수 있음

#### moodboard_detail.js

**확인된 코드**:

- `moodboard_detail.js:39-53`: `getCurrentUser()` 함수가 `getCurrentFirebaseUser()` 사용
- `moodboard_detail.js:24-30`: DOMContentLoaded 시 `getCurrentUser()` 호출

**확정 시점**:

- ✅ `getCurrentFirebaseUser()` Promise에서 확정
- ⚠️ **타이밍 문제**: `loadMoodboard()`가 인증 확정 전에 호출될 수 있음

### 5.2 인증 확정 이전에 호출되는 DB 쿼리 목록

**확인된 코드**:

- `feed.js:105-113`: `loadLiveFeed()` 호출 (인증 확인 전)
- `feed.js:575-595`: `works` 테이블 조회 (인증 확인 전)
- `moodboard_detail.js:55-97`: `loadMoodboardFromURL()` 호출 (인증 확인 전)
- `moodboard_detail.js:136-179`: `loadMoodboard()` 호출 (인증 확인 전)

**위험 요소**:

- ❌ **RLS 실패 가능**: 인증 확정 전에 DB 쿼리 시 RLS 정책 위반 가능
- ❌ **Custom JWT 미생성**: Firebase Functions의 Custom JWT가 생성되기 전에 쿼리 시 실패 가능

### 5.3 undefined → function → undefined 상태가 발생 가능한 전역 함수

**확인된 코드**:

- `feed.js:1065-1070`: `getCurrentUserId()` 함수가 `window.getCurrentFirebaseUser` 확인
- `feed-stat-interaction.js:154-162`: 전역 함수 존재 여부 확인 로그
- `api-functions.js:534-543`: `getCurrentFirebaseUid()` 함수가 여러 경로로 확인

**위험 요소**:

- ❌ **스크립트 로드 순서**: `reader_auth.js`가 로드되기 전에 `getCurrentFirebaseUser` 호출 시 undefined
- ❌ **동적 import 실패**: `import("./reader_auth.js")` 실패 시 함수 미정의
- ⚠️ **폴백 로직**: 여러 폴백 경로가 있지만 모두 실패할 수 있음

---

## 6. 기능별 현재 상태 판정

### 6.1 좋아요 기능

**상태**: ⚠️ **부분 작동**

**확인된 코드**:

- `api-functions.js:15-64`: `likeTarget()` 함수 정의
- `feed-stat-interaction.js:173-315`: `handleFeedLikeAction()` 함수 정의
- `feed.js:1274-1327`: 좋아요 상태 확인 및 UI 업데이트

**실패 원인**:

1. **ID 불일치**:

   - `likes.user_id`는 Firebase UID (text)
   - `likes.target_id`는 UUID
   - ✅ 코드에서 올바르게 처리됨

2. **Auth 타이밍**:

   - `feed-stat-interaction.js:213`: `getCurrentFirebaseUid()` 호출
   - ⚠️ 인증 확정 전에 호출 시 실패 가능

3. **RLS**:

   - `feed-stat-interaction.js:253-257`: RLS 정책 위반 에러 처리
   - ❌ RLS 정책 내용 확인 불가

4. **렌더링 로직**:
   - `feed-stat-interaction.js:195-208`: Optimistic UI 업데이트
   - ✅ 정상 작동

### 6.2 댓글 / 대댓글 기능

**상태**: ⚠️ **부분 작동**

**확인된 코드**:

- `api-functions.js:110-160`: `createComment()` 함수 정의
- `api-functions.js:298-334`: `createReply()` 함수 정의
- `feed-stat-interaction.js:1404-1517`: `submitComment()` 함수 정의

**실패 원인**:

1. **ID 불일치**:

   - `comments.user_id`는 Firebase UID (text)
   - `comments.target_id`는 UUID
   - ✅ 코드에서 올바르게 처리됨

2. **Auth 타이밍**:

   - `feed-stat-interaction.js:1423`: `getCurrentFirebaseUid()` 호출
   - ⚠️ 인증 확정 전에 호출 시 실패 가능

3. **RLS**:

   - `feed-stat-interaction.js:1474-1477`: RLS 정책 위반 에러 처리
   - ❌ RLS 정책 내용 확인 불가

4. **렌더링 로직**:
   - `feed-stat-interaction.js:704-1318`: `renderComments()` 함수 정의
   - ⚠️ 표시명 조회 시 Supabase/Firestore 혼용으로 실패 가능

### 6.3 팔로우 기능

**상태**: ❌ **실패 (비활성화됨)**

**확인된 코드**:

- `api-functions.js:578-582`: `toggleCreatorFollow()` 함수가 BLOCKED 처리됨
- `feed-stat-interaction.js:2440-2456`: `checkFollowStatus()` 함수가 BLOCKED 처리됨
- `feed-stat-interaction.js:2514-2538`: `toggleCreatorFollow()` 함수가 UI만 변경

**실패 원인**:

1. **ID 불일치**:

   - `creator_follows.reader_id` 타입 불명확
   - `creator_follows.creator_id` 타입 불명확
   - ❌ 코드에서 확인 불가

2. **기능 비활성화**:
   - ❌ 모든 팔로우 기능이 BLOCKED 처리됨
   - ❌ DB 작업 없이 UI만 변경

### 6.4 무드보드 로드

**상태**: ⚠️ **부분 작동**

**확인된 코드**:

- `moodboard_detail.js:136-179`: `loadMoodboard()` 함수 정의
- `moodboard_detail.js:181-222`: `loadBlocks()` 함수 정의
- `moodboard_detail.js:306-341`: `loadCreatorInfo()` 함수 정의

**실패 원인**:

1. **ID 불일치**:

   - `moodboards.owner_id`는 Firebase UID (text)
   - `moodboards.id`는 UUID
   - ✅ 코드에서 올바르게 처리됨

2. **Auth 타이밍**:

   - `moodboard_detail.js:39-53`: `getCurrentUser()` 호출
   - ⚠️ 인증 확정 전에 `loadMoodboard()` 호출 시 실패 가능

3. **RLS**:

   - `moodboard_detail.js:146-150`: `moodboards` 테이블 조회
   - ❌ RLS 정책 내용 확인 불가

4. **렌더링 로직**:
   - `moodboard_detail.js:346-425`: `renderBlocks()` 함수 정의
   - ⚠️ `cut_id` 매핑 실패 시 렌더링 실패 가능

### 6.5 무드보드 저장

**상태**: ❓ **확인 불가** (에디터 파일 미확인)

**확인된 코드**:

- `moodboard_detail.js:55-97`: 에디터로 리다이렉트 처리
- `moodboard_editor.html` 존재 확인

**실패 원인**:

- ❓ 에디터 코드 미확인으로 판정 불가

### 6.6 컷 렌더링

**상태**: ⚠️ **부분 작동**

**확인된 코드**:

- `feed.js:589`: `works` 조회 시 `cuts` 포함
- `feed.js:660-693`: `cuts` 데이터 매핑 및 렌더링
- `moodboard_detail.js:352-376`: `cut_id` 매핑 로직

**실패 원인**:

1. **ID 불일치**:

   - `cuts.work_id`는 UUID (works.id 참조)
   - `cuts.id`는 UUID
   - ✅ 코드에서 올바르게 처리됨

2. **FK 제약 없음**:

   - ❌ `cuts.work_id`가 존재하지 않는 `works.id` 참조 가능
   - ❌ 삭제된 work의 cut이 남아있을 수 있음

3. **렌더링 로직**:
   - `feed.js:922-1058`: `createFeedCard()` 함수 정의
   - ⚠️ `cuts` 배열이 비어있을 경우 썸네일 사용

### 6.7 프로필/닉네임 표시

**상태**: ⚠️ **부분 작동**

**확인된 코드**:

- `api-functions.js:190-256`: `loadComments()` 함수에서 표시명 조회
- `feed-stat-interaction.js:774-1084`: `renderComments()` 함수에서 표시명 조회
- `moodboard_detail.js:233-304`: 독자 닉네임/크리에이터 펜네임 조회

**실패 원인**:

1. **ID 불일치**:

   - 독자: Firestore `readers` 컬렉션의 `nickname` 사용
   - 크리에이터: Supabase `creators` 테이블의 `pen_name` 사용
   - ⚠️ 두 시스템 혼용으로 실패 가능

2. **Auth 타이밍**:

   - `feed-stat-interaction.js:706`: `getCurrentFirebaseUid()` 호출
   - ⚠️ 인증 확정 전에 호출 시 실패 가능

3. **RLS**:

   - `api-functions.js:196-217`: `creators` 테이블 조회
   - ❌ RLS 정책 내용 확인 불가

4. **렌더링 로직**:
   - `feed-stat-interaction.js:1064-1078`: 표시명 결정 로직
   - ⚠️ 크리에이터/독자 구분 실패 시 기본값 "사용자" 표시

---

## 7. 기능별 상태 매트릭스

| 기능          | 상태        | ID 불일치   | Auth 타이밍 | RLS         | 렌더링 로직 |
| ------------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| 좋아요        | ⚠️ 부분     | ✅ 정상     | ⚠️ 위험     | ❌ 확인불가 | ✅ 정상     |
| 댓글          | ⚠️ 부분     | ✅ 정상     | ⚠️ 위험     | ❌ 확인불가 | ⚠️ 위험     |
| 대댓글        | ⚠️ 부분     | ✅ 정상     | ⚠️ 위험     | ❌ 확인불가 | ⚠️ 위험     |
| 팔로우        | ❌ 실패     | ❌ 확인불가 | ❌ 비활성화 | ❌ 확인불가 | ❌ 비활성화 |
| 무드보드 로드 | ⚠️ 부분     | ✅ 정상     | ⚠️ 위험     | ❌ 확인불가 | ⚠️ 위험     |
| 무드보드 저장 | ❓ 확인불가 | ❓ 확인불가 | ❓ 확인불가 | ❓ 확인불가 | ❓ 확인불가 |
| 컷 렌더링     | ⚠️ 부분     | ✅ 정상     | ✅ 정상     | ❌ 확인불가 | ⚠️ 위험     |
| 프로필/닉네임 | ⚠️ 부분     | ⚠️ 위험     | ⚠️ 위험     | ❌ 확인불가 | ⚠️ 위험     |

**범례**:

- ✅ 정상: 코드에서 올바르게 처리됨
- ⚠️ 위험: 실패 가능성이 있음
- ❌ 확인불가: 코드에서 확인 불가
- ❌ 실패/비활성화: 기능이 작동하지 않음

---

## 8. ❗ 지금 가장 위험한 구조적 전제 TOP 5

### 8.1 FK 제약 없음으로 인한 데이터 무결성 위험

**위험도**: 🔴 **매우 높음**

**확인된 사실**:

- 모든 테이블 간 FK 제약이 없음
- `works.creator_id` → `creators.id` 참조하지만 FK 없음
- `comments.target_id` → `works.id` 참조하지만 FK 없음
- `moodboard_blocks.moodboard_id` → `moodboards.id` 참조하지만 FK 없음

**영향**:

- 삭제된 creator의 work가 남아있을 수 있음
- 존재하지 않는 `target_id`를 참조하는 comment 생성 가능
- 데이터 정합성 보장 불가

**코드 근거**:

- `feed.js:639-642`: `works.creator_id`로 `creators` 조회 (FK 없어도 작동)
- `api-functions.js:148-154`: `comments` INSERT 시 `target_id` 검증 없음 (DB 제약 없음)

### 8.2 인증 확정 전 DB 쿼리 호출

**위험도**: 🔴 **매우 높음**

**확인된 사실**:

- `feed.js:105-113`: `loadLiveFeed()` 호출이 인증 확인 전에 실행됨
- `moodboard_detail.js:55-97`: `loadMoodboardFromURL()` 호출이 인증 확인 전에 실행됨
- Custom JWT 생성 전에 Supabase 쿼리 시도 가능

**영향**:

- RLS 정책 위반으로 쿼리 실패
- Custom JWT 미생성으로 인증 실패
- 사용자 경험 저하 (에러 메시지 표시)

**코드 근거**:

- `feed.js:67-75`: DOMContentLoaded 시 `checkAuthStatus()` 호출
- `feed.js:105-113`: `loadLiveFeed()` 호출 (인증 확인과 독립적)
- `supabase-auth.js:19-40`: Custom JWT 생성은 Firebase Functions 호출 필요

### 8.3 Firebase UID와 UUID 혼용 가능성

**위험도**: 🟡 **중간**

**확인된 사실**:

- `creators.id`는 UUID, `creators.firebase_uid`는 text
- `works.creator_id`는 UUID (creators.id 참조)
- `likes.user_id`는 Firebase UID (text)
- `moodboards.owner_id`는 Firebase UID (text)

**영향**:

- 잘못된 ID 타입 사용 시 쿼리 실패
- 데이터 불일치 발생 가능

**코드 근거**:

- `feed.js:629-658`: `works.creator_id` (UUID)로 `creators` 조회하여 `firebase_uid` 가져오기
- `api-functions.js:57`: `likes.user_id: firebaseUid` (Firebase UID 직접 사용)

### 8.4 전역 함수 의존성으로 인한 undefined 상태

**위험도**: 🟡 **중간**

**확인된 사실**:

- `window.getCurrentFirebaseUser` 함수가 `reader_auth.js`에서 정의됨
- 스크립트 로드 순서에 따라 undefined 가능
- 동적 import 실패 시 함수 미정의

**영향**:

- 함수 호출 시 TypeError 발생
- 기능 작동 중단

**코드 근거**:

- `feed.js:1065-1070`: `getCurrentUserId()` 함수가 `window.getCurrentFirebaseUser` 확인
- `feed-stat-interaction.js:1811-1844`: `getCurrentFirebaseUid()` 함수가 여러 경로로 확인

### 8.5 RLS 정책과 코드 로직 불일치

**위험도**: 🔴 **매우 높음**

**확인된 사실**:

- RLS 정책 내용이 코드에서 확인 불가
- 코드는 `user_id` (Firebase UID) 기반으로 작성됨
- RLS 정책이 다른 방식으로 구현되어 있을 수 있음

**영향**:

- RLS 정책 위반으로 쿼리 실패
- 권한 문제로 기능 작동 중단

**코드 근거**:

- `feed-stat-interaction.js:253-257`: RLS 정책 위반 에러 처리 (42501 코드)
- `feed-stat-interaction.js:1474-1477`: RLS 정책 위반 에러 처리

---

## 9. ❗ 이 상태에서 수정하면 반드시 깨지는 영역

### 9.1 FK 제약 추가 시

**깨지는 영역**:

- ❌ **기존 데이터**: FK 제약 추가 시 기존 데이터 중 무효한 참조가 있으면 실패
- ❌ **삭제 로직**: FK 제약이 있으면 참조된 데이터 삭제 시 CASCADE 필요
- ❌ **트랜잭션**: FK 제약 추가는 트랜잭션 필요 (데이터 정리 후 제약 추가)

**영향 범위**:

- 모든 테이블 간 관계
- 데이터 마이그레이션 필요

### 9.2 인증 타이밍 수정 시

**깨지는 영역**:

- ❌ **페이지 로드 순서**: 인증 대기 로직 추가 시 페이지 로드 지연
- ❌ **기존 쿼리**: 인증 대기 전에 호출되는 모든 쿼리 실패
- ❌ **에러 처리**: 인증 실패 시 에러 처리 로직 필요

**영향 범위**:

- `feed.js`: `loadLiveFeed()` 함수
- `moodboard_detail.js`: `loadMoodboard()` 함수
- 모든 페이지의 초기 로드 로직

### 9.3 ID 타입 통일 시

**깨지는 영역**:

- ❌ **기존 데이터**: ID 타입 변경 시 데이터 마이그레이션 필요
- ❌ **쿼리 로직**: 모든 쿼리에서 ID 타입 확인 필요
- ❌ **매핑 로직**: `works.creator_id` → `creators.firebase_uid` 매핑 로직 변경 필요

**영향 범위**:

- `creators` 테이블: `id` (UUID) vs `firebase_uid` (text)
- `works` 테이블: `creator_id` (UUID)
- 모든 사용자 ID 참조

### 9.4 전역 함수 의존성 제거 시

**깨지는 영역**:

- ❌ **기존 코드**: `window.getCurrentFirebaseUser` 호출하는 모든 코드
- ❌ **동적 import**: 동적 import로 변경 시 로드 순서 문제
- ❌ **에러 처리**: 함수 미정의 시 에러 처리 로직 필요

**영향 범위**:

- `feed.js`: `getCurrentUserId()` 함수
- `feed-stat-interaction.js`: `getCurrentFirebaseUid()` 함수
- 모든 인증 관련 코드

### 9.5 RLS 정책 수정 시

**깨지는 영역**:

- ❌ **기존 쿼리**: RLS 정책 변경 시 기존 쿼리 실패 가능
- ❌ **권한 로직**: 권한 체크 로직 변경 필요
- ❌ **에러 처리**: RLS 위반 에러 처리 로직 필요

**영향 범위**:

- 모든 Supabase 쿼리
- 인증 관련 모든 기능

---

## 10. ❗ 이 프로젝트를 살리기 위한 최소 기준점 정의

### 10.1 데이터 무결성 기준

**필수 사항**:

1. ✅ **FK 제약 추가 전 데이터 정리**: 모든 무효한 참조 제거
2. ✅ **FK 제약 추가**: 최소한 핵심 관계에 FK 제약 추가
   - `works.creator_id` → `creators.id`
   - `comments.target_id` → `works.id` (target_type별로)
   - `moodboard_blocks.moodboard_id` → `moodboards.id`
3. ✅ **CASCADE 정책 정의**: 삭제 시 CASCADE 정책 명확히 정의

**검증 방법**:

- 무효한 참조 데이터 조회 쿼리 실행
- FK 제약 추가 전 데이터 정리 스크립트 실행

### 10.2 인증 타이밍 기준

**필수 사항**:

1. ✅ **인증 확정 대기**: 모든 DB 쿼리 전에 인증 확정 대기
2. ✅ **Custom JWT 생성 대기**: Supabase 쿼리 전에 Custom JWT 생성 대기
3. ✅ **에러 처리**: 인증 실패 시 명확한 에러 메시지 표시

**검증 방법**:

- 페이지 로드 시 인증 대기 로직 확인
- 인증 실패 시 에러 처리 확인

### 10.3 ID 타입 일관성 기준

**필수 사항**:

1. ✅ **ID 타입 문서화**: 모든 테이블의 ID 타입 명확히 문서화
2. ✅ **타입 검증**: 모든 쿼리에서 ID 타입 검증
3. ✅ **매핑 로직 통일**: ID 매핑 로직을 한 곳에 통일

**검증 방법**:

- 모든 쿼리에서 ID 타입 확인
- 타입 불일치 시 에러 로그 확인

### 10.4 전역 함수 의존성 기준

**필수 사항**:

1. ✅ **함수 존재 확인**: 모든 전역 함수 호출 전에 존재 확인
2. ✅ **에러 처리**: 함수 미정의 시 명확한 에러 메시지
3. ✅ **로드 순서 보장**: 스크립트 로드 순서 명확히 정의

**검증 방법**:

- 스크립트 로드 순서 확인
- 함수 미정의 시 에러 처리 확인

### 10.5 RLS 정책 기준

**필수 사항**:

1. ✅ **RLS 정책 문서화**: 모든 테이블의 RLS 정책 명확히 문서화
2. ✅ **정책 테스트**: 모든 쿼리에서 RLS 정책 테스트
3. ✅ **에러 처리**: RLS 위반 시 명확한 에러 메시지

**검증 방법**:

- RLS 정책 문서 확인
- RLS 위반 시 에러 처리 확인

---

## 11. 결론

이 프로젝트는 **구조적 위험 요소가 많은 레거시 시스템**입니다. 주요 문제점은 다음과 같습니다:

1. **FK 제약 없음**: 데이터 무결성 보장 불가
2. **인증 타이밍 문제**: 인증 확정 전 DB 쿼리 호출
3. **ID 타입 혼용**: Firebase UID와 UUID 혼용 가능성
4. **전역 함수 의존성**: 스크립트 로드 순서에 의존
5. **RLS 정책 불명확**: RLS 정책 내용 확인 불가

**권장 사항**:

1. **단계적 개선**: 한 번에 모든 것을 수정하지 말고 단계적으로 개선
2. **데이터 정리 우선**: FK 제약 추가 전에 데이터 정리
3. **인증 타이밍 수정**: 모든 DB 쿼리 전에 인증 확정 대기
4. **문서화**: 모든 정책과 규칙을 명확히 문서화
5. **테스트**: 각 개선 사항에 대한 테스트 작성

---

**보고서 작성 완료**
