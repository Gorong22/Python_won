/* 팔로우한 작가 */
const followedAuthors = [
  { id: 1, name: "작가명 1", meta: "로맨스 · 팔로워 1.2K" },
  { id: 2, name: "작가명 2", meta: "일상 · 팔로워 9.2K" },
  { id: 3, name: "작가명 3", meta: "스릴러 · 팔로워 1.1K" },
];

/* 피드 더미 데이터 */
const feedData = [
  {
    id: 1,
    authorName: "작가 이름",
    title: "얼레리꼴레리",
    desc: "콜라콜라 콜구야 노올자~~",
    tags: ["액션", "일상"],
    date: "2025.11.27",
    likes: 30,
    comments: 30,
    category: "전체",
  },
  {
    id: 2,
    authorName: "작가 이름",
    title: "얼레리꼴레리 2",
    desc: "또 놀러 왔지롱~",
    tags: ["개그"],
    date: "2025.11.27",
    likes: 22,
    comments: 12,
    category: "개그",
  },
];

/* DOM */
const followedListEl = document.querySelector(".followed-author-list");
const feedListEl = document.querySelector(".feed-list");
const tabEls = document.querySelectorAll(".tab");

/* 렌더링: 팔로우 */
function renderFollowed() {
  followedListEl.innerHTML = "";
  followedAuthors.forEach((a) => {
    followedListEl.innerHTML += `
        <div class="followed-author-item">
          <div class="followed-author-left">
            <img src="https://via.placeholder.com/44" />
            <div class="followed-author-info">
              <span class="name">${a.name}</span>
              <span class="meta">${a.meta}</span>
            </div>
          </div>
          <button class="follow-btn">팔로우</button>
        </div>
      `;
  });
}

/* 렌더링: 피드 */
function renderFeed(filter = "전체") {
  feedListEl.innerHTML = "";

  const list =
    filter === "전체"
      ? feedData
      : feedData.filter((p) => p.category === filter);

  list.forEach((post) => {
    feedListEl.innerHTML += `
        <div class="feed-card">
          <div class="author">
            <img src="https://via.placeholder.com/42" />
            <span class="author-name">${post.authorName}</span>
          </div>
  
          <div class="title">${post.title}</div>
          <div class="desc">${post.desc}</div>
  
          <div class="tag-wrap">
            ${post.tags.map((t) => `<div class="tag">${t}</div>`).join("")}
          </div>
  
          <div class="thumbnail"></div>
  
          <div class="meta-bottom">
            <span>${post.date}</span>
            <div class="right">
              <span>❤️ ${post.likes}</span>
              <span>💬 ${post.comments}</span>
            </div>
          </div>
        </div>
      `;
  });
}

/* 필터 탭 */
tabEls.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabEls.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    renderFeed(tab.innerText);
  });
});

/* 초기 실행 */
renderFollowed();
renderFeed();
