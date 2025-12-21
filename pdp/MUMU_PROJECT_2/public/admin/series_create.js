/**
 * 작품(Series) 등록 기능
 * 
 * - Firebase Auth로 인증 확인
 * - 이미지를 Canvas로 WEBP 변환
 * - Supabase Storage에 업로드
 * - Supabase series 테이블에 INSERT 후 UPDATE
 */

import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getSupabase } from "../js/supabase-auth.js";

// Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyB9CE6mr0leyh9DL_PLDD_nm3MBY6HZzrE",
  authDomain: "mumu-3db59.firebaseapp.com",
  projectId: "mumu-3db59",
  storageBucket: "mumu-3db59.firebasestorage.app",
  messagingSenderId: "436159743714",
  appId: "1:436159743714:web:49330772ad51141ace00bb",
};

let app;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0];
}

const auth = getAuth(app);
const supabase = getSupabase();

/**
 * 이미지를 WEBP로 변환
 * @param {File} file - 원본 이미지 파일
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
async function convertToWebP(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                width: img.width,
                height: img.height,
              });
            } else {
              reject(new Error("WEBP 변환 실패"));
            }
          },
          "image/webp",
          0.9 // 품질 90%
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

/**
 * Supabase Storage에 이미지 업로드
 * @param {Blob} blob - WEBP 변환된 이미지 Blob
 * @param {string} path - Storage 경로
 * @returns {Promise<string>} Public URL
 */
async function uploadToStorage(blob, path) {
  const { data, error } = await supabase.storage
    .from("public")
    .upload(path, blob, {
      contentType: "image/webp",
      upsert: false,
    });

  if (error) {
    console.error("Storage 업로드 실패:", error);
    throw error;
  }

  // Public URL 가져오기
  const {
    data: { publicUrl },
  } = supabase.storage.from("public").getPublicUrl(path);

  return publicUrl;
}

/**
 * 이미지 미리보기 표시
 * @param {File} file - 이미지 파일
 * @param {HTMLElement} previewElement - 미리보기를 표시할 요소
 */
function showPreview(file, previewElement) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; margin-top: 10px;">`;
  };
  reader.readAsDataURL(file);
}

// 폼 제출 처리
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("seriesForm");
  const thumbnailInput = document.getElementById("thumbnail");
  const backgroundInput = document.getElementById("background");
  const thumbnailPreview = document.getElementById("thumbnailPreview");
  const backgroundPreview = document.getElementById("backgroundPreview");
  const submitBtn = document.getElementById("submitBtn");

  // 이미지 미리보기
  thumbnailInput.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      showPreview(e.target.files[0], thumbnailPreview);
    }
  });

  backgroundInput.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      showPreview(e.target.files[0], backgroundPreview);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Firebase Auth로 로그인 확인
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const creatorId = currentUser.uid;

    // 폼 데이터 가져오기
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const genre = document.getElementById("genre").value.trim();
    const thumbnailFile = thumbnailInput.files[0];
    const backgroundFile = backgroundInput.files[0];

    // 필수 항목 확인
    if (!title || !thumbnailFile) {
      alert("작품 제목과 썸네일 이미지는 필수입니다.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "등록 중...";

      // 1. series 테이블에 먼저 INSERT (이미지 없이)
      const { data: seriesData, error: insertError } = await supabase
        .from("series")
        .insert({
          creator_id: creatorId,
          title: title,
          description: description || null,
          genre: genre || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Series INSERT 실패:", insertError);
        throw insertError;
      }

      const seriesId = seriesData.id;
      console.log("Series 생성 완료, ID:", seriesId);

      // 2. 썸네일 이미지 처리
      const thumbnailWebP = await convertToWebP(thumbnailFile);
      const thumbnailPath = `creator-series/${creatorId}/${seriesId}/thumbnail.webp`;
      const thumbnailUrl = await uploadToStorage(
        thumbnailWebP.blob,
        thumbnailPath
      );
      console.log("썸네일 업로드 완료:", thumbnailUrl);

      // 3. 배경 이미지 처리 (있는 경우)
      let backgroundUrl = null;
      let backgroundWidth = null;
      let backgroundHeight = null;

      if (backgroundFile) {
        const backgroundWebP = await convertToWebP(backgroundFile);
        const backgroundPath = `creator-series/${creatorId}/${seriesId}/background.webp`;
        backgroundUrl = await uploadToStorage(
          backgroundWebP.blob,
          backgroundPath
        );
        backgroundWidth = backgroundWebP.width;
        backgroundHeight = backgroundWebP.height;
        console.log("배경 이미지 업로드 완료:", backgroundUrl);
      }

      // 4. series 테이블 UPDATE (이미지 URL 및 크기 저장)
      const updateData = {
        thumbnail_url: thumbnailUrl,
        thumbnail_width: thumbnailWebP.width,
        thumbnail_height: thumbnailWebP.height,
      };

      if (backgroundUrl) {
        updateData.background_image_url = backgroundUrl;
        updateData.background_image_width = backgroundWidth;
        updateData.background_image_height = backgroundHeight;
      }

      const { error: updateError } = await supabase
        .from("series")
        .update(updateData)
        .eq("id", seriesId);

      if (updateError) {
        console.error("Series UPDATE 실패:", updateError);
        throw updateError;
      }

      console.log("작품 등록 완료!");
      alert("작품 등록 완료");

      // 폼 초기화
      form.reset();
      thumbnailPreview.innerHTML = "";
      backgroundPreview.innerHTML = "";
    } catch (error) {
      console.error("작품 등록 실패:", error);
      alert("작품 등록 실패: " + (error.message || "알 수 없는 오류"));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "작품 등록";
    }
  });
});




