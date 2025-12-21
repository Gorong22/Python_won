// =========================
// Genre Utilities
// 단일 계산 엔진 - 모든 추천 점수 계산은 여기서만 수행
// =========================

let genreTaxonomy = null;
let unifiedTaxonomy = null; // 통합 Taxonomy JSON
let genreKeys = null;
let genreMapping = null; // 한글 -> 영어 key 매핑

/**
 * 통합 Taxonomy JSON 로드
 */
async function loadUnifiedTaxonomy() {
  if (unifiedTaxonomy) {
    return unifiedTaxonomy;
  }

  try {
    const response = await fetch('./ p_algorithms/mumu_taxonomy_unified_v2.json');
    if (!response.ok) {
      const encodedPath = encodeURIComponent(' p_algorithms/mumu_taxonomy_unified_v2.json');
      const fallbackResponse = await fetch(`./${encodedPath}`);
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to load unified taxonomy: ${response.status}`);
      }
      unifiedTaxonomy = await fallbackResponse.json();
    } else {
      unifiedTaxonomy = await response.json();
    }
    
    console.log("[GENRE_UTILS] 통합 Taxonomy 로드 완료:", {
      version: unifiedTaxonomy.version,
      canonicalGenres: Object.keys(unifiedTaxonomy.canonical_genres || {}),
      subTagsCount: Object.keys(unifiedTaxonomy.sub_tags || {}).length
    });
    
    return unifiedTaxonomy;
  } catch (error) {
    console.error("[GENRE_UTILS] 통합 Taxonomy 로드 실패:", error);
    return null;
  }
}

/**
 * JSON에서 장르 key 목록 추출 (하위 호환성 유지)
 */
async function loadGenreTaxonomy() {
  if (genreTaxonomy) {
    return genreTaxonomy;
  }

  try {
    // 디렉토리 이름에 공백이 있으므로 URL 인코딩 또는 상대 경로 사용
    const response = await fetch('./ p_algorithms/mumu_cluster_taxonomy_v1.json');
    if (!response.ok) {
      // 공백이 문제일 수 있으므로 URL 인코딩 시도
      const encodedPath = encodeURIComponent(' p_algorithms/mumu_cluster_taxonomy_v1.json');
      const fallbackResponse = await fetch(`./${encodedPath}`);
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to load genre taxonomy: ${response.status}`);
      }
      genreTaxonomy = await fallbackResponse.json();
    } else {
      genreTaxonomy = await response.json();
    }
    
    // 모든 클러스터에서 고유한 장르 추출
    const uniqueGenres = new Set();
    if (genreTaxonomy.clusters) {
      genreTaxonomy.clusters.forEach(cluster => {
        if (cluster.genres && Array.isArray(cluster.genres)) {
          cluster.genres.forEach(genre => {
            uniqueGenres.add(genre);
          });
        }
      });
    }
    
    // 한글 -> 영어 key 매핑 정의 (JSON 기준)
    // JSON에 있는 장르만 사용
    genreMapping = {
      "판타지": "fantasy",
      "액션": "action",
      "일상": "daily",
      "스릴러": "thriller",
      "개그": "comedy",
      "코미디": "comedy", // 개그와 동일
      "로맨스": "romance",
      "드라마": "drama",
      "감성": "emotional",
      "스포츠": "sports",
      "무협/사극": "martial",
      "공포": "horror"
    };
    
    // 영어 key만 필터링 (JSON에 실제로 존재하는 것만)
    // 요구사항: fantasy, action, daily, thriller, comedy만 사용
    const allowedKeys = ["fantasy", "action", "daily", "thriller", "comedy"];
    genreKeys = Array.from(uniqueGenres)
      .map(korean => genreMapping[korean])
      .filter(key => key !== undefined && allowedKeys.includes(key)) // 허용된 key만 사용
      .filter((value, index, self) => self.indexOf(value) === index); // 중복 제거
    
    // 허용된 key 중 JSON에 없는 것도 포함 (기본값으로)
    allowedKeys.forEach(key => {
      if (!genreKeys.includes(key)) {
        genreKeys.push(key);
      }
    });
    genreKeys.sort(); // 정렬
    
    console.log("[GENRE_UTILS] 장르 taxonomy 로드 완료:", {
      totalClusters: genreTaxonomy.clusters?.length || 0,
      uniqueGenres: Array.from(uniqueGenres),
      genreKeys: genreKeys
    });
    
    return genreTaxonomy;
  } catch (error) {
    console.error("[GENRE_UTILS] JSON 로드 실패:", error);
    // 기본값 반환 (fallback)
    genreKeys = ["fantasy", "action", "daily", "thriller", "comedy"];
    genreMapping = {
      "판타지": "fantasy",
      "액션": "action",
      "일상": "daily",
      "스릴러": "thriller",
      "개그": "comedy",
      "코미디": "comedy"
    };
    return null;
  }
}

/**
 * 장르 key 목록 가져오기
 */
async function getGenreKeys() {
  if (!genreKeys) {
    await loadGenreTaxonomy();
  }
  return genreKeys || ["fantasy", "action", "daily", "thriller", "comedy"];
}

/**
 * 한글 장르를 영어 key로 변환
 */
function koreanToKey(koreanGenre) {
  if (!genreMapping) {
    // 기본 매핑
    const defaultMapping = {
      "판타지": "fantasy",
      "액션": "action",
      "일상": "daily",
      "스릴러": "thriller",
      "개그": "comedy",
      "코미디": "comedy"
    };
    return defaultMapping[koreanGenre] || null;
  }
  return genreMapping[koreanGenre] || null;
}

/**
 * 영어 key를 한글 장르로 변환
 */
function keyToKorean(genreKey) {
  if (!genreMapping) {
    const defaultMapping = {
      "fantasy": "판타지",
      "action": "액션",
      "daily": "일상",
      "thriller": "스릴러",
      "comedy": "코미디"
    };
    return defaultMapping[genreKey] || null;
  }
  
  for (const [korean, key] of Object.entries(genreMapping)) {
    if (key === genreKey) {
      return korean;
    }
  }
  return null;
}

/**
 * 초기 genreScores 객체 생성 (모든 장르 50으로 초기화)
 */
async function createInitialGenreScores() {
  const keys = await getGenreKeys();
  const scores = {};
  keys.forEach(key => {
    scores[key] = 50;
  });
  return scores;
}

/**
 * user_tastes를 genreScores 형태로 변환
 * user_tastes는 { fantasy: number, action: number, ... } 형태
 */
function userTastesToGenreScores(userTastes) {
  if (!userTastes || typeof userTastes !== 'object') {
    return null;
  }
  
  // user_tastes가 이미 올바른 형태인지 확인
  const keys = Object.keys(userTastes);
  const validKeys = ["fantasy", "action", "daily", "thriller", "comedy"];
  
  // 모든 key가 유효한지 확인
  const isValid = keys.every(key => validKeys.includes(key));
  
  if (isValid) {
    return { ...userTastes };
  }
  
  // 기존 형태 (preferredGenres 배열)에서 변환
  return null;
}

/**
 * UI 장르 → Canonical 장르 매핑
 * @param {string} uiGenre - UI에서 사용하는 장르 값
 * @returns {string|null} canonical genre key 또는 null
 */
function mapToCanonicalGenre(uiGenre) {
  if (!uiGenre || typeof uiGenre !== 'string') {
    return null;
  }

  // 통합 Taxonomy의 매핑 테이블 사용
  if (unifiedTaxonomy && unifiedTaxonomy.genre_mapping && unifiedTaxonomy.genre_mapping.ui_to_canonical) {
    const mapping = unifiedTaxonomy.genre_mapping.ui_to_canonical;
    if (mapping[uiGenre]) {
      return mapping[uiGenre];
    }
  }

  // 기본 매핑 (fallback)
  const defaultMapping = {
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
  };

  return defaultMapping[uiGenre] || null;
}

/**
 * 태그 문자열을 tag_id로 변환 (aliases 포함 검색)
 * @param {string} tagDisplayName - 태그 표시명 또는 별칭
 * @param {object} taxonomy - 통합 Taxonomy 객체
 * @returns {string|null} tag_id 또는 null
 */
function findTagIdByDisplayName(tagDisplayName, taxonomy) {
  if (!tagDisplayName || !taxonomy || !taxonomy.sub_tags) {
    return null;
  }

  const normalized = tagDisplayName.trim().toLowerCase();

  for (const [tagId, tagDef] of Object.entries(taxonomy.sub_tags)) {
    // display_name 매칭
    if (tagDef.display_name && tagDef.display_name.toLowerCase() === normalized) {
      return tagId;
    }

    // aliases 매칭
    if (tagDef.aliases && Array.isArray(tagDef.aliases)) {
      const matched = tagDef.aliases.some(alias => alias.toLowerCase() === normalized);
      if (matched) {
        return tagId;
      }
    }
  }

  return null;
}

/**
 * 작가 입력(장르 + 태그) → genre_scores 변환
 * 단일 계산 엔진의 핵심 함수
 * @param {string[]} genres - 선택된 장르 배열 (UI 값)
 * @param {string[]} tags - 선택된 태그 배열 (표시명 또는 별칭)
 * @param {object} taxonomy - 통합 Taxonomy 객체 (선택적, 없으면 자동 로드)
 * @returns {Promise<object>} genre_scores 객체 { fantasy: 0.0~1.0, ... }
 */
async function calculateGenreScores(genres = [], tags = [], taxonomy = null) {
  // Taxonomy 로드
  if (!taxonomy) {
    taxonomy = await loadUnifiedTaxonomy();
    if (!taxonomy) {
      console.warn("[GENRE_UTILS] Taxonomy 로드 실패, 기본값 반환");
      return {
        fantasy: 0.0,
        action: 0.0,
        daily: 0.0,
        thriller: 0.0,
        comedy: 0.0
      };
    }
  }

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
  (Array.isArray(genres) ? genres : []).forEach((genre) => {
    const canonicalKey = mapToCanonicalGenre(genre);
    if (canonicalKey && genreScores.hasOwnProperty(canonicalKey)) {
      genreScores[canonicalKey] += genreBaseWeight;
    }
  });

  // 3. 선택된 태그의 genre_weights 누적
  (Array.isArray(tags) ? tags : []).forEach((tag) => {
    const tagId = findTagIdByDisplayName(tag, taxonomy);
    if (tagId && taxonomy.sub_tags[tagId] && taxonomy.sub_tags[tagId].genre_weights) {
      const tagDef = taxonomy.sub_tags[tagId];
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
 * 독자 입력(장르 + 취향) → user_tastes 변환
 * 단일 계산 엔진의 핵심 함수
 * @param {string[]} genres - 선택된 장르 배열 (UI 값)
 * @param {string[]} tastes - 선택된 취향 배열 (표시명 또는 별칭)
 * @param {object} taxonomy - 통합 Taxonomy 객체 (선택적, 없으면 자동 로드)
 * @returns {Promise<object>} user_tastes 객체 { fantasy: 0~100, ... }
 */
async function calculateUserTastes(genres = [], tastes = [], taxonomy = null) {
  // Taxonomy 로드
  if (!taxonomy) {
    taxonomy = await loadUnifiedTaxonomy();
    if (!taxonomy) {
      console.warn("[GENRE_UTILS] Taxonomy 로드 실패, 기본값 반환");
      return {
        fantasy: 50,
        action: 50,
        daily: 50,
        thriller: 50,
        comedy: 50
      };
    }
  }

  // 1. 초기화: 모든 genre를 50으로 시작 (중립)
  const userTastes = {
    fantasy: 50,
    action: 50,
    daily: 50,
    thriller: 50,
    comedy: 50,
  };

  // 2. 선택된 장르에 높은 점수 부여
  (Array.isArray(genres) ? genres : []).forEach((genre) => {
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
  (Array.isArray(tastes) ? tastes : []).forEach((taste) => {
    const tagId = findTagIdByDisplayName(taste, taxonomy);
    if (tagId && taxonomy.sub_tags[tagId] && taxonomy.sub_tags[tagId].genre_weights) {
      const tagDef = taxonomy.sub_tags[tagId];
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

// 전역으로 노출
window.genreUtils = {
  loadGenreTaxonomy,
  loadUnifiedTaxonomy,
  getGenreKeys,
  koreanToKey,
  keyToKorean,
  createInitialGenreScores,
  userTastesToGenreScores,
  mapToCanonicalGenre,
  findTagIdByDisplayName,
  calculateGenreScores,
  calculateUserTastes
};

export {
  loadGenreTaxonomy,
  loadUnifiedTaxonomy,
  getGenreKeys,
  koreanToKey,
  keyToKorean,
  createInitialGenreScores,
  userTastesToGenreScores,
  mapToCanonicalGenre,
  findTagIdByDisplayName,
  calculateGenreScores,
  calculateUserTastes
};

