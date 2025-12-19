// public/js/firebase_init.js
// Firebase 초기화 단일화 - 모든 파일에서 이 파일만 사용
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase 프로젝트 설정 (실제 값)
const firebaseConfig = {
  apiKey: "AIzaSyB9CE6mr0leyh9DL_PLDD_nm3MBY6HZzrE",
  authDomain: "mumu-3db59.firebaseapp.com",
  projectId: "mumu-3db59",
  storageBucket: "mumu-3db59.firebasestorage.app",
  messagingSenderId: "436159743714",
  appId: "1:436159743714:web:49330772ad51141ace00bb",
};

// Firebase 초기화 (한 번만 실행)
let app;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
