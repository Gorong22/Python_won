/* ========================== 
   Header 커스터마이징
========================== */
fetch("components/header.html")
  .then((r) => {
    if (!r.ok) throw new Error("header load failed");
    return r.text();
  })
  .then((html) => {
    document.getElementById("header").innerHTML = html;
    // 헤더 내용 변경
    const headerTitle = document.querySelector("#header .header-title");
    if (headerTitle) {
      headerTitle.remove();
    }
    const headerLeft = document.querySelector("#header .header-left");
    if (headerLeft) {
      headerLeft.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="66" height="33" viewBox="0 0 66 33" fill="none" class="header-logo"><path d="M21.8057 19.4238C23.8834 13.555 25.4048 8.11381 27.5078 0.767578V0H36.5371V28.0244C38.3632 27.4704 40.1105 26.7874 42.2383 25.9531V0H51.2666V27.998C53.0869 27.4409 54.8359 26.754 56.9707 25.917V0H65.999V32.9912H56.9707V29.625C54.8758 30.2024 53.1431 30.7743 51.2666 31.3496V32.9912H42.2383V29.6504C40.1516 30.2283 38.4204 30.801 36.5371 31.377V32.9912H27.5078V14.6396C25.8102 19.8463 24.2073 24.8635 21.8057 31.4521V32.9912H12.7764V14.6719C11.0575 19.9443 9.43511 25.0266 6.97852 31.7471L6.94531 31.7393V32.9902H0V23.3994L6.94531 7.63965V19.8115C9.09084 13.803 10.6326 8.29372 12.7764 0.804688V0H21.8057V19.4238Z" fill="#000000"/></svg>';
    }
    let headerLink = document.querySelector("#header .header-link");
    if (!headerLink) {
      // header-link가 없으면 생성
      headerLink = document.createElement("a");
      headerLink.className = "header-link";
      const header = document.getElementById("header");
      if (header) {
        header.appendChild(headerLink);
      }
    }
    if (headerLink) {
      headerLink.textContent = "업로드";
      headerLink.href = "upload.html";
    }
  })
  .catch((error) => console.error("Error fetching header.html:", error));

/* ========================== 
   Tabbar 로드
========================== */
fetch("components/tabbar.html")
  .then((r) => {
    if (!r.ok) throw new Error("tabbar load failed");
    return r.text();
  })
  .then((html) => {
    document.getElementById("tabbar").innerHTML = html;
    // Load shared initialization script
    const script = document.createElement("script");
    script.src = "js/tabbar-init.js";
    document.body.appendChild(script);
  })
  .catch((error) => console.error("Error fetching tabbar.html:", error));

const postList = document.getElementById("postList");
const genreTags = document.querySelectorAll(".tag");

// community-images 폴더의 이미지 파일 목록
const communityImages = [
  "image 3.webp",
  "image 6.webp",
  "image 12.webp",
  "image 13.webp",
  "image 14.webp",
  "image 15.webp",
  "image 16.webp",
  "image 17.webp",
  "image 23.webp",
  "image 24.webp",
  "image 25.webp",
  "image 26.webp",
  "image 27.webp",
  "image 28.webp",
];

// 랜덤 제목 목록
const randomTitles = [
  "오늘의 일기",
  "행복한 하루",
  "새로운 시작",
  "우리들의 이야기",
  "기억 속의 순간",
  "꿈꾸는 시간",
  "일상의 소중함",
  "특별한 만남",
  "그날의 기억",
  "하루의 끝",
  "새로운 모험",
  "추억 속으로",
  "소중한 순간들",
  "일상의 기록",
  "기억하고 싶은 날",
  "행복한 순간",
  "오늘의 발견",
  "평범한 하루",
  "새로운 경험",
  "그 시간 속에서",
  "작은 행복",
  "일상의 조각들",
  "오늘도 수고했어",
  "내일을 위한 오늘",
  "소소한 기쁨",
  "기억에 남는 하루",
  "평온한 시간",
  "새로운 하루",
  "일상의 아름다움",
  "소중한 하루",
];

// 랜덤 제목 선택 함수
function getRandomTitle() {
  return randomTitles[Math.floor(Math.random() * randomTitles.length)];
}

// MOCK 데이터
const samplePosts = Array.from({ length: 12 }).map((_, i) => ({
  title: getRandomTitle(),
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

  // 필터링된 게시물 목록
  const filteredPosts = samplePosts.filter(
    (p) => filter === "전체" || p.tags.includes(filter)
  );

  // 게시물이 없을 때 빈 상태 메시지 표시
  if (filteredPosts.length === 0) {
    postList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #999;">
        <p style="font-size: 16px; font-weight: 500;">게시물을 올려보세요</p>
      </div>
    `;
    return;
  }

  let imageIndex = 0; // 이미지 인덱스 추적

  filteredPosts.forEach((post, index) => {
    // 일부 카드는 이미지 포함 (두 번째 게시글부터 이미지 포함)
    const hasImage = index === 1 || index % 3 === 1;
    const cardClass = hasImage ? "feed-card with-image" : "feed-card";

    // 텍스트 내용 설정 (이미지가 있는 경우와 없는 경우 다르게)
    let postText = "";
    if (hasImage) {
      postText = "작가 설명을 적는 구간 LLO大\n○大ⅡOLIO\nㄴㅍㄹㄴ퓰 ㅍㄹㅇ";
    } else {
      postText = "작가 설명을 적는 구간 LLO大○大ⅡOLIO\nㄴㅍㄹㄴ퓰 ㅍㄹㅇ";
    }

    // 하트 아이콘 HTML
    const heartIconHtml = `
      <svg class="feed-post-heart-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.8434 4.05117C15.4768 3.68448 15.0417 3.3936 14.5627 3.19514C14.0837 2.99668 13.5704 2.89453 13.0519 2.89453C12.5335 2.89453 12.0201 2.99668 11.5411 3.19514C11.0621 3.3936 10.627 3.68448 10.2605 4.05117L9.49981 4.81182L8.73916 4.05117C7.99882 3.31083 6.9947 2.89491 5.94771 2.89492C4.90071 2.89492 3.89659 3.31083 3.15626 4.05117C2.41592 4.79151 2 5.79562 2 6.84262C2 7.88962 2.41592 8.89373 3.15626 9.63407L3.91691 10.3947L9.49981 15.9776L15.0827 10.3947L15.8434 9.63407C16.21 9.26756 16.5009 8.83238 16.6994 8.35342C16.8979 7.87445 17 7.36108 17 6.84262C17 6.32417 16.8979 5.81079 16.6994 5.33183C16.5009 4.85286 16.21 4.41769 15.8434 4.05117Z" stroke="#A0A0A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="feed-post-heart-count">30</span>
    `;

    // 이미지가 있는 경우 이미지 경로 생성 (하트 아이콘 포함)
    let imageHtml = "";
    if (hasImage && imageIndex < communityImages.length) {
      const fileName = encodeURIComponent(communityImages[imageIndex]);
      imageHtml = `
        <div class="feed-image" style="background-image: url('/assets/community-images/${fileName}');">
          <div class="feed-post-stats feed-post-stats-on-image">
            ${heartIconHtml}
          </div>
        </div>
      `;
      imageIndex++;
    }

    // 텍스트 영역의 하트 아이콘 (이미지가 없는 경우만)
    const textFooterHtml = hasImage ? '' : `
      <div class="feed-post-footer">
        <div class="feed-post-stats">
          ${heartIconHtml}
        </div>
      </div>
    `;

    postList.innerHTML += `
      <article class="${cardClass}">
        <div class="feed-content">
          <h3 class="feed-post-title">오늘의 컷</h3>
          <p class="feed-post-text">${postText}</p>
          ${textFooterHtml}
        </div>
        ${imageHtml}
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
});

// ============================
// 댓글 모달 및 상호작용 기능
// ============================

// stat-icon-heart 클릭 시 색상 변경
document.addEventListener("DOMContentLoaded", () => {
  // top-tab 클릭 시 (작가 피드 탭) 준비중 팝업 표시
  document.addEventListener("click", function (e) {
    if (e.target.closest(".top-tab:not(.active)")) {
      const tab = e.target.closest(".top-tab");
      // 작가 피드 탭인 경우만 팝업 표시
      if (
        tab.getAttribute("href") === "creator_feed.html" ||
        tab.textContent.includes("작가 피드")
      ) {
        e.preventDefault();
        e.stopPropagation();
        showComingSoonModal();
        return;
      }
    }
  });

  // 동적으로 생성된 요소를 위해 이벤트 위임 사용
  document.addEventListener("click", function (e) {
    // feed-card 클릭 시 페이지 이동 (하트 아이콘, 통계 버튼 제외)
    if (
      e.target.closest(".feed-card") &&
      !e.target.closest(".feed-post-heart-icon") &&
      !e.target.closest(".feed-post-stats") &&
      !e.target.closest(".feed-post-stats-on-image")
    ) {
      const card = e.target.closest(".feed-card");
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "community-post-details.html";
      return;
    }

    // feed-post-stats 클릭 시 이벤트 전파 중지 (모달 방지)
    if (e.target.closest(".feed-post-stats") || e.target.closest(".feed-post-stats-on-image")) {
      // 하트 아이콘이 아닌 경우 모든 이벤트 차단
      if (!e.target.closest(".feed-post-heart-icon") && !e.target.closest(".feed-post-heart-count")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // feed-post-heart-icon 클릭
    if (e.target.closest(".feed-post-heart-icon")) {
      const icon = e.target.closest(".feed-post-heart-icon");
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle("active");

      const countElement = icon.nextElementSibling;
      if (countElement && countElement.classList.contains("feed-post-heart-count")) {
        let currentCount = parseInt(countElement.textContent) || 0;
        if (icon.classList.contains("active")) {
          countElement.textContent = currentCount + 1;
        } else {
          countElement.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // stat-icon-heart 클릭 (피드 카드 및 게시글 상세 모달 모두)
    if (e.target.closest(".stat-icon-heart")) {
      const icon = e.target.closest(".stat-icon-heart");
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle("active");

      const statItem = icon.parentElement.querySelector(".stat-item");
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains("active")) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // stat-icon-comment 클릭 시 댓글 모달 열기
    if (e.target.closest(".stat-icon-comment")) {
      e.preventDefault();
      openCommentModal();
    }

    // comment-stat-icon-heart 클릭 (댓글 모달 및 게시글 상세 모달 둘 다)
    if (e.target.closest(".comment-stat-icon-heart")) {
      const icon = e.target.closest(".comment-stat-icon-heart");
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle("active");

      const statItem = icon.parentElement.querySelector("span");
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains("active")) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // feed-detail-comment-item 내 comment-more-btn 클릭
    if (e.target.closest(".feed-detail-comment-item .comment-more-btn")) {
      const btn = e.target.closest(
        ".feed-detail-comment-item .comment-more-btn"
      );
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest(".feed-detail-comment-item");
      if (commentItem) {
        const modal = document.getElementById("commentMoreModal");
        if (modal && modal.style.display === "flex") {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }

    // comment-more-btn 클릭
    if (e.target.closest(".comment-more-btn")) {
      const btn = e.target.closest(".comment-more-btn");
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest(".comment-item");
      if (commentItem) {
        const modal = document.getElementById("commentMoreModal");
        if (modal && modal.style.display === "flex") {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }

    // post-more-btn 클릭
    if (e.target.closest(".post-more-btn")) {
      const btn = e.target.closest(".post-more-btn");
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("CreatorMoreModal");
      if (modal && modal.style.display === "flex") {
        closeCreatorMoreModal();
      } else {
        openCreatorMoreModal(btn);
      }
    }

    // CreatorMoreModal-option 클릭 시 팝업 표시
    if (e.target.closest(".CreatorMoreModal-option")) {
      const optionBtn = e.target.closest(".CreatorMoreModal-option");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }

  });
});

// 댓글 모달 열기
function openCommentModal() {
  const modal = document.getElementById("commentModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal = document.getElementById("commentModal");
  if (modal) {
    const commentSection = modal.querySelector(".comment-section");
    if (commentSection) {
      commentSection.style.animation = "slideDown 0.3s ease forwards";
    }
    modal.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => {
      modal.style.display = "none";
      modal.style.animation = "fadeIn 0.3s ease";
      if (commentSection) {
        commentSection.style.animation = "slideUp 0.3s ease";
      }
    }, 300);
  }
};

// 모달 배경 클릭 시 닫기
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("commentModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeCommentModal();
      }
    });
  }
});

// 댓글 더보기 모달 열기
function openCommentMoreModal(button, commentItem) {
  const modal = document.getElementById("commentMoreModal");
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = "flex";
    const modalContent = modal.querySelector(".comment-more-modal-content");
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + "px";
      modalContent.style.right = right + "px";

      if (!modal.hasAttribute("data-scroll-listener")) {
        modal.setAttribute("data-scroll-listener", "true");
        window.addEventListener("scroll", handleCommentMoreModalScroll, {
          passive: true,
        });
      }
    }
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById("commentMoreModal");
  if (modal) {
    modal.style.animation = "fadeOut 0.2s ease forwards";
    setTimeout(() => {
      modal.style.display = "none";
      modal.style.animation = "fadeIn 0.2s ease";
      window.removeEventListener("scroll", handleCommentMoreModalScroll);
      modal.removeAttribute("data-scroll-listener");
    }, 200);
  }
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById("commentMoreModal");
  if (modal && modal.style.display === "flex") {
    closeCommentMoreModal();
  }
}

// 준비중인 기능 팝업 모달 표시
function showComingSoonModal() {
  const modal = document.getElementById("comingSoonModal");
  if (modal) {
    modal.style.display = "flex";
    modal.style.animation = "fadeIn 0.2s ease";
  }
}

// 준비중인 기능 팝업 모달 닫기
function closeComingSoonModal() {
  const modal = document.getElementById("comingSoonModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById("CreatorMoreModal");
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = "flex";
    const modalContent = modal.querySelector(".CreatorMoreModal-content");
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + "px";
      modalContent.style.right = right + "px";

      if (!modal.hasAttribute("data-scroll-listener")) {
        modal.setAttribute("data-scroll-listener", "true");
        window.addEventListener("scroll", handleCreatorMoreModalScroll, {
          passive: true,
        });
      }
    }
    // 모달이 열릴 때 옵션 버튼 이벤트 리스너 연결
    setTimeout(() => {
      document.querySelectorAll(".CreatorMoreModal-option").forEach((btn) => {
        if (!btn.hasAttribute("data-option-listener-attached")) {
          btn.setAttribute("data-option-listener-attached", "true");
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeCreatorMoreModal();
            setTimeout(() => {
              showComingSoonModal();
            }, 200);
          });
        }
      });
    }, 10);
  }
}

// CreatorMoreModal 닫기
function closeCreatorMoreModal() {
  const modal = document.getElementById("CreatorMoreModal");
  if (modal) {
    modal.style.animation = "fadeOut 0.2s ease forwards";
    setTimeout(() => {
      modal.style.display = "none";
      modal.style.animation = "fadeIn 0.2s ease";
      window.removeEventListener("scroll", handleCreatorMoreModalScroll);
      modal.removeAttribute("data-scroll-listener");
    }, 200);
  }
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById("CreatorMoreModal");
  if (modal && modal.style.display === "flex") {
    closeCreatorMoreModal();
  }
}


// 모달 배경 클릭 시 닫기 및 ESC 키 처리
document.addEventListener("click", function (e) {
  const creatorMoreModal = document.getElementById("CreatorMoreModal");
  if (creatorMoreModal && creatorMoreModal.style.display === "flex") {
    // CreatorMoreModal-option 클릭은 제외
    if (e.target.closest(".CreatorMoreModal-option")) {
      return;
    }
    if (
      !e.target.closest(".CreatorMoreModal-content") &&
      !e.target.closest(".post-more-btn")
    ) {
      closeCreatorMoreModal();
    }
  }

  const commentMoreModal = document.getElementById("commentMoreModal");
  if (commentMoreModal && commentMoreModal.style.display === "flex") {
    if (
      !e.target.closest(".comment-more-modal-content") &&
      !e.target.closest(".comment-more-btn")
    ) {
      closeCommentMoreModal();
    }
  }

  // 준비중인 기능 팝업 배경 클릭 시 닫기
  const comingSoonModal = document.getElementById("comingSoonModal");
  if (comingSoonModal && comingSoonModal.style.display === "flex") {
    if (
      e.target === comingSoonModal ||
      e.target.closest(".coming-soon-modal-close")
    ) {
      closeComingSoonModal();
    }
  }
});

// ESC 키로 모달 닫기
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const commentModal = document.getElementById("commentModal");
    if (commentModal && commentModal.style.display === "flex") {
      closeCommentModal();
      return;
    }
    const commentMoreModal = document.getElementById("commentMoreModal");
    if (commentMoreModal && commentMoreModal.style.display === "flex") {
      closeCommentMoreModal();
      return;
    }
    const creatorMoreModal = document.getElementById("CreatorMoreModal");
    if (creatorMoreModal && creatorMoreModal.style.display === "flex") {
      closeCreatorMoreModal();
      return;
    }
    const comingSoonModal = document.getElementById("comingSoonModal");
    if (comingSoonModal && comingSoonModal.style.display === "flex") {
      closeComingSoonModal();
      return;
    }
  }
});

// coming-soon-modal-close 버튼 클릭 시 닫기
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector(".coming-soon-modal-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeComingSoonModal();
    });
  }
});
