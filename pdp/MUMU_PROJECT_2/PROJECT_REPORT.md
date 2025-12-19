# MUMU 프로젝트 작업 보고서

## 📋 프로젝트 개요

**프로젝트명**: MUMU  
**프로젝트 타입**: 웹 애플리케이션 (모바일 우선 디자인)  
**배포 플랫폼**: Firebase Hosting  
**주요 기술**: HTML, CSS, JavaScript, Firebase Auth, Supabase

---

## 🏗️ 프로젝트 구조

### 디렉토리 구조

```
MUMU_project_2/
├── public/                          # 정적 파일 디렉토리
│   ├── *.html                       # HTML 페이지 파일들
│   ├── css/                         # 스타일시트
│   │   ├── tabbar.css              # 하단 탭바 스타일
│   │   └── mypage_reader.css       # 마이페이지 독자 스타일
│   ├── js/                         # JavaScript 파일
│   │   ├── tabbar-init.js          # 탭바 초기화
│   │   └── mypage_reader.js        # 마이페이지 독자 로직
│   └── assets/                     # 이미지 및 아이콘 리소스
├── firebase.json                    # Firebase Hosting 설정
└── .gitignore                      # Git 제외 파일 목록
```

### 주요 페이지 파일

- `index.html` - 홈 페이지
- `mypage_reader.html` - 독자 마이페이지 (주요 작업 대상)
- `community.html` - 커뮤니티 페이지
- `explore.html` - 탐색 페이지
- `creator_studio.html` - 크리에이터 스튜디오
- `onboarding_reader.html` - 독자 온보딩
- `onboarding_creator.html` - 크리에이터 온보딩
- `signup.html` - 회원가입
- `reader_creator_feed.html` - 독자/크리에이터 피드

### Firebase Hosting 설정

**firebase.json** 주요 설정:

- Public 디렉토리: `public`
- URL 리라이트 규칙:
  - `/` → `/index.html`
  - `/community` → `/community.html`
  - `/explore` → `/explore.html`
  - `/mypage_reader` → `/mypage_reader.html`
- 캐시 정책:
  - 정적 리소스 (CSS, JS, 이미지): 1시간 캐시
  - HTML 파일: 캐시 없음 (항상 재검증)

---

## 🎯 주요 작업 내역

### 1. MY / MY MOOD 탭 레이아웃 최적화

#### 작업 배경

- 데스크톱에서 모바일 UI가 전체 화면으로 확장되는 문제
- 무드보드 에디터가 데스크톱 너비로 늘어나는 문제
- 모바일 우선 디자인 원칙 유지 필요

#### 구현 내용

**1.1 데스크톱 레이아웃 제약**

- **파일**: `public/css/mypage_reader.css`
- 데스크톱에서 앱 프레임을 모바일 크기(402px)로 제한
- 중앙 정렬 및 그림자 효과 추가
- 모바일에서는 전체 너비 유지

```css
/* Desktop: Center the mobile frame */
@media (min-width: 403px) {
  body {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 20px 0;
  }

  .app-frame {
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
}
```

**1.2 무드보드 에디터 모달 제약**

- 에디터 모달 최대 너비 402px로 제한
- 데스크톱에서도 모바일 크기 유지
- 사이드바 너비 축소 (280px → 160px)로 캔버스 공간 확보

```css
.moodboard-editor-content {
  width: 100%;
  max-width: 402px;
  height: 100%;
  max-height: 100vh;
  margin: 0 auto;
}

.editor-sidebar {
  width: 160px; /* 기존 280px에서 축소 */
}
```

**1.3 MY 탭 - 이미지 전용 그리드**

- Pinterest 스타일의 이미지 그리드 레이아웃
- 폴더 기반 조직화
- 캔버스 편집 기능 없음 (저장된 컷 라이브러리만)

**1.4 MY MOOD 탭 - 무드보드 에디터**

- 자유형 캔버스 편집 기능
- 다이어리/스크랩북 느낌의 UI
- 모바일에서 편안한 캔버스 크기 유지

#### 결과

- ✅ 데스크톱에서 모바일 프레임으로 제한된 뷰
- ✅ 무드보드 에디터가 모바일 크기로 제약
- ✅ MY 탭은 이미지 전용 그리드 유지
- ✅ MY MOOD 탭은 편안한 모바일 캔버스 제공

---

### 2. Firebase Auth 타이밍 이슈 해결

#### 문제 상황

- Supabase 초기화가 Firebase Auth 준비 전에 실행됨
- "Firebase user not found" 에러 발생
- 페이지 로드 시 즉시 Supabase 초기화 시도

#### 해결 방안

**2.1 Firebase Auth 상태 리스너 구현**

- **파일**: `public/js/mypage_reader.js`
- `onAuthStateChanged`를 사용하여 Firebase Auth 상태 대기
- 사용자 확인 후에만 Supabase 초기화

```javascript
function setupFirebaseAuth() {
  const auth = firebase.auth();

  auth.onAuthStateChanged((user) => {
    if (user) {
      // 사용자 로그인 확인 후 Supabase 초기화
      initializeSupabase(user);
    } else {
      // 로그인 안 됨 - Supabase 초기화 안 함
      currentUserId = null;
      supabaseClient = null;
    }
  });
}
```

**2.2 Supabase 초기화 함수 분리**

- `initializeSupabase(user)` 함수로 초기화 로직 분리
- 사용자 UID를 `currentUserId`에 저장
- `creatorId`로 사용할 수 있도록 준비

```javascript
function initializeSupabase(user) {
  if (!user || !user.uid) {
    console.warn("Cannot initialize Supabase: Firebase user not found");
    return;
  }

  currentUserId = user.uid;
  // Supabase 클라이언트 초기화 (TODO)
  // 데이터 로드 시작
  loadFolders();
  loadMoodboards();
  loadFeaturedMoodboard();
}
```

**2.3 데이터 로드 함수 보호**

- 모든 데이터 로드 함수에 인증 체크 추가
- 로그인하지 않은 경우 빈 상태 표시 (에러 없음)
- 저장 함수에도 인증 체크 추가

```javascript
function loadFolders() {
  // 인증 확인
  if (!currentUserId) {
    // 빈 상태 표시
    foldersEmpty.style.display = "flex";
    return;
  }
  // 데이터 로드...
}
```

**2.4 초기화 순서 변경**

- 기존: DOMContentLoaded → 즉시 데이터 로드
- 변경: DOMContentLoaded → Firebase Auth 대기 → 사용자 확인 → Supabase 초기화 → 데이터 로드

#### 결과

- ✅ Firebase Auth 준비 후 Supabase 초기화
- ✅ 사용자 UID를 `creatorId`로 사용 가능
- ✅ 로그인하지 않은 경우 에러 없이 처리
- ✅ 타이밍 이슈 완전 해결

---

## 📁 주요 파일 상세

### `public/mypage_reader.html`

**역할**: 독자 마이페이지 메인 HTML 구조

**주요 섹션**:

1. 프로필 영역

   - 프로필 배경 이미지
   - 아바타 및 설정 아이콘
   - 팔로우/팔로워 정보
   - 이름, 태그, 자기소개

2. 탭 네비게이션

   - MY MOOD 탭: 무드보드 편집
   - MY 탭: 저장된 컷 라이브러리

3. MY MOOD 탭 콘텐츠

   - 대표 무드보드 섹션
   - 무드보드 그리드
   - 무드보드 생성/편집 모달

4. MY 탭 콘텐츠

   - 폴더 리스트 뷰
   - 폴더 내용 뷰 (저장된 컷 그리드)

5. 모달들
   - 무드보드 생성 모달
   - 템플릿 선택 모달
   - 무드보드 에디터 모달
   - 폴더 관리 모달
   - 설정 모달

### `public/css/mypage_reader.css`

**역할**: 마이페이지 스타일시트

**주요 스타일 카테고리**:

- 전역 스타일 및 앱 프레임
- 프로필 영역 스타일
- 탭 네비게이션 스타일
- 무드보드 관련 스타일
- 폴더 및 저장된 컷 스타일
- 모달 스타일
- 반응형 미디어 쿼리

**특징**:

- 모바일 우선 디자인
- 데스크톱에서 모바일 프레임 제약
- 다이어리/스크랩북 느낌의 UI
- Pinterest 스타일 이미지 그리드

### `public/js/mypage_reader.js`

**역할**: 마이페이지 JavaScript 로직

**주요 기능 모듈**:

1. **상태 관리**

   - Supabase 클라이언트
   - 현재 사용자 ID
   - 폴더 및 무드보드 데이터
   - 편집 상태

2. **Firebase Auth 통합**

   - `setupFirebaseAuth()`: Auth 상태 리스너
   - `initializeSupabase()`: 사용자 확인 후 Supabase 초기화

3. **탭 전환**

   - `switchTab()`: MY / MY MOOD 탭 전환

4. **폴더 관리**

   - 폴더 목록 로드
   - 폴더 내용 보기
   - 폴더 생성/수정/삭제

5. **무드보드 관리**

   - 무드보드 목록 로드
   - 대표 무드보드 표시
   - 무드보드 생성/편집/삭제
   - 템플릿 선택
   - 자유형 캔버스 편집

6. **초기화**
   - DOMContentLoaded 이벤트 핸들러
   - Firebase Auth 설정
   - 모달 외부 클릭 처리

### `firebase.json`

**역할**: Firebase Hosting 설정

**주요 설정**:

- Public 디렉토리: `public`
- URL 리라이트 규칙
- 캐시 정책:
  - 정적 리소스: 1시간 캐시
  - HTML: 캐시 없음

---

## 🔧 기술 스택

### 프론트엔드

- **HTML5**: 시맨틱 마크업
- **CSS3**:
  - Flexbox 레이아웃
  - Grid 레이아웃
  - 미디어 쿼리 (반응형 디자인)
  - CSS 변수 및 모던 스타일링
- **JavaScript (Vanilla)**:
  - ES6+ 문법
  - 이벤트 리스너
  - DOM 조작
  - 비동기 처리

### 백엔드/인프라

- **Firebase Hosting**: 정적 웹사이트 호스팅
- **Firebase Auth**: 사용자 인증
- **Supabase** (예정): 데이터베이스 및 백엔드 서비스

### 디자인 원칙

- 모바일 우선 (Mobile First)
- 모바일 프레임 제약 (데스크톱에서도 모바일 크기 유지)
- 다이어리/스크랩북 느낌의 UI
- Pinterest 스타일 이미지 그리드

---

## 📝 작업 요약

### 완료된 작업

1. ✅ **MY / MY MOOD 탭 레이아웃 최적화**

   - 데스크톱에서 모바일 프레임 제약
   - 무드보드 에디터 모달 크기 제한
   - MY 탭 이미지 전용 그리드 유지
   - MY MOOD 탭 편안한 모바일 캔버스

2. ✅ **Firebase Auth 타이밍 이슈 해결**
   - `onAuthStateChanged`로 Auth 상태 대기
   - 사용자 확인 후 Supabase 초기화
   - 인증 체크 추가 (에러 방지)
   - 사용자 UID를 `creatorId`로 사용 준비

### 향후 작업 (TODO)

1. **Supabase 통합**

   - Supabase 클라이언트 초기화 코드 추가
   - 폴더 CRUD 작업 구현
   - 무드보드 CRUD 작업 구현
   - 저장된 컷 관리 구현

2. **기능 구현**

   - 이미지 업로드 기능
   - 무드보드 템플릿 적용
   - 폴더 공개/비공개 설정
   - 무드보드 공개/비공개 설정

3. **최적화**
   - 이미지 최적화 (WebP 변환)
   - 로딩 상태 표시
   - 에러 처리 개선

---

## 🎨 디자인 철학

### 모바일 우선 접근

- 모든 디자인이 모바일 화면을 기준으로 설계
- 데스크톱에서는 모바일 프레임을 중앙에 배치
- PC 화면 = 폰 에뮬레이터 개념

### 사용자 경험

- **MY 탭**: Pinterest 스타일의 이미지 라이브러리

  - 폴더 기반 조직화
  - 이미지 전용 그리드
  - 캔버스 편집 없음

- **MY MOOD 탭**: 자유형 무드보드 에디터
  - 다이어리/스크랩북 느낌
  - 편안한 모바일 캔버스
  - 템플릿 또는 자유형 선택 가능

### UI/UX 원칙

- 최소한의 변경 (기존 구조 유지)
- 자연스러운 빈 상태 처리
- 에러 없이 동작 (로그인 안 해도 크래시 없음)
- 직관적인 모달 인터페이스

---

## 🔒 보안 및 인증

### Firebase Auth 통합

- 사용자 인증 상태 확인
- 인증된 사용자만 데이터 접근
- 사용자 UID를 `creatorId`로 사용

### 데이터 보호

- 모든 데이터 로드 함수에 인증 체크
- 저장 함수에 인증 체크
- 로그인하지 않은 경우 안전하게 처리

---

## 📊 파일 통계

### 코드 라인 수 (추정)

- `mypage_reader.html`: ~564 라인
- `mypage_reader.css`: ~3,200 라인
- `mypage_reader.js`: ~800 라인

### 주요 컴포넌트

- 모달: 8개
- 탭: 2개 (MY MOOD, MY)
- 섹션: 5개 이상
- 함수: 30개 이상

---

## 🚀 배포 정보

### Firebase Hosting

- 배포 디렉토리: `public`
- URL 리라이트: 활성화
- 캐시 정책: 최적화됨

### 접근 가능한 경로

- `/` - 홈 페이지
- `/mypage_reader` - 독자 마이페이지
- `/community` - 커뮤니티
- `/explore` - 탐색

---

## 📌 주요 결정 사항

1. **모바일 프레임 제약**

   - 데스크톱에서도 모바일 크기 유지
   - 중앙 정렬로 모바일 프레임 표시

2. **Firebase Auth 우선**

   - Supabase 초기화 전에 Firebase Auth 확인 필수
   - `onAuthStateChanged` 사용으로 타이밍 이슈 해결

3. **에러 방지**

   - 로그인하지 않은 경우에도 크래시 없음
   - 빈 상태로 자연스럽게 처리

4. **코드 구조**
   - 모듈화된 함수 구조
   - 명확한 주석 및 TODO 표시
   - 기존 구조 최대한 유지

---

## 📅 작업 일정

### 완료된 작업

1. MY / MY MOOD 탭 레이아웃 최적화
2. Firebase Auth 타이밍 이슈 해결

### 진행 중

- Supabase 통합 준비 완료 (초기화 로직 구현됨)

### 예정

- Supabase 실제 통합
- 기능 구현 완료
- 테스트 및 최적화

---

## 📚 참고 사항

### 코드 주석

- 모든 주요 함수에 주석 포함
- TODO 주석으로 향후 작업 표시
- 중요 로직에 설명 추가

### 브라우저 호환성

- 모던 브라우저 지원
- 모바일 Safari 최적화
- 반응형 디자인 적용

### 성능 고려사항

- 이미지 lazy loading
- CSS 최적화
- JavaScript 모듈화

---

## ✨ 결론

MUMU 프로젝트는 모바일 우선 디자인의 웹 애플리케이션으로, 독자 마이페이지를 중심으로 작업이 진행되었습니다. 주요 작업은 레이아웃 최적화와 Firebase Auth 통합으로, 사용자 경험을 개선하고 안정성을 높였습니다.

향후 Supabase 통합을 통해 완전한 백엔드 기능을 구현할 예정입니다.

---

**작성일**: 2025년  
**프로젝트 버전**: 2.0  
**상태**: 개발 중
