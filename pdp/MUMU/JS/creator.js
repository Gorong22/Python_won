// URL에서 id=... 가져오기
const params = new URLSearchParams(window.location.search);
const creatorId = params.get("id");

// Firebase 불러오기
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// ========== 작가 정보 로딩 ==========
async function loadCreator() {
  if (!creatorId) return;

  const ref = doc(db, "creators", creatorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("creatorProfileImg").src =
    data.profileImg || "img/default_profile.png";

  document.getElementById("creatorName").textContent = data.name || "작가";
  document.getElementById("creatorFollower").textContent = data.follower || 0;

  document.getElementById("creatorTags").innerHTML = (data.tags || [])
    .map((t) => `<span>${t}</span>`)
    .join("");

  document.getElementById("creatorPostCount").textContent = data.postCount || 0;
}

// ========== 작가의 작품 목록 로딩 ==========
async function loadCreatorPosts() {
  const grid = document.getElementById("creatorGrid");

  const q = query(collection(db, "posts"), where("creatorId", "==", creatorId));

  const snap = await getDocs(q);

  snap.forEach((doc) => {
    const p = doc.data();

    grid.innerHTML += `
      <div class="grid-item"></div>
    `;
  });
}

// 실행
loadCreator();
loadCreatorPosts();
