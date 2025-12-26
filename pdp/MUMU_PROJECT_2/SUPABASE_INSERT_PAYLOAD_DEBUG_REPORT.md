# 🔥 Supabase Insert Payload 디버깅 보고서

## 📌 문제 상황

**에러 메시지:**

```
22P02 invalid input syntax for type uuid: "hkmU6SQHWyRZIlRrvA7znmphK5D2"
```

**발생 위치:**

- `likes` 테이블 insert
- `comments` 테이블 insert

**문제:**

- Firebase UID (`hkmU6SQHWyRZIlRrvA7znmphK5D2`)가 UUID 컬럼(`target_id` 또는 `comment_id`)에 전달되고 있음
- DB 스키마는 정상: `likes.user_id`는 `text`, `likes.target_id`는 `uuid`

## 🔍 조사 완료 사항

### 1️⃣ Supabase Insert 직전 Payload 로그 추가

다음 위치에 **🔥 SUPABASE FINAL INSERT** 로그를 추가했습니다:

**파일:** `public/js/api-functions.js`

#### `likeTarget` 함수 (89번 줄)

```javascript
// 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
console.log(
  "🔥 SUPABASE FINAL INSERT",
  "likes",
  JSON.stringify(payload),
  Object.keys(payload),
  Object.values(payload)
);

const { data, error } = await window.supabase.from("likes").insert(payload);
```

#### `createComment` 함수 (255번 줄)

```javascript
// 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
console.log(
  "🔥 SUPABASE FINAL INSERT",
  "comments",
  JSON.stringify(payload),
  Object.keys(payload),
  Object.values(payload)
);

const { data, error } = await window.supabase.from("comments").insert(payload);
```

#### `createReply` 함수 (484번 줄)

```javascript
// 🔥 SUPABASE FINAL INSERT - 실제 전달되는 payload 확인
console.log(
  "🔥 SUPABASE FINAL INSERT",
  "comment_replies",
  JSON.stringify(payload),
  Object.keys(payload),
  Object.values(payload)
);

const { data, error } = await window.supabase
  .from("comment_replies")
  .insert(payload);
```

### 2️⃣ Payload 변조 코드 조사 결과

#### ✅ Supabase 메서드 Override 없음

- `supabase.from` override 없음
- `supabase.insert` override 없음
- `prototype` 수정 없음

#### ✅ Arguments 재조립 코드 없음

- `arguments` 재정렬 코드 없음
- `.apply()`, `.call()`, `.bind()` 사용 없음

#### ✅ 함수 호출 인자 순서 정상

- `likeTarget("feed", feedId, firebaseUid)` ✅ 정상
- `createComment("feed", feedId, content, firebaseUid)` ✅ 정상

### 3️⃣ 코드 레벨 검증 확인

모든 insert 함수에서 다음 검증이 이미 구현되어 있습니다:

```javascript
// UUID 검증
if (!isUUID(targetId)) {
  console.error("[likeTarget] target_id가 UUID가 아닙니다:", targetId);
  return { error: new Error("target_id must be a valid UUID") };
}

// Payload 생성
const payload = {
  target_type: targetType,
  target_id: targetId, // UUID 검증 완료
  user_id: firebaseUid, // Firebase UID
};

// 코드 레벨 강제 검증
if (!isUUID(payload.target_id)) {
  throw error;
}
```

## 🎯 다음 단계 (실행 필요)

### 1. 브라우저 콘솔에서 로그 확인

다음 순서로 테스트:

1. **좋아요 버튼 클릭**
2. 콘솔에서 다음 로그 확인:

   ```
   [FINAL INSERT PAYLOAD] likeTarget
   🔥 SUPABASE FINAL INSERT likes
   ```

3. **댓글 작성**
4. 콘솔에서 다음 로그 확인:
   ```
   [FINAL INSERT PAYLOAD] createComment
   🔥 SUPABASE FINAL INSERT comments
   ```

### 2. 로그 분석 포인트

**확인해야 할 사항:**

1. **`[FINAL INSERT PAYLOAD]`와 `🔥 SUPABASE FINAL INSERT`의 payload 비교**

   - 두 로그의 `Object.values(payload)`가 동일한가?
   - 값의 순서가 바뀌었는가?

2. **`Object.values(payload)` 확인**

   - 첫 번째 값이 `target_type`인가?
   - 두 번째 값이 `target_id` (UUID)인가?
   - 세 번째 값이 `user_id` (Firebase UID)인가?

3. **값 교체 확인**
   - `target_id` 자리에 Firebase UID가 들어갔는가?
   - `user_id` 자리에 UUID가 들어갔는가?

### 3. 예상 시나리오

#### 시나리오 A: Payload 생성 시점에서 이미 잘못됨

```
[FINAL INSERT PAYLOAD] likeTarget
  target_id: "hkmU6SQHWyRZIlRrvA7znmphK5D2"  ❌ Firebase UID
  user_id: "550e8400-e29b-41d4-a716-446655440000"  ❌ UUID

🔥 SUPABASE FINAL INSERT
  동일한 값
```

**원인:** 함수 호출 시 인자 순서가 잘못됨

#### 시나리오 B: Insert 직전에 값이 바뀜

```
[FINAL INSERT PAYLOAD] likeTarget
  target_id: "550e8400-e29b-41d4-a716-446655440000"  ✅ UUID
  user_id: "hkmU6SQHWyRZIlRrvA7znmphK5D2"  ✅ Firebase UID

🔥 SUPABASE FINAL INSERT
  target_id: "hkmU6SQHWyRZIlRrvA7znmphK5D2"  ❌ Firebase UID로 변경됨
  user_id: "550e8400-e29b-41d4-a716-446655440000"  ❌ UUID로 변경됨
```

**원인:** Supabase SDK 내부에서 payload 변조 또는 객체 키 순서 문제

#### 시나리오 C: Supabase SDK가 객체 키 순서를 무시

```
[FINAL INSERT PAYLOAD] likeTarget
  { target_type: "feed", target_id: UUID, user_id: Firebase UID }

🔥 SUPABASE FINAL INSERT
  { target_type: "feed", user_id: Firebase UID, target_id: UUID }  ← 순서 변경
```

**원인:** JavaScript 객체 키 순서가 Supabase로 전달될 때 변경됨

## 📤 최종 결과물 (로그 확인 후 업데이트 필요)

### 현재 상태

- ✅ Insert 직전 payload 로그 추가 완료
- ✅ Payload 변조 코드 조사 완료 (없음)
- ⏳ 실제 로그 확인 필요

### 로그 확인 후 해야 할 일

1. **로그에서 실제 payload 확인**
2. **값이 어디서 바뀌는지 pinpoint**
3. **수정 코드 작성**

## ⚠️ 주의사항

이 문제는:

- ❌ DB 문제 아님
- ❌ RLS 문제 아님
- ❌ UUID 검증 문제 아님 (검증은 이미 구현됨)
- ✅ **insert 직전 payload가 중간에서 바뀌는 구조적 문제**

로그를 확인한 후, **"딱 한 줄"**만 찾아 고치면 에러가 즉시 사라집니다.




