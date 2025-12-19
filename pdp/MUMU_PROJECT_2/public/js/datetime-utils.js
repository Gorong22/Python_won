/**
 * 날짜/시간 유틸리티 함수 (KST 기준)
 * 
 * 한국 표준시(KST) 기준의 날짜/시간을 생성하고 관리합니다.
 * Firestore 이벤트 컬렉션에 사용되는 시간 필드들을 생성합니다.
 */

/**
 * 현재 시간을 KST(한국 표준시) 기준으로 반환
 * 
 * @returns {Date} KST 기준 Date 객체
 */
function getKSTDate() {
  const now = new Date();
  const kstOffset = 9 * 60; // KST는 UTC+9 (분 단위)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (kstOffset * 60000));
}

/**
 * KST 기준 현재 시간을 "YYYY-MM-DD HH:mm:ss" 형식 문자열로 반환
 * 
 * @returns {string} "YYYY-MM-DD HH:mm:ss" 형식의 KST 시간 문자열
 */
function getKSTDateTimeString() {
  const kstDate = getKSTDate();
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  const hours = String(kstDate.getHours()).padStart(2, '0');
  const minutes = String(kstDate.getMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * KST 기준 현재 날짜를 "YYYY-MM-DD" 형식 문자열로 반환
 * 
 * @returns {string} "YYYY-MM-DD" 형식의 KST 날짜 문자열
 */
function getKSTDateString() {
  const kstDate = getKSTDate();
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * KST 기준 현재 시간의 시간대(0~23)를 반환
 * 
 * @returns {number} 0~23 사이의 시간 값
 */
function getKSTHour() {
  const kstDate = getKSTDate();
  return kstDate.getHours();
}

/**
 * 세션 ID 생성 및 관리
 * 
 * session_id는 앱 진입 시 생성되며,
 * 30분 이상 비활성 상태가 지속되면 새로운 session_id를 생성합니다.
 */

// 세션 관리 상태
let sessionState = {
  sessionId: null,
  lastActivityTime: null,
  inactivityThreshold: 30 * 60 * 1000 // 30분 (밀리초)
};

/**
 * UUID v4 생성
 * 
 * @returns {string} UUID v4 형식의 문자열
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 새로운 세션 ID 생성
 * 
 * @returns {string} 새로운 session_id (UUID)
 */
function createNewSessionId() {
  const newSessionId = generateUUID();
  sessionState.sessionId = newSessionId;
  sessionState.lastActivityTime = Date.now();
  
  // localStorage에 저장 (페이지 새로고침 시에도 유지)
  if (typeof Storage !== 'undefined') {
    localStorage.setItem('session_id', newSessionId);
    localStorage.setItem('session_last_activity', sessionState.lastActivityTime.toString());
  }
  
  return newSessionId;
}

/**
 * 현재 세션 ID 가져오기 (필요 시 새로 생성)
 * 
 * @returns {string} 현재 session_id
 */
function getCurrentSessionId() {
  // localStorage에서 기존 세션 정보 로드
  if (typeof Storage !== 'undefined') {
    const storedSessionId = localStorage.getItem('session_id');
    const storedLastActivity = localStorage.getItem('session_last_activity');
    
    if (storedSessionId && storedLastActivity) {
      const lastActivity = parseInt(storedLastActivity, 10);
      const now = Date.now();
      
      // 30분 이내 활동이면 기존 세션 사용
      if (now - lastActivity < sessionState.inactivityThreshold) {
        sessionState.sessionId = storedSessionId;
        sessionState.lastActivityTime = lastActivity;
        updateSessionActivity(); // 활동 시간 업데이트
        return storedSessionId;
      }
    }
  }
  
  // 새 세션 생성
  return createNewSessionId();
}

/**
 * 세션 활동 시간 업데이트
 * 
 * 사용자 활동이 있을 때마다 호출하여 세션을 유지합니다.
 */
function updateSessionActivity() {
  sessionState.lastActivityTime = Date.now();
  
  if (typeof Storage !== 'undefined') {
    localStorage.setItem('session_last_activity', sessionState.lastActivityTime.toString());
  }
}

/**
 * 세션 초기화 (로그아웃 등)
 */
function clearSession() {
  sessionState.sessionId = null;
  sessionState.lastActivityTime = null;
  
  if (typeof Storage !== 'undefined') {
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_last_activity');
  }
}

/**
 * 이벤트 컬렉션에 사용할 공통 필드 생성
 * 
 * @param {string} uid - 사용자 UID
 * @param {string} eventType - 이벤트 타입
 * @param {number} durationMs - 이벤트 지속 시간 (밀리초, 선택사항)
 * @returns {Object} 이벤트 공통 필드 객체
 */
function createEventCommonFields(uid, eventType, durationMs = null) {
  const fields = {
    uid: uid,
    event_type: eventType,
    created_at_kst: getKSTDateTimeString(),
    created_date_kst: getKSTDateString(),
    created_hour_kst: getKSTHour(),
    session_id: getCurrentSessionId()
  };
  
  if (durationMs !== null) {
    fields.duration_ms = durationMs;
  }
  
  return fields;
}

// 전역으로 노출 (브라우저 환경)
if (typeof window !== 'undefined') {
  window.datetimeUtils = {
    getKSTDate,
    getKSTDateTimeString,
    getKSTDateString,
    getKSTHour,
    generateUUID,
    createNewSessionId,
    getCurrentSessionId,
    updateSessionActivity,
    clearSession,
    createEventCommonFields
  };
}

// 페이지 로드 시 세션 초기화
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      getCurrentSessionId(); // 세션 ID 초기화
    });
  } else {
    getCurrentSessionId(); // 이미 로드된 경우 즉시 실행
  }
  
  // 사용자 활동 추적 (마우스 이동, 키 입력 등)
  let activityTimeout;
  const trackActivity = () => {
    updateSessionActivity();
    
    // 디바운싱: 1분마다만 업데이트
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      updateSessionActivity();
    }, 60000);
  };
  
  document.addEventListener('mousemove', trackActivity);
  document.addEventListener('keydown', trackActivity);
  document.addEventListener('click', trackActivity);
  document.addEventListener('scroll', trackActivity);
}

