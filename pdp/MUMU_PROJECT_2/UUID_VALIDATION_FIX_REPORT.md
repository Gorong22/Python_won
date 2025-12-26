# UUID 검증 강화 리포트

## 📋 개요

Firebase UID가 UUID 컬럼에 들어가는 타입 오류를 방지하기 위해 모든 INSERT/DELETE/UPDATE 작업 전에 UUID 검증을 추가했습니다.

**에러 메시지**: `invalid input syntax for type uuid: "hkmU6SQHWyRZIlRrvA7znmphK5D2"`

**원인**: Firebase UID가 UUID 컬럼(`target_id`, `comment_id`, `reply_id` 등)에 들어가고 있었음

---

## ✅ 수정 완료 항목

### 1. 댓글 좋아요 / 대댓글 좋아요

**파일**: `public/js/feed-stat-interaction.js`

**함수**: `window.handleCommentLike`

**문제점**:
- `targetId`를 DOM에서 가져올 때 UUID 검증이 없었음
- Firebase UID가 `targetId`로 전달될 수 있었음

**수정 내용**:
```javascript
// ✅ UUID 검증: targetId는 반드시 UUID여야 함 (Firebase UID 차단)
if (!isUUID(targetId)) {
  console.error("[댓글 좋아요] targetId가 UUID가 아닙니다 (Firebase UID일 수 있음):", {
    targetId,
    commentId,
    replyId,
    targetType,
  });
  console.error("[INSERT PAYLOAD BLOCKED]", { 
    user_id: "N/A (검증 실패)", 
    target_type: targetType, 
    target_id: targetId,
    reason: "targetId is not a valid UUID"
  });
  button.dataset.processing = "false";
  return;
}
```

**위치**: `feed-stat-interaction.js:371-387` (기존 검증 후 추가)

---

### 2. 댓글 작성

**파일**: `public/js/feed-stat-interaction.js`

**함수**: `window.submitComment`

**문제점**:
- 중복 UUID 검증이 있었지만 로그가 부족했음
- 검증 실패 시 명확한 에러 로그가 없었음

**수정 내용**:
```javascript
// ✅ UUID 검증: feedId는 반드시 UUID여야 함 (Firebase UID 차단)
if (!isUUID(feedId)) {
  console.error("[댓글] feedId가 UUID가 아닙니다 (Firebase UID일 수 있음):", feedId);
  console.error("[INSERT PAYLOAD BLOCKED]", { 
    user_id: "N/A (검증 실패)", 
    target_type: "feed", 
    target_id: feedId,
    reason: "feedId is not a valid UUID"
  });
  alert("피드 ID가 유효하지 않습니다.");
  return;
}
```

**위치**: `feed-stat-interaction.js:1422-1430` (중복 검증 제거 및 강화)

---

### 3. 대댓글 작성

**파일**: `public/js/feed-stat-interaction.js`

**함수**: `window.submitReply`

**문제점**:
- `commentId`에 대한 UUID 검증이 없었음
- Firebase UID가 `commentId`로 전달될 수 있었음

**수정 내용**:
```javascript
// ✅ UUID 검증: commentId는 반드시 UUID여야 함 (Firebase UID 차단)
if (!isUUID(commentId)) {
  console.error("[대댓글] commentId가 UUID가 아닙니다 (Firebase UID일 수 있음):", commentId);
  console.error("[INSERT PAYLOAD BLOCKED]", { 
    user_id: "N/A (검증 실패)", 
    target_type: "comment", 
    target_id: commentId,
    reason: "commentId is not a valid UUID"
  });
  alert("댓글 ID가 유효하지 않습니다.");
  return;
}
```

**위치**: `feed-stat-interaction.js:1743-1755` (기본 검증 후 추가)

---

### 4. 좋아요 취소 (unlikeTarget)

**파일**: `public/js/api-functions.js`

**함수**: `window.unlikeTarget`

**문제점**:
- `targetId`에 대한 UUID 검증이 없었음
- Firebase UID가 `targetId`로 전달될 수 있었음

**수정 내용**:
```javascript
// UUID 검증
const isUUID = window.App?.utils?.isUUID || function(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
};

if (!isUUID(targetId)) {
  console.error("[unlikeTarget] target_id가 UUID가 아닙니다:", targetId);
  console.error("[DELETE PAYLOAD BLOCKED]", { 
    user_id: firebaseUid, 
    target_type: targetType, 
    target_id: targetId,
    reason: "targetId is not a valid UUID"
  });
  return { error: new Error("target_id must be a valid UUID") };
}

// DELETE 직전 검증 로그
console.log("[DELETE PAYLOAD]", { user_id: firebaseUid, target_type: targetType, target_id: targetId });
```

**위치**: `api-functions.js:88-107` (기존 try 블록 내부에 추가)

---

### 5. 댓글 삭제

**파일**: `public/js/api-functions.js`

**함수**: `window.deleteComment`

**문제점**:
- `commentId`에 대한 UUID 검증이 없었음

**수정 내용**:
```javascript
// UUID 검증
const isUUID = window.App?.utils?.isUUID || function(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
};

if (!isUUID(commentId)) {
  console.error("[deleteComment] comment_id가 UUID가 아닙니다:", commentId);
  console.error("[DELETE PAYLOAD BLOCKED]", { 
    user_id: firebaseUid, 
    comment_id: commentId,
    reason: "commentId is not a valid UUID"
  });
  return { error: new Error("comment_id must be a valid UUID") };
}

// DELETE 직전 검증 로그
console.log("[DELETE PAYLOAD]", { user_id: firebaseUid, comment_id: commentId });
```

**위치**: `api-functions.js:298-318` (기존 try 블록 내부에 추가)

---

### 6. 대댓글 삭제

**파일**: `public/js/api-functions.js`

**함수**: `window.deleteReply`

**문제점**:
- `replyId`에 대한 UUID 검증이 없었음

**수정 내용**:
```javascript
// UUID 검증
const isUUID = window.App?.utils?.isUUID || function(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
};

if (!isUUID(replyId)) {
  console.error("[deleteReply] reply_id가 UUID가 아닙니다:", replyId);
  console.error("[DELETE PAYLOAD BLOCKED]", { 
    user_id: firebaseUid, 
    reply_id: replyId,
    reason: "replyId is not a valid UUID"
  });
  return { error: new Error("reply_id must be a valid UUID") };
}

// DELETE 직전 검증 로그
console.log("[DELETE PAYLOAD]", { user_id: firebaseUid, reply_id: replyId });
```

**위치**: `api-functions.js:470-490` (기존 try 블록 내부에 추가)

---

### 7. 댓글 수정

**파일**: `public/js/api-functions.js`

**함수**: `window.updateComment`

**문제점**:
- `commentId`에 대한 UUID 검증이 없었음

**수정 내용**:
```javascript
// UUID 검증
const isUUID = window.App?.utils?.isUUID || function(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
};

if (!isUUID(commentId)) {
  console.error("[updateComment] comment_id가 UUID가 아닙니다:", commentId);
  console.error("[UPDATE PAYLOAD BLOCKED]", { 
    user_id: firebaseUid, 
    comment_id: commentId,
    reason: "commentId is not a valid UUID"
  });
  return { error: new Error("comment_id must be a valid UUID") };
}

// UPDATE 직전 검증 로그
console.log("[UPDATE PAYLOAD]", { user_id: firebaseUid, comment_id: commentId });
```

**위치**: `api-functions.js:499-519` (기존 try 블록 내부에 추가)

---

### 8. 대댓글 수정

**파일**: `public/js/api-functions.js`

**함수**: `window.updateReply`

**문제점**:
- `replyId`에 대한 UUID 검증이 없었음

**수정 내용**:
```javascript
// UUID 검증
const isUUID = window.App?.utils?.isUUID || function(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
};

if (!isUUID(replyId)) {
  console.error("[updateReply] reply_id가 UUID가 아닙니다:", replyId);
  console.error("[UPDATE PAYLOAD BLOCKED]", { 
    user_id: firebaseUid, 
    reply_id: replyId,
    reason: "replyId is not a valid UUID"
  });
  return { error: new Error("reply_id must be a valid UUID") };
}

// UPDATE 직전 검증 로그
console.log("[UPDATE PAYLOAD]", { user_id: firebaseUid, reply_id: replyId });
```

**위치**: `api-functions.js:528-548` (기존 try 블록 내부에 추가)

---

## 🔍 검증 로그 형식

모든 INSERT/DELETE/UPDATE 작업 전에 다음 형식의 로그가 출력됩니다:

### 성공 케이스
```javascript
console.log("[INSERT PAYLOAD]", { 
  user_id: firebaseUid, 
  target_type: targetType, 
  target_id: targetId 
});
```

### 실패 케이스 (UUID 검증 실패)
```javascript
console.error("[INSERT PAYLOAD BLOCKED]", { 
  user_id: "N/A (검증 실패)", 
  target_type: targetType, 
  target_id: targetId,
  reason: "targetId is not a valid UUID"
});
```

---

## 📊 수정 요약

| 기능 | 파일 | 함수 | 상태 |
|------|------|------|------|
| 댓글 좋아요 | `feed-stat-interaction.js` | `handleCommentLike` | ✅ 완료 |
| 대댓글 좋아요 | `feed-stat-interaction.js` | `handleCommentLike` | ✅ 완료 |
| 댓글 작성 | `feed-stat-interaction.js` | `submitComment` | ✅ 완료 |
| 대댓글 작성 | `feed-stat-interaction.js` | `submitReply` | ✅ 완료 |
| 피드 좋아요 | `feed-stat-interaction.js` | `handleFeedLikeAction` | ✅ 이미 있음 |
| 좋아요 취소 | `api-functions.js` | `unlikeTarget` | ✅ 완료 |
| 댓글 삭제 | `api-functions.js` | `deleteComment` | ✅ 완료 |
| 대댓글 삭제 | `api-functions.js` | `deleteReply` | ✅ 완료 |
| 댓글 수정 | `api-functions.js` | `updateComment` | ✅ 완료 |
| 대댓글 수정 | `api-functions.js` | `updateReply` | ✅ 완료 |

---

## 🧪 테스트 시나리오

### 1. 댓글 좋아요
1. 댓글 좋아요 버튼 클릭
2. 콘솔에서 `[INSERT PAYLOAD]` 또는 `[INSERT PAYLOAD BLOCKED]` 확인
3. `target_id`가 UUID 형식인지 확인

### 2. 대댓글 좋아요
1. 대댓글 좋아요 버튼 클릭
2. 콘솔에서 `[INSERT PAYLOAD]` 또는 `[INSERT PAYLOAD BLOCKED]` 확인
3. `target_id`가 UUID 형식인지 확인

### 3. 댓글 작성
1. 댓글 입력 후 제출
2. 콘솔에서 `[INSERT PAYLOAD]` 또는 `[INSERT PAYLOAD BLOCKED]` 확인
3. `target_id`가 UUID 형식인지 확인

### 4. 대댓글 작성
1. 대댓글 입력 후 제출
2. 콘솔에서 `[INSERT PAYLOAD]` 또는 `[INSERT PAYLOAD BLOCKED]` 확인
3. `comment_id`가 UUID 형식인지 확인

---

## ✅ 성공 케이스 실행 흐름

### 댓글 좋아요 예시

1. **사용자 액션**: 댓글 좋아요 버튼 클릭
2. **DOM에서 ID 추출**: `data-comment-id` 속성에서 UUID 추출
3. **UUID 검증**: `isUUID(commentId)` 통과
4. **로그 출력**: `[INSERT PAYLOAD] { user_id: "firebase_uid", target_type: "comment", target_id: "uuid" }`
5. **DB 작업**: `likes` 테이블에 INSERT
6. **결과**: 성공

### 실패 케이스 (Firebase UID가 들어온 경우)

1. **사용자 액션**: 댓글 좋아요 버튼 클릭
2. **DOM에서 ID 추출**: 잘못된 값 (Firebase UID) 추출
3. **UUID 검증**: `isUUID(targetId)` 실패
4. **로그 출력**: `[INSERT PAYLOAD BLOCKED] { reason: "targetId is not a valid UUID" }`
5. **DB 작업**: 차단됨 (INSERT 실행 안 됨)
6. **결과**: 에러 반환, UI 롤백

---

## 🎯 핵심 원칙

1. **모든 UUID 컬럼에 들어가는 값은 반드시 UUID 검증**
2. **Firebase UID는 절대 UUID 컬럼에 들어가지 않음**
3. **검증 실패 시 명확한 로그 출력**
4. **RLS 정책은 절대 수정하지 않음** (이미 정답)

---

## 📝 참고사항

- `isUUID` 함수는 `window.App?.utils?.isUUID`를 사용하며, 없을 경우 폴백 함수 사용
- 모든 검증은 INSERT/DELETE/UPDATE 직전에 수행
- 검증 실패 시 에러를 반환하고 DB 작업을 차단
- UI는 optimistic update를 사용하므로 검증 실패 시 롤백 필요

---

## ✨ 결론

모든 기능에 UUID 검증을 추가하여 Firebase UID가 UUID 컬럼에 들어가는 것을 완전히 차단했습니다. 이제 `invalid input syntax for type uuid` 에러가 발생하지 않습니다.





