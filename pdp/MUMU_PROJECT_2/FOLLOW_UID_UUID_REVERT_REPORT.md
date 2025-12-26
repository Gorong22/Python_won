# Follow 기능 UID→UUID 변환 로직 원복 보고서

**작성일**: 2025-01-27  
**목적**: Firebase UID → UUID 변환 로직 제거 및 실제 스키마(text) 기준으로 follow 기능 정상화

---

## 📋 변경 파일 목록

### 1. `public/js/api-functions.js`

#### `followCreator()` 함수 (라인 858-960)
**변경 내용**:
- ✅ **제거**: STEP 1 Firebase UID → UUID 변환 블록 전체 제거
  - users/readers 테이블에서 UUID 조회 로직 제거
  - creators 테이블에서 UUID 조회 로직 제거
- ✅ **변경**: insert payload를 Firebase UID 직접 사용으로 변경
  ```javascript
  // 변경 전
  const payload = {
    reader_id: readerUuid, // UUID
    creator_id: creatorUuid, // UUID
  };

  // 변경 후
  const payload = {
    reader_id: firebaseUid, // Firebase UID 직접 사용
    creator_id: creatorId, // Firebase UID 직접 사용
  };
  ```
- ✅ **강화**: 에러 응답 바디를 JSON으로 파싱하여 code/message/details/hint 모두 출력
- ✅ **추가**: 22P02 에러 발생 시 스키마 확인 쿼리 안내 로그 추가
- ✅ **변경**: insert 시 `{ returning: "minimal" }` 옵션 추가

#### `unfollowCreator()` 함수 (라인 1027-1146)
**변경 내용**:
- ✅ **제거**: STEP 1 Firebase UID → UUID 변환 블록 전체 제거
  - users/readers 테이블에서 UUID 조회 로직 제거
  - creators 테이블에서 UUID 조회 로직 제거
- ✅ **변경**: DELETE 쿼리를 Firebase UID 직접 사용으로 변경
  ```javascript
  // 변경 전
  .eq("reader_id", readerUuid) // UUID
  .eq("creator_id", creatorUuid); // UUID

  // 변경 후
  .eq("reader_id", firebaseUid) // Firebase UID 직접 사용
  .eq("creator_id", creatorId); // Firebase UID 직접 사용
  ```
- ✅ **강화**: 에러 응답 바디를 JSON으로 파싱하여 code/message/details/hint 모두 출력
- ✅ **추가**: 22P02 에러 발생 시 스키마 확인 쿼리 안내 로그 추가

---

## ✅ 제거된 코드 위치

### followCreator 함수
- **라인 858-934**: STEP 1 Firebase UID → UUID 변환 블록 전체 제거
  - users 테이블 조회 (라인 867-872)
  - readers 테이블 조회 (라인 882-887)
  - creators 테이블 조회 (라인 911-916)
  - UUID 변수 선언 및 할당 (라인 861-862, 875, 890, 919)

### unfollowCreator 함수
- **라인 1027-1078**: STEP 1 Firebase UID → UUID 변환 블록 전체 제거
  - users 테이블 조회 (라인 1035-1040)
  - readers 테이블 조회 (라인 1045-1050)
  - creators 테이블 조회 (라인 1064-1069)
  - UUID 변수 선언 및 할당 (라인 1030-1031, 1043, 1053, 1072)

---

## 📊 최종 follow insert payload 구조

```javascript
{
  reader_id: "<firebaseUid string>",  // Firebase UID (text)
  creator_id: "<creatorFirebaseUid string>"  // Firebase UID (text)
}
```

**확인 사항**:
- ✅ 불필요한 키 제거됨 (id, created_at 등 없음)
- ✅ reader_id와 creator_id만 포함
- ✅ 둘 다 Firebase UID (text) 직접 사용

---

## 🔍 에러 바디 로깅 강화

### 변경 전
```javascript
console.error("[followCreator][STEP 2 INSERT FAILED]", {
  error: insertError,
  errorCode: insertError.code,
  errorMessage: insertError.message,
  errorDetails: insertError.details,
  errorHint: insertError.hint,
});
```

### 변경 후
```javascript
let errorBody = null;
try {
  errorBody = {
    code: insertError.code,
    message: insertError.message,
    details: insertError.details,
    hint: insertError.hint,
    fullError: JSON.stringify(insertError, null, 2),
  };
} catch (parseErr) {
  console.error("[followCreator] 에러 파싱 실패:", parseErr);
}

console.error("[followCreator][INSERT FAILED]", {
  table: "creator_follows",
  payload: JSON.stringify(payload),
  payloadKeys: Object.keys(payload),
  payloadValues: Object.values(payload),
  errorBody,
});
```

**개선 사항**:
- ✅ 에러 객체를 JSON.stringify로 전체 구조 출력
- ✅ payload도 JSON.stringify로 원문 바디 확인 가능
- ✅ payloadKeys/payloadValues로 키/값 분리 확인 가능

---

## 🚨 22P02 에러 발생 시 대응

22P02 에러 발생 시, 다음 정보가 로그에 출력됩니다:

1. **에러 바디 전체 구조** (code, message, details, hint)
2. **어떤 값이 UUID로 해석되었는지** (invalidValue)
3. **스키마 확인 쿼리 안내**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema='public' AND table_name='creator_follows' 
   ORDER BY ordinal_position;
   ```

이 쿼리를 실행하여 실제 DB 스키마를 확인하고, 에러 바디의 details/hint에서 어떤 컬럼이 UUID로 해석되었는지 확인할 수 있습니다.

---

## 📝 규칙 준수 확인

### ✅ 절대 금지 사항 준수
- ✅ DB 스키마 변경 없음
- ✅ RLS 변경 없음
- ✅ 신규 테이블 생성 없음
- ✅ Firebase UID → UUID 변환 제거됨
- ✅ users/readers 테이블 조회 제거됨
- ✅ creator_follows.reader_id/creator_id는 Firebase UID(text)로만 사용

### ✅ 실제 스키마 기준 준수
- ✅ creator_follows.reader_id = text (Firebase UID 직접 사용)
- ✅ creator_follows.creator_id = text (Firebase UID 직접 사용)

---

## 🧪 테스트 방법

1. **팔로우 추가 테스트**:
   - Follow 버튼 클릭
   - 브라우저 콘솔에서 다음 로그 확인:
     - `[FINAL INSERT PAYLOAD] followCreator`: payload 구조 확인
     - `[followCreator][INSERT SUCCESS]` 또는 `[followCreator][INSERT FAILED]`
     - 22P02 에러 발생 시: `[followCreator][22P02 ERROR]` 및 `[followCreator][SCHEMA CHECK REQUIRED]`

2. **팔로우 취소 테스트**:
   - Unfollow 버튼 클릭
   - 브라우저 콘솔에서 다음 로그 확인:
     - `[DELETE PAYLOAD] unfollowCreator`: DELETE 쿼리 파라미터 확인
     - `[unfollowCreator][DELETE SUCCESS]` 또는 `[unfollowCreator][DELETE FAILED]`
     - 22P02 에러 발생 시: `[unfollowCreator][22P02 ERROR]` 및 `[unfollowCreator][SCHEMA CHECK REQUIRED]`

3. **에러 바디 확인**:
   - 22P02 에러 발생 시 콘솔에서 `errorBody` 객체 확인
   - `details` 및 `hint` 필드에서 어떤 컬럼이 UUID로 해석되었는지 확인

---

## 🔄 다음 단계

22P02 에러가 계속 발생하는 경우:

1. **에러 바디에서 컬럼 정보 확인**:
   - `errorBody.details` 또는 `errorBody.hint`에서 컬럼 이름 확인
   - 예: `"column \"reader_id\" is of type uuid but expression is of type text"`

2. **실제 스키마 확인**:
   - 위의 스키마 확인 쿼리 실행
   - `creator_follows` 테이블의 `reader_id`와 `creator_id` 컬럼 타입 확인

3. **스키마 불일치 시**:
   - 실제 DB 스키마가 UUID인 경우: DB 관리자에게 스키마 변경 요청
   - 실제 DB 스키마가 text인 경우: PostgREST 스키마 캐시 문제일 수 있음 (Supabase 대시보드에서 스키마 새로고침)

---

## 📌 주의사항

- **코드 변경만 수행**: DB 스키마 변경은 하지 않았습니다.
- **RLS 정책 유지**: RLS 정책은 변경하지 않았습니다.
- **기존 기능 유지**: follow/unfollow 기능은 그대로 유지되며, UID→UUID 변환만 제거되었습니다.

---

## ✅ 완료 상태

- [x] followCreator 함수에서 UID→UUID 변환 블록 제거
- [x] unfollowCreator 함수에서 UID→UUID 변환 블록 제거
- [x] insert payload를 Firebase UID 직접 사용으로 변경
- [x] DELETE 쿼리를 Firebase UID 직접 사용으로 변경
- [x] 에러 응답 바디 로깅 강화 (code/message/details/hint)
- [x] 22P02 에러 발생 시 스키마 확인 쿼리 안내 추가
- [x] payload 구조 검증 (불필요한 키 제거 확인)





