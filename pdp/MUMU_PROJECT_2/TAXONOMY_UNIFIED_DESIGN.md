# 통합 Taxonomy 설계 문서

## 개요

독자 온보딩과 작가 스튜디오가 서로 다른 개념 구조를 사용하여 추천/탐색/설명이 일관되지 않은 문제를 해결하기 위한 통합 Taxonomy 설계입니다.

**핵심 원칙:**

- 추천 엔진의 축(genre 5개)은 변경하지 않음
- 기존 DB 구조를 파괴하지 않음
- 작가 ↔ 독자 ↔ 추천 엔진이 같은 언어를 사용

---

## 1️⃣ 공통 Taxonomy 구조

### Level 1: Canonical Genres (고정 5개)

```
fantasy    → 판타지
action     → 액션
daily      → 일상
thriller   → 스릴러
comedy     → 코미디
```

**제약사항:**

- 이 5개는 절대 변경/추가 불가
- 모든 추천 벡터는 이 5개 차원으로만 구성됨

---

### Level 2: Sub-tags (스토리 요소, 분위기 등)

Sub-tag는 다음 두 가지 역할을 합니다:

1. **UI에서 사용자에게 보여지는 선택지**
2. **Genre Score 계산을 위한 가중치 매핑**

#### Sub-tag 구조

각 sub-tag는 하나 이상의 canonical genre에 영향을 줍니다.

```json
{
  "tag_id": "reincarnation",
  "display_name": "환생",
  "category": "story_element", // story_element | mood | setting | character
  "genre_weights": {
    "fantasy": 0.85,
    "action": 0.2,
    "daily": 0.1,
    "thriller": 0.05,
    "comedy": 0.15
  },
  "parent_genres": ["fantasy"] // 주로 속하는 장르 (UI 그룹핑용)
}
```

**genre_weights 의미:**

- 해당 태그가 선택되면 각 genre에 얼마나 기여하는지
- 합이 1이 아니어도 됨 (독립적인 기여도)
- 값 범위: 0.0 ~ 1.0

---

## 2️⃣ 작가 입력 → 추천 벡터 흐름

### 2.1 작가 입력 단계

**UI에서 수집:**

- 장르 선택 (1~2개, HTML의 `data-genre` 값)
- 태그 선택 (0~10개, 자유 입력 또는 프리셋)

**예시:**

```javascript
// 작가가 선택한 값
{
  genres: ["fantasy", "romance"],  // HTML data-genre 값
  tags: ["환생", "회귀", "빙의", "역하렘"]
}
```

### 2.2 DB 저장 구조

**works 테이블:**

```json
{
  "id": "work_123",
  "title": "작품 제목",
  "description": "작품 설명",
  "genre": ["fantasy", "romance"], // 원본 장르 배열 (UI 호환성)
  "tags": ["환생", "회귀", "빙의", "역하렘"], // 원본 태그 배열
  "genre_scores": {
    // ← 추천 엔진용 벡터
    "fantasy": 0.85,
    "action": 0.15,
    "daily": 0.1,
    "thriller": 0.05,
    "comedy": 0.2
  },
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 2.3 genre_scores 계산 로직

**알고리즘:**

```javascript
/**
 * 작가 입력(장르 + 태그) → genre_scores 변환
 */
function calculateGenreScores(selectedGenres, selectedTags, taxonomy) {
  // 1. 초기화: 모든 genre를 0으로 시작
  const genreScores = {
    fantasy: 0,
    action: 0,
    daily: 0,
    thriller: 0,
    comedy: 0,
  };

  // 2. 선택된 장르에 직접 점수 부여 (기본 가중치)
  const genreBaseWeight = 0.6; // 장르 직접 선택의 기본 가중치
  selectedGenres.forEach((genre) => {
    const canonicalKey = mapToCanonicalGenre(genre);
    if (canonicalKey && genreScores.hasOwnProperty(canonicalKey)) {
      genreScores[canonicalKey] += genreBaseWeight;
    }
  });

  // 3. 선택된 태그의 genre_weights 누적
  selectedTags.forEach((tag) => {
    const tagDef = taxonomy.tags[tag];
    if (tagDef && tagDef.genre_weights) {
      Object.keys(genreScores).forEach((genre) => {
        const weight = tagDef.genre_weights[genre] || 0;
        genreScores[genre] += weight * 0.4; // 태그 가중치 (0.4 = 태그의 영향력)
      });
    }
  });

  // 4. 정규화: 최대값을 1.0으로 스케일링
  const maxScore = Math.max(...Object.values(genreScores));
  if (maxScore > 0) {
    Object.keys(genreScores).forEach((genre) => {
      genreScores[genre] = Math.min(genreScores[genre] / maxScore, 1.0);
    });
  }

  return genreScores;
}

/**
 * UI 장르 → Canonical 장르 매핑
 */
function mapToCanonicalGenre(uiGenre) {
  const mapping = {
    fantasy: "fantasy",
    action: "action",
    "slice-of-life": "daily",
    daily: "daily",
    thriller: "thriller",
    comedy: "comedy",
    romance: "fantasy", // 로맨스는 판타지로 매핑 (또는 다른 규칙)
    drama: "daily", // 드라마는 일상으로 매핑
    horror: "thriller", // 공포는 스릴러로 매핑
    // ... 기타 매핑
  };
  return mapping[uiGenre] || null;
}
```

**계산 예시:**

```javascript
// 입력
selectedGenres = ["fantasy", "romance"]
selectedTags = ["환생", "회귀"]

// Step 1: 장르 직접 점수
genreScores = {
  fantasy: 0.6,  // fantasy 직접 선택
  action: 0,
  daily: 0,
  thriller: 0,
  comedy: 0
}

// Step 2: 태그 가중치 추가
// "환생" 태그의 genre_weights: { fantasy: 0.85, action: 0.20, ... }
// "회귀" 태그의 genre_weights: { fantasy: 0.80, action: 0.30, ... }

genreScores = {
  fantasy: 0.6 + (0.85 * 0.4) + (0.80 * 0.4) = 1.26,
  action: 0 + (0.20 * 0.4) + (0.30 * 0.4) = 0.20,
  daily: 0 + (0.10 * 0.4) + (0.15 * 0.4) = 0.10,
  thriller: 0 + (0.05 * 0.4) + (0.10 * 0.4) = 0.06,
  comedy: 0 + (0.15 * 0.4) + (0.20 * 0.4) = 0.14
}

// Step 3: 정규화 (최대값 1.26으로 나눔)
genreScores = {
  fantasy: 1.0,
  action: 0.16,
  daily: 0.08,
  thriller: 0.05,
  comedy: 0.11
}
```

---

## 3️⃣ 독자 온보딩 → 추천 벡터 흐름

### 3.1 독자 입력 단계

**UI에서 수집:**

- 장르 선택 (다중 선택 가능)
- 취향 선택 (다중 선택 가능)

**예시:**

```javascript
// 독자가 선택한 값
{
  genres: ["fantasy", "romance", "slice-of-life"],
  tastes: ["happy-ending", "strong-female-lead", "reincarnation"]
}
```

### 3.2 Taxonomy 상 위치

**장르 선택:**

- UI의 장르는 직접 canonical genre로 매핑 가능
- 예: `"fantasy"` → `fantasy`, `"slice-of-life"` → `daily`

**취향 선택:**

- 취향은 사실상 sub-tag와 동일한 개념
- 예: `"reincarnation"` → sub-tag `"환생"`과 동일

### 3.3 user_tastes 계산 로직

**알고리즘:**

```javascript
/**
 * 독자 입력(장르 + 취향) → user_tastes 변환
 */
function calculateUserTastes(selectedGenres, selectedTastes, taxonomy) {
  // 1. 초기화: 모든 genre를 50으로 시작 (중립)
  const userTastes = {
    fantasy: 50,
    action: 50,
    daily: 50,
    thriller: 50,
    comedy: 50,
  };

  // 2. 선택된 장르에 높은 점수 부여
  selectedGenres.forEach((genre) => {
    const canonicalKey = mapToCanonicalGenre(genre);
    if (canonicalKey && userTastes.hasOwnProperty(canonicalKey)) {
      userTastes[canonicalKey] = 80; // 선호 장르는 높은 점수
    }
  });

  // 3. 선택되지 않은 장르는 낮은 점수
  Object.keys(userTastes).forEach((genre) => {
    if (userTastes[genre] === 50) {
      userTastes[genre] = 20; // 비선호 장르는 낮은 점수
    }
  });

  // 4. 취향(태그)의 genre_weights를 반영하여 점수 조정
  selectedTastes.forEach((taste) => {
    const tagDef = taxonomy.tags[taste];
    if (tagDef && tagDef.genre_weights) {
      Object.keys(userTastes).forEach((genre) => {
        const weight = tagDef.genre_weights[genre] || 0;
        // 가중치가 높은 장르는 점수를 더 높임
        const adjustment = weight * 30; // 최대 30점 추가
        userTastes[genre] = Math.min(userTastes[genre] + adjustment, 100);
      });
    }
  });

  return userTastes;
}
```

**계산 예시:**

```javascript
// 입력
selectedGenres = ["fantasy", "slice-of-life"]
selectedTastes = ["reincarnation", "happy-ending"]

// Step 1: 장르 직접 점수
userTastes = {
  fantasy: 80,   // 선택됨
  action: 20,    // 선택 안됨
  daily: 80,     // slice-of-life → daily 매핑
  thriller: 20,  // 선택 안됨
  comedy: 20     // 선택 안됨
}

// Step 2: 취향 가중치 추가
// "reincarnation" 태그의 genre_weights: { fantasy: 0.85, action: 0.20, ... }
// "happy-ending" 태그의 genre_weights: { fantasy: 0.60, daily: 0.70, ... }

userTastes = {
  fantasy: 80 + (0.85 * 30) + (0.60 * 30) = 123.5 → 100 (최대값),
  action: 20 + (0.20 * 30) + (0.10 * 30) = 29,
  daily: 80 + (0.10 * 30) + (0.70 * 30) = 104 → 100 (최대값),
  thriller: 20 + (0.05 * 30) + (0.05 * 30) = 23,
  comedy: 20 + (0.15 * 30) + (0.40 * 30) = 36.5
}
```

### 3.4 DB 저장 구조

**readers 테이블:**

```json
{
  "id": "reader_123",
  "username": "user123",
  "preferredGenres": ["fantasy", "romance", "slice-of-life"], // 원본 (하위 호환성)
  "preferredTastes": ["happy-ending", "strong-female-lead"], // 원본 (하위 호환성)
  "user_tastes": {
    // ← 추천 엔진용 벡터
    "fantasy": 100,
    "action": 29,
    "daily": 100,
    "thriller": 23,
    "comedy": 36
  },
  "onboardingCompleted": true
}
```

---

## 4️⃣ Taxonomy JSON 스키마

### 4.1 전체 구조

```json
{
  "version": "2.0",
  "canonical_genres": {
    "fantasy": {
      "key": "fantasy",
      "display_name": "판타지",
      "description": "판타지 요소가 포함된 작품"
    },
    "action": {
      "key": "action",
      "display_name": "액션",
      "description": "액션 요소가 포함된 작품"
    },
    "daily": {
      "key": "daily",
      "display_name": "일상",
      "description": "일상적 요소가 포함된 작품"
    },
    "thriller": {
      "key": "thriller",
      "display_name": "스릴러",
      "description": "스릴러 요소가 포함된 작품"
    },
    "comedy": {
      "key": "comedy",
      "display_name": "코미디",
      "description": "코미디 요소가 포함된 작품"
    }
  },
  "sub_tags": {
    "reincarnation": {
      "tag_id": "reincarnation",
      "display_name": "환생",
      "aliases": ["전생", "환생물"],
      "category": "story_element",
      "parent_genres": ["fantasy"],
      "genre_weights": {
        "fantasy": 0.85,
        "action": 0.2,
        "daily": 0.1,
        "thriller": 0.05,
        "comedy": 0.15
      }
    },
    "happy-ending": {
      "tag_id": "happy-ending",
      "display_name": "해피엔딩",
      "aliases": ["해피엔딩물"],
      "category": "mood",
      "parent_genres": ["fantasy", "daily"],
      "genre_weights": {
        "fantasy": 0.6,
        "action": 0.1,
        "daily": 0.7,
        "thriller": 0.05,
        "comedy": 0.4
      }
    },
    "strong-female-lead": {
      "tag_id": "strong-female-lead",
      "display_name": "강한 여주",
      "aliases": ["우월녀", "여주중심"],
      "category": "character",
      "parent_genres": ["fantasy", "action"],
      "genre_weights": {
        "fantasy": 0.7,
        "action": 0.8,
        "daily": 0.3,
        "thriller": 0.4,
        "comedy": 0.2
      }
    }
    // ... 더 많은 태그
  },
  "genre_mapping": {
    "ui_to_canonical": {
      "fantasy": "fantasy",
      "action": "action",
      "slice-of-life": "daily",
      "daily": "daily",
      "thriller": "thriller",
      "comedy": "comedy",
      "romance": "fantasy",
      "drama": "daily",
      "horror": "thriller",
      "sports": "action",
      "mystery": "thriller",
      "sci-fi": "fantasy",
      "historical": "daily"
    }
  }
}
```

---

## 5️⃣ 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    작가 스튜디오                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UI 입력:                                                   │
│  - 장르: ["fantasy", "romance"]                            │
│  - 태그: ["환생", "회귀", "빙의"]                          │
│                                                             │
│         ↓                                                    │
│                                                             │
│  [calculateGenreScores()]                                   │
│  - 장르 직접 점수 (0.6)                                     │
│  - 태그 가중치 누적 (0.4)                                   │
│  - 정규화                                                    │
│                                                             │
│         ↓                                                    │
│                                                             │
│  DB 저장:                                                   │
│  {                                                          │
│    genre: ["fantasy", "romance"],  // 원본                  │
│    tags: ["환생", "회귀", "빙의"],  // 원본                 │
│    genre_scores: {  // ← 추천 엔진용                        │
│      fantasy: 0.85,                                         │
│      action: 0.15,                                          │
│      daily: 0.10,                                           │
│      thriller: 0.05,                                        │
│      comedy: 0.20                                           │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    추천 엔진                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cosine Similarity:                                        │
│  user_tastes · works.genre_scores                           │
│                                                             │
│  예시:                                                      │
│  user_tastes = {                                            │
│    fantasy: 100,                                            │
│    action: 29,                                              │
│    daily: 100,                                              │
│    thriller: 23,                                            │
│    comedy: 36                                               │
│  }                                                          │
│                                                             │
│  works.genre_scores = {                                     │
│    fantasy: 0.85,                                           │
│    action: 0.15,                                            │
│    daily: 0.10,                                             │
│    thriller: 0.05,                                          │
│    comedy: 0.20                                             │
│  }                                                          │
│                                                             │
│  → 유사도 점수 계산                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    독자 온보딩                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UI 입력:                                                   │
│  - 장르: ["fantasy", "slice-of-life"]                      │
│  - 취향: ["reincarnation", "happy-ending"]                │
│                                                             │
│         ↓                                                    │
│                                                             │
│  [calculateUserTastes()]                                    │
│  - 장르 직접 점수 (80/20)                                    │
│  - 취향 가중치 조정 (+30점)                                 │
│                                                             │
│         ↓                                                    │
│                                                             │
│  DB 저장:                                                   │
│  {                                                          │
│    preferredGenres: [...],  // 원본 (하위 호환성)          │
│    preferredTastes: [...],  // 원본 (하위 호환성)          │
│    user_tastes: {  // ← 추천 엔진용                        │
│      fantasy: 100,                                          │
│      action: 29,                                            │
│      daily: 100,                                            │
│      thriller: 23,                                          │
│      comedy: 36                                             │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ 구현 체크리스트

### 6.1 Taxonomy JSON 생성

- [ ] `public/ p_algorithms/mumu_taxonomy_unified_v2.json` 생성
- [ ] 모든 sub-tag에 `genre_weights` 정의
- [ ] `genre_mapping` 테이블 완성

### 6.2 작가 스튜디오 수정

- [ ] `creator_studio.js`에 `calculateGenreScores()` 함수 추가
- [ ] 작품 저장 시 `genre_scores` 자동 계산 및 저장
- [ ] 기존 작품에 대한 마이그레이션 스크립트 작성

### 6.3 독자 온보딩 수정

- [ ] `onboarding_reader.js`의 `calculateUserTastes()` 함수 개선
- [ ] 취향 선택 시 taxonomy의 `genre_weights` 반영
- [ ] 기존 사용자에 대한 마이그레이션 스크립트 작성

### 6.4 유틸리티 함수

- [ ] `genre_utils.js`에 통합 함수 추가:
  - `calculateGenreScores(genres, tags, taxonomy)`
  - `calculateUserTastes(genres, tastes, taxonomy)`
  - `mapToCanonicalGenre(uiGenre)`

---

## 7️⃣ 마이그레이션 전략

### 7.1 기존 작품 (works)

```javascript
// 마이그레이션 스크립트
async function migrateWorks() {
  const works = await getAllWorks();
  const taxonomy = await loadTaxonomy();

  for (const work of works) {
    if (!work.genre_scores) {
      const genreScores = calculateGenreScores(
        work.genre || [],
        work.tags || [],
        taxonomy
      );

      await updateWork(work.id, { genre_scores: genreScores });
    }
  }
}
```

### 7.2 기존 독자 (readers)

```javascript
// 마이그레이션 스크립트
async function migrateReaders() {
  const readers = await getAllReaders();
  const taxonomy = await loadTaxonomy();

  for (const reader of readers) {
    if (!reader.user_tastes || Object.keys(reader.user_tastes).length !== 5) {
      const userTastes = calculateUserTastes(
        reader.preferredGenres || [],
        reader.preferredTastes || [],
        taxonomy
      );

      await updateReader(reader.id, { user_tastes: userTastes });
    }
  }
}
```

---

## 8️⃣ 예시 시나리오

### 시나리오 1: 작가가 판타지 로맨스 작품 업로드

**입력:**

- 장르: `["fantasy", "romance"]`
- 태그: `["환생", "역하렘", "해피엔딩"]`

**계산:**

1. 장르 직접 점수: `fantasy: 0.6`
2. 태그 가중치:
   - "환생": `{ fantasy: 0.85, ... }`
   - "역하렘": `{ fantasy: 0.70, ... }`
   - "해피엔딩": `{ fantasy: 0.60, daily: 0.70, ... }`
3. 정규화 후 `genre_scores` 생성

**결과:**

```json
{
  "genre": ["fantasy", "romance"],
  "tags": ["환생", "역하렘", "해피엔딩"],
  "genre_scores": {
    "fantasy": 0.92,
    "action": 0.18,
    "daily": 0.25,
    "thriller": 0.08,
    "comedy": 0.22
  }
}
```

### 시나리오 2: 독자가 판타지와 일상을 선호

**입력:**

- 장르: `["fantasy", "slice-of-life"]`
- 취향: `["환생", "해피엔딩", "강한 여주"]`

**계산:**

1. 장르 직접 점수: `fantasy: 80, daily: 80, 나머지: 20`
2. 취향 가중치 조정:
   - "환생": `fantasy +25.5점`
   - "해피엔딩": `fantasy +18점, daily +21점`
   - "강한 여주": `fantasy +21점, action +24점`

**결과:**

```json
{
  "preferredGenres": ["fantasy", "slice-of-life"],
  "preferredTastes": ["환생", "해피엔딩", "강한 여주"],
  "user_tastes": {
    "fantasy": 100,
    "action": 44,
    "daily": 100,
    "thriller": 23,
    "comedy": 36
  }
}
```

---

## 9️⃣ 제약사항 및 주의사항

### 9.1 Genre 축 고정

- **절대 변경 금지**: `fantasy, action, daily, thriller, comedy` 5개만 사용
- 새로운 장르 추가 요청 시 → 기존 5개 중 하나로 매핑해야 함

### 9.2 DB 호환성

- 기존 필드(`genre`, `tags`, `preferredGenres`, `preferredTastes`)는 유지
- 새로운 필드(`genre_scores`, `user_tastes`) 추가
- 마이그레이션 스크립트로 기존 데이터 보완

### 9.3 점수 범위

- `works.genre_scores`: `0.0 ~ 1.0` (정규화된 값)
- `readers.user_tastes`: `0 ~ 100` (점수 기반)

### 9.4 Taxonomy 버전 관리

- Taxonomy JSON은 버전 관리 필요
- 변경 시 마이그레이션 스크립트 작성
- 하위 호환성 유지

---

## 🔟 다음 단계

1. **Taxonomy JSON 완성**: 모든 sub-tag의 `genre_weights` 정의
2. **유틸리티 함수 구현**: `genre_utils.js`에 통합 함수 추가
3. **작가 스튜디오 통합**: 작품 저장 시 `genre_scores` 자동 계산
4. **독자 온보딩 통합**: 취향 선택 시 `user_tastes` 개선
5. **마이그레이션 실행**: 기존 데이터 보완
6. **테스트**: 추천 엔진 정확도 검증

---

**작성일**: 2025-01-XX  
**버전**: 1.0  
**작성자**: System Architect
