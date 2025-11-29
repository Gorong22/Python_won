const postList = document.getElementById("postList");
const genreTags = document.querySelectorAll(".tag");

// MOCK 데이터
const samplePosts = Array.from({ length: 12 }).map((_, i) => ({
  title: "얼레리꼴레리",
  text: "폴라폴라 짱구야 노욜자~~",
  tags: i % 3 === 0 ? ["판타지", "액션"] : i % 3 === 1 ? ["일상"] : ["액션"],
  date: "2025.11.27",
  likes: Math.floor(Math.random() * 40),
  comments: Math.floor(Math.random() * 20),
  views: Math.floor(Math.random() * 80),
}));

// 렌더링 함수
function renderPosts(filter = "전체") {
  postList.innerHTML = "";

  samplePosts
    .filter((p) => filter === "전체" || p.tags.includes(filter))
    .forEach((post) => {
      postList.innerHTML += `
      <article class="post-card">

        <!-- 왼쪽 텍스트 -->
        <div class="post-left">
          <div class="post-tags">
            ${post.tags.map((t) => `<span>${t}</span>`).join("")}
          </div>

          <div class="post-title">${post.title}</div>
          <div class="post-desc">${post.text}</div>
          <div class="post-date">${post.date}</div>
        </div>

        <!-- 오른쪽: 썸네일 + 하단 stats -->
        <div class="post-right">
          <div class="post-thumb"></div>
          <div class="post-stats-under">
            <span>❤️ ${post.likes}</span>
            <span>💬 ${post.comments}</span>
            <span>👁 ${post.views}</span>
          </div>
        </div>

      </article>
    `;
    });
}

renderPosts();

// 태그 필터링
genreTags.forEach((tag) => {
  tag.addEventListener("click", () => {
    genreTags.forEach((t) => t.classList.remove("active"));
    tag.classList.add("active");
    renderPosts(tag.innerText);
  });
  // "작가 피드" 버튼 클릭 시 페이지 이동
  document
    .querySelector('.top-tab[data-tab="creator"]')
    .addEventListener("click", () => {
      window.location.href = "creator_feed.html";
    });
});
