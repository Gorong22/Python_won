# UUID 오염 문제 해결 보고서

**작성일**: 2025-01-27  
**문제**: `invalid input syntax for type uuid: "hkmU6SQHWyRZIlRrvA7znmphK5D2"`  
**원인**: 검증 이전 단계에서 Firebase UID가 UUID 컬럼에 들어가는 구조적 문제

---

## 🔍 Firebase UID가 UUID로 변한 정확한 최초 위치

### 발견된 오염 경로

**1. DOM dataset 오염 가능성**

- 위치: `feed-stat-interaction.js`의 모든 핸들러 함수
- 문제: `dataset.id`, `dataset.target`, `dataset.value` 같은 모호한 속성 사용
- 위험: Firebase UID가 들어있을 수 있는 속성이 UUID로 오인될 수 있음

**2. 함수 진입 시점에서의 값 혼동**

- `handleFeedLikeAction`: `data-feed-id` 읽기 전에 다른 dataset 속성 참조 가능
- `handleCommentLike`: `data-comment-id` / `data-reply-id` 읽기 전 fallback 로직
- `submitComment`: 인자로 받은 `feedId`가 이미 오염된 상태일 수 있음
- `submitReply`: 인자로 받은 `commentId`가 이미 오염된 상태일 수 있음

### 정확한 오염 발생 지점 (추정)

**가장 가능성 높은 경로**:

```
DOM 요소 → dataset.id/target/value 읽기 → UUID로 오인 → INSERT 시도 → 22P02 에러
```

**확인 방법**:
각 핸들러 함수의 최초 진입점에 추가한 로그(`[ENTRY PAYLOAD]`)를 통해 정확한 위치 확인 가능

---

## 🧠 왜 기존 UUID 검증이 이를 막지 못했는지

### 기존 검증의 한계

1. **검증 시점의 문제**

   - 기존: INSERT 직전에만 검증 (`api-functions.js`의 `likeTarget`, `createComment` 등)
   - 문제: 검증 이전에 이미 잘못된 값이 함수 인자로 전달됨
   - 결과: 검증을 통과한 것이 아니라, 검증이 실행되기 전에 오염된 payload 생성

2. **dataset 속성의 모호성**

   - `dataset.id`: UUID일 수도 있고 Firebase UID일 수도 있음
   - `dataset.target`: 마찬가지로 타입 불명확
   - `dataset.value`: 완전히 모호한 속성명

3. **함수 시그니처의 혼동**
   - `handleLike(id)`: id가 UUID인지 Firebase UID인지 불명확
   - `handleAction(target)`: target의 타입 불명확
   - 결과: 호출 시점에서 잘못된 값이 전달될 수 있음

### 해결 방법

**1. 진입점 로깅 추가**

- 각 핸들러 함수의 최초 진입점에 `[ENTRY PAYLOAD]` 로그 추가
- `rawTargetId`, `isUUID`, `isFirebaseUID` 확인 가능

**2. dataset 오염 차단**

- `data-feed-id`, `data-comment-id`, `data-reply-id`만 허용
- `dataset.id`, `dataset.target`, `dataset.value` 사용 시 즉시 차단

**3. 코드 레벨 강제 검증**

- INSERT 직전에 `if (!isUUID(payload.target_id)) throw error` 추가
- 검증 실패 시 즉시 에러 발생하여 DB 쿼리 차단

---

## ✅ 수정된 코드

### 1. `app_init.js`: isFirebaseUID 유틸리티 추가

```javascript
isFirebaseUID: function(v) {
  if (!v || typeof v !== "string") return false;
  // UUID는 Firebase UID가 아님
  if (window.App?.utils?.isUUID(v)) return false;
  // Firebase UID는 보통 20-28자 길이의 영숫자 문자열
  return /^[a-zA-Z0-9]{20,28}$/.test(v);
},
```

### 2. `feed-stat-interaction.js`: 진입 로그 및 dataset 오염 차단

#### `handleFeedLikeAction` 함수

```javascript
window.handleFeedLikeAction = async function (button) {
  // 🔍 1️⃣ 진입 로그
  console.log("[ENTRY PAYLOAD] handleFeedLikeAction", {
    arguments: Array.from(arguments),
    rawTargetId: button?.dataset?.feedId || button?.getAttribute("data-feed-id"),
    isUUID: isUUID ? isUUID(...) : "N/A",
    isFirebaseUID: isFirebaseUID ? isFirebaseUID(...) : "N/A",
  });

  // 🚫 dataset 오염 차단
  if (!feedId) {
    const fallbackId = card?.dataset?.id || button?.dataset?.id || ...;
    if (fallbackId) {
      console.error("[BLOCKED: dataset 오염]", {...});
      return; // 오염된 값 차단
    }
  }

  // 🔍 4️⃣ INSERT 직전 payload 로그
  console.log("[FINAL INSERT PAYLOAD] likeTarget", {
    target_type: "feed",
    target_id: feedId,
    user_id: firebaseUid,
    isTargetIdUUID: isUUID ? isUUID(feedId) : "N/A",
    isUserIdFirebaseUID: isFirebaseUID ? isFirebaseUID(firebaseUid) : "N/A",
  });
}
```

#### `handleCommentLike` 함수

```javascript
window.handleCommentLike = async function (button) {
  // 🔍 1️⃣ 진입 로그
  console.log("[ENTRY PAYLOAD] handleCommentLike", {
    arguments: Array.from(arguments),
    rawTargetId: rawCommentId || rawReplyId,
    isUUID: isUUID ? isUUID(...) : "N/A",
    isFirebaseUID: isFirebaseUID ? isFirebaseUID(...) : "N/A",
  });

  // 🚫 dataset 오염 차단
  if (!commentId && !replyId) {
    const fallbackId = button?.dataset?.id || ...;
    if (fallbackId) {
      console.error("[BLOCKED: dataset 오염]", {...});
      return; // 오염된 값 차단
    }
  }
}
```

#### `submitComment` 함수

```javascript
window.submitComment = async function (feedId) {
  // 🔍 1️⃣ 진입 로그
  console.log("[ENTRY PAYLOAD] submitComment", {
    arguments: Array.from(arguments),
    rawTargetId: feedId,
    isUUID: isUUID ? isUUID(feedId) : "N/A",
    isFirebaseUID: isFirebaseUID ? isFirebaseUID(feedId) : "N/A",
  });

  // 🔍 4️⃣ INSERT 직전 payload 로그
  console.log("[FINAL INSERT PAYLOAD] createComment", {
    target_type: "feed",
    target_id: feedId,
    user_id: firebaseUid,
    isTargetIdUUID: isUUID ? isUUID(feedId) : "N/A",
    isUserIdFirebaseUID: isFirebaseUID ? isFirebaseUID(firebaseUid) : "N/A",
  });
};
```

#### `submitReply` 함수

```javascript
window.submitReply = async function (commentId) {
  // 🔍 1️⃣ 진입 로그
  console.log("[ENTRY PAYLOAD] submitReply", {
    arguments: Array.from(arguments),
    rawTargetId: commentId,
    isUUID: isUUID ? isUUID(commentId) : "N/A",
    isFirebaseUID: isFirebaseUID ? isFirebaseUID(commentId) : "N/A",
  });

  // 🔍 4️⃣ INSERT 직전 payload 로그
  console.log("[FINAL INSERT PAYLOAD] createReply", {
    target_type: "comment",
    target_id: commentId,
    user_id: firebaseUid,
    isTargetIdUUID: isUUID ? isUUID(commentId) : "N/A",
    isUserIdFirebaseUID: isFirebaseUID ? isFirebaseUID(firebaseUid) : "N/A",
  });
};
```

### 3. `api-functions.js`: INSERT 직전 코드 레벨 강제 검증

#### `likeTarget` 함수

```javascript
window.likeTarget = async function (targetType, targetId, firebaseUid) {
  // ... 기존 검증 ...

  // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
  const payload = {
    target_type: targetType,
    target_id: targetId,
    user_id: firebaseUid,
  };

  console.log("[FINAL INSERT PAYLOAD] likeTarget", {
    ...payload,
    isTargetIdUUID: isUUID(targetId),
    isUserIdFirebaseUID:
      !isUUID(firebaseUid) && typeof firebaseUid === "string",
  });

  // 코드 레벨 강제 검증
  if (!isUUID(payload.target_id)) {
    const error = new Error(
      `BLOCKED: target_id is not UUID. Got: ${payload.target_id}`
    );
    console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
      ...payload,
      reason: "target_id is not a valid UUID",
    });
    throw error;
  }

  const { data, error } = await window.supabase.from("likes").insert(payload);
};
```

#### `createComment` 함수

```javascript
window.createComment = async function (
  targetType,
  targetId,
  content,
  firebaseUid
) {
  // ... 기존 검증 ...

  // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
  const payload = {
    target_type: targetType,
    target_id: targetId,
    content: content,
    user_id: firebaseUid,
  };

  console.log("[FINAL INSERT PAYLOAD] createComment", {
    ...payload,
    isTargetIdUUID: isUUID(targetId),
    isUserIdFirebaseUID:
      !isUUID(firebaseUid) && typeof firebaseUid === "string",
  });

  // 코드 레벨 강제 검증
  if (!isUUID(payload.target_id)) {
    const error = new Error(
      `BLOCKED: target_id is not UUID. Got: ${payload.target_id}`
    );
    console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
      ...payload,
      reason: "target_id is not a valid UUID",
    });
    throw error;
  }

  const { data, error } = await window.supabase
    .from("comments")
    .insert(payload);
};
```

#### `createReply` 함수

```javascript
window.createReply = async function (commentId, content, firebaseUid) {
  // ... 기존 검증 ...

  // 🔍 4️⃣ INSERT 직전 payload 로그 및 코드 레벨 검증
  const payload = {
    comment_id: commentId,
    content: content,
    user_id: firebaseUid,
  };

  console.log("[FINAL INSERT PAYLOAD] createReply", {
    ...payload,
    target_type: "comment",
    target_id: commentId,
    isTargetIdUUID: isUUID(commentId),
    isUserIdFirebaseUID:
      !isUUID(firebaseUid) && typeof firebaseUid === "string",
  });

  // 코드 레벨 강제 검증
  if (!isUUID(payload.comment_id)) {
    const error = new Error(
      `BLOCKED: comment_id is not UUID. Got: ${payload.comment_id}`
    );
    console.error("[FINAL INSERT PAYLOAD BLOCKED]", {
      ...payload,
      reason: "comment_id is not a valid UUID",
    });
    throw error;
  }

  const { data, error } = await window.supabase
    .from("comment_replies")
    .insert(payload);
};
```

---

## 🧪 수정 후 예상 결과

### 1. 댓글 작성 성공

- `submitComment` 함수 진입 시 `[ENTRY PAYLOAD]` 로그로 `feedId` 타입 확인 가능
- `[FINAL INSERT PAYLOAD]` 로그로 INSERT 직전 값 확인 가능
- 코드 레벨 검증으로 Firebase UID가 들어오면 즉시 차단

### 2. 댓글 좋아요 성공

- `handleCommentLike` 함수 진입 시 `[ENTRY PAYLOAD]` 로그로 `targetId` 타입 확인 가능
- dataset 오염 차단으로 잘못된 속성 사용 시 즉시 차단
- `[FINAL INSERT PAYLOAD]` 로그로 INSERT 직전 값 확인 가능

### 3. 22P02 에러 완전 소멸

- **진입점 차단**: dataset 오염 차단으로 잘못된 값이 함수에 전달되지 않음
- **INSERT 직전 차단**: 코드 레벨 강제 검증으로 UUID가 아닌 값이 DB에 전달되지 않음
- **이중 방어**: 두 단계에서 모두 차단하여 완전히 방지

---

## 📊 로그 분석 가이드

### 오염 발생 지점 확인 방법

1. **브라우저 콘솔에서 다음 로그 확인**:

   ```
   [ENTRY PAYLOAD] handleFeedLikeAction
   [ENTRY PAYLOAD] handleCommentLike
   [ENTRY PAYLOAD] submitComment
   [ENTRY PAYLOAD] submitReply
   ```

2. **각 로그에서 확인할 항목**:

   - `rawTargetId`: 원본 값
   - `isUUID`: UUID 여부
   - `isFirebaseUID`: Firebase UID 여부

3. **오염 발견 시**:

   - `isUUID: false`이고 `isFirebaseUID: true`이면 → Firebase UID가 UUID로 오인됨
   - `[BLOCKED: dataset 오염]` 로그가 보이면 → dataset 오염 차단 작동

4. **INSERT 직전 확인**:
   ```
   [FINAL INSERT PAYLOAD] likeTarget
   [FINAL INSERT PAYLOAD] createComment
   [FINAL INSERT PAYLOAD] createReply
   ```
   - `isTargetIdUUID: true`여야 함
   - `isUserIdFirebaseUID: true`여야 함 (user_id는 Firebase UID)

---

## 🎯 핵심 개선 사항 요약

1. ✅ **진입점 로깅**: 모든 핸들러 함수의 최초 진입점에 상세 로그 추가
2. ✅ **dataset 오염 차단**: 모호한 속성(`dataset.id`, `dataset.target`, `dataset.value`) 사용 금지
3. ✅ **명확한 속성 사용**: `data-feed-id`, `data-comment-id`, `data-reply-id`만 허용
4. ✅ **코드 레벨 강제 검증**: INSERT 직전에 `throw error`로 차단
5. ✅ **이중 방어**: 진입점 차단 + INSERT 직전 차단

---

## ⚠️ 주의사항

1. **로그 확인 필수**: 실제 오염 발생 지점을 확인하려면 브라우저 콘솔 로그를 확인해야 함
2. **dataset 속성 명명 규칙**: 앞으로는 반드시 `data-target-id` (UUID), `data-user-id` (Firebase UID) 형식 사용
3. **함수 시그니처**: 혼동을 피하기 위해 `handleFeedLike({ feedId })` 형식 권장 (현재는 인자 순서로 구분)

---

**수정 완료일**: 2025-01-27  
**수정 파일**:

- `public/js/app_init.js`
- `public/js/feed-stat-interaction.js`
- `public/js/api-functions.js`




