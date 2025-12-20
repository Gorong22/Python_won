// onboarding_reader.js
// 선호 장르와 취향 다중 선택 관리

// 선택 상태 관리
const selectedGenres = new Set();
const selectedTastes = new Set();

// DOM 요소
const genreGrid = document.getElementById("genreGrid");
const tasteGrid = document.getElementById("tasteGrid");
const completeBtn = document.getElementById("completeBtn");

// 장르 선택 토글
function toggleGenre(button) {
  const genre = button.dataset.genre;

  if (selectedGenres.has(genre)) {
    selectedGenres.delete(genre);
    button.classList.remove("selected");
  } else {
    selectedGenres.add(genre);
    button.classList.add("selected");
  }

  updateCompleteButton();
}

// 취향 선택 토글
function toggleTaste(button) {
  const taste = button.dataset.taste;

  if (selectedTastes.has(taste)) {
    selectedTastes.delete(taste);
    button.classList.remove("selected");
  } else {
    selectedTastes.add(taste);
    button.classList.add("selected");
  }

  updateCompleteButton();
}

// 완료 버튼 활성화 상태 업데이트
function updateCompleteButton() {
  // 최소 1개 이상의 장르 선택 시 활성화
  if (selectedGenres.size > 0) {
    completeBtn.disabled = false;
  } else {
    completeBtn.disabled = true;
  }
}

// 장르 버튼 이벤트 리스너
if (genreGrid) {
  genreGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("pill-btn")) {
      toggleGenre(e.target);
    }
  });
}

// 취향 버튼 이벤트 리스너
if (tasteGrid) {
  tasteGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("taste-keyword")) {
      toggleTaste(e.target);
    }
  });
}

// 완료 버튼 클릭 핸들러
if (completeBtn) {
  completeBtn.addEventListener("click", async () => {
    if (completeBtn.disabled) return;

    // 로딩 상태
    completeBtn.disabled = true;
    completeBtn.textContent = "저장 중...";

    try {
      // sessionStorage에서 회원가입 정보 가져오기
      const signupDraftStr = sessionStorage.getItem("signupDraft");
      if (!signupDraftStr) {
        throw new Error("회원가입 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      }

      const signupDraft = JSON.parse(signupDraftStr);
      console.log("[온보딩] 회원가입 정보:", signupDraft);

      // Firebase Auth 및 Firestore import
      const { createUserWithEmailAndPassword } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
      );
      const { getFirestore, doc, setDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
      );
      const { auth } = await import("./firebase_init.js");
      const db = getFirestore();

      // Firebase 계정 생성 (username@mumu.app 형식)
      const email = `${signupDraft.username}@mumu.app`;
      console.log("[온보딩] Firebase 계정 생성 시작:", email);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        signupDraft.password
      );

      console.log(
        "[온보딩] ✅ Firebase 계정 생성 성공:",
        userCredential.user.uid
      );

      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, "readers", userCredential.user.uid), {
        username: signupDraft.username,
        email: signupDraft.email,
        name: signupDraft.name,
        nickname: signupDraft.nickname,
        birth: signupDraft.birth,
        gender: signupDraft.gender,
        preferredGenres: Array.from(selectedGenres),
        preferredTastes: Array.from(selectedTastes),
        agreements: signupDraft.agreements,
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("[온보딩] ✅ Firestore 사용자 정보 저장 완료");

      // 로그인 상태 저장
      localStorage.setItem("mumu_logged_in", "true");
      console.log("[온보딩] ✅ 로그인 상태 저장 완료");

      // 온보딩 완료 상태 저장 (무드보드 안내 팝업용)
      localStorage.setItem("onboardingCompleted", "true");

      // 환영 모달 표시를 위한 플래그 설정
      localStorage.setItem("mumu_onboarding_completed", "true");

      // sessionStorage 정리
      sessionStorage.removeItem("signupDraft");
      sessionStorage.removeItem("readerAgreements");

      // 디버깅 로그
      console.log("[온보딩] 제출 완료 - localStorage 저장:");
      console.log(
        "  - mumu_onboarding_completed:",
        localStorage.getItem("mumu_onboarding_completed")
      );
      console.log(
        "  - mumu_logged_in:",
        localStorage.getItem("mumu_logged_in")
      );

      // 저장 후 리다이렉트
      window.location.href = "/index.html";
    } catch (error) {
      console.error("[온보딩] ❌ 오류:", error);
      let errorMessage = "저장 중 오류가 발생했습니다. 다시 시도해주세요.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "이미 사용 중인 아이디입니다.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "비밀번호가 너무 약합니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
      completeBtn.disabled = false;
      completeBtn.textContent = "추천 시작하기";
    }
  });
}

// 초기화
updateCompleteButton();
