# MUMU 프로젝트 사전 진단 보고서

**작성일**: 2025-01-XX  
**목적**: 현재 시스템 상태 진단 및 수정 전 기반 문서 작성  
**⚠️ 중요**: 이 보고서는 코드 수정 없이 현재 상태만 분석합니다.

---

## 1️⃣ 시스템 개요 (요약)

### 인증 흐름 (Firebase / Supabase 관계)

#### 독자(Reader) 인증
- **인증 시스템**: Firebase Auth 전용
- **인증 방식**: `username@mumu.app` 형식의 이메일로 변환하여 Firebase Auth 사용
- **사용 파일**:
  - `firebase/auth.js`: 독자 인증 유틸리티
  - `public/js/reader_auth.js`: 독자 로그인/회원가입 로직
  - `public/js/firebase_init.js`: Firebase 초기화
- **데이터 저장소**: 
  - Firebase Firestore: `readers`, `reader_consents`, `reader_onboarding` 컬렉션
  - Supabase DB: `reader_follows`, `user_feed_events` 등 (읽기/쓰기용)

#### 크리에이터(Creator) 인증
- **인증 시스템**: Supabase Auth 전용
- **인증 방식**: 이메일/비밀번호로 Supabase Auth 사용
- **사용 파일**:
  - `public/js/supabase-auth.js`: 크리에이터 인증 및 Supabase 클라이언트 생성
  - `public/js/creator_login.js`: 크리에이터 로그인 로직
- **데이터 저장소**: 
  - Supabase DB: `creators` 테이블 (Supabase Auth user.id와 동기화)

#### 인증 혼용 문제점
- **독자**: Firebase Auth로 인증하지만 Supabase DB에 접근 시도
- **Supabase RLS**: Supabase Auth 세션이 없으면 INSERT/UPDATE/DELETE 실패 가능
- **SELECT는 가능**: RLS 정책에 따라 SELECT는 허용될 수 있으나, INSERT는 실패
- **코드 근거**: `moodboard_detail.js:895-900`에서 댓글 INSERT 시도, `moodboard_editor.js:185-196`에서 무드보드 생성 시도

### 주요 도메인

#### Creator Studio
- **파일**: `public/creator_studio.html`, `public/js/creator_studio.js`
- **사용 테이블**: `creators`, `works`, `cuts`, `feeds`, `series`
- **인증**: Supabase Auth 사용

#### Moodboard
- **파일**: 
  - `public/moodboard_detail.html`, `public/js/moodboard_detail.js` (보기)
  - `public/moodboard_editor.html`, `public/js/moodboard_editor.js` (편집)
- **사용 테이블**: `moodboards`, `moodboard_blocks`, `comments`
- **인증**: Firebase Auth (독자) 또는 Supabase Auth (크리에이터) 혼용

#### Community
- **파일**: `public/community.html`, `public/js/community.js`
- **사용 테이블**: `community_posts`, `comments` (추정)
- **인증**: Firebase Auth (독자)

---

## 2️⃣ DB 스키마 vs 코드 사용 현황 매핑

| 테이블명 | 실제 컬럼 (추정) | 코드에서 사용 중인 컬럼 | 불일치 여부 | 문제 영향도 |
|---------|----------------|---------------------|-----------|-----------|
| **moodboards** | `id` (UUID), `owner_id`, `title`, `description`, `is_public` | `id`, `owner_id`, `title`, `description`, `is_public` | ✅ 일치 | - |
| **moodboard_blocks** | `id`, `moodboard_id`, `block_type`, `cut_id`, `title`, `content`, `emoji`, `span`, `order_index`, `meta` (JSONB) | `id`, `moodboard_id`, `block_type`, `cut_id`, `title`, `content`, `emoji`, `span`, `order_index`, `meta` | ✅ 일치 | - |
| **comments** | `id`, `target_type`, `target_id`, `user_id`, `content`, `is_deleted`, `created_at` | `target_type`, `target_id`, `user_id`, `content`, `is_deleted` | ✅ 일치 | - |
| **comments** (과거 코드) | `moodboard_id` (존재하지 않음) | `moodboard_id` (사용 시도) | ❌ 불일치 | 댓글 로드 실패 (해결됨) |
| **readers** | Firestore 컬렉션: `uid`, `username`, `nickname`, `email`, `name`, `birth`, `gender` | `uid`, `nickname` (Firestore에서 조회) | ✅ 일치 | - |
| **users** | Firestore 컬렉션: `nickname` (독자용) | `nickname` (코드에서 조회 시도) | ⚠️ 불확실 | 닉네임 표시 실패 가능 |
| **reader_follows** | `follower_id`, `following_id` | `follower_id`, `following_id` | ✅ 일치 | - |
| **creators** | `id` (Supabase Auth user.id), `email`, `display_name`, `bio`, `sns_links`, `status` | `id`, `email`, `display_name`, `bio`, `sns_links`, `status` | ✅ 일치 | - |

### 코드 근거

#### comments 테이블 사용
```javascript
// moodboard_detail.js:895-900
const { error } = await supabaseClient.from("comments").insert({
  target_type: "moodboard",
  target_id: currentMoodboardId,
  user_id: firebaseUser.uid,
  content: input.value.trim(),
});

// moodboard_detail.js:931-937
const { data, error } = await supabaseClient
  .from("comments")
  .select("*")
  .eq("target_type", "moodboard")
  .eq("target_id", currentMoodboardId)
  .eq("is_deleted", false)
  .order("created_at", { ascending: false });
```

#### moodboards 테이블 사용
```javascript
// moodboard_editor.js:185-196
const { data, error } = await supabaseClient
  .from("moodboards")
  .insert([
    {
      owner_id: currentUserId,
      title: "새 무드보드",
      description: null,
      is_public: false,
    },
  ])
  .select()
  .single();
```

---

## 3️⃣ UUID 관련 오류 원인 분석

### UUID 검증 로직

#### 검증 함수 위치
- `moodboard_editor.js:157-161`: `isValidUUID()` 함수 정의
- `moodboard_detail.js:97-101`: 동일한 `isValidUUID()` 함수 정의

```javascript
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
```

#### UUID 검증 적용 위치

1. **URL 파라미터 검증** (`moodboard_editor.js:143-148`)
   ```javascript
   if (!isValidUUID(id)) {
     console.error("[Editor] 잘못된 ID 형식:", id);
     alert("잘못된 무드보드 ID입니다.");
     history.back();
     return;
   }
   ```

2. **무드보드 로드 전 검증** (`moodboard_editor.js:222-228`)
   ```javascript
   if (!isValidUUID(id)) {
     console.error("[Editor] 잘못된 ID 형식:", id);
     alert("잘못된 무드보드 ID입니다.");
     history.back();
     return;
   }
   ```

3. **블록 로드 전 검증** (`moodboard_detail.js:153-158`)
   ```javascript
   if (!isValidUUID(moodboardId)) {
     console.error("[Moodboard] 잘못된 무드보드 ID:", moodboardId);
     blocks = [];
     return;
   }
   ```

### UUID 생성 경로

#### 정상 경로: Supabase 자동 생성
- `moodboard_editor.js:185-196`: `moodboards` 테이블 INSERT 시 Supabase가 UUID 자동 생성
- `moodboard_editor.js:200-201`: 생성된 UUID를 `currentMoodboardId`에 저장
- `moodboard_editor.js:204`: URL에 UUID 쿼리 파라미터로 추가

```javascript
const { data, error } = await supabaseClient
  .from("moodboards")
  .insert([...])
  .select()
  .single();

currentMoodboardId = data.id; // UUID
window.history.replaceState({}, "", `?id=${data.id}`);
```

#### 비정상 경로 가능성
- **코드 분석 결과**: 현재 코드에서는 `moodboard_123` 또는 timestamp 기반 ID를 생성하는 로직이 **발견되지 않음**
- **가능한 원인**:
  1. 과거 코드에서 생성된 잘못된 ID가 URL에 남아있음
  2. 다른 페이지에서 무드보드 링크 생성 시 잘못된 형식 사용
  3. 브라우저 히스토리/북마크에 잘못된 ID 저장

### URL 파라미터 → DB 쿼리 흐름 다이어그램

```
1. URL: moodboard_detail.html?id=<UUID 또는 잘못된 ID>
   ↓
2. loadMoodboardFromURL() 호출
   ↓
3. URLSearchParams로 id 추출
   ↓
4. isValidUUID(id) 검증
   ├─ [통과] → currentMoodboardId = id
   └─ [실패] → alert + history.back()
   ↓
5. loadMoodboard(id) 호출
   ↓
6. Supabase 쿼리: .from("moodboards").select("*").eq("id", id)
   ├─ [UUID 형식] → 정상 쿼리 성공
   └─ [잘못된 형식] → 쿼리 실패 또는 빈 결과
```

### 문제점

1. **검증 타이밍**: URL 파라미터 추출 직후 검증하지만, 일부 경로에서 검증 누락 가능
2. **에러 처리**: UUID 검증 실패 시 `history.back()`만 호출하여 사용자 경험 저하
3. **일관성**: `moodboard_detail.js`와 `moodboard_editor.js`에 동일한 검증 로직이 중복 정의됨

---

## 4️⃣ 인증/Auth 충돌 분석

### Firebase Auth 흐름 (독자)

#### 로그인 프로세스
1. `reader_auth.js:22-89`: `signInWithUsername()` 호출
2. `username@mumu.app` 형식으로 변환
3. Firebase Auth `signInWithEmailAndPassword()` 호출
4. 로그인 성공 후 `localStorage.setItem("mumu_logged_in", "true")` 저장
5. **⚠️ 문제**: Supabase Auth signIn 시도 (`reader_auth.js:68-75`)
   ```javascript
   try {
     const { signIn } = await import("./auth.js");
     await signIn(username, password);
     console.log("[로그인] ✅ Supabase Auth signIn 완료");
   } catch (supabaseError) {
     console.warn("[로그인] ⚠️ Supabase Auth signIn 실패 (계속 진행):", supabaseError);
   }
   ```

#### 사용자 확인 프로세스
- `moodboard_editor.js:86-127`: `getCurrentUser()` 함수
  - 방법 1: `window.getCurrentFirebaseUser()` 사용
  - 방법 2: Firebase Auth 직접 확인
- `moodboard_detail.js:35-49`: 동일한 패턴

### Supabase Auth 호출 위치 목록

#### 크리에이터 전용
1. `supabase-auth.js:23-76`: `signUpCreator()` - Supabase Auth signUp
2. `supabase-auth.js:81-97`: `signInCreator()` - Supabase Auth signIn
3. `supabase-auth.js:102-115`: `getCurrentCreatorUser()` - Supabase Auth getUser

#### 독자 코드에서 Supabase Auth 호출 시도
- `reader_auth.js:68-75`: 독자 로그인 시 Supabase Auth signIn 시도 (실패해도 계속 진행)

### AuthSessionMissingError 발생 원인

#### 구조적 원인

1. **독자는 Firebase Auth만 사용**
   - Firebase Auth로 인증된 독자는 Supabase Auth 세션이 없음
   - Supabase RLS 정책이 Supabase Auth 세션을 요구하면 INSERT/UPDATE/DELETE 실패

2. **Supabase 클라이언트 초기화**
   - `supabase-auth.js:15`: Supabase 클라이언트는 anon key로 생성됨
   - `supabase-auth.js:157-165`: `getSupabase()` 함수로 단일 인스턴스 반환
   - **문제**: 독자가 사용하는 Supabase 클라이언트에 Auth 세션이 없음

3. **RLS 정책 영향**
   - SELECT: RLS 정책에 따라 허용될 수 있음 (공개 데이터)
   - INSERT/UPDATE/DELETE: RLS 정책이 `auth.uid()`를 요구하면 실패

#### 코드 근거

```javascript
// moodboard_detail.js:895-900 (독자가 댓글 작성 시도)
const { error } = await supabaseClient.from("comments").insert({
  target_type: "moodboard",
  target_id: currentMoodboardId,
  user_id: firebaseUser.uid, // Firebase UID 사용
  content: input.value.trim(),
});
// ⚠️ Supabase Auth 세션이 없으면 RLS 정책 위반 가능
```

### "왜 SELECT는 되고 INSERT는 실패하는지" 구조적 설명

#### 시나리오 1: 공개 데이터 SELECT
- **RLS 정책**: `is_public = true`인 무드보드는 모든 사용자가 SELECT 가능
- **결과**: Firebase Auth만 있어도 SELECT 성공

#### 시나리오 2: INSERT 시도
- **RLS 정책**: `auth.uid() = user_id` 또는 `auth.role() = 'authenticated'` 요구
- **문제**: Firebase Auth UID는 Supabase Auth 세션과 다름
- **결과**: `AuthSessionMissingError` 또는 RLS 정책 위반 에러

#### 코드 근거

```javascript
// moodboard_editor.js:185-196 (무드보드 생성)
const { data, error } = await supabaseClient
  .from("moodboards")
  .insert([...])
  .select()
  .single();
// ⚠️ 독자가 실행하면 Supabase Auth 세션 없어서 실패 가능
```

---

## 5️⃣ 댓글 시스템 분석

### comments 테이블 실제 구조 (코드 기반 추정)

#### 컬럼 목록
- `id`: UUID (Primary Key)
- `target_type`: 문자열 (예: "moodboard", "community_post")
- `target_id`: UUID (target_type에 해당하는 대상의 ID)
- `user_id`: 문자열 (Firebase UID 또는 Supabase Auth UID)
- `content`: 텍스트 (댓글 내용)
- `is_deleted`: 불린 (삭제 여부)
- `created_at`: 타임스탬프

#### 코드 근거

```javascript
// moodboard_detail.js:895-900 (댓글 INSERT)
const { error } = await supabaseClient.from("comments").insert({
  target_type: "moodboard",
  target_id: currentMoodboardId,
  user_id: firebaseUser.uid,
  content: input.value.trim(),
});

// moodboard_detail.js:931-937 (댓글 SELECT)
const { data, error } = await supabaseClient
  .from("comments")
  .select("*")
  .eq("target_type", "moodboard")
  .eq("target_id", currentMoodboardId)
  .eq("is_deleted", false)
  .order("created_at", { ascending: false });
```

### 현재 코드가 기대하는 구조

#### 정상 사용
- `target_type = "moodboard"`, `target_id = moodboard UUID`
- `user_id = Firebase UID` (독자) 또는 Supabase Auth UID (크리에이터)

#### 과거 문제 (해결됨)
- `moodboard_detail.js:912`: 주석에 "댓글은 target_type과 target_id를 사용하므로 이 함수는 더 이상 필요 없음" 명시
- **추정**: 과거에는 `moodboard_id` 컬럼을 사용하려 했으나, 실제 DB에는 없어서 오류 발생

### target_type / target_id 설계 의도와 실제 사용 여부

#### 설계 의도
- **다형성(Polymorphism)**: 하나의 `comments` 테이블로 여러 타입의 대상에 댓글 달기
- **확장성**: 새로운 타입 추가 시 테이블 구조 변경 불필요

#### 실제 사용
- `moodboard_detail.js:896`: `target_type = "moodboard"` 사용
- `moodboard_detail.js:935`: `target_id = currentMoodboardId` 사용

### 왜 comments.moodboard_id 오류가 발생했는지

#### 원인 추정
1. **과거 코드**: `moodboard_id` 컬럼을 직접 참조하는 쿼리 사용
2. **DB 스키마**: 실제로는 `target_type`/`target_id` 구조만 존재
3. **결과**: `column "moodboard_id" does not exist` 에러 발생

#### 해결 상태
- `moodboard_detail.js:930`: 주석에 "comments 테이블에는 moodboard_id 컬럼이 없음" 명시
- 현재 코드는 `target_type`/`target_id` 사용으로 수정됨

---

## 6️⃣ 닉네임 표시 실패 원인

### Firestore user 문서 로드 위치

#### 위치 1: 무드보드 작가 정보 (`moodboard_detail.js:198-238`)
```javascript
async function loadCreatorInfo() {
  // ...
  // Firebase Firestore user 문서에서 nickname 가져오기
  let nickname = null;
  try {
    if (typeof firebase !== "undefined" && firebase.firestore) {
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(moodboardData.owner_id)
        .get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        nickname = userData.nickname || null;
      }
    }
  } catch (e) {
    // 닉네임 조회 실패 시 fallback
  }
  // ...
}
```

#### 위치 2: 댓글 작성자 닉네임 (`moodboard_detail.js:958-981`)
```javascript
const commentPromises = data.map(async (comment) => {
  let nickname = null;
  try {
    if (typeof firebase !== "undefined" && firebase.firestore) {
      const userDoc = await firebase
        .firestore()
        .collection("users")
        .doc(comment.user_id)
        .get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        nickname = userData.nickname || null;
      }
    }
  } catch (e) {
    // 닉네임 조회 실패 시 fallback
  }
  // ...
});
```

### nickname 필드가 있음에도 화면에 반영되지 않는 이유

#### 원인 1: Firestore 컬렉션 불일치
- **코드 기대**: `users` 컬렉션에 `nickname` 필드
- **실제 구조**: `readers` 컬렉션에 `nickname` 필드 (`firebase/firestore.js:58`)
- **결과**: `users` 컬렉션 조회 시 문서가 없거나 `nickname` 필드가 없음

#### 원인 2: owner_id가 Supabase UID인 경우
- **문제**: `moodboardData.owner_id`가 Supabase Auth UID일 수 있음
- **Firestore 조회**: Firebase UID로 조회하므로 문서를 찾지 못함
- **결과**: `userDoc.exists()`가 `false` 반환

#### 코드 근거

```javascript
// firebase/firestore.js:63-87
async function createReader(uid, readerData) {
  // ...
  await firestore.collection('readers').doc(uid).set(readerDoc);
  // ⚠️ 'readers' 컬렉션에 저장하지만, 코드는 'users' 컬렉션에서 조회
}
```

### Supabase / Firebase 혼용 여부 분석

#### 독자 데이터
- **Firebase Firestore**: `readers` 컬렉션에 독자 정보 저장
- **Supabase DB**: `reader_follows`, `user_feed_events` 등에 독자 활동 저장

#### 크리에이터 데이터
- **Supabase DB**: `creators` 테이블에 크리에이터 정보 저장
- **Firebase Firestore**: 사용하지 않음 (추정)

#### 문제점
- **무드보드 owner_id**: Firebase UID인지 Supabase UID인지 불명확
- **닉네임 조회**: `users` 컬렉션에서 조회하지만 실제로는 `readers` 컬렉션에 저장됨

---

## 7️⃣ 팔로우/팔로잉 카운트 문제

### reader_follows 테이블 기준 설계

#### 테이블 구조 (코드 기반 추정)
- `follower_id`: 팔로우하는 사람의 ID (Firebase UID)
- `following_id`: 팔로우받는 사람의 ID (Firebase UID)

#### 코드 근거

```javascript
// mypage_reader.js:6460-6469
// 팔로워 수 (나를 팔로우한 사람)
const { count: followersCount } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", currentUserId);

// 팔로잉 수 (내가 팔로우한 사람)
const { count: followingCount } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("follower_id", currentUserId);
```

### 현재 카운트 계산 방식

#### 위치 1: MY 탭 프로필 (`mypage_reader.js:6460-6494`)
- 팔로워: `following_id = currentUserId`인 행 개수
- 팔로잉: `follower_id = currentUserId`인 행 개수

#### 위치 2: MY MOOD 탭 프로필 (`mypage_reader.js:8748-8764`)
- 동일한 로직 사용

### 값이 갱신되지 않는 원인

#### 원인 1: RLS 정책
- **문제**: Supabase RLS 정책이 COUNT 쿼리를 제한할 수 있음
- **결과**: `count`가 `null` 반환 또는 에러 발생

#### 원인 2: 인증 세션 부재
- **문제**: Firebase Auth만 있고 Supabase Auth 세션이 없으면 RLS 정책 위반
- **결과**: 쿼리 실패 또는 빈 결과

#### 원인 3: 데이터 불일치
- **문제**: `follower_id`/`following_id`가 Firebase UID인지 Supabase UID인지 불명확
- **결과**: 쿼리 조건 불일치로 카운트 0 반환

#### 코드 근거

```javascript
// mypage_reader.js:6460-6463
const { count: followersCount } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", currentUserId);
// ⚠️ currentUserId가 Firebase UID인데, DB에 Supabase UID가 저장되어 있으면 불일치
```

---

## 8️⃣ UI/UX 구조 문제

### PC / 모바일 레이아웃 분기 지점

#### 코드 분석 결과
- **명시적 분기 로직 발견되지 않음**
- **추정**: CSS 미디어 쿼리로 처리하거나, 단일 반응형 레이아웃 사용

### 왜 "두 번째 화면 / 빈 화면"이 나타나는지

#### 원인 1: 무드보드 로드 실패
- **시나리오**: UUID 검증 실패 또는 쿼리 실패 시 빈 화면 표시
- **코드 근거**: `moodboard_detail.js:127-132`
  ```javascript
  if (!data) {
    console.error("[Moodboard] 존재하지 않는 무드보드", id);
    alert("무드보드를 찾을 수 없습니다.");
    history.back();
    return;
  }
  ```

#### 원인 2: 블록 렌더링 실패
- **시나리오**: `blocks` 배열이 비어있거나 렌더링 로직 오류
- **코드 근거**: `moodboard_detail.js:243-267`
  ```javascript
  function renderBlocks() {
    const canvas = document.getElementById("moodboardCanvas");
    if (!canvas) return;
    canvas.innerHTML = "";
    // blocks가 비어있으면 빈 캔버스만 표시
  }
  ```

#### 원인 3: 리다이렉트 루프
- **시나리오**: `moodboard_detail.js:58-72`에서 편집 모드 시 `moodboard_editor.html`로 리다이렉트
- **문제**: 리다이렉트 후 다시 원래 페이지로 돌아오는 경우

### moodboard_detail / editor 역할 혼선 분석

#### moodboard_detail.html (보기 전용)
- **역할**: 무드보드 조회 및 댓글 작성
- **편집 기능**: 없음 (`isEditMode = false` 고정)
- **리다이렉트**: `edit=true` 파라미터 시 `moodboard_editor.html`로 리다이렉트

#### moodboard_editor.html (편집 전용)
- **역할**: 무드보드 생성/편집
- **편집 기능**: 블록 추가/수정/삭제, 드래그 앤 드롭, 리사이즈, 회전
- **리다이렉트**: 없음

#### 문제점
1. **URL 파라미터 혼선**: `edit=true`, `view=true`, `new=1` 등 여러 파라미터 사용
2. **역할 중복**: 두 파일 모두 무드보드 로드 로직 포함
3. **일관성 부족**: 검증 로직이 각 파일에 중복 정의됨

---

## 9️⃣ 에러 로그 분류표

### 치명적(Blocker)

| 에러 유형 | 발생 위치 | 원인 | 영향 |
|---------|---------|------|------|
| **AuthSessionMissingError** | Supabase INSERT/UPDATE/DELETE | 독자가 Supabase Auth 세션 없이 쓰기 시도 | 무드보드 생성/수정, 댓글 작성 실패 |
| **UUID 형식 오류** | URL 파라미터 검증 | 잘못된 ID 형식 전달 | 무드보드 로드 실패 |
| **RLS 정책 위반** | Supabase 쿼리 | RLS 정책이 Supabase Auth 세션 요구 | 데이터 쓰기 전면 실패 |

### 연쇄적(다른 에러 유발)

| 에러 유형 | 발생 위치 | 유발하는 에러 | 영향 |
|---------|---------|------------|------|
| **무드보드 로드 실패** | `moodboard_detail.js:109-149` | 블록 렌더링 실패, 댓글 로드 실패 | 빈 화면 표시 |
| **닉네임 조회 실패** | `moodboard_detail.js:198-238` | 작가 정보 표시 실패, 댓글 작성자 표시 실패 | 사용자 식별 불가 |
| **팔로우 카운트 실패** | `mypage_reader.js:6460-6494` | 프로필 정보 불완전 표시 | 사용자 경험 저하 |

### 구조적(설계 불일치)

| 에러 유형 | 발생 위치 | 불일치 내용 | 영향 |
|---------|---------|-----------|------|
| **Firebase/Supabase Auth 혼용** | 전체 시스템 | 독자는 Firebase Auth, 크리에이터는 Supabase Auth | RLS 정책 위반 |
| **Firestore 컬렉션 불일치** | `moodboard_detail.js:209-217` | `users` 컬렉션 조회하지만 `readers`에 저장 | 닉네임 표시 실패 |
| **UID 형식 불일치** | `moodboard_detail.js:212` | `owner_id`가 Firebase UID인지 Supabase UID인지 불명확 | 작가 정보 로드 실패 |

### 파생적(위 에러로 인해 발생)

| 에러 유형 | 발생 위치 | 원인 에러 | 영향 |
|---------|---------|---------|------|
| **빈 화면 표시** | `moodboard_detail.js:243-267` | 무드보드 로드 실패 | 사용자 경험 저하 |
| **댓글 표시 실패** | `moodboard_detail.js:914-1006` | 댓글 로드 실패 또는 닉네임 조회 실패 | 댓글 기능 불가 |
| **프로필 정보 불완전** | `mypage_reader.js:8748-8764` | 팔로우 카운트 실패 | 프로필 페이지 정보 부족 |

---

## 🔚 보고서 마무리 섹션 (중요)

### 가장 먼저 고쳐야 할 "핵심 3개"

#### 1. 인증 세션 문제 해결 (최우선)
- **문제**: 독자가 Firebase Auth만 있고 Supabase Auth 세션이 없어서 INSERT/UPDATE/DELETE 실패
- **영향**: 무드보드 생성/수정, 댓글 작성 전면 실패
- **해결 방향**:
  - 옵션 A: Supabase RLS 정책을 Firebase UID 기반으로 변경 (서버 사이드 함수 필요)
  - 옵션 B: 독자용 Supabase Auth 세션 생성 (Firebase UID를 Supabase 사용자로 매핑)
  - 옵션 C: 서버 사이드 API 엔드포인트로 쓰기 작업 위임 (Firebase Auth 토큰 검증)

#### 2. Firestore 컬렉션 불일치 수정
- **문제**: 코드는 `users` 컬렉션에서 닉네임 조회하지만 실제로는 `readers` 컬렉션에 저장
- **영향**: 닉네임 표시 실패, 작가 정보 표시 실패
- **해결 방향**:
  - `moodboard_detail.js:209-217`의 `users` 컬렉션 조회를 `readers` 컬렉션으로 변경
  - 또는 `readers` 컬렉션 데이터를 `users` 컬렉션으로 동기화

#### 3. UID 형식 일관성 확보
- **문제**: `owner_id`가 Firebase UID인지 Supabase UID인지 불명확
- **영향**: 작가 정보 로드 실패, 닉네임 조회 실패
- **해결 방향**:
  - 무드보드 생성 시 `owner_id`에 저장하는 UID 형식 명확화
  - 독자가 생성한 무드보드는 Firebase UID, 크리에이터가 생성한 무드보드는 Supabase UID로 구분
  - 또는 모든 무드보드 `owner_id`를 Firebase UID로 통일

### 이 3개를 고치면 사라질 에러 목록

#### 인증 세션 문제 해결 시
- ✅ AuthSessionMissingError 제거
- ✅ 무드보드 생성 실패 해결
- ✅ 댓글 작성 실패 해결
- ✅ 무드보드 수정 실패 해결

#### Firestore 컬렉션 불일치 수정 시
- ✅ 닉네임 표시 실패 해결
- ✅ 작가 정보 표시 실패 해결
- ✅ 댓글 작성자 닉네임 표시 실패 해결

#### UID 형식 일관성 확보 시
- ✅ 작가 정보 로드 실패 해결
- ✅ 닉네임 조회 실패 해결 (부분적)
- ✅ 팔로우 카운트 불일치 해결 (부분적)

### 수정 순서 로드맵 (1 → 2 → 3)

#### Phase 1: 인증 세션 문제 해결 (1주)
1. **현황 파악**
   - Supabase RLS 정책 확인
   - Firebase Auth 토큰을 Supabase에서 검증 가능한지 확인
2. **해결 방안 선택**
   - 옵션 A/B/C 중 하나 선택 (서버 사이드 함수 또는 매핑 테이블)
3. **구현**
   - 선택한 방안에 따라 코드 수정
4. **테스트**
   - 무드보드 생성/수정, 댓글 작성 테스트

#### Phase 2: Firestore 컬렉션 불일치 수정 (3일)
1. **코드 수정**
   - `moodboard_detail.js:209-217`의 `users` → `readers` 변경
   - `moodboard_detail.js:962-972`의 `users` → `readers` 변경
2. **데이터 마이그레이션** (필요 시)
   - `readers` 컬렉션 데이터 확인
   - 누락된 데이터 보완
3. **테스트**
   - 닉네임 표시, 작가 정보 표시 테스트

#### Phase 3: UID 형식 일관성 확보 (5일)
1. **현황 파악**
   - 기존 무드보드 `owner_id` 형식 조사
   - Firebase UID vs Supabase UID 비율 확인
2. **정책 수립**
   - 모든 무드보드 `owner_id`를 Firebase UID로 통일할지 결정
   - 또는 크리에이터 무드보드는 Supabase UID 유지
3. **코드 수정**
   - 무드보드 생성 시 `owner_id` 저장 로직 수정
   - 작가 정보 로드 시 UID 형식에 따라 분기 처리
4. **데이터 마이그레이션** (필요 시)
   - 기존 데이터 정규화
5. **테스트**
   - 작가 정보 로드, 팔로우 카운트 테스트

---

## 📌 추가 참고사항

### 코드 중복 제거 필요
- `isValidUUID()` 함수가 `moodboard_detail.js`와 `moodboard_editor.js`에 중복 정의됨
- 공통 유틸리티 파일로 분리 권장

### 에러 처리 개선 필요
- UUID 검증 실패 시 `history.back()`만 호출하여 사용자 경험 저하
- 에러 메시지 표시 및 로깅 개선 권장

### 문서화 필요
- Supabase RLS 정책 문서화
- Firebase/Supabase Auth 사용 가이드 문서화
- 무드보드 생성/수정 플로우 다이어그램 작성

---

**보고서 작성 완료**  
**다음 단계**: 이 보고서를 기반으로 실제 패치 작업 수행

