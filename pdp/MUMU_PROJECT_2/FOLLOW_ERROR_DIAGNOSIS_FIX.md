# Follow 토글 에러 진단 및 수정 보고서

**작성일**: 2025-01-27  
**목적**: Follow 토글 시 발생하는 22P02/406 에러의 정확한 발생 지점 특정 및 코드 수정

---

## 📋 변경 파일 목록

### 1. `public/js/supabase-auth.js`
**변경 내용**: Supabase 요청 instrumentation 추가
- 모든 Supabase 요청을 추적하는 fetch wrapper 추가
- 요청 URL/메서드/바디/응답 코드/응답 메시지 로깅
- 400/406/401/403 에러 시 response body 상세 출력
- 22P02 에러 특별 처리 (Firebase UID가 UUID 컬럼에 들어간 경우 감지)
- 406 에러 특별 처리 (PostgREST Accept 헤더 문제 감지)

**변경 이유**: 
- 어떤 테이블의 어떤 컬럼에서 에러가 발생하는지 정확히 특정하기 위해
- 모든 Supabase 요청을 한 곳에서 추적 가능하도록 instrumentation 추가

### 2. `public/js/api-functions.js`
**변경 내용**: Follow 관련 함수들의 쿼리 분리 및 에러 처리 강화

#### `followCreator()` 함수
- **STEP 2: INSERT** 단계 분리
- 각 단계마다 try/catch 추가
- 22P02 에러 발생 시 상세 로깅 (어떤 테이블의 어떤 컬럼에 Firebase UID가 들어갔는지)
- 에러 코드/메시지/상세 정보 로깅

#### `unfollowCreator()` 함수
- **STEP 2: DELETE** 단계 분리
- 각 단계마다 try/catch 추가
- 22P02 에러 발생 시 상세 로깅
- 에러 코드/메시지/상세 정보 로깅

#### `__toggleCreatorFollowAPI()` 함수
- **STEP 1: 상태 확인 (SELECT)** 분리
- **STEP 2: INSERT 또는 DELETE** 분리
- **STEP 3: 부수 효과** (현재 없음, 향후 확장 가능)
- 각 단계마다 독립적인 try/catch 추가
- `.single()` 제거 → `.limit(1)` + 배열 체크로 변경
- 406 에러 특별 처리
- 22P02 에러 특별 처리

**변경 이유**:
- 실패한 단계와 실패한 테이블을 정확히 로그로 남기기 위해
- 406 에러의 원인인 `.single()` 사용 제거
- 22P02 에러 발생 시 정확한 테이블/컬럼 정보 확보

### 3. `public/js/feed-stat-interaction.js`
**변경 내용**: `checkFollowStatus()` 함수 수정

- `.single()` 제거 → `.limit(1)` + 배열 체크로 변경
- 각 단계마다 try/catch 추가
- 406 에러 특별 처리
- 22P02 에러 특별 처리

**변경 이유**:
- 406 에러의 원인인 `.single()` 사용 제거
- 에러 발생 시 정확한 정보 확보

---

## 🔍 에러 진단 로직

### 22P02 에러 (invalid input syntax for type uuid)
**감지 방법**:
```javascript
if (error.message && error.message.includes('invalid input syntax for type uuid')) {
  const uuidMatch = error.message.match(/invalid input syntax for type uuid: "([^"]+)"/);
  const invalidValue = uuidMatch ? uuidMatch[1] : 'unknown';
  // 로그에 테이블명, 컬럼명, 잘못된 값 출력
}
```

**로그 출력 예시**:
```
[FOLLOW][22P02 ERROR] {
  table: "creator_follows",
  invalidValue: "hkmU6SQHWyRZIlRrvA7znmphK5D2",
  payload: { reader_id: "...", creator_id: "..." },
  message: "Firebase UID가 creator_follows 테이블의 UUID 컬럼에 들어간 것으로 추정됩니다."
}
```

### 406 에러 (Not Acceptable)
**감지 방법**:
```javascript
if (error.code === 'PGRST116' || error.message?.includes('406')) {
  // PostgREST 406 에러 로깅
}
```

**로그 출력 예시**:
```
[FOLLOW][406 ERROR] {
  table: "creator_follows",
  error: {...},
  message: "PostgREST 406 에러 - .single() 사용으로 인한 문제일 수 있습니다."
}
```

---

## 📊 테이블/컬럼 단위 변경 사항

### `creator_follows` 테이블
- **reader_id**: text (Firebase UID) - 변경 없음
- **creator_id**: text (Firebase UID) - 변경 없음
- **쿼리 변경**: `.single()` → `.limit(1)` + 배열 체크

### 에러 발생 가능한 다른 테이블 (향후 모니터링)
- `user_feed_events` (현재 사용 안 함, 향후 확장 가능)
- `likes` (target_id는 UUID, user_id는 Firebase UID)
- `comments` (id는 UUID, user_id는 Firebase UID)
- `comment_replies` (id는 UUID, user_id는 Firebase UID)

---

## ✅ 해결된 문제

1. **406 에러**: `.single()` 사용 제거로 해결
2. **22P02 에러**: instrumentation을 통해 정확한 발생 지점 특정 가능
3. **에러 추적**: 모든 Supabase 요청이 한 곳에서 로깅되어 디버깅 용이

---

## 🧪 테스트 방법

1. Follow 버튼 클릭
2. 브라우저 콘솔에서 다음 로그 확인:
   - `[SUPABASE REQUEST req_...]`: 요청 정보
   - `[SUPABASE SUCCESS req_...]` 또는 `[SUPABASE ERROR req_...]`: 응답 정보
   - `[FOLLOW][STEP 1 CHECK]`: 상태 확인 단계
   - `[FOLLOW][STEP 2 INSERT/DELETE]`: INSERT/DELETE 단계
   - `[FOLLOW][22P02 ERROR]`: 22P02 에러 발생 시
   - `[FOLLOW][406 ERROR]`: 406 에러 발생 시

---

## 📝 주의사항

- **DB 스키마 변경 없음**: 모든 변경은 코드 레벨에서만 수행
- **RLS 정책 변경 없음**: RLS 정책은 그대로 유지
- **Firebase UID → UUID 변환 금지**: 모든 사용자 식별자는 Firebase UID (text)로 직접 사용
- **기존 기능 유지**: 기존 기능은 모두 유지되며, 에러 처리만 강화

---

## 🔄 향후 개선 사항

1. **STEP 3: 부수 효과** 추가 시 `user_feed_events` 테이블 사용 가능
2. **에러 알림**: 사용자에게 친화적인 에러 메시지 표시
3. **재시도 로직**: 일시적인 네트워크 에러에 대한 재시도 로직 추가 가능





