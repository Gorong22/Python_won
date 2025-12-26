# Follow 함수 Firebase UID 검증 강화 보고서

**작성일**: 2025-01-27  
**목적**: `feed-stat-interaction.js`의 `toggleCreatorFollow` 함수에 Firebase UID 검증 추가

---

## 🔍 발견된 문제

### 1. 잘못된 주석
- `feed-stat-interaction.js:2782`: `// ⚠️ STEP 2: UUID 차단 로직 제거 (currentCreatorId는 UUID일 수 있음)`
- **문제**: `currentCreatorId`는 항상 Firebase UID입니다. UUID가 아닙니다.
- **영향**: 개발자가 혼동할 수 있는 잘못된 가정

### 2. Firebase UID 검증 누락
- `feed-stat-interaction.js:2834`: `creatorId: currentCreatorId` 전달 전에 검증 없음
- **문제**: `currentCreatorId`가 Firebase UID 형식인지 검증하지 않음
- **영향**: 잘못된 값이 전달될 경우 22P02 에러 발생 가능

---

## ✅ 수정 내용

### 1. `toggleCreatorFollow()` 함수 수정

#### 추가된 검증 로직:
```javascript
// Firebase UID 검증 함수 가져오기
const isFirebaseUID = window.App?.utils?.isFirebaseUID || ...
const isUUID = window.App?.utils?.isUUID || ...

// currentCreatorId가 Firebase UID인지 검증
if (!isFirebaseUID(currentCreatorId)) {
  console.error("[FOLLOW][VALIDATION ERROR]", {
    currentCreatorId,
    isUUID: isUUID(currentCreatorId),
    isFirebaseUID: isFirebaseUID(currentCreatorId),
    message: "currentCreatorId가 Firebase UID 형식이 아닙니다."
  });
  showToast("작가 정보가 올바르지 않습니다.");
  return;
}

// 현재 사용자 UID도 Firebase UID인지 검증
if (!isFirebaseUID(firebaseUid)) {
  console.error("[FOLLOW][VALIDATION ERROR]", {
    firebaseUid,
    message: "현재 사용자 UID가 Firebase UID 형식이 아닙니다."
  });
  showToast("로그인 정보가 올바르지 않습니다.");
  return;
}
```

#### 추가된 로깅:
```javascript
console.log("[FOLLOW][CALL API] __toggleCreatorFollowAPI 호출", {
  creatorId: currentCreatorId,
  readerId: firebaseUid,
  isCreatorIdFirebaseUID: isFirebaseUID(currentCreatorId),
  isReaderIdFirebaseUID: isFirebaseUID(firebaseUid),
});
```

#### 22P02 에러 특별 처리:
```javascript
if (error.message && error.message.includes('invalid input syntax for type uuid')) {
  const uuidMatch = error.message.match(/invalid input syntax for type uuid: "([^"]+)"/);
  const invalidValue = uuidMatch ? uuidMatch[1] : 'unknown';
  console.error("[FOLLOW][22P02 ERROR]", {
    table: "creator_follows",
    invalidValue,
    currentCreatorId,
    firebaseUid,
    message: `Firebase UID "${invalidValue}"가 creator_follows 테이블의 UUID 컬럼에 들어간 것으로 추정됩니다.`,
  });
  showToast("팔로우 처리 중 오류가 발생했습니다. (타입 오류)");
}
```

### 2. `goToCreatorFeed()` 함수 수정
- 잘못된 주석 제거
- 올바른 주석 추가: `// currentCreatorId는 Firebase UID (text)`

---

## 📊 변경 파일 목록

### `public/js/feed-stat-interaction.js`
- `toggleCreatorFollow()` 함수: Firebase UID 검증 추가
- `goToCreatorFeed()` 함수: 주석 수정

---

## 🔍 검증 흐름

1. **currentCreatorId 검증**
   - Firebase UID 형식인지 확인
   - UUID가 아닌지 확인
   - 검증 실패 시 에러 로그 및 사용자 알림

2. **firebaseUid 검증**
   - 현재 사용자 UID가 Firebase UID 형식인지 확인
   - 검증 실패 시 에러 로그 및 사용자 알림

3. **API 호출 전 로깅**
   - 전달되는 값과 검증 결과 로깅

4. **에러 처리**
   - 22P02 에러 특별 처리
   - 에러 발생 시 상세 로그 출력

---

## ✅ 해결된 문제

1. **잘못된 가정 제거**: UUID 관련 잘못된 주석 제거
2. **타입 안전성 강화**: Firebase UID 검증 추가로 잘못된 값 전달 방지
3. **에러 추적 개선**: 상세한 로깅으로 디버깅 용이

---

## 🧪 테스트 방법

1. Follow 버튼 클릭
2. 브라우저 콘솔에서 다음 로그 확인:
   - `[FOLLOW][DEBUG]`: 버튼 클릭 정보
   - `[FOLLOW][VALIDATION ERROR]`: 검증 실패 시 (잘못된 값 전달 시)
   - `[FOLLOW][CALL API]`: API 호출 전 검증 결과
   - `[FOLLOW][22P02 ERROR]`: 22P02 에러 발생 시 (잘못된 타입 전달 시)

---

## 📝 주의사항

- **currentCreatorId는 항상 Firebase UID**: `feed.js`에서 `creator_id`는 Firebase UID로 설정됨
- **creator_follows 테이블**: `reader_id`와 `creator_id` 모두 Firebase UID (text) 타입
- **UUID 변환 금지**: Firebase UID를 UUID로 변환하지 않음





