/**
 * Firestore 유틸리티 함수
 * 
 * 독자(reader) 관련 Firestore 컬렉션 작업을 위한 헬퍼 함수들입니다.
 * 
 * 주요 컬렉션:
 * - readers: 독자 기본 정보
 * - reader_consents: 약관 동의 정보
 * - reader_onboarding: 온보딩 정보
 */

/**
 * Firestore 인스턴스 가져오기
 * 
 * @returns {firebase.firestore.Firestore} Firestore 인스턴스
 */
function getFirestore() {
  if (typeof window !== 'undefined' && window.firebaseUtils) {
    return window.firebaseUtils.getFirestore();
  }
  
  // 폴백: 직접 firebase 사용
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK is not loaded. Please include Firebase scripts.');
  }
  
  if (firebase.apps.length === 0) {
    throw new Error('Firebase is not initialized. Please initialize Firebase first.');
  }
  
  return firebase.firestore();
}

/**
 * KST 시간 문자열 가져오기
 * 
 * @returns {string} KST 시간 문자열
 */
function getKSTString() {
  if (typeof window !== 'undefined' && window.datetimeUtils) {
    return window.datetimeUtils.getKSTDateTimeString();
  }
  return new Date().toISOString();
}

// =========================
// readers 컬렉션
// =========================

/**
 * 독자 정보 생성
 * 
 * @param {string} uid - 사용자 UID (docId)
 * @param {Object} readerData - 독자 정보 객체
 * @param {string} readerData.username - 사용자명
 * @param {string} readerData.email - 이메일
 * @param {string} readerData.name - 이름
 * @param {string} readerData.nickname - 닉네임
 * @param {Object} readerData.birth - 생년월일 {year, month, day}
 * @param {string} readerData.gender - 성별 ("male" | "female")
 * @returns {Promise<void>}
 */
async function createReader(uid, readerData) {
  const firestore = getFirestore();
  const kstString = getKSTString();
  
  const readerDoc = {
    uid: uid,
    username: readerData.username,
    email: readerData.email,
    name: readerData.name,
    nickname: readerData.nickname,
    birth: {
      year: readerData.birth.year,
      month: readerData.birth.month,
      day: readerData.birth.day
    },
    gender: readerData.gender,
    status: 'active',
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    created_at_kst: kstString,
    last_login_at: firebase.firestore.FieldValue.serverTimestamp(),
    onboarding_completed: false
  };
  
  await firestore.collection('readers').doc(uid).set(readerDoc);
}

/**
 * 독자 정보 조회
 * 
 * @param {string} uid - 사용자 UID
 * @returns {Promise<Object|null>} 독자 정보 또는 null
 */
async function getReader(uid) {
  const firestore = getFirestore();
  const doc = await firestore.collection('readers').doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

/**
 * 독자 정보 업데이트
 * 
 * @param {string} uid - 사용자 UID
 * @param {Object} updateData - 업데이트할 데이터 (부분 업데이트 가능)
 * @returns {Promise<void>}
 */
async function updateReader(uid, updateData) {
  const firestore = getFirestore();
  await firestore.collection('readers').doc(uid).update(updateData);
}

// =========================
// reader_consents 컬렉션
// =========================

/**
 * 약관 동의 정보 생성
 * 
 * @param {string} uid - 사용자 UID (docId)
 * @param {Object} consentData - 약관 동의 정보
 * @param {boolean} consentData.terms_of_service - 이용약관 동의
 * @param {boolean} consentData.privacy_policy - 개인정보 처리방침 동의
 * @param {boolean} consentData.marketing_opt_in - 마케팅 정보 수신 동의 (선택)
 * @returns {Promise<void>}
 */
async function createReaderConsent(uid, consentData) {
  const firestore = getFirestore();
  const kstString = getKSTString();
  
  const consentDoc = {
    uid: uid,
    terms_of_service: consentData.terms_of_service,
    privacy_policy: consentData.privacy_policy,
    marketing_opt_in: consentData.marketing_opt_in || false,
    agreed_at: firebase.firestore.FieldValue.serverTimestamp(),
    agreed_at_kst: kstString
  };
  
  await firestore.collection('reader_consents').doc(uid).set(consentDoc);
}

/**
 * 약관 동의 정보 조회
 * 
 * @param {string} uid - 사용자 UID
 * @returns {Promise<Object|null>} 약관 동의 정보 또는 null
 */
async function getReaderConsent(uid) {
  const firestore = getFirestore();
  const doc = await firestore.collection('reader_consents').doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

// =========================
// reader_onboarding 컬렉션
// =========================

/**
 * 온보딩 정보 생성
 * 
 * @param {string} uid - 사용자 UID (docId)
 * @param {Object} onboardingData - 온보딩 정보
 * @param {string[]} onboardingData.preferred_genres - 선호 장르 배열
 * @param {string[]} onboardingData.preferred_tags - 선호 태그 배열
 * @param {number} onboardingData.durationMs - 온보딩 완료까지 걸린 시간 (밀리초)
 * @returns {Promise<void>}
 */
async function createReaderOnboarding(uid, onboardingData) {
  const firestore = getFirestore();
  const kstString = getKSTString();
  
  const onboardingDoc = {
    uid: uid,
    preferred_genres: onboardingData.preferred_genres || [],
    preferred_tags: onboardingData.preferred_tags || [],
    completed: true,
    completed_at: firebase.firestore.FieldValue.serverTimestamp(),
    completed_at_kst: kstString,
    duration_ms: onboardingData.durationMs || 0
  };
  
  await firestore.collection('reader_onboarding').doc(uid).set(onboardingDoc);
  
  // readers 컬렉션의 onboarding_completed 업데이트
  await updateReader(uid, {
    onboarding_completed: true
  });
}

/**
 * 온보딩 정보 조회
 * 
 * @param {string} uid - 사용자 UID
 * @returns {Promise<Object|null>} 온보딩 정보 또는 null
 */
async function getReaderOnboarding(uid) {
  const firestore = getFirestore();
  const doc = await firestore.collection('reader_onboarding').doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data();
}

// =========================
// 이벤트 컬렉션 (공통)
// =========================

/**
 * 이벤트 컬렉션에 이벤트 추가
 * 
 * @param {string} collectionName - 컬렉션 이름 (예: 'feed_events', 'work_view_events' 등)
 * @param {Object} eventData - 이벤트 데이터 (공통 필드는 자동 추가됨)
 * @param {string} eventData.uid - 사용자 UID
 * @param {string} eventData.event_type - 이벤트 타입
 * @param {number} [eventData.duration_ms] - 이벤트 지속 시간 (선택사항)
 * @param {Object} [eventData.additionalFields] - 추가 필드들
 * @returns {Promise<string>} 생성된 문서 ID
 */
async function addEvent(collectionName, eventData) {
  const firestore = getFirestore();
  
  // 공통 필드 생성
  if (typeof window !== 'undefined' && window.datetimeUtils) {
    const commonFields = window.datetimeUtils.createEventCommonFields(
      eventData.uid,
      eventData.event_type,
      eventData.duration_ms
    );
    
    // 추가 필드와 병합
    const { uid, event_type, duration_ms, ...additionalFields } = eventData;
    const eventDoc = {
      ...commonFields,
      ...additionalFields,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await firestore.collection(collectionName).add(eventDoc);
    return docRef.id;
  } else {
    // 폴백: 기본 필드만 사용
    const eventDoc = {
      uid: eventData.uid,
      event_type: eventData.event_type,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      created_at_kst: getKSTString(),
      ...eventData
    };
    
    const docRef = await firestore.collection(collectionName).add(eventDoc);
    return docRef.id;
  }
}

// 전역으로 노출 (브라우저 환경)
if (typeof window !== 'undefined') {
  window.firestoreUtils = {
    createReader,
    getReader,
    updateReader,
    createReaderConsent,
    getReaderConsent,
    createReaderOnboarding,
    getReaderOnboarding,
    addEvent
  };
}

