# 데이터 무결성 수정 보고서

**작성일**: 2025-01-27  
**수정 목적**: Firebase Firestore 및 Supabase Postgres 실제 스키마 기준으로 코드 정합성 확보

---

## 📋 기준 스키마 요약

### Firebase Firestore 구조

- **readers**: Document ID = Firebase UID, Fields: name, nickname, username, email 등
- **creators**: Document ID = Firebase UID
- **reader_moodboards**: Document ID = random string
- **reader_consents**: Document ID = random string

### Supabase Postgres 스키마 (제공된 부분)

- **comment_replies**: id (uuid), comment_id (uuid), user_id (text), content (text)
- **comments**: id (uuid), user_id (text), target_type (text), target_id (uuid), content (text)
- **creator_featured_works**: id (uuid), creator_firebase_uid (text), work_id (uuid)
- **creator_follows**: id (uuid), reader_id (text), creator_id (text), created_at (timestamp)
- **creator_posts**: id (uuid), creator_id (text), ...
- **creators**: id (text), firebase_uid (text), ...

### 전역 ID 규칙

1. **Firebase UID**: 항상 `text` 타입, 절대 UUID로 변환하지 않음
2. **UUID**: 콘텐츠 식별자에만 사용 (works.id, cuts.id, moodboards.id, comments.id 등)
3. **금지 사항**: Firebase UID → UUID 변환, users/readers 테이블에서 UUID 조회

---

## 🔍 발견된 불일치 및 수정 사항

### 1. `reader_profiles` 테이블 사용 제거

**문제**: `api-functions.js`의 `loadComments()`와 `loadReplies()` 함수에서 존재하지 않는 `reader_profiles` 테이블을 조회하고 있었음.

**기준**: 사용자가 제공한 Supabase 스키마에는 `reader_profiles` 테이블이 없음. Reader 정보는 Firebase Firestore `readers` 컬렉션에 저장됨.

**수정 내용**:

- `loadComments()` 함수: `reader_profiles` 테이블 조회 제거, Firebase Firestore `readers` 컬렉션에서 정보 가져오도록 변경
- `loadReplies()` 함수: 동일하게 수정

**수정 파일**: `public/js/api-functions.js`

**수정 전**:

```javascript
// reader_profiles 조회
let readers = null;
try {
  const result = await window.supabase
    .from("reader_profiles")
    .select("reader_id")
    .in("reader_id", userIds);
  readers = result.data || [];
} catch (err) {
  console.warn("[loadComments] reader_profiles 조회 실패:", err);
  readers = [];
}
```

**수정 후**:

```javascript
// Firebase Firestore에서 readers 정보 조회
const readerMap = {};
if (window.firestoreUtils && window.firestoreUtils.getReader) {
  // creator가 아닌 user_id들만 조회
  const readerIds = userIds.filter((uid) => !creatorMap[uid]);
  for (const uid of readerIds) {
    try {
      const readerData = await window.firestoreUtils.getReader(uid);
      if (readerData) {
        readerMap[uid] = readerData;
      }
    } catch (err) {
      console.warn(
        `[loadComments] Firebase Firestore readers 조회 실패 (${uid}):`,
        err
      );
    }
  }
}
```

**표시명 설정 변경**:

```javascript
// 수정 전
displayName = readerMap[userId].reader_id || "사용자";

// 수정 후
const readerData = readerMap[userId];
displayName =
  readerData.nickname || readerData.name || readerData.username || "사용자";
```

---

## ✅ 확인 완료 사항

### 1. `creator_follows` 테이블 사용

- **상태**: ✅ 올바름
- **확인**: `reader_id`와 `creator_id` 모두 Firebase UID (text)를 직접 사용
- **위치**: `api-functions.js`의 `followCreator()`, `unfollowCreator()`, `__toggleCreatorFollowAPI()` 함수

### 2. Firebase UID 직접 사용

- **상태**: ✅ 올바름
- **확인**: `likes.user_id`, `comments.user_id`, `comment_replies.user_id` 모두 Firebase UID 직접 사용
- **위치**: `api-functions.js`의 모든 INSERT/DELETE 함수

### 3. UUID 검증

- **상태**: ✅ 올바름
- **확인**: 콘텐츠 ID (target_id, comment_id 등)에 대한 UUID 검증이 모든 함수에 구현됨
- **위치**: `api-functions.js`의 모든 함수

### 4. `creators` 테이블 조회

- **상태**: ✅ 올바름
- **확인**: `creators.firebase_uid`로 조회하여 역할 판별 및 정보 가져오기
- **위치**: `app_init.js`, `api-functions.js`, `feed.js`

---

## 📝 수정 파일 목록

### 수정된 파일

1. **`public/js/api-functions.js`**
   - `loadComments()` 함수: `reader_profiles` 제거, Firebase Firestore `readers` 사용
   - `loadReplies()` 함수: 동일하게 수정

### 변경 없음 (이미 기준 준수)

- `public/js/app_init.js`: `creators` 테이블 조회 올바름
- `public/js/api-functions.js`: `creator_follows` 테이블 사용 올바름
- `public/js/api-functions.js`: 모든 INSERT/DELETE 함수의 UID/UUID 사용 올바름

---

## 🎯 수정 결과

### 수정 전 문제점

1. ❌ 존재하지 않는 `reader_profiles` 테이블 조회 시도
2. ❌ Reader 정보를 Supabase에서 가져오려고 시도 (실제로는 Firebase Firestore에 저장됨)
3. ❌ Reader 표시명을 `reader_id`로 설정 (실제로는 `nickname`, `name`, `username` 사용)

### 수정 후

1. ✅ Firebase Firestore `readers` 컬렉션에서 Reader 정보 가져오기
2. ✅ Reader 표시명을 Firebase Firestore의 실제 필드(`nickname`, `name`, `username`)에서 가져오기
3. ✅ 기준 스키마와 완전히 일치

---

## 🔄 다음 단계 권장 사항

1. **전체 Supabase 스키마 확인**: 사용자가 제공한 스키마는 일부만 제공되었으므로, 전체 스키마를 확인하여 다른 불일치가 있는지 검토 필요

2. **Firebase Firestore 구조 확인**: `readers` 컬렉션의 실제 필드 구조가 코드에서 사용하는 필드(`nickname`, `name`, `username`)와 일치하는지 확인 필요

3. **테스트**: 수정된 `loadComments()`와 `loadReplies()` 함수가 정상적으로 작동하는지 테스트 필요

---

## 📌 참고 사항

- 모든 수정은 **기존 기능을 유지**하면서 **데이터 소스만 변경**했습니다.
- 기존 모달, 이벤트, UI는 그대로 유지됩니다.
- Firebase Firestore `readers` 컬렉션 접근을 위해 `window.firestoreUtils.getReader()` 함수를 사용합니다.




