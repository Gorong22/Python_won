# MUMU 독자(Reader) Firebase 구현 가이드

본 문서는 MUMU 웹툰 서비스의 독자 기능을 위한 Firebase 구현 명세서입니다.

---

## 목차

1. [Firestore 컬렉션 구조](#1-firestore-컬렉션-구조)
2. [회원가입 → 온보딩 → 저장 전체 흐름](#2-회원가입--온보딩--저장-전체-흐름)
3. [KST 시간 생성 유틸 함수](#3-kst-시간-생성-유틸-함수)
4. [session_id 생성/관리 예시 코드](#4-session_id-생성관리-예시-코드)
5. [Firestore Security Rules](#5-firestore-security-rules)

---

## 1. Firestore 컬렉션 구조

### 1.1 readers 컬렉션

**경로**: `readers/{uid}` (docId = uid)

```javascript
{
  uid: string,                          // 사용자 UID (Firebase Auth uid)
  username: string,                     // 로그인 사용자명
  email: string,                        // 이메일
  name: string,                         // 이름 (실명)
  nickname: string,                     // 닉네임
  birth: {                              // 생년월일
    year: number,                       // 연도
    month: number,                      // 월 (1-12)
    day: number                         // 일 (1-31)
  },
  gender: "male" | "female",            // 성별
  status: "active" | "blocked",         // 계정 상태
  created_at: serverTimestamp,          // 생성 시간 (Firestore 서버 시간)
  created_at_kst: string,               // 생성 시간 KST ("YYYY-MM-DD HH:mm:ss")
  last_login_at: serverTimestamp,       // 마지막 로그인 시간
  onboarding_completed: boolean         // 온보딩 완료 여부
}
```

### 1.2 reader_consents 컬렉션

**경로**: `reader_consents/{uid}` (docId = uid)

```javascript
{
  uid: string,                          // 사용자 UID
  terms_of_service: boolean,            // 이용약관 동의
  privacy_policy: boolean,              // 개인정보 처리방침 동의
  marketing_opt_in: boolean,            // 마케팅 정보 수신 동의 (선택)
  agreed_at: serverTimestamp,           // 동의 시간 (Firestore 서버 시간)
  agreed_at_kst: string                 // 동의 시간 KST ("YYYY-MM-DD HH:mm:ss")
}
```

### 1.3 reader_onboarding 컬렉션

**경로**: `reader_onboarding/{uid}` (docId = uid)

```javascript
{
  uid: string,                          // 사용자 UID
  preferred_genres: string[],           // 선호 장르 배열
  preferred_tags: string[],             // 선호 태그 배열
  completed: boolean,                   // 온보딩 완료 여부
  completed_at: serverTimestamp,        // 완료 시간 (Firestore 서버 시간)
  completed_at_kst: string,             // 완료 시간 KST ("YYYY-MM-DD HH:mm:ss")
  duration_ms: number                   // 온보딩 완료까지 걸린 시간 (밀리초)
}
```

### 1.4 이벤트 컬렉션들

다음 이벤트 컬렉션들은 모두 동일한 공통 필드를 가집니다:

- `feed_events`
- `work_view_events`
- `work_like_events`
- `comment_events`
- `cut_save_events`
- `moodboard_edit_events`
- `follow_events`
- `search_events`
- `reports`

**공통 필드 구조**:

```javascript
{
  uid: string,                          // 사용자 UID
  event_type: string,                   // 이벤트 타입
  created_at: serverTimestamp,          // 생성 시간 (Firestore 서버 시간)
  created_at_kst: string,               // 생성 시간 KST ("YYYY-MM-DD HH:mm:ss")
  created_date_kst: string,             // 생성 날짜 KST ("YYYY-MM-DD")
  created_hour_kst: number,             // 생성 시간대 KST (0~23)
  session_id: string,                   // 세션 ID (UUID)
  duration_ms: number                   // 이벤트 지속 시간 (선택사항, 밀리초)
  // ... 추가 이벤트별 필드들
}
```

---

## 2. 회원가입 → 온보딩 → 저장 전체 흐름

### 2.1 전체 플로우 다이어그램

```
[약관 동의] 
    ↓
[정보 입력] → username, email, password, name, nickname, birth, gender
    ↓
[Firebase Auth 계정 생성] → username을 email 형식으로 변환하여 저장
    ↓
[Firestore readers 문서 생성]
    ↓
[Firestore reader_consents 문서 생성]
    ↓
[온보딩 페이지 이동]
    ↓
[취향 태그 선택] → preferred_genres, preferred_tags
    ↓
[Firestore reader_onboarding 문서 생성]
    ↓
[readers.onboarding_completed = true 업데이트]
    ↓
[회원가입 완료]
```

### 2.2 단계별 상세 설명

#### Step 1: 약관 동의 (`reader_signup_terms.html`)

1. 사용자가 다음 약관에 동의:
   - 이용약관 (필수)
   - 개인정보 처리방침 (필수)
   - 마케팅 정보 수신 동의 (선택)

2. 동의 정보를 `sessionStorage`에 저장:
   ```javascript
   sessionStorage.setItem("readerAgreements", JSON.stringify({
     terms: true,
     privacy: true,
     marketing: false
   }));
   ```

#### Step 2: 정보 입력 (`reader_signup_account.html`)

1. 사용자가 다음 정보를 입력:
   - username (3-20자, 영문/숫자/언더스코어)
   - email
   - password (최소 6자)
   - name (실명)
   - nickname
   - birth (year, month, day)
   - gender ("male" | "female")

2. **Firebase Auth 계정 생성**:
   ```javascript
   // username을 email 형식으로 변환: username@mumu.app
   const userCredential = await window.firebaseAuth.createUserWithUsername(username, password);
   const uid = userCredential.user.uid;
   ```

3. **Firestore readers 문서 생성**:
   ```javascript
   await window.firestoreUtils.createReader(uid, {
     username: username,
     email: email,
     name: name,
     nickname: nickname,
     birth: { year, month, day },
     gender: gender
   });
   ```

4. **Firestore reader_consents 문서 생성**:
   ```javascript
   const agreements = JSON.parse(sessionStorage.getItem("readerAgreements"));
   await window.firestoreUtils.createReaderConsent(uid, {
     terms_of_service: agreements.terms,
     privacy_policy: agreements.privacy,
     marketing_opt_in: agreements.marketing || false
   });
   ```

5. 온보딩 페이지로 이동:
   ```javascript
   sessionStorage.setItem("readerSignupUid", uid);
   window.location.href = "onboarding_reader.html";
   ```

#### Step 3: 온보딩 (`onboarding_reader.html`)

1. 온보딩 시작 시간 기록:
   ```javascript
   const onboardingStartTime = Date.now();
   ```

2. 사용자가 선호 장르와 태그 선택:
   - preferred_genres: 장르 배열
   - preferred_tags: 취향 태그 배열

3. **Firestore reader_onboarding 문서 생성**:
   ```javascript
   const durationMs = Date.now() - onboardingStartTime;
   await window.firestoreUtils.createReaderOnboarding(uid, {
     preferred_genres: selectedGenres,
     preferred_tags: selectedTags,
     duration_ms: durationMs
   });
   ```

4. **readers 컬렉션의 onboarding_completed 업데이트**:
   ```javascript
   // createReaderOnboarding 함수 내부에서 자동 처리됨
   await updateReader(uid, { onboarding_completed: true });
   ```

5. 회원가입 완료 → 홈 페이지로 이동

---

## 3. KST 시간 생성 유틸 함수

**파일**: `public/js/datetime-utils.js`

### 3.1 주요 함수

#### `getKSTDateTimeString()`

KST 기준 현재 시간을 "YYYY-MM-DD HH:mm:ss" 형식 문자열로 반환합니다.

```javascript
// 사용 예시
const kstTime = window.datetimeUtils.getKSTDateTimeString();
// 반환값: "2024-01-15 14:30:45"
```

#### `getKSTDateString()`

KST 기준 현재 날짜를 "YYYY-MM-DD" 형식 문자열로 반환합니다.

```javascript
// 사용 예시
const kstDate = window.datetimeUtils.getKSTDateString();
// 반환값: "2024-01-15"
```

#### `getKSTHour()`

KST 기준 현재 시간의 시간대(0~23)를 반환합니다.

```javascript
// 사용 예시
const hour = window.datetimeUtils.getKSTHour();
// 반환값: 14 (오후 2시)
```

### 3.2 전체 코드 예시

```javascript
// KST 시간 문자열 생성
const createdAtKst = window.datetimeUtils.getKSTDateTimeString();
const createdDateKst = window.datetimeUtils.getKSTDateString();
const createdHourKst = window.datetimeUtils.getKSTHour();

// Firestore 문서에 저장
await firestore.collection('readers').doc(uid).set({
  created_at: firebase.firestore.FieldValue.serverTimestamp(),
  created_at_kst: createdAtKst,
  // ...
});
```

---

## 4. session_id 생성/관리 예시 코드

**파일**: `public/js/datetime-utils.js`

### 4.1 session_id 규칙

- 앱 진입 시 UUID v4 형식으로 생성
- 30분 이상 비활성 상태가 지속되면 새로운 session_id 생성
- localStorage에 저장하여 페이지 새로고침 시에도 유지

### 4.2 주요 함수

#### `getCurrentSessionId()`

현재 세션 ID를 가져옵니다. 필요 시 새로 생성합니다.

```javascript
// 사용 예시
const sessionId = window.datetimeUtils.getCurrentSessionId();
// 반환값: "550e8400-e29b-41d4-a716-446655440000"
```

#### `createEventCommonFields(uid, eventType, durationMs)`

이벤트 컬렉션에 사용할 공통 필드를 생성합니다.

```javascript
// 사용 예시
const eventFields = window.datetimeUtils.createEventCommonFields(
  "user123",
  "feed_view",
  5000  // 5초 (선택사항)
);

// 반환값:
// {
//   uid: "user123",
//   event_type: "feed_view",
//   created_at_kst: "2024-01-15 14:30:45",
//   created_date_kst: "2024-01-15",
//   created_hour_kst: 14,
//   session_id: "550e8400-e29b-41d4-a716-446655440000",
//   duration_ms: 5000
// }
```

### 4.3 이벤트 저장 예시

```javascript
// 이벤트 저장
const eventData = {
  uid: "user123",
  event_type: "feed_view",
  duration_ms: 5000,
  feed_id: "feed456",
  // ... 추가 필드들
};

await window.firestoreUtils.addEvent("feed_events", eventData);
```

### 4.4 세션 관리 자동화

`datetime-utils.js`는 페이지 로드 시 자동으로 세션을 초기화하고, 사용자 활동(마우스 이동, 키 입력 등)을 추적하여 세션을 유지합니다.

---

## 5. Firestore Security Rules

**파일**: `firestore.rules`

### 5.1 주요 규칙

#### readers 컬렉션

- **읽기**: 본인 문서만 읽기 가능
- **쓰기**: 본인 문서만 생성/수정 가능
- **삭제**: 비활성화

```javascript
match /readers/{uid} {
  allow read: if request.auth.uid == uid;
  allow create: if request.auth.uid == uid;
  allow update: if request.auth.uid == uid;
  allow delete: if false;
}
```

#### reader_consents 컬렉션

- **읽기**: 본인 문서만 읽기 가능
- **생성**: 본인 문서만 생성 가능
- **수정/삭제**: 비활성화 (약관 동의는 수정 불가)

```javascript
match /reader_consents/{uid} {
  allow read: if request.auth.uid == uid;
  allow create: if request.auth.uid == uid;
  allow update: if false;
  allow delete: if false;
}
```

#### reader_onboarding 컬렉션

- **읽기**: 본인 문서만 읽기 가능
- **생성**: 본인 문서만 생성 가능
- **수정/삭제**: 비활성화 (온보딩 정보는 수정 불가)

```javascript
match /reader_onboarding/{uid} {
  allow read: if request.auth.uid == uid;
  allow create: if request.auth.uid == uid;
  allow update: if false;
  allow delete: if false;
}
```

#### 이벤트 컬렉션들

- **읽기**: 다른 사용자의 이벤트 읽기 불가
- **쓰기**: 로그인한 사용자만 본인 UID로 이벤트 생성 가능

```javascript
match /feed_events/{eventId} {
  allow read: if false;
  allow write: if request.auth != null && 
                 request.resource.data.uid == request.auth.uid;
}
```

### 5.2 Rules 배포

Firebase CLI를 사용하여 Rules를 배포합니다:

```bash
firebase deploy --only firestore:rules
```

---

## 6. 파일 구조

```
MUMU_project_2/
├── firebase/
│   ├── firebase.js          # Firebase 초기화
│   ├── auth.js              # Firebase Auth 유틸 함수
│   └── firestore.js         # Firestore 유틸 함수
├── public/
│   ├── js/
│   │   ├── config.js        # Firebase/Supabase 설정
│   │   └── datetime-utils.js # KST 시간 및 session_id 관리
│   ├── reader_signup_terms.html    # 약관 동의 페이지
│   ├── reader_signup_account.html  # 정보 입력 페이지
│   └── onboarding_reader.html      # 온보딩 페이지
└── firestore.rules          # Firestore Security Rules
```

---

## 7. 주요 주의사항

### 7.1 비밀번호 보안

⚠️ **비밀번호는 Firebase Auth에만 저장되며, Firestore에는 절대 저장하지 않습니다.**

### 7.2 Username 변환

- 로그인 식별자는 `username`입니다.
- Firebase Auth에는 `username@mumu.app` 형식으로 변환하여 저장합니다.
- 이 변환은 `firebase/auth.js`의 `usernameToEmail()` 함수에서 처리됩니다.

### 7.3 시간 필드

- `created_at`: Firestore `serverTimestamp()` 사용 (서버 시간 기준)
- `created_at_kst`: 프론트엔드에서 생성한 KST 시간 문자열
- 두 필드를 모두 저장하여 서버 시간과 로컬 시간을 모두 추적합니다.

### 7.4 세션 관리

- 세션 ID는 UUID v4 형식입니다.
- 30분 비활성 상태 시 새로운 세션 ID가 생성됩니다.
- 사용자 활동은 자동으로 추적됩니다.

---

## 8. 참고 사항

- 모든 컬렉션과 필드는 노션 명세와 1:1로 대응됩니다.
- 명세를 임의로 변경하거나 단순화하지 않았습니다.
- 독자(reader) 기능만 구현되었으며, 창작자(creator) 기능은 별도로 구현됩니다.

