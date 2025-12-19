/**
 * ⚠️ Auth email 규칙은 반드시 username@mumu.app 로 통일할 것.
 * 회원가입/로그인 불일치 시 인증 실패 발생함.
 */

// Firebase v9+ CDN imports (ES Module 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase Configuration (실제 값으로 직접 선언)
const firebaseConfig = {
  apiKey: "AIzaSyB9CE6mr0leyh9DL_PLDD_nm3MBY6HZzrE",
  authDomain: "mumu-3db59.firebaseapp.com",
  projectId: "mumu-3db59",
  storageBucket: "mumu-3db59.firebasestorage.app",
  messagingSenderId: "436159743714",
  appId: "1:436159743714:web:49330772ad51141ace00bb",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// KST 시간 유틸 함수
function getKSTString() {
  const now = new Date();
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

// 생년월일로 만 나이 계산
function calculateAge(year, month, day) {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

// 성별 선택 함수 (전역으로 노출)
let selectedGender = null;
window.selectGender = function (value) {
  selectedGender = value;
  document.getElementById("gender").value = value;

  // Update button styles
  document.querySelectorAll(".gender-btn").forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.dataset.value === value) {
      btn.classList.add("selected");
    }
  });
};

// Form submission handler
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("accountForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("submitBtn");
      const errorMessage = document.getElementById("errorMessage");

      // Clear previous errors
      errorMessage.classList.remove("show");
      submitBtn.disabled = true;
      submitBtn.textContent = "처리 중...";

      try {
        // 약관 동의 확인
        const readerAgreements = sessionStorage.getItem("readerAgreements");
        if (!readerAgreements) {
          throw new Error("약관 동의가 필요합니다.");
        }

        const agreements = JSON.parse(readerAgreements);
        if (!agreements.privacy || !agreements.terms) {
          throw new Error("필수 약관에 동의해주세요.");
        }

        // Get form values
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const name = document.getElementById("name").value.trim();
        const nickname = document.getElementById("nickname").value.trim();
        const birthYear = parseInt(document.getElementById("birthYear").value);
        const birthMonth = parseInt(
          document.getElementById("birthMonth").value
        );
        const birthDay = parseInt(document.getElementById("birthDay").value);
        const gender = document.getElementById("gender").value;

        // Validation
        if (
          !username ||
          !email ||
          !password ||
          !name ||
          !nickname ||
          !birthYear ||
          !birthMonth ||
          !birthDay ||
          !gender
        ) {
          throw new Error("모든 필수 항목을 입력해주세요.");
        }

        // 생년월일 유효성 검사
        if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
          throw new Error("올바른 연도를 입력해주세요.");
        }
        if (birthMonth < 1 || birthMonth > 12) {
          throw new Error("올바른 월을 입력해주세요.");
        }
        if (birthDay < 1 || birthDay > 31) {
          throw new Error("올바른 일을 입력해주세요.");
        }

        // 만 나이 계산 (만 13세 이상 확인)
        const age = calculateAge(birthYear, birthMonth, birthDay);
        if (age < 13) {
          throw new Error("만 13세 이상만 가입 가능합니다.");
        }

        // 임시 저장: Firebase Auth 계정은 아직 생성하지 않음
        // "추천 시작하기" 버튼에서 실제 회원가입이 완료됨
        const signupDraft = {
          username,
          email,
          password,
          name,
          nickname,
          birth: { year: birthYear, month: birthMonth, day: birthDay },
          gender,
          agreements: {
            terms: agreements.terms,
            privacy: agreements.privacy,
            marketing: agreements.marketing || false,
          },
        };

        // sessionStorage에 임시 저장 (온보딩 완료 시 사용)
        sessionStorage.setItem("signupDraft", JSON.stringify(signupDraft));

        // 온보딩 페이지로 이동 (아직 가입 완료 아님)
        window.location.href = "onboarding_reader.html";
      } catch (error) {
        console.error("Form validation error:", error);
        let errorMessageText = error.message || "입력 정보를 확인해주세요.";

        errorMessage.textContent = errorMessageText;
        errorMessage.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "다음";
      }
    });
});
