// =========================
// MOODBOARD TEMPLATES
// 프론트 전용 템플릿 정의
// 슬롯 기반 레이아웃 구조
// 모든 슬롯은 1:1 비율 (size 속성 사용)
// =========================

const MOODBOARD_TEMPLATES = [
  {
    id: "free",
    type: "free",
    name: "자유형",
    description: "자유롭게 배치하기",
  },

  // 템플릿 1: 클린 그리드 4컷 (화면 가득 채우기)
  {
    id: "clean_grid_4",
    type: "template",
    name: "클린 그리드 4컷",
    description: "깔끔하게 정리된 4컷",
    slots: [
      { id: "a", x: 0, y: 0, w: 50, h: 50, role: "main" },
      { id: "b", x: 50, y: 0, w: 50, h: 50, role: "main" },
      { id: "c", x: 0, y: 50, w: 50, h: 50, role: "main" },
      { id: "d", x: 50, y: 50, w: 50, h: 50, role: "main" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "clean"
  },

  // 템플릿 2: 중앙 집중형 (1컷) - 화면 가득 채우기
  {
    id: "focus_center",
    type: "template",
    name: "중앙 집중",
    description: "하나의 컷에 집중하기",
    slots: [
      { id: "a", x: 5, y: 5, w: 90, h: 90, role: "main" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "focus"
  },

  // 템플릿 3: 그리드 6컷 - 화면 가득 채우기
  {
    id: "grid_6",
    type: "template",
    name: "그리드 6컷",
    description: "6개의 컷을 깔끔하게",
    slots: [
      { id: "a", x: 0, y: 0, w: 33, h: 33, role: "main" },
      { id: "b", x: 33.5, y: 0, w: 33, h: 33, role: "sub" },
      { id: "c", x: 67, y: 0, w: 33, h: 33, role: "sub" },
      { id: "d", x: 0, y: 33.5, w: 33, h: 33, role: "sub" },
      { id: "e", x: 33.5, y: 33.5, w: 33, h: 33, role: "main" },
      { id: "f", x: 67, y: 33.5, w: 33, h: 33, role: "sub" }
    ],
    defaultBackground: "#FFFFFF",
    defaultMood: "clean"
  },

  // 템플릿 4: 대형 + 소형 3컷 - 화면 가득 채우기
  {
    id: "large_small_3",
    type: "template",
    name: "대형 + 소형 3컷",
    description: "하나 강조, 나머지 보조",
    slots: [
      { id: "a", x: 0, y: 0, w: 58, h: 58, role: "main" },
      { id: "b", x: 60, y: 0, w: 40, h: 40, role: "sub" },
      { id: "c", x: 60, y: 42, w: 40, h: 40, role: "sub" }
    ],
    defaultBackground: "#FAFAFA",
    defaultMood: "soft_day"
  },

  // 템플릿 5: 좌우 대칭 - 화면 가득 채우기
  {
    id: "symmetry_2",
    type: "template",
    name: "좌우 대칭",
    description: "두 컷의 대칭 배치",
    slots: [
      { id: "a", x: 0, y: 15, w: 50, h: 50, role: "main" },
      { id: "b", x: 50, y: 15, w: 50, h: 50, role: "main" }
    ],
    defaultBackground: "#F5F5F5",
    defaultMood: "soft_day"
  },

  // 템플릿 6: 상하 2단 - 화면 가득 채우기
  {
    id: "vertical_2",
    type: "template",
    name: "상하 2단",
    description: "위아래로 배치",
    slots: [
      { id: "a", x: 15, y: 0, w: 70, h: 48, role: "main" },
      { id: "b", x: 15, y: 52, w: 70, h: 48, role: "main" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "clean"
  },

  // 템플릿 7: 3단 그리드 - 화면 가득 채우기
  {
    id: "grid_3",
    type: "template",
    name: "3단 그리드",
    description: "세로로 3개 배치",
    slots: [
      { id: "a", x: 25, y: 0, w: 50, h: 32, role: "main" },
      { id: "b", x: 25, y: 34, w: 50, h: 32, role: "main" },
      { id: "c", x: 25, y: 68, w: 50, h: 32, role: "main" }
    ],
    defaultBackground: "#FFFFFF",
    defaultMood: "clean"
  },

  // 템플릿 8: 대각선 배치 - 화면 가득 채우기
  {
    id: "diagonal",
    type: "template",
    name: "대각선 배치",
    description: "대각선으로 흩어뜨리기",
    slots: [
      { id: "a", x: 0, y: 0, w: 48, h: 48, role: "main" },
      { id: "b", x: 52, y: 52, w: 48, h: 48, role: "main" }
    ],
    defaultBackground: "#FAFAFA",
    defaultMood: "memory"
  },

  // 템플릿 9: 9컷 그리드 - 화면 가득 채우기
  {
    id: "grid_9",
    type: "template",
    name: "9컷 그리드",
    description: "9개의 컷을 정렬",
    slots: [
      { id: "a", x: 0, y: 0, w: 33, h: 33, role: "sub" },
      { id: "b", x: 33.5, y: 0, w: 33, h: 33, role: "main" },
      { id: "c", x: 67, y: 0, w: 33, h: 33, role: "sub" },
      { id: "d", x: 0, y: 33.5, w: 33, h: 33, role: "sub" },
      { id: "e", x: 33.5, y: 33.5, w: 33, h: 33, role: "main" },
      { id: "f", x: 67, y: 33.5, w: 33, h: 33, role: "sub" },
      { id: "g", x: 0, y: 67, w: 33, h: 33, role: "sub" },
      { id: "h", x: 33.5, y: 67, w: 33, h: 33, role: "sub" },
      { id: "i", x: 67, y: 67, w: 33, h: 33, role: "sub" }
    ],
    defaultBackground: "#FFFFFF",
    defaultMood: "clean"
  },

  // 템플릿 10: 중앙 + 주변 4컷 - 화면 가득 채우기
  {
    id: "center_around",
    type: "template",
    name: "중앙 + 주변 4컷",
    description: "중앙 강조, 주변 보조",
    slots: [
      { id: "a", x: 25, y: 25, w: 50, h: 50, role: "main" },
      { id: "b", x: 0, y: 0, w: 24, h: 24, role: "sub" },
      { id: "c", x: 76, y: 0, w: 24, h: 24, role: "sub" },
      { id: "d", x: 0, y: 76, w: 24, h: 24, role: "sub" },
      { id: "e", x: 76, y: 76, w: 24, h: 24, role: "sub" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "focus"
  },
  
  // 템플릿 11: 상단 메인 + 하단 2컷
  {
    id: "main_top_2_bottom",
    type: "template",
    name: "상단 메인 + 하단 2컷",
    description: "상단 강조, 하단 보조",
    slots: [
      { id: "a", x: 0, y: 0, w: 100, h: 60, role: "main" },
      { id: "b", x: 0, y: 62, w: 50, h: 38, role: "sub" },
      { id: "c", x: 50, y: 62, w: 50, h: 38, role: "sub" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "focus"
  },
  
  // 템플릿 12: 좌측 메인 + 우측 2컷
  {
    id: "main_left_2_right",
    type: "template",
    name: "좌측 메인 + 우측 2컷",
    description: "좌측 강조, 우측 보조",
    slots: [
      { id: "a", x: 0, y: 0, w: 60, h: 100, role: "main" },
      { id: "b", x: 62, y: 0, w: 38, h: 50, role: "sub" },
      { id: "c", x: 62, y: 50, w: 38, h: 50, role: "sub" }
    ],
    defaultBackground: "#F8FAFC",
    defaultMood: "soft_day"
  }
];

// 템플릿 가져오기
function getTemplate(templateId) {
  return MOODBOARD_TEMPLATES.find(t => t.id === templateId);
}

// 자유형 템플릿 가져오기
function getFreeTemplate() {
  return MOODBOARD_TEMPLATES.find(t => t.type === "free");
}

// 템플릿 목록 가져오기 (자유형 제외)
function getTemplateList() {
  return MOODBOARD_TEMPLATES.filter(t => t.type === "template");
}

// 슬롯 좌표를 블록 좌표로 변환
// size 속성 사용 (1:1 비율 슬롯)
function slotToBlock(slot, canvasWidth, canvasHeight) {
  const size = slot.size || (slot.w && slot.h ? Math.min(slot.w, slot.h) : 0.3);
  return {
    x: slot.x,
    y: slot.y,
    w: size,
    h: size,
    rotation: 0,
    z_index: 1
  };
}

// 전역 export
window.MOODBOARD_TEMPLATES = MOODBOARD_TEMPLATES;
window.getTemplate = getTemplate;
window.getFreeTemplate = getFreeTemplate;
window.getTemplateList = getTemplateList;
window.slotToBlock = slotToBlock;

