/**
 * Firebase 초기화 및 유틸리티 함수
 * 
 * 브라우저 환경에서 Firebase SDK를 사용하기 위한 헬퍼 함수들입니다.
 * Firebase SDK는 전역 변수로 로드되어야 합니다.
 */

/**
 * Firebase App 초기화
 * 이미 초기화되어 있으면 기존 인스턴스를 반환합니다.
 * 
 * @param {Object} config - Firebase 설정 객체 (선택사항, 없으면 window.FIREBASE_CONFIG 사용)
 * @returns {firebase.app.App} Firebase App 인스턴스
 */
function initializeFirebase(config) {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK is not loaded. Please include Firebase scripts before this file.');
  }

  try {
    // 이미 초기화되어 있는지 확인
    if (firebase.apps.length > 0) {
      return firebase.app();
    }

    // 설정 가져오기
    const firebaseConfig = config || window.FIREBASE_CONFIG;
    
    if (!firebaseConfig) {
      throw new Error('Firebase configuration is missing. Please set FIREBASE_CONFIG.');
    }

    // Firebase 초기화
    return firebase.initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

/**
 * Firebase App 인스턴스 반환
 * 
 * @returns {firebase.app.App} Firebase App 인스턴스
 */
function getFirebaseApp() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK is not loaded.');
  }

  if (firebase.apps.length === 0) {
    return initializeFirebase();
  }

  return firebase.app();
}

/**
 * Firebase Auth 인스턴스 반환
 * 
 * @returns {firebase.auth.Auth} Firebase Auth 인스턴스
 */
function getAuth() {
  const app = getFirebaseApp();
  return firebase.auth(app);
}

/**
 * Firestore 인스턴스 반환
 * 
 * @returns {firebase.firestore.Firestore} Firestore 인스턴스
 */
function getFirestore() {
  const app = getFirebaseApp();
  return firebase.firestore(app);
}

/**
 * Firebase Storage 인스턴스 반환
 * 
 * @returns {firebase.storage.Storage} Firebase Storage 인스턴스
 */
function getStorage() {
  const app = getFirebaseApp();
  return firebase.storage(app);
}

// 전역으로 노출 (브라우저 환경)
if (typeof window !== 'undefined') {
  window.firebaseUtils = {
    initializeFirebase,
    getFirebaseApp,
    getAuth,
    getFirestore,
    getStorage
  };
}
