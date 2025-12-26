# [MUMU] 사전 진단 보고서

**작성일**: 2025-01-XX  
**분석 범위**: 프론트엔드 코드 (HTML/CSS/JS), 인증 흐름, 쿼리 로직  
**제약사항**: DB 스키마 변경 금지, RLS 정책 변경 금지, Supabase Auth 설정 변경 금지

---

## 1. 아키텍처/권한 모델 요약 (현재 코드 기준)

### 1.1 인증 흐름

#### Reader (Firebase Auth)
- **인증 시스템**: Firebase Auth만 사용
- **로그인 파일**: `public/js/reader_auth.js`
- **세션 저장**: Firebase Auth 세션 (localStorage `mumu_logged_in` 플래그)
- **Supabase 연동**: Supabase는 **데이터베이스로만** 사용 (Auth 미사용)
- **UID 사용**: Firebase UID를 `owner_id`, `user_id` 등으로 직접 사용

**코드 근거**:
- `reader_auth.js:120-127`: `getCurrentFirebaseUser()`는 Firebase Auth만 확인
- `reader_auth.js:67-75`: Firebase 로그인 성공 후 Supabase Auth signIn 시도하지만 실패해도 계속 진행
- `supabase_client.js:11`: `getSupabase()`는 anon key로 클라이언트 생성 (세션 없음)

#### Creator (Supabase Auth)
- **인증 시스템**: Supabase Auth 사용
- **로그인 파일**: `public/js/supabase-auth.js`
- **세션 저장**: Supabase Auth 세션 (localStorage)
- **UID 사용**: Supabase Auth UID를 `creator_id`로 사용

**코드 근거**:
- `supabase-auth.js:81-97`: `signInCreator()`는 Supabase Auth만 사용
- `creator_studio.js:1604-1620`: `handleSaveDraft()`에서 Supabase Auth 세션 필수 확인

### 1.2 Supabase 클라이언트 싱글톤 관리

**현재 상태**: 부분적으로 싱글톤 패턴 구현되어 있으나, 일관성 없음

**싱글톤 구현 파일**:
1. `supabase-auth.js:157-165`: `getSupabase()` 함수가 `window.__supabase_singleton` 사용
2. `supabase_client.js:11`: `getSupabase()` 재사용
3. `community.js:85-130`: `loadSupabaseClient()`가 여러 fallback 경로로 클라이언트 로드

**문제점**:
- `community.js:89-104`: ESM import 실패 시 fallback으로 새 클라이언트 생성 가능
- `moodboard_editor.js:79-84`: `getSupabase()` 직접 호출하지만, import 실패 시 null 반환 가능
- `creator_studio.js:326-340`: `initializeSupabase()`에서 `getSupabase()` import 후 사용하지만, 실패 시 에러 throw

**코드 근거**:
- `community.js:125`: 모든 방법 실패 시 `null` 반환 (에러 없이 조용히 실패)
- `moodboard_editor.js:33`: `getSupabase()`가 null이면 에러 로그만 출력하고 계속 진행

### 1.3 ESM 모듈 vs 일반 스크립트

**ESM 모듈 파일**:
- `supabase-auth.js`: `export function getSupabase()`
- `moodboard_editor.js`: `import { getSupabase } from "./supabase-auth.js"`
- `moodboard_detail.js`: `import { getSupabase } from "./supabase-auth.js"`

**일반 스크립트 파일**:
- `community.js`: `typeof window.getSupabase === "function"` 체크 후 동적 import 시도
- `mypage_reader.js`: `loadSupabaseClient()` 함수로 클라이언트 로드

**문제점**:
- `community.js:99`: 동적 import 실패 시 조용히 실패하고 다음 fallback 시도
- `mypage_reader.js`: ESM import 없이 전역 객체에 의존

---

## 2. 이슈별 원인 분석

### 이슈 1: 닉네임이 logs에는 있는데 UI에는 UID 축약으로 나오는 이유

#### 원인 후보 및 검증

**후보 1: DOM 반영 타이밍 문제** ⭐ **유력**
- **근거**: `mypage_reader.js:8726-8742`에서 `getReaderNickname()`을 await하지만, UI 렌더링이 먼저 실행될 수 있음
- **코드 위치**: `mypage_reader.js:8726-8742`
```javascript
const displayNameEl = document.getElementById("profile-display-name");
if (displayNameEl) {
  let displayName = await getReaderNickname(firebaseUser.uid);
  if (!displayName) {
    displayName = await getCreatorPenName(firebaseUser.uid);
  }
  if (displayName) {
    displayNameEl.textContent = displayName;
  } else {
    displayNameEl.textContent = firebaseUser.uid.substring(0, 6); // ⚠️ 여기서 fallback
  }
}
```
- **검증 방법**: 콘솔에서 `getReaderNickname(firebaseUser.uid)` 직접 호출하여 반환값 확인

**후보 2: nickname 조회 함수가 다른 소스(users/creators)를 사용**
- **근거**: `mypage_reader.js:8122-8135`에서 팔로잉 목록 로드 시 `users` 컬렉션을 조회 (❌ 잘못된 컬렉션)
- **코드 위치**: `mypage_reader.js:8126-8135`
```javascript
const userDoc = await firebase
  .firestore()
  .collection("users")  // ⚠️ "readers"가 아니라 "users" 사용
  .doc(item.following_id)
  .get();
```
- **검증 방법**: Firestore에서 `users` 컬렉션에 해당 UID 문서가 있는지 확인

**후보 3: 캐시에 null이 먼저 저장되어 이후 갱신이 막힘**
- **근거**: `mypage_reader.js:39-63`에서 nickname 조회 실패 시 `nicknameCache.set(firebaseUid, null)` 저장
- **코드 위치**: `mypage_reader.js:62`
```javascript
nicknameCache.set(firebaseUid, null);  // ⚠️ null 캐시 저장
return null;
```
- **검증 방법**: 콘솔에서 `nicknameCache.get(firebaseUser.uid)` 확인

**후보 4: 동일 UID가 페이지마다 다른 포맷으로 들어와 조회 실패**
- **근거**: `mypage_reader.js:8831-8847`에서 `mypageMoodNickname` 요소에 표시할 때도 동일한 로직 사용
- **코드 위치**: `mypage_reader.js:8846`
```javascript
nicknameEl.textContent = `@${firebaseUser.uid.substring(0, 6)}`;  // ⚠️ fallback
```

#### 결론

**주요 원인**: **후보 2 + 후보 3 조합**
1. `mypage_reader.js:8126`에서 `users` 컬렉션을 조회하지만, 실제 데이터는 `readers` 컬렉션에 있음
2. 조회 실패 시 `nicknameCache`에 `null`이 저장되어 이후 조회가 막힘
3. UI 렌더링 시점에 nickname이 없으면 `substring(0, 6)` fallback 사용

**수정 포인트**:
- `mypage_reader.js:8126`: `collection("users")` → `collection("readers")`
- `mypage_reader.js:8168`: 동일하게 `collection("users")` → `collection("readers")`
- `mypage_reader.js:8461`: 동일하게 `collection("users")` → `collection("readers")`

---

### 이슈 2: 팔로워/팔로잉 0/0 연동 안 되는 이유

#### 원인 후보 및 검증

**후보 1: RLS 정책으로 인해 COUNT 쿼리가 막힘** ⭐ **유력**
- **근거**: `mypage_reader.js:6533-6542`에서 COUNT 쿼리 실행 시 RLS 정책 적용
- **코드 위치**: `mypage_reader.js:6533-6542`
```javascript
const { count: followersCount, error: followersError } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", firebaseUser.uid);  // ⚠️ Firebase UID 사용, Supabase Auth 세션 없음
```
- **검증 방법**: 네트워크 탭에서 `/rest/v1/reader_follows?select=*&following_id=eq.{uid}` 요청 확인, 응답 상태 코드 확인

**후보 2: localStorage 기반 팔로우와 DB 기반 팔로우 분리**
- **근거**: `community.js:258-279`에서 `getFollowedReaders()`는 localStorage만 조회
- **코드 위치**: `community.js:263-274`
```javascript
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith(`follow_${firebaseUser.uid}_`)) {
    const readerId = key.replace(`follow_${firebaseUser.uid}_`, "");
    if (localStorage.getItem(key) === "true") {
      followedReaders.push(readerId);
    }
  }
}
```
- **검증 방법**: localStorage에 `follow_{uid}_{targetId}` 키가 있는지 확인

**후보 3: reader_follows 테이블에 실제 데이터가 없음**
- **근거**: `mypage_reader.js:8290-8294`에서 팔로우 시 INSERT하지만, 이전 데이터는 localStorage에만 있을 수 있음
- **코드 위치**: `mypage_reader.js:8289-8294`
```javascript
await supabaseClient
  .from("reader_follows")
  .insert({
    follower_id: firebaseUser.uid,
    following_id: userId
  });
```

#### 결론

**주요 원인**: **후보 1 (RLS 정책)**
- Reader는 Firebase Auth만 사용하므로 Supabase Auth 세션이 없음
- `reader_follows` 테이블의 RLS 정책이 Supabase Auth 세션을 요구할 가능성 높음
- COUNT 쿼리 시 RLS에 막혀 0 반환

**수정 포인트**:
- `mypage_reader.js:6533-6542`: COUNT 쿼리 전에 Supabase Auth 세션 확인 로그 추가
- RLS 정책 확인 필요 (DB 변경 금지이므로, 현재 정책이 어떻게 되어 있는지 확인만)

---

### 이슈 3: moodboards 생성이 RLS 위반으로 실패하는 이유

#### 원인 후보 및 검증

**후보 1: Reader는 Firebase만 로그인인데, Supabase write는 RLS에 막힘** ⭐ **확정**
- **근거**: `moodboard_editor.js:186-247`에서 무드보드 생성 시 Supabase INSERT 실행
- **코드 위치**: `moodboard_editor.js:205-217`
```javascript
try {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();
  if (sessionError || !sessionData?.session) {
    console.warn(
      "[Editor] Supabase Auth 세션이 없습니다. Firebase Auth만 사용 중입니다."
    );
    // Firebase Auth만 있어도 계속 진행 시도 (RLS 정책에 따라 실패할 수 있음)
  }
} catch (e) {
  console.warn("[Editor] 세션 확인 실패:", e);
}
```
- **검증 방법**: `moodboard_editor.js:222-233`에서 INSERT 직전에 `supabaseClient.auth.getSession()` 로그 추가

**후보 2: Supabase 클라이언트가 anon 상태로 생성됨**
- **근거**: `supabase-auth.js:15`에서 anon key로 클라이언트 생성
- **코드 위치**: `supabase-auth.js:15`
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);  // ⚠️ anon key만 사용
```
- **검증 방법**: `moodboard_editor.js:79`에서 `getSupabase()` 반환값의 `auth.getSession()` 확인

#### 결론

**주요 원인**: **후보 1 (확정)**
- Reader는 Firebase Auth만 사용하므로 Supabase Auth 세션이 없음
- `moodboards` 테이블의 RLS 정책이 INSERT 시 Supabase Auth 세션을 요구함
- `moodboard_editor.js:213`에서 "Firebase Auth만 있어도 계속 진행 시도"라고 주석이 있지만, 실제로는 RLS에 막힘

**해결안 제시**:

**A. Reader 쓰기 기능은 전부 Firestore로 옮기고, Supabase에는 공개용 read만 둠 (단기)**
- **난이도**: 중
- **권장도**: ⭐⭐⭐ (가장 빠른 해결)
- **수정 파일**: `moodboard_editor.js`, `moodboard_service.js` (신규 생성)
- **변경 내용**: `createNewMoodboard()`에서 Supabase INSERT 대신 Firestore에 저장

**B. Edge Function/서버 API(서비스 롤)로 쓰기 위임 (단기~중기)**
- **난이도**: 높음
- **권장도**: ⭐⭐
- **수정 파일**: Edge Function 신규 생성, `moodboard_editor.js`에서 API 호출로 변경

**C. Reader도 Supabase Auth에 로그인시키는 브릿지 (중기)**
- **난이도**: 매우 높음
- **권장도**: ⭐ (근본 해결이지만 복잡도 높음)
- **수정 파일**: `reader_auth.js`, `supabase-auth.js`, 모든 Reader 페이지

**즉시 가능한 임시 플랜**: **A안 (Firestore로 옮기기)**

---

### 이슈 4: 커뮤니티가 빈 화면인데 에러가 없는 이유

#### 원인 후보 및 검증

**후보 1: page-community 가드가 실제로 return이 없어 스크립트가 계속 실행되는지 확인** ⭐ **유력**
- **근거**: `community.js:6-10`에서 가드 체크하지만 return 없음
- **코드 위치**: `community.js:6-10`
```javascript
const isCommunityPage = document.body.classList.contains('page-community');
if (!isCommunityPage) {
  console.log('[Community] not community page → skip init');
  // 스크립트 실행 중단 (에러를 던지지 않고 조용히 종료)
}
```
- **검증 방법**: `community.html`에서 `body`에 `page-community` 클래스가 있는지 확인

**후보 2: loadSupabaseClient()가 null을 반환하는 경로**
- **근거**: `community.js:85-130`에서 여러 fallback 시도하지만 모두 실패 시 null 반환
- **코드 위치**: `community.js:125`
```javascript
// 모든 방법 실패 시 null 반환
return null;
```
- **검증 방법**: `community.js:291`에서 `if (!supabase)` 체크 후 `renderEmptyState()` 호출

**후보 3: RLS로 select가 막히는 가능성**
- **근거**: `community.js:301-306`에서 `is_public=true`만 조회하지만 RLS 정책 적용 가능
- **코드 위치**: `community.js:301-306`
```javascript
const { data: moodboardsData, error } = await supabase
  .from("moodboards")
  .select("id, owner_id, title, description, is_public, created_at")
  .eq("is_public", true)
  .order("created_at", { ascending: false })
  .limit(50);
```
- **검증 방법**: 네트워크 탭에서 `/rest/v1/moodboards?select=*&is_public=eq.true` 요청 확인

**후보 4: 렌더링 로직이 blocks 로드에서 조용히 실패하고 빈 상태 렌더링**
- **근거**: `community.js:375-377`에서 블록 로드 실패 시 `console.warn`만 출력하고 계속 진행
- **코드 위치**: `community.js:375-377`
```javascript
} catch (e) {
  console.warn(`[Community] 블록 로드 실패 (${mb.id}):`, e);
}
```

#### 결론

**주요 원인**: **후보 2 + 후보 3 조합**
1. `loadSupabaseClient()`가 null을 반환하거나
2. Supabase 클라이언트는 있지만 RLS 정책으로 SELECT가 막혀 빈 배열 반환
3. `community.js:308-310`에서 error 시 `renderEmptyState()` 호출 (에러 없이 조용히 실패)

**수정 포인트**:
- `community.js:291-295`: `loadSupabaseClient()` 실패 시 로그 강화
- `community.js:308-310`: error 객체를 로그에 출력하여 RLS 에러인지 확인

---

### 이슈 5: Creator Studio works INSERT가 RLS 위반 / 401 / AuthSessionMissingError

#### 원인 후보 및 검증

**후보 1: creator_studio.js가 getSupabase()로 받은 클라이언트가 실제로 Supabase Auth 세션을 갖고 있는지 확인** ⭐ **유력**
- **근거**: `creator_studio.js:1604-1611`에서 세션 확인하지만, 실제 INSERT 시 세션이 없을 수 있음
- **코드 위치**: `creator_studio.js:1604-1611`
```javascript
const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

if (sessionError || !sessionData?.session) {
  console.error("[CREATOR] Supabase session missing", sessionError);
  alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
  window.location.href = "/login_creator.html";
  return;
}
```
- **검증 방법**: `creator_studio.js:1720` INSERT 직전에 다시 `getSession()` 로그 추가

**후보 2: 동일 페이지에서 supabase client가 2개 생성되어, 한쪽은 로그인, 한쪽은 anon 상태**
- **근거**: `creator_studio.js:330`에서 `supabase = getSupabase()`와 `supabaseClient = getSupabase()` 두 번 호출
- **코드 위치**: `creator_studio.js:330-331`
```javascript
supabase = getSupabase();
supabaseClient = getSupabase();
```
- **검증 방법**: `window.__supabase_singleton`이 실제로 세션을 갖고 있는지 확인

**후보 3: HTML script type="module" 누락으로 import 기반 getSupabase가 실패**
- **근거**: `creator_studio.js:329`에서 `import("./supabase-auth.js")` 동적 import 사용
- **코드 위치**: `creator_studio.js:329`
```javascript
const { getSupabase } = await import("./supabase-auth.js");
```
- **검증 방법**: `creator_studio.html`에서 script 태그에 `type="module"` 있는지 확인

**후보 4: Firebase UID를 creator_id로 사용하려고 시도**
- **근거**: `creator_studio.js:1702`에서 `creator_id: supabaseUserId` 사용하지만, 실제로는 Firebase UID일 수 있음
- **코드 위치**: `creator_studio.js:1702`
```javascript
creator_id: supabaseUserId, // Supabase Auth UID 사용 (Firebase UID 사용 금지)
```
- **검증 방법**: `creator_studio.js:1614`에서 `supabaseUserId`가 실제로 Supabase Auth UID인지 확인

#### 결론

**주요 원인**: **후보 1 + 후보 4 조합**
1. `creator_studio.js:1614`에서 `sessionData.session.user.id`를 사용하지만, 세션이 만료되었을 수 있음
2. `creator_studio.js:343-350`에서 Firebase UID를 `creatorId`로 설정하는 코드가 있어 혼선 가능
- **코드 위치**: `creator_studio.js:343-350`
```javascript
const firebaseUser = auth.currentUser;
if (firebaseUser && firebaseUser.uid) {
  creatorId = firebaseUser.uid;  // ⚠️ Firebase UID 사용
  window.__CREATOR_ID__ = creatorId;
  await ensureCreatorRecord(creatorId);
}
```

**수정 포인트**:
- `creator_studio.js:1614`: `supabaseUserId`가 실제로 Supabase Auth UID인지 로그 추가
- `creator_studio.js:1702`: INSERT 직전에 다시 세션 확인 로그 추가

---

## 3. 검증 체크리스트

### 3.1 닉네임 표시 문제 검증
- [ ] 콘솔에서 `getReaderNickname(firebaseUser.uid)` 직접 호출하여 반환값 확인
- [ ] Firestore에서 `readers/{uid}` 문서의 `nickname` 필드 확인
- [ ] `nicknameCache.get(firebaseUser.uid)` 확인하여 null 캐시 여부 확인
- [ ] `mypage_reader.js:8126`에서 `collection("users")` → `collection("readers")` 변경 후 테스트

### 3.2 팔로워/팔로잉 문제 검증
- [ ] 네트워크 탭에서 `/rest/v1/reader_follows?select=*&following_id=eq.{uid}` 요청 확인
- [ ] 응답 상태 코드가 200인지, 401/403인지 확인
- [ ] localStorage에 `follow_{uid}_{targetId}` 키가 있는지 확인
- [ ] `mypage_reader.js:6533` COUNT 쿼리 전에 Supabase Auth 세션 확인 로그 추가

### 3.3 무드보드 생성 RLS 위반 검증
- [ ] `moodboard_editor.js:222` INSERT 직전에 `supabaseClient.auth.getSession()` 로그 추가
- [ ] 세션 유무, `auth.uid()` 값 확인
- [ ] 네트워크 탭에서 POST `/rest/v1/moodboards` 요청 확인, 응답 상태 코드 확인

### 3.4 커뮤니티 빈 화면 검증
- [ ] `community.html`에서 `body`에 `page-community` 클래스 확인
- [ ] `community.js:291`에서 `loadSupabaseClient()` 반환값 확인
- [ ] 네트워크 탭에서 `/rest/v1/moodboards?select=*&is_public=eq.true` 요청 확인
- [ ] 응답이 빈 배열인지, 에러인지 확인

### 3.5 Creator Studio works INSERT 검증
- [ ] `creator_studio.js:1720` INSERT 직전에 `getSession()` 로그 추가
- [ ] `supabaseUserId`가 실제로 Supabase Auth UID인지 확인
- [ ] `window.__supabase_singleton.auth.getSession()` 확인
- [ ] 네트워크 탭에서 POST `/rest/v1/works` 요청 확인, 응답 상태 코드 확인

---

## 4. 수정안 제시

### 4.1 이슈 1: 닉네임 표시 문제

#### 최소 수정 (MVP)
**파일**: `public/js/mypage_reader.js`

1. **라인 8126**: `collection("users")` → `collection("readers")`
2. **라인 8168**: `collection("users")` → `collection("readers")`
3. **라인 8461**: `collection("users")` → `collection("readers")`

**기대 동작**: 팔로잉/팔로워 목록에서 닉네임이 정상 표시됨

#### 근본 수정
**추가 수정**:
- `mypage_reader.js:62`: nickname 조회 실패 시 null 캐시 저장하지 않도록 변경
- `mypage_reader.js:8726-8742`: UI 렌더링 전에 nickname 로드 완료 대기

**기대 동작**: 모든 페이지에서 닉네임이 일관되게 표시됨

---

### 4.2 이슈 2: 팔로워/팔로잉 0/0 문제

#### 최소 수정 (MVP)
**파일**: `public/js/mypage_reader.js`

1. **라인 6533-6542**: COUNT 쿼리 전에 RLS 에러 로그 추가
```javascript
console.log("[팔로우] COUNT 쿼리 시작, firebaseUser.uid:", firebaseUser.uid);
const { count: followersCount, error: followersError } = await supabaseClient
  .from("reader_follows")
  .select("*", { count: "exact", head: true })
  .eq("following_id", firebaseUser.uid);

if (followersError) {
  console.error("[팔로우] 팔로워 수 조회 실패:", followersError);
  console.error("[팔로우] 에러 코드:", followersError.code);
  console.error("[팔로우] 에러 메시지:", followersError.message);
}
```

**기대 동작**: RLS 에러 원인을 로그로 확인 가능

#### 근본 수정
**옵션 A**: RLS 정책 확인 후, Reader용 정책 추가 (DB 변경 필요하므로 불가)
**옵션 B**: localStorage 기반 팔로우를 DB로 마이그레이션하는 스크립트 작성
**옵션 C**: COUNT 대신 전체 SELECT 후 length 사용 (성능 저하 가능)

**기대 동작**: 팔로워/팔로잉 수가 정상 표시됨

---

### 4.3 이슈 3: 무드보드 생성 RLS 위반

#### 최소 수정 (MVP) - Firestore로 옮기기
**파일**: `public/js/moodboard_editor.js`, `public/js/moodboard_service.js` (신규)

1. **moodboard_service.js 신규 생성**: Firestore 기반 무드보드 CRUD 함수
2. **moodboard_editor.js:186-247**: `createNewMoodboard()`에서 Supabase INSERT 대신 Firestore 저장

**기대 동작**: Reader가 무드보드를 생성할 수 있음

#### 근본 수정
**옵션 B**: Edge Function으로 쓰기 위임
**옵션 C**: Reader도 Supabase Auth에 로그인시키는 브릿지

**기대 동작**: Supabase에서도 무드보드 생성 가능

---

### 4.4 이슈 4: 커뮤니티 빈 화면

#### 최소 수정 (MVP)
**파일**: `public/js/community.js`

1. **라인 291-295**: `loadSupabaseClient()` 실패 시 로그 강화
```javascript
const supabase = await loadSupabaseClient();
if (!supabase) {
  console.error("[Community] Supabase 클라이언트 로드 실패");
  renderEmptyState();
  return;
}
```

2. **라인 308-310**: error 객체를 로그에 출력
```javascript
if (error) {
  console.error("[Community] 무드보드 조회 실패:", error);
  console.error("[Community] 에러 코드:", error.code);
  console.error("[Community] 에러 메시지:", error.message);
  renderEmptyState();
  return;
}
```

**기대 동작**: 빈 화면 원인을 로그로 확인 가능

#### 근본 수정
- RLS 정책 확인 후, 공개 무드보드 조회용 정책 추가 (DB 변경 필요하므로 불가)
- 또는 `is_public=true`인 무드보드는 anon 사용자도 조회 가능하도록 정책 확인

**기대 동작**: 커뮤니티에 무드보드가 정상 표시됨

---

### 4.5 이슈 5: Creator Studio works INSERT RLS 위반

#### 최소 수정 (MVP)
**파일**: `public/js/creator_studio.js`

1. **라인 1614**: `supabaseUserId` 로그 추가
```javascript
const supabaseUserId = sessionData.session.user.id;
console.log("[CREATOR] Supabase Auth UID:", supabaseUserId);
console.log("[CREATOR] Firebase UID:", firebaseUser?.uid);
```

2. **라인 1720**: INSERT 직전에 다시 세션 확인
```javascript
// INSERT 직전 세션 재확인
const { data: finalSession } = await supabaseClient.auth.getSession();
if (!finalSession?.session) {
  console.error("[CREATOR] INSERT 직전 세션 만료");
  alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
  window.location.href = "/login_creator.html";
  return;
}
```

**기대 동작**: RLS 위반 원인을 로그로 확인 가능

#### 근본 수정
- `creator_studio.js:343-350`: Firebase UID 사용 코드 제거
- Creator는 Supabase Auth만 사용하도록 일관성 유지

**기대 동작**: Creator Studio에서 works INSERT가 정상 동작

---

## 5. 진단용 로깅 패치 (권장)

### 5.1 공통 인증 상태 디버그 함수

**파일**: `public/js/debug_auth.js` (신규 생성)

```javascript
/**
 * 현재 인증 상태를 한 번에 로그로 출력
 */
export async function debugAuthState(context = "") {
  console.group(`[AUTH DEBUG] ${context}`);
  
  // Firebase Auth
  try {
    const firebaseUser = await window.getCurrentFirebaseUser?.();
    console.log("Firebase Auth:", firebaseUser ? {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    } : "null");
  } catch (e) {
    console.error("Firebase Auth 확인 실패:", e);
  }
  
  // Supabase Auth
  try {
    const { getSupabase } = await import("./supabase-auth.js");
    const supabase = getSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("Supabase Auth:", sessionData?.session ? {
      userId: sessionData.session.user.id,
      email: sessionData.session.user.email,
      expiresAt: sessionData.session.expires_at
    } : "null", sessionError ? `(에러: ${sessionError.message})` : "");
  } catch (e) {
    console.error("Supabase Auth 확인 실패:", e);
  }
  
  console.groupEnd();
}
```

### 5.2 적용 위치

1. **moodboard_editor.js:222** (무드보드 생성 직전)
```javascript
await debugAuthState("무드보드 생성 직전");
```

2. **creator_studio.js:1720** (works INSERT 직전)
```javascript
await debugAuthState("works INSERT 직전");
```

3. **mypage_reader.js:6533** (팔로워 COUNT 쿼리 직전)
```javascript
await debugAuthState("팔로워 COUNT 쿼리 직전");
```

4. **community.js:301** (무드보드 조회 직전)
```javascript
await debugAuthState("무드보드 조회 직전");
```

---

## 6. 적용 순서 (1~N)

### Phase 1: 진단 로깅 추가 (즉시 적용 가능)
1. `debug_auth.js` 신규 생성
2. 각 이슈 발생 지점에 `debugAuthState()` 호출 추가
3. 실제 동작 확인하여 원인 확정

### Phase 2: 최소 수정 적용 (빠른 해결)
1. **이슈 1**: `mypage_reader.js`에서 `collection("users")` → `collection("readers")` 변경
2. **이슈 3**: `moodboard_editor.js`에서 Firestore로 무드보드 생성 변경 (또는 RLS 정책 확인)
3. **이슈 4**: `community.js`에서 에러 로그 강화

### Phase 3: 근본 수정 (중기)
1. **이슈 2**: 팔로워/팔로잉 DB 마이그레이션 또는 RLS 정책 조정
2. **이슈 5**: Creator Studio 인증 흐름 일관성 유지

---

## 7. 추가 확인 사항

### 7.1 RLS 정책 확인 (DB 변경 금지이므로 확인만)
- `moodboards` 테이블: INSERT 정책이 Supabase Auth 세션을 요구하는지 확인
- `reader_follows` 테이블: SELECT/COUNT 정책이 Supabase Auth 세션을 요구하는지 확인
- `works` 테이블: INSERT 정책이 Supabase Auth 세션을 요구하는지 확인

### 7.2 Supabase Auth 세션 만료 시간
- 현재 세션 만료 시간 확인
- 세션 갱신 로직이 있는지 확인

### 7.3 Firestore readers 컬렉션 구조
- `readers/{uid}` 문서에 `nickname` 필드가 실제로 있는지 확인
- `users` 컬렉션이 별도로 존재하는지 확인

---

**보고서 작성 완료**










