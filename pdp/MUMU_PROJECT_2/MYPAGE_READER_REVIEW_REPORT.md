# 마이페이지 리더 전반적 검토 보고서

**작성일**: 2025-01-XX  
**검토 대상**: `/public/mypage_reader.html`, `/public/css/mypage_reader.css`, `/public/js/mypage_reader.js`

---

## 📋 목차

1. [전체 개요](#전체-개요)
2. [발견된 문제점](#발견된-문제점)
3. [디자인 이슈](#디자인-이슈)
4. [기능적 문제](#기능적-문제)
5. [코드 품질 문제](#코드-품질-문제)
6. [개선 제안](#개선-제안)
7. [우선순위별 수정 사항](#우선순위별-수정-사항)

---

## 전체 개요

### 현재 상태

- **HTML 파일**: 1,653줄 - 매우 복잡한 구조, 다수의 모달 포함
- **CSS 파일**: 5,673줄 - 과도하게 긴 스타일시트
- **JavaScript 파일**: 769줄 - 상태 관리 및 무드보드 편집 기능

### 주요 기능

- MY MOOD 탭: 대표 무드보드 전시
- MY 탭: 무드보드 관리, 폴더 관리, 저장된 컷 관리
- 무드보드 편집기: 텍스트/이미지 블록 추가 및 편집
- 프로필 설정 모달

---

## 발견된 문제점

### 🔴 심각한 문제 (즉시 수정 필요)

#### 1. HTML 중복 코드

**위치**: `mypage_reader.html` 라인 1056-1186

```html
<!-- 텍스트 폰트 선택 모달 -->
<div id="textFontModal" class="text-style-modal">
  <!-- ... 모달 내용 ... -->
</div>

<!-- 텍스트 폰트 선택 모달 -->
<!-- ⚠️ 중복! -->
<div id="textFontModal" class="text-style-modal">
  <!-- ... 모달 내용 ... -->
</div>
```

**문제**: `textFontModal` ID가 두 번 정의되어 있음. 이는 JavaScript에서 `getElementById`가 첫 번째 요소만 반환하여 두 번째 모달이 작동하지 않을 수 있음.

**영향**: 폰트 선택 기능이 제대로 작동하지 않을 수 있음.

---

#### 2. 프로필 정보 표시 문제

**위치**: `mypage_reader.html` 라인 73-79

```html
<div class="profile-name">독자</div>
<!-- 팔로우/팔로워 정보 (MY MOOD 탭에만 표시) -->
<div class="profile-stats" id="profile-stats" style="display: none">
  <span class="follow-num">0</span> 팔로우
  <span class="follow-num">0</span> 팔로워
</div>
<div class="profile-desc" style="display: none"></div>
```

**문제**:

- 프로필 정보가 하드코딩되어 있음 ("독자")
- 팔로우/팔로워 정보가 항상 숨김 상태
- 프로필 설명이 항상 숨김 상태
- 실제 사용자 데이터를 불러오는 로직이 없음

**영향**: 사용자 프로필이 제대로 표시되지 않음.

---

#### 3. 대표 무드보드 로딩 실패 가능성

**위치**: `mypage_reader.js` 라인 377-431

```javascript
async function loadMoodboards() {
  // ...
  const { data: eventsData, error } = await client
    .from("user_feed_events")
    .select("id, metadata, created_at")
    .eq("user_id", firebaseUser.uid)
    .eq("event_type", "moodboard_created");
  // ...
}
```

**문제**:

- 에러 처리가 부족함 (에러 발생 시 빈 배열만 반환)
- 로딩 상태 표시가 없음
- 대표 무드보드(`is_featured`) 필터링이 없음
- 실패 시 사용자에게 알림이 없음

**영향**: 무드보드가 로드되지 않아도 사용자는 이유를 알 수 없음.

---

#### 4. 무드보드 편집기 기능 미완성

**위치**: `mypage_reader.js` 전체

**문제**:

- 드래그 앤 드롭 기능이 구현되지 않음
- 리사이즈 핸들 기능이 보이지만 실제 동작하지 않음
- 블록 회전 기능이 있지만 UI 피드백이 부족함
- 저장 기능이 있지만 검증 로직이 없음

**영향**: 무드보드 편집이 제대로 작동하지 않음.

---

### 🟡 중간 문제 (빠른 시일 내 수정 권장)

#### 5. CSS 파일 과도한 길이

**위치**: `mypage_reader.css` 전체 (5,673줄)

**문제**:

- 단일 파일에 모든 스타일이 집중되어 있음
- 중복 스타일이 많을 가능성
- 유지보수가 어려움
- 특정 기능만 수정해도 전체 파일을 로드해야 함

**영향**: 성능 저하, 유지보수 어려움.

---

#### 6. 모바일 반응형 문제

**위치**: `mypage_reader.css` 전체

**문제**:

- 모바일 최적화가 일부만 되어 있음
- 데스크탑에서 모바일 프레임을 고정하는 방식 사용
- 다양한 화면 크기에 대한 대응이 부족함
- 터치 인터랙션 최적화 부족

**예시**:

```css
@media (min-width: 391px) {
  .app-frame {
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    border-radius: 0;
    max-width: 390px;
    width: 390px;
  }
}
```

**영향**: 다양한 디바이스에서 사용자 경험이 일관되지 않음.

---

#### 7. 탭 전환 시 상태 유지 문제

**위치**: `mypage_reader.js` 라인 638-646

```javascript
function switchTab(tab) {
  setState({ currentTab: tab });
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  const tabEl = document.querySelector(`[data-tab="${tab}"]`);
  const contentEl = document.getElementById(`tab-${tab}`);
  if (tabEl) tabEl.classList.add("active");
  if (contentEl) contentEl.classList.add("active");
}
```

**문제**:

- 탭 전환 시 스크롤 위치가 초기화됨
- 로드된 데이터가 다시 로드될 수 있음
- 애니메이션이 없어 전환이 갑작스러움

**영향**: 사용자 경험이 부자연스러움.

---

#### 8. 빈 상태(Empty State) 처리 부족

**위치**: HTML 전체

**문제**:

- 빈 상태가 있지만 일관성이 없음
- 로딩 중 상태가 없음
- 에러 상태가 없음
- 사용자 액션 유도가 부족함

**영향**: 사용자가 다음 행동을 취하기 어려움.

---

### 🟢 경미한 문제 (개선 권장)

#### 9. 접근성 문제

- 키보드 네비게이션이 부족함
- ARIA 레이블이 일부만 있음
- 포커스 관리가 부족함
- 스크린 리더 지원이 불충분함

#### 10. 성능 최적화 부족

- 이미지 지연 로딩이 일부만 적용됨
- 불필요한 리렌더링 가능성
- 이벤트 리스너 최적화 부족

#### 11. 코드 주석 부족

- 복잡한 로직에 설명이 없음
- 함수 목적이 명확하지 않음
- 매직 넘버 사용

---

## 디자인 이슈

### 1. 일관성 없는 스타일

- 버튼 스타일이 여러 곳에서 다르게 정의됨
- 색상 값이 하드코딩되어 있음 (`#ff5e00`, `#000` 등)
- 간격(spacing)이 일관되지 않음
- 폰트 크기가 일관되지 않음

### 2. 시각적 계층 구조 부족

- 중요도에 따른 시각적 구분이 약함
- 타이포그래피 계층이 명확하지 않음
- 색상 대비가 일부 부족함

### 3. 모달 디자인 일관성

- 모달 크기가 다양함
- 닫기 버튼 위치가 일관되지 않음
- 애니메이션이 일부만 있음

### 4. 프로필 영역 디자인

- 프로필 영역이 너무 단순함
- 아바타 크기가 작음 (48px)
- 프로필 정보가 시각적으로 강조되지 않음

### 5. 무드보드 카드 디자인

- 카드 간격이 일관되지 않음
- 호버 효과가 일부만 있음
- 썸네일 비율이 고정되어 있음

---

## 기능적 문제

### 1. 무드보드 편집 기능

- ✅ 텍스트 블록 추가: 구현됨
- ✅ 이미지 블록 추가: 구현됨
- ❌ 드래그 앤 드롭: 미구현
- ❌ 리사이즈: UI만 있고 기능 미구현
- ⚠️ 회전: 기본 기능만 있음
- ⚠️ 저장: 기본 기능만 있음

### 2. 폴더 관리 기능

- ❌ 폴더 생성: 모달은 있지만 실제 기능 확인 필요
- ❌ 폴더 삭제: 모달은 있지만 실제 기능 확인 필요
- ❌ 폴더 이름 변경: 모달은 있지만 실제 기능 확인 필요
- ❌ 컷 이동: 드래그 앤 드롭 미구현

### 3. 대표 무드보드 설정

- ⚠️ 대표 무드보드 선택: 모달은 있지만 실제 기능 확인 필요
- ❌ 대표 무드보드 편집: 캔버스 편집기와 연동 필요
- ❌ 대표 무드보드 미리보기: 제대로 렌더링되는지 확인 필요

### 4. 프로필 설정

- ❌ 프로필 이미지 업로드: UI만 있고 실제 업로드 기능 확인 필요
- ❌ 닉네임 변경: 저장 기능 확인 필요
- ❌ 자기소개 변경: 저장 기능 확인 필요

---

## 코드 품질 문제

### 1. 상태 관리

- 전역 상태 객체 사용 (`AppState`)
- 상태 업데이트가 분산되어 있음
- 상태 동기화 문제 가능성

### 2. 에러 처리

- try-catch가 일부만 있음
- 에러 메시지가 사용자에게 전달되지 않음
- 네트워크 에러 처리 부족

### 3. 코드 중복

- 모달 열기/닫기 로직이 반복됨
- 스타일 적용 로직이 중복됨
- 이벤트 핸들러가 분산되어 있음

### 4. 함수 크기

- 일부 함수가 너무 김 (100줄 이상)
- 단일 책임 원칙 위반
- 테스트하기 어려운 구조

### 5. 변수명

- 일부 변수명이 불명확함 (`data`, `item` 등)
- 매직 넘버 사용
- 상수 정의 부족

---

## 개선 제안

### 1. 즉시 수정 사항

#### HTML 중복 제거

```html
<!-- 중복된 textFontModal 제거 -->
<!-- 하나만 남기고 나머지 삭제 -->
```

#### 프로필 데이터 로딩 구현

```javascript
async function loadProfile() {
  const user = await ensureFirebaseUser();
  if (!user) return;

  // 프로필 데이터 로드
  const profile = await loadUserProfile(user.uid);

  // UI 업데이트
  updateProfileUI(profile);
}
```

#### 에러 처리 개선

```javascript
async function loadMoodboards() {
  try {
    // ... 로딩 로직 ...
  } catch (error) {
    console.error("무드보드 로딩 실패:", error);
    showErrorMessage("무드보드를 불러오는데 실패했습니다.");
    setState({ moodboards: [] });
  }
}
```

### 2. 구조 개선

#### CSS 모듈화

```
css/
  ├── mypage_reader/
  │   ├── base.css          # 기본 스타일
  │   ├── layout.css        # 레이아웃
  │   ├── components/       # 컴포넌트별 스타일
  │   │   ├── modal.css
  │   │   ├── card.css
  │   │   └── button.css
  │   └── themes.css        # 테마/색상
```

#### JavaScript 모듈화

```
js/
  ├── mypage_reader/
  │   ├── state.js          # 상태 관리
  │   ├── api.js            # API 호출
  │   ├── render.js         # 렌더링 함수
  │   ├── editor.js         # 편집기 기능
  │   └── utils.js          # 유틸리티
```

### 3. 디자인 시스템 구축

#### 디자인 토큰 정의

```css
:root {
  /* 색상 */
  --color-primary: #ff5e00;
  --color-text: #000;
  --color-text-secondary: #666;

  /* 간격 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* 폰트 */
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
}
```

### 4. 기능 완성

#### 드래그 앤 드롭 구현

- interact.js 라이브러리 활용 (이미 포함됨)
- 블록 드래그 기능 구현
- 폴더 간 컷 이동 구현

#### 리사이즈 기능 구현

- 리사이즈 핸들 이벤트 처리
- 최소/최대 크기 제한
- 비율 유지 옵션

---

## 우선순위별 수정 사항

### 🔴 P0 (즉시 수정)

1. HTML 중복 코드 제거 (`textFontModal`)
2. 프로필 데이터 로딩 구현
3. 에러 처리 추가
4. 기본 기능 동작 확인 및 수정

### 🟡 P1 (1주일 내)

1. CSS 모듈화
2. JavaScript 리팩토링
3. 디자인 시스템 구축
4. 모바일 반응형 개선

### 🟢 P2 (2주일 내)

1. 드래그 앤 드롭 구현
2. 리사이즈 기능 구현
3. 접근성 개선
4. 성능 최적화

### ⚪ P3 (향후)

1. 테스트 코드 작성
2. 문서화
3. 추가 기능 개발

---

## 결론

마이페이지 리더는 기본적인 구조는 갖추고 있으나, 여러 문제점들이 발견되었습니다. 특히 **중복 코드**, **기능 미완성**, **디자인 일관성 부족**이 주요 이슈입니다.

**즉시 수정이 필요한 사항**부터 처리하고, 점진적으로 구조를 개선해 나가는 것을 권장합니다.

---

## 추가 참고사항

- 현재 코드는 복잡도가 높아 유지보수가 어려움
- 새로운 기능 추가 전에 기존 코드 리팩토링 권장
- 디자인 시스템 구축으로 일관성 확보 필요
- 사용자 테스트를 통한 UX 개선 필요




