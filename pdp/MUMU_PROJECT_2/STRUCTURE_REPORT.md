# 무드보드 프로젝트 구조 보고서

## 개요

본 문서는 `mypage_reader.js` 파일의 리팩토링된 구조를 분석하고 문서화한 보고서입니다. 이 파일은 무드보드 편집 및 관리 기능을 담당하는 핵심 모듈입니다.

---

## 1. 아키텍처 개요

### 1.1 설계 원칙

- **단일 진실 공급원(Single Source of Truth)**: `AppState` 객체를 통한 중앙 집중식 상태 관리
- **관심사의 분리(Separation of Concerns)**: 상태 관리, 렌더링, 이벤트 처리, API 호출의 명확한 분리
- **이벤트 위임(Event Delegation)**: 단일 루트에서 모든 이벤트 처리
- **순수 함수(Pure Functions)**: 렌더링 함수들의 부작용 최소화

### 1.2 모듈 구조

```
mypage_reader.js
├── STATE (상태 관리)
├── CANVAS INSTANCE MANAGEMENT (캔버스 인스턴스 관리)
├── BLOCK DOM CREATION (블록 DOM 생성)
├── RENDER FUNCTIONS (렌더링 함수)
├── EVENT DELEGATION (이벤트 위임)
├── STATE ACTIONS (상태 액션)
├── API FUNCTIONS (API 함수)
├── MOODBOARD OPERATIONS (무드보드 작업)
├── UI HELPERS (UI 헬퍼)
├── INITIALIZATION (초기화)
└── EXPORT FOR COMPATIBILITY (호환성 익스포트)
```

---

## 2. 주요 구성 요소

### 2.1 상태 관리 (STATE)

#### AppState 객체

```javascript
const AppState = {
  currentUserId: null, // 현재 사용자 ID
  moodboards: [], // 무드보드 목록
  folders: [], // 폴더 목록
  savedCuts: [], // 저장된 컷 목록
  activeMoodboardId: null, // 활성 무드보드 ID
  activeCanvasId: null, // 활성 캔버스 ID
  activeBlockId: null, // 활성 블록 ID
  currentTab: "mood", // 현재 탭
  editor: {
    // 에디터 상태
    isOpen: false,
    moodboardId: null,
    template: null,
    canvasId: null,
  },
};
```

**특징:**

- 애플리케이션의 모든 상태를 중앙에서 관리
- 상태 변경은 `setState()` 함수를 통해서만 수행
- 상태 변경 시 자동으로 렌더링 함수 호출

---

### 2.2 캔버스 인스턴스 관리 (CANVAS INSTANCE MANAGEMENT)

#### Canvas 클래스

```javascript
class Canvas {
  constructor(id, moodboardId, options = {})
  createDOM()
  render()
  addBlock(blockData)
  removeBlock(blockId)
}
```

**책임:**

- 캔버스의 생명주기 관리
- DOM 요소 생성 및 렌더링
- 블록 추가/제거 관리

**인스턴스 저장소:**

- `canvasInstances` (Map): 모든 캔버스 인스턴스를 ID로 관리

**주요 함수:**

- `getCanvas(canvasId)`: 캔버스 인스턴스 조회
- `createCanvas(moodboardId, options)`: 새 캔버스 생성
- `removeCanvas(canvasId)`: 캔버스 제거

---

### 2.3 블록 DOM 생성 (BLOCK DOM CREATION)

#### createBlockDOM(blockData)

**책임:**

- 블록 데이터를 DOM 요소로 변환
- 이벤트 바인딩 없이 순수 DOM 생성만 수행
- 텍스트 블록과 이미지 블록 지원

**지원 블록 타입:**

1. **텍스트 블록**

   - 편집 가능한 텍스트 콘텐츠
   - 폰트 크기, 굵기, 색상, 폰트 패밀리 설정 가능
   - 삭제, 회전, 색상 변경 컨트롤

2. **이미지 블록**
   - 이미지 표시
   - 필터 적용 가능
   - 삭제, 필터 변경, 회전 컨트롤

---

### 2.4 렌더링 함수 (RENDER FUNCTIONS)

#### renderMoodboards()

**책임:**

- 무드보드 목록을 그리드 형태로 렌더링
- 빈 상태 처리 (empty state)
- 각 무드보드 카드에 클릭 이벤트 속성 추가

#### renderEditor()

**책임:**

- 무드보드 에디터 모달 표시/숨김 제어
- 캔버스 렌더링
- 에디터 상태에 따른 UI 업데이트

#### render()

**책임:**

- 모든 렌더링 함수를 순차적으로 호출
- 상태 변경 시 자동 호출

---

### 2.5 이벤트 위임 (EVENT DELEGATION)

#### setupEventDelegation()

**책임:**

- 문서 루트에서 모든 클릭 이벤트 처리
- `data-action` 속성을 통한 액션 식별
- 이벤트 버블링 활용

**지원 액션:**

- `delete-block`: 블록 삭제
- `rotate-block`: 블록 회전 (15도씩)
- `change-color`: 텍스트 색상 변경
- `change-filter`: 이미지 필터 변경
- `open-moodboard`: 무드보드 에디터 열기

**마우스 이벤트:**

- `mouseover`: 블록 컨트롤 표시
- `mouseout`: 블록 컨트롤 숨김

**장점:**

- 동적으로 추가되는 요소에도 이벤트 처리 가능
- 메모리 효율적 (단일 리스너)
- 코드 중복 제거

---

### 2.6 상태 액션 (STATE ACTIONS)

#### setState(updates)

**책임:**

- AppState 객체 업데이트
- 업데이트 후 자동 렌더링 호출

**사용 예시:**

```javascript
setState({
  currentTab: "mood",
  moodboards: newMoodboards,
});
```

---

### 2.7 API 함수 (API FUNCTIONS)

#### 인증 관련

- `loadSupabaseClient()`: Supabase 클라이언트 로드
- `ensureFirebaseUser()`: Firebase 사용자 확인
- `ensureAuthenticated()`: 인증 상태 확인
- `getContextIds()`: 현재 사용자 및 프로필 사용자 ID 조회

**특징:**

- 비동기 처리
- 에러 핸들링 포함
- 클라이언트 재사용 (싱글톤 패턴)

---

### 2.8 무드보드 작업 (MOODBOARD OPERATIONS)

#### 데이터 로드

- `loadMoodboards()`: 사용자의 무드보드 목록 로드
  - Supabase `user_feed_events` 테이블에서 조회
  - `event_type: 'moodboard_created'` 필터링
  - 최대 1000개 제한

#### 에디터 제어

- `openMoodboardEditor(moodboardId, template)`: 에디터 열기
- `closeMoodboardEditor()`: 에디터 닫기
- `saveMoodboardEditor()`: 무드보드 저장

#### 블록 추가

- `addTextBlock()`: 텍스트 블록 추가
- `addImageBlock(imageUrl)`: 이미지 블록 추가

#### 데이터 저장

- `createMoodboardFeed(moodboardData)`: 무드보드 데이터 저장
  - 기존 무드보드 업데이트 또는 새로 생성
  - Supabase에 이벤트로 저장

---

### 2.9 UI 헬퍼 (UI HELPERS)

#### 탭 관리

- `switchTab(tab)`: 탭 전환

#### 모달 관리

- `createNewMoodboard()`: 무드보드 생성 모달 열기
- `closeMoodboardCreateModal()`: 생성 모달 닫기
- `showTemplates()`: 템플릿 선택 모달 표시
- `closeTemplateSelectModal()`: 템플릿 선택 모달 닫기
- `selectTemplate(templateName)`: 템플릿 선택

#### 무드보드 생성

- `startFreeformMoodboard()`: 자유형 무드보드 시작

---

### 2.10 초기화 (INITIALIZATION)

#### DOMContentLoaded 이벤트 핸들러

**초기화 순서:**

1. 이벤트 위임 설정
2. 인증 확인
3. 무드보드 목록 로드
4. UI 요소 이벤트 리스너 등록
   - 텍스트 추가 버튼
   - 컷 추가 버튼
   - 이모지 추가 버튼
   - 비율 선택 카드
   - 비율 토글 버튼
   - 에디터 제어 버튼들

---

### 2.11 호환성 익스포트 (EXPORT FOR COMPATIBILITY)

**전역 함수로 익스포트:**

- `window.switchTab`
- `window.createNewMoodboard`
- `window.closeMoodboardCreateModal`
- `window.startFreeformMoodboard`
- `window.showTemplates`
- `window.closeTemplateSelectModal`
- `window.selectTemplate`
- `window.openMoodboardEditor`
- `window.closeMoodboardEditor`
- `window.saveMoodboardEditor`
- `window.addTextBlock`
- `window.addImageBlock`

**목적:**

- 기존 HTML의 `onclick` 속성과의 호환성 유지
- 점진적 마이그레이션 지원

---

## 3. 데이터 흐름

### 3.1 무드보드 로드 흐름

```
사용자 인증 확인
  ↓
Supabase 클라이언트 로드
  ↓
user_feed_events 테이블 조회
  ↓
이벤트 데이터를 무드보드 객체로 변환
  ↓
AppState.moodboards 업데이트
  ↓
renderMoodboards() 호출
  ↓
UI 업데이트
```

### 3.2 무드보드 편집 흐름

```
무드보드 카드 클릭
  ↓
openMoodboardEditor() 호출
  ↓
Canvas 인스턴스 생성
  ↓
AppState.editor 업데이트
  ↓
renderEditor() 호출
  ↓
에디터 모달 표시
```

### 3.3 무드보드 저장 흐름

```
저장 버튼 클릭
  ↓
saveMoodboardEditor() 호출
  ↓
캔버스에서 블록 데이터 추출
  ↓
무드보드 데이터 객체 생성
  ↓
createMoodboardFeed() 호출
  ↓
Supabase에 저장 (INSERT 또는 UPDATE)
  ↓
무드보드 목록 재로드
  ↓
에디터 닫기
```

---

## 4. 주요 개선 사항

### 4.1 구조적 개선

1. **명확한 모듈 분리**: 각 기능 영역이 명확히 구분됨
2. **단일 책임 원칙**: 각 함수가 하나의 책임만 수행
3. **중앙 집중식 상태 관리**: AppState를 통한 상태 관리
4. **이벤트 위임 패턴**: 성능 및 유지보수성 향상

### 4.2 코드 품질 개선

1. **주석 기반 구조화**: 섹션별 명확한 구분
2. **일관된 네이밍**: 함수 및 변수명의 일관성
3. **에러 핸들링**: API 호출 시 에러 처리 포함
4. **호환성 유지**: 기존 코드와의 호환성 보장

### 4.3 성능 개선

1. **이벤트 위임**: 메모리 사용량 감소
2. **캔버스 인스턴스 관리**: Map을 통한 효율적인 조회
3. **조건부 렌더링**: 필요한 경우에만 렌더링 수행

---

## 5. 의존성

### 5.1 외부 라이브러리

- **Supabase**: 데이터베이스 및 백엔드 서비스
- **Firebase**: 인증 서비스
- **window.supabase**: Supabase 클라이언트 라이브러리

### 5.2 전역 변수

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `window.getCurrentFirebaseUser`: Firebase 사용자 조회 함수
- `window.openTextColorPicker`: 텍스트 색상 선택기
- `window.openImageFilterPicker`: 이미지 필터 선택기
- `window.openCutSelectionModal`: 컷 선택 모달

### 5.3 DOM 요소

- `#moodboards-grid`: 무드보드 그리드 컨테이너
- `#moodboards-empty`: 빈 상태 표시 요소
- `#moodboardEditorModal`: 에디터 모달
- `#canvasEditor`: 캔버스 컨테이너
- `#editor-title-input`: 에디터 제목 입력 필드
- 기타 UI 컨트롤 요소들

---

## 6. 향후 개선 방향

### 6.1 제안 사항

1. **타입 안정성**: TypeScript 도입 고려
2. **상태 관리 라이브러리**: Redux 또는 Zustand 같은 라이브러리 고려
3. **컴포넌트화**: React/Vue 같은 프레임워크로 마이그레이션
4. **테스트 코드**: 단위 테스트 및 통합 테스트 추가
5. **에러 바운더리**: 더 강력한 에러 핸들링 및 사용자 피드백

### 6.2 성능 최적화

1. **가상 스크롤**: 많은 무드보드 목록 처리 시
2. **이미지 지연 로딩**: 썸네일 이미지 최적화
3. **디바운싱/스로틀링**: 자주 발생하는 이벤트 처리 최적화

---

## 7. 결론

`mypage_reader.js` 파일은 명확한 구조와 관심사 분리를 통해 유지보수성과 확장성을 크게 향상시켰습니다. 단일 진실 공급원 원칙을 따르는 상태 관리, 이벤트 위임 패턴, 그리고 순수 함수 기반의 렌더링은 코드의 품질을 높였습니다.

이 구조는 향후 기능 추가나 수정 시에도 안정적으로 확장할 수 있는 견고한 기반을 제공합니다.

---

**작성일**: 2025년 1월
**버전**: 1.0
**파일**: `public/js/mypage_reader.js`







