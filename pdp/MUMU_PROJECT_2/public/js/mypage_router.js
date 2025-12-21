/**
 * 마이페이지 역할 분기 라우터
 * 
 * Firebase Auth UID를 확인하고,
 * Supabase creators 테이블에서 firebase_uid로 조회하여
 * 작가/독자 역할을 판단한 후 적절한 페이지로 리다이렉트
 */

import { auth } from "./firebase_init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { supabase } from "./supabase_client.js";

/**
 * 역할 분기 메인 로직
 */
async function routeToMypage() {
  console.log("[마이페이지 라우터] 역할 분기 시작");

  // Firebase Auth 상태 확인
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // 한 번만 실행되도록 구독 해제

      // 로그인 안 되어 있으면 로그인 페이지로 이동
      if (!user) {
        console.log("[마이페이지 라우터] 로그인 안 됨 → login.html로 이동");
        window.location.href = "login.html";
        resolve();
        return;
      }

      const uid = user.uid;
      console.log("[마이페이지 라우터] Firebase UID:", uid);

      try {
        // Supabase creators 테이블에서 firebase_uid로 조회
        const { data, error } = await supabase
          .from("creators")
          .select("id")
          .eq("firebase_uid", uid)
          .maybeSingle(); // 단일 행 또는 null 반환

        if (error) {
          console.error("[마이페이지 라우터] Supabase 조회 에러:", error);
          // 에러 발생 시 기본적으로 독자 페이지로 이동
          console.log("[마이페이지 라우터] 에러 발생 → mypage_reader.html로 이동");
          window.location.href = "mypage_reader.html";
          resolve();
          return;
        }

        // creators 테이블에 row가 존재하면 작가
        if (data && data.id) {
          console.log("[마이페이지 라우터] 작가 확인됨 → mypage_creator.html로 이동");
          window.location.href = "mypage_creator.html";
        } else {
          console.log("[마이페이지 라우터] 독자 확인됨 → mypage_reader.html로 이동");
          window.location.href = "mypage_reader.html";
        }

        resolve();
      } catch (error) {
        console.error("[마이페이지 라우터] 예외 발생:", error);
        // 예외 발생 시 기본적으로 독자 페이지로 이동
        console.log("[마이페이지 라우터] 예외 발생 → mypage_reader.html로 이동");
        window.location.href = "mypage_reader.html";
        resolve();
      }
    });
  });
}

// 페이지 로드 시 즉시 실행
routeToMypage().catch((error) => {
  console.error("[마이페이지 라우터] 치명적 에러:", error);
  // 최종 안전장치: 독자 페이지로 이동
  window.location.href = "mypage_reader.html";
});

