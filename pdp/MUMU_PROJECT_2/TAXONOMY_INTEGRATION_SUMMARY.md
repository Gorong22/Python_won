# 통합 Taxonomy 시스템 구현 완료 보고서

## 📋 개요

기존 분산된 장르/취향 로직을 단일 Taxonomy 기반으로 통합 완료했습니다.

**구현 일자**: 2025-01-XX  
**버전**: 2.0

---

## ✅ 완료된 작업

### 1️⃣ 통합 Taxonomy JSON 생성

**파일**: `/public/ p_algorithms/mumu_taxonomy_unified_v2.json`

**구조**:
- `canonical_genres`: 고정 5개 장르 (fantasy, action, daily, thriller, comedy)
- `sub_tags`: 스토리 요소/분위기/캐릭터/배경 태그 (각각 `genre_weights` 포함)
- `genre_mapping.ui_to_canonical`: UI 장르 → Canonical 장르 매핑 테이블

**주요 태그 예시**:
- `reincarnation` (환생): fantasy 중심
- `regression` (회귀): fantasy + action
- `happy-ending` (해피엔딩): fantasy + daily
- `strong-female-lead` (강한 여주): fantasy + action
- `healing` (치유물): daily 중심
- 등 20개 이상의 주요 태그 정의

---

### 2️⃣ genre_utils.js 단일 계산 엔진 구현

**파일**: `/public/js/genre_utils.js`

**추가된 핵심 함수**:

#### `calculateGenreScores(genres, tags, taxonomy)`
- **용도**: 작가 입력(장르 + 태그) → `genre_scores` 변환
- **입력**: 
  - `genres`: 선택된 장르 배열 (UI 값)
  - `tags`: 선택된 태그 배열 (표시명 또는 별칭)
  - `taxonomy`: 통합 Taxonomy 객체 (선택적)
- **출력**: `{ fantasy: 0.0~1.0, action: 0.0~1.0, ... }`
- **알고리즘**:
  1. 장르 직접 점수 (가중치 0.6)
  2. 태그 가중치 누적 (가중치 0.4)
  3. 정규화 (최대값 1.0)

#### `calculateUserTastes(genres, tastes, taxonomy)`
- **용도**: 독자 입력(장르 + 취향) → `user_tastes` 변환
- **입력**:
  - `genres`: 선택된 장르 배열 (UI 값)
  - `tastes`: 선택된 취향 배열 (표시명 또는 별칭)
  - `taxonomy`: 통합 Taxonomy 객체 (선택적)
- **출력**: `{ fantasy: 0~100, action: 0~100, ... }`
- **알고리즘**:
  1. 장르 직접 점수 (선택: 80점, 미선택: 20점)
  2. 취향 가중치 조정 (+30점, 최대 100점)

#### `mapToCanonicalGenre(uiGenre)`
- **용도**: UI 장르 → Canonical 장르 매핑
- **예시**: `"romance"` → `"fantasy"`, `"slice-of-life"` → `"daily"`

#### `findTagIdByDisplayName(tagDisplayName, taxonomy)`
- **용도**: 태그 표시명/별칭 → `tag_id` 변환
- **지원**: `display_name` 및 `aliases` 매칭

---

### 3️⃣ 작가 스튜디오 연동

**파일**: `/public/js/creator_studio.js`

**수정 내용**:
- `handleSaveDraft()`: 임시저장 시 `genre_scores` 자동 계산 및 저장
- `handlePublish()`: 게시 시 `genre_scores` 자동 계산 및 저장

**저장 구조**:
```javascript
{
  genre: ["fantasy", "romance"],      // 원본 (UI 호환성)
  tags: ["환생", "회귀"],              // 원본 (UI 호환성)
  genre_scores: {                     // ← 추천 엔진용
    fantasy: 0.85,
    action: 0.15,
    daily: 0.10,
    thriller: 0.05,
    comedy: 0.20
  }
}
```

---

### 4️⃣ 독자 온보딩 연동

**파일**: `/public/js/onboarding_reader.js`

**수정 내용**:
- `calculateUserTastes()` 함수 사용으로 변경
- 통합 Taxonomy 기반 취향 계산

**저장 구조**:
```javascript
{
  preferredGenres: ["fantasy", "slice-of-life"],  // 원본 (하위 호환성)
  preferredTastes: ["환생", "해피엔딩"],           // 원본 (하위 호환성)
  user_tastes: {                                  // ← 추천 엔진용
    fantasy: 100,
    action: 29,
    daily: 100,
    thriller: 23,
    comedy: 36
  }
}
```

---

## 📊 추천 계산 흐름 다이어그램

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
│  [calculateGenreScores()]                                  │
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
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    독자 온보딩                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UI 입력:                                                   │
│  - 장르: ["fantasy", "slice-of-life"]                      │
│  - 취향: ["환생", "해피엔딩"]                               │
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

## 📁 생성/변경된 파일 목록

### 새로 생성된 파일
1. `/public/ p_algorithms/mumu_taxonomy_unified_v2.json` - 통합 Taxonomy JSON

### 수정된 파일
1. `/public/js/genre_utils.js` - 단일 계산 엔진 구현
2. `/public/js/creator_studio.js` - 작가 스튜디오 연동
3. `/public/js/onboarding_reader.js` - 독자 온보딩 연동

---

## 🔑 핵심 원칙 준수 확인

✅ **기존 JSON 파일 삭제 금지**: 기존 JSON 파일은 모두 유지  
✅ **기존 DB 컬럼 구조 변경 금지**: `genre`, `tags`, `preferredGenres`, `preferredTastes` 유지  
✅ **추천 엔진 축 5개 고정**: fantasy, action, daily, thriller, comedy만 사용  
✅ **추천 계산 로직 단일화**: `genre_utils.js`에만 존재  
✅ **기존 화면/UI 동작 유지**: 모든 UI 동작 그대로 유지  

---

## 🎯 다음 단계 (권장)

1. **기존 데이터 마이그레이션**
   - 기존 `works` 테이블의 작품들에 `genre_scores` 계산 및 저장
   - 기존 `readers` 테이블의 사용자들에 `user_tastes` 계산 및 저장

2. **추천 엔진 통합**
   - 추천 엔진에서 `genre_scores`와 `user_tastes` 사용하도록 수정
   - 기존 로직 대신 통합 Taxonomy 기반 계산 사용

3. **테스트**
   - 작가 작품 업로드 시 `genre_scores` 정확도 검증
   - 독자 온보딩 시 `user_tastes` 정확도 검증
   - 추천 결과 품질 검증

---

## 📝 참고사항

- 모든 계산은 `genre_utils.js`의 함수를 통해서만 수행됩니다.
- Taxonomy JSON 교체만으로 추천 규칙 변경이 가능합니다.
- 작가와 독자가 같은 태그를 선택하면 같은 의미로 작동합니다.
- 기존 필드는 하위 호환성을 위해 유지됩니다.

---

**작성자**: System Architect  
**검토 필요**: 추천 엔진 팀, 데이터베이스 팀

