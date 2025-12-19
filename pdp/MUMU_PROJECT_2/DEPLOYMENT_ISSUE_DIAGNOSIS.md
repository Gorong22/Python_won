# Firebase Hosting 배포 문제 진단 및 해결

## 🔍 문제 상황

- **로컬 (127.0.0.1)**: UI 변경사항 정상 반영 ✅
- **Firebase Hosting (mumu-3db59.web.app)**: 변경사항 미반영 ❌

---

## 1️⃣ HTML 실제 로딩 파일 확인

### 발견된 문제

**`/public/_redirects` 파일이 모든 경로를 `index.html`로 리다이렉트하고 있습니다.**

```bash
# _redirects 파일 내용
/*    /index.html   200
```

### 영향

- Firebase Hosting은 `_redirects` 파일을 지원합니다
- `/onboarding_reader.html` 접속 시 → `index.html`이 로드됨
- 따라서 실제 `onboarding_reader.html` 파일이 서빙되지 않음

### 확인 방법

브라우저 개발자 도구에서:

1. Network 탭 → `/onboarding_reader.html` 요청 확인
2. Response 탭 → 실제 HTML 내용이 `index.html`인지 확인
3. Elements 탭 → `<title>` 태그가 "MUMU - 홈"인지 확인 (index.html의 title)

---

## 2️⃣ CSS 적용 경로 확인

### 현재 상태

- ✅ **CSS는 인라인으로 포함되어 있음** (`<style>` 태그 내부)
- ✅ 외부 CSS 파일 의존성 없음
- ✅ `css/tabbar.css`만 로드 (공통 스타일)

### 결론

CSS 경로 문제는 **아님**. 인라인 스타일이므로 파일 로딩 이슈 없음.

---

## 3️⃣ JavaScript 파일 확인

### 현재 상태

- ✅ 파일 경로: `/js/onboarding_reader.js` (절대 경로 사용)
- ✅ 파일 존재 확인: `public/js/onboarding_reader.js` (3128 bytes)
- ✅ 최신 수정 시간: Dec 16 12:11

### 잠재적 문제

- `_redirects`로 인해 `index.html`이 로드되면, `onboarding_reader.js`는 실행되지 않음
- `index.html`에는 `onboarding_reader.js` 스크립트가 없음

---

## 4️⃣ Service Worker / Cache 문제 점검

### 확인 결과

- ❌ Service Worker 등록 코드 없음 (프로젝트 내 검색 결과 없음)
- ❌ `sw.js`, `service-worker.js` 파일 없음

### 결론

**Service Worker 문제는 아님.**

### 브라우저 캐시 가능성

- 브라우저가 이전 `index.html`을 캐시했을 수 있음
- 하지만 근본 원인은 `_redirects` 파일임

---

## 5️⃣ Firebase Hosting 캐시 / 배포 구조 점검

### firebase.json 확인

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

### 문제점

- `_redirects` 파일이 `**/.*` 패턴에 포함되지 않음 (`.`으로 시작하지 않음)
- 따라서 `_redirects` 파일이 배포에 포함됨
- Firebase Hosting이 이 파일을 읽어서 모든 경로를 `index.html`로 리다이렉트

### 배포 확인 방법

```bash
# 배포 전 파일 확인
firebase deploy --dry-run

# 실제 배포된 파일 확인
firebase hosting:channel:list
```

---

## 6️⃣ 최종 정리

### 🎯 핵심 원인 (단 하나)

**`/public/_redirects` 파일이 모든 경로(`/*`)를 `index.html`로 리다이렉트하고 있어서, `/onboarding_reader.html` 접속 시 실제로는 `index.html`이 로드되고 있습니다.**

### 즉시 수정 방법

#### 방법 1: `_redirects` 파일 제거 또는 수정 (권장)

```bash
# 옵션 A: 파일 삭제 (SPA가 아닌 경우)
rm public/_redirects

# 옵션 B: 특정 경로만 제외하도록 수정
# _redirects 파일 내용을 다음과 같이 변경:
/onboarding_reader.html    /onboarding_reader.html   200
/*    /index.html   200
```

#### 방법 2: `firebase.json`에 명시적 rewrites 규칙 추가

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/onboarding_reader.html",
        "destination": "/onboarding_reader.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### 방법 3: `_redirects` 파일을 Firebase Hosting ignore에 추가

`firebase.json` 수정:

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "_redirects"]
  }
}
```

**→ 방법 1 (옵션 B) 또는 방법 2를 권장합니다.**

### 재배포 후 확인

```bash
# 1. 수정 후 재배포
firebase deploy --only hosting

# 2. 브라우저에서 확인
# - 시크릿 모드로 https://mumu-3db59.web.app/onboarding_reader.html 접속
# - 개발자 도구 Network 탭에서 실제 HTML 파일 확인
# - Elements 탭에서 <title>이 "MUMU – 취향 설정"인지 확인
```

---

## 📋 앞으로 배포할 때 확인할 체크리스트

### 배포 전 체크리스트

- [ ] **`firebase.json`의 `rewrites` 또는 `_redirects` 파일 확인**
  - 특정 HTML 파일이 필요한 경우, 해당 경로가 `index.html`로 리다이렉트되지 않는지 확인
- [ ] **로컬에서 `firebase serve`로 테스트**

  ```bash
  firebase serve
  # http://localhost:5000/onboarding_reader.html 접속하여 확인
  ```

- [ ] **배포 전 파일 목록 확인**

  ```bash
  firebase deploy --dry-run
  # onboarding_reader.html이 포함되어 있는지 확인
  ```

- [ ] **브라우저 캐시 무시하고 테스트**
  - 시크릿 모드 사용
  - 또는 `Ctrl+Shift+R` (강력 새로고침)

### 배포 후 체크리스트

- [ ] **실제 호스팅 URL에서 파일 직접 접근 테스트**

  - `https://mumu-3db59.web.app/onboarding_reader.html`
  - Network 탭에서 200 OK + 올바른 HTML 내용 확인

- [ ] **JavaScript 파일 로딩 확인**

  - Network 탭에서 `/js/onboarding_reader.js`가 200 OK로 로드되는지 확인
  - Console에서 에러 없이 실행되는지 확인

- [ ] **CSS 스타일 적용 확인**
  - Elements 탭에서 인라인 스타일이 적용되었는지 확인
  - 선택 버튼 클릭 시 색상 변경 확인 (#ff5e00)

---

## 🚀 권장 수정 작업

1. **`_redirects` 파일 수정** (가장 빠른 해결)
2. **`firebase.json`에 명시적 rewrites 추가** (더 명확한 제어)
3. **재배포 및 확인**

이 작업을 진행하시겠습니까?
