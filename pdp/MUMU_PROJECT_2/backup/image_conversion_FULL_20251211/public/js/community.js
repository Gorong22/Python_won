/* ========================== 
   Header 커스터마이징
========================== */
fetch("components/header.html")
  .then((r) => r.text())
  .then((html) => {
    document.getElementById("header").innerHTML = html;
    // 헤더 내용 변경
    const headerTitle = document.querySelector("#header .header-title");
    if (headerTitle) {
      headerTitle.remove();
    }
    const headerLeft = document.querySelector("#header .header-left");
    if (headerLeft) {
      headerLeft.innerHTML = '<a href="index.html" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;"><img src="assets/logos/mumu-logo.png" alt="MUMU Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;"></a>';
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
  .then((r) => r.text())
  .then((html) => (document.getElementById("tabbar").innerHTML = html))
  .catch((error) => console.error("Error fetching tabbar.html:", error));

const postList = document.getElementById("postList");
const genreTags = document.querySelectorAll(".tag");

// community-images 폴더의 이미지 파일 목록
const communityImages = [
  "image 3.png",
  "image 6.png",
  "image 12.png",
  "image 13.png",
  "image 14.png",
  "image 15.png",
  "image 16.png",
  "image 17.png",
  "image 23.png",
  "image 24.png",
  "image 25.png",
  "image 26.png",
  "image 27.png",
  "image 28.png"
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
  "소중한 하루"
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
  const filteredPosts = samplePosts.filter((p) => filter === "전체" || p.tags.includes(filter));

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

  filteredPosts
    .forEach((post, index) => {
      // 일부 카드는 이미지 배경, 일부는 단색 배경
      const hasImage = index % 3 === 0 || index % 3 === 2;
      const cardClass = hasImage ? 'feed-card with-gradient' : 'feed-card';

      // 이미지가 있는 경우 배경 이미지 경로 생성
      let backgroundImageStyle = '';
      if (hasImage && imageIndex < communityImages.length) {
        const fileName = encodeURIComponent(communityImages[imageIndex]);
        backgroundImageStyle = `style="background-image: url('assets/community-images/${fileName}');"`;
        imageIndex++;
      }

      postList.innerHTML += `
      <article class="${cardClass}">
        <button class="post-more-btn">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </button>
        <div class="feed-thumbnail" ${backgroundImageStyle}>
          <div class="feed-date">${post.date}</div>
          <div class="feed-title">${post.title}</div>
          <div class="feed-author">
            <div class="feed-author-avatar"></div>
            <span class="feed-author-name">작성자 이름</span>
          </div>
        </div>
        <div class="feed-stats">
          <div class="stat-group">
            <svg class="stat-icon-heart" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 22 20" fill="none">
              <path d="M19.4949 2.31617C18.9986 1.81965 18.4093 1.42577 17.7608 1.15704C17.1122 0.888315 16.4171 0.75 15.715 0.75C15.013 0.75 14.3179 0.888315 13.6693 1.15704C13.0208 1.42577 12.4315 1.81965 11.9352 2.31617L10.9053 3.34615L9.87528 2.31617C8.87281 1.3137 7.51317 0.75052 6.09547 0.75052C4.67776 0.75052 3.31812 1.3137 2.31565 2.31617C1.31318 3.31864 0.75 4.67828 0.75 6.09599C0.75 7.51369 1.31318 8.87333 2.31565 9.8758L3.34563 10.9058L10.9053 18.4654L18.4649 10.9058L19.4949 9.8758C19.9914 9.37951 20.3853 8.79026 20.654 8.14171C20.9227 7.49315 21.061 6.79801 21.061 6.09599C21.061 5.39396 20.9227 4.69882 20.654 4.05027C20.3853 3.40171 19.9914 2.81246 19.4949 2.31617Z" stroke="#A0A0A0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="stat-item">${post.likes}</span>
          </div>
          <div class="stat-group">
            <svg class="stat-icon-comment" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
              <path d="M18.4658 9.11582C18.4692 10.4148 18.1657 11.6963 17.58 12.8558C16.8856 14.2453 15.818 15.414 14.4969 16.231C13.1758 17.048 11.6533 17.481 10.1 17.4816C8.80097 17.485 7.51951 17.1815 6.36 16.5958L0.75 18.4658L2.62 12.8558C2.03433 11.6963 1.73082 10.4148 1.73421 9.11582C1.73481 7.5625 2.16787 6.04001 2.98487 4.71891C3.80187 3.3978 4.97055 2.33024 6.36 1.63582C7.51951 1.05014 8.80097 0.746641 10.1 0.750028H10.5921C12.6435 0.863204 14.5812 1.72908 16.0339 3.18187C17.4867 4.63466 18.3526 6.57228 18.4658 8.62371V9.11582Z" stroke="#A0A0A0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="stat-item">${post.comments}</span>
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
});

// ============================
// 댓글 모달 및 상호작용 기능
// ============================

// stat-icon-heart 클릭 시 색상 변경
document.addEventListener('DOMContentLoaded', () => {
  // top-tab 클릭 시 (작가 피드 탭) 준비중 팝업 표시
  document.addEventListener('click', function (e) {
    if (e.target.closest('.top-tab:not(.active)')) {
      const tab = e.target.closest('.top-tab');
      // 작가 피드 탭인 경우만 팝업 표시
      if (tab.getAttribute('href') === 'creator_feed.html' || tab.textContent.includes('작가 피드')) {
        e.preventDefault();
        e.stopPropagation();
        showComingSoonModal();
        return;
      }
    }
  });

  // 동적으로 생성된 요소를 위해 이벤트 위임 사용
  document.addEventListener('click', function (e) {
    // stat-icon-heart 클릭 (피드 카드 및 게시글 상세 모달 모두)
    if (e.target.closest('.stat-icon-heart')) {
      const icon = e.target.closest('.stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('.stat-item');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // stat-icon-comment 클릭 시 댓글 모달 열기
    if (e.target.closest('.stat-icon-comment')) {
      e.preventDefault();
      openCommentModal();
    }

    // comment-stat-icon-heart 클릭 (댓글 모달 및 게시글 상세 모달 둘 다)
    if (e.target.closest('.comment-stat-icon-heart')) {
      const icon = e.target.closest('.comment-stat-icon-heart');
      e.preventDefault();
      e.stopPropagation();
      icon.classList.toggle('active');

      const statItem = icon.parentElement.querySelector('span');
      if (statItem) {
        let currentCount = parseInt(statItem.textContent) || 0;
        if (icon.classList.contains('active')) {
          statItem.textContent = currentCount + 1;
        } else {
          statItem.textContent = Math.max(0, currentCount - 1);
        }
      }
    }

    // feed-detail-comment-item 내 comment-more-btn 클릭
    if (e.target.closest('.feed-detail-comment-item .comment-more-btn')) {
      const btn = e.target.closest('.feed-detail-comment-item .comment-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest('.feed-detail-comment-item');
      if (commentItem) {
        const modal = document.getElementById('commentMoreModal');
        if (modal && modal.style.display === 'flex') {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }

    // comment-more-btn 클릭
    if (e.target.closest('.comment-more-btn')) {
      const btn = e.target.closest('.comment-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const commentItem = btn.closest('.comment-item');
      if (commentItem) {
        const modal = document.getElementById('commentMoreModal');
        if (modal && modal.style.display === 'flex') {
          closeCommentMoreModal();
        } else {
          openCommentMoreModal(btn, commentItem);
        }
      }
    }

    // post-more-btn 클릭
    if (e.target.closest('.post-more-btn')) {
      const btn = e.target.closest('.post-more-btn');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('CreatorMoreModal');
      if (modal && modal.style.display === 'flex') {
        closeCreatorMoreModal();
      } else {
        openCreatorMoreModal(btn);
      }
    }

    // CreatorMoreModal-option 클릭 시 팝업 표시
    if (e.target.closest('.CreatorMoreModal-option')) {
      const optionBtn = e.target.closest('.CreatorMoreModal-option');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeCreatorMoreModal();
      setTimeout(() => {
        showComingSoonModal();
      }, 200);
      return;
    }

    // feed-card 클릭 시 상세 모달 열기 (post-more-btn, stat-icon-heart, stat-icon-comment 제외, 모달 내부 제외)
    if (e.target.closest('.feed-card') && !e.target.closest('#feedDetailModal') && !e.target.closest('.post-more-btn') && !e.target.closest('.stat-icon-heart') && !e.target.closest('.stat-icon-comment')) {
      const card = e.target.closest('.feed-card');
      e.preventDefault();
      e.stopPropagation();
      openFeedDetailModal(card);
    }
  });
});

// 댓글 모달 열기
function openCommentModal() {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// 댓글 모달 닫기 (전역 함수로 선언)
window.closeCommentModal = function () {
  const modal = document.getElementById('commentModal');
  if (modal) {
    const commentSection = modal.querySelector('.comment-section');
    if (commentSection) {
      commentSection.style.animation = 'slideDown 0.3s ease forwards';
    }
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.3s ease';
      if (commentSection) {
        commentSection.style.animation = 'slideUp 0.3s ease';
      }
    }, 300);
  }
};

// 모달 배경 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('commentModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeCommentModal();
      }
    });
  }
});


// 댓글 더보기 모달 열기
function openCommentMoreModal(button, commentItem) {
  const modal = document.getElementById('commentMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.comment-more-modal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCommentMoreModalScroll, { passive: true });
      }
    }
  }
}

// 댓글 더보기 모달 닫기
function closeCommentMoreModal() {
  const modal = document.getElementById('commentMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCommentMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// 댓글 더보기 모달 스크롤 핸들러
function handleCommentMoreModalScroll() {
  const modal = document.getElementById('commentMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCommentMoreModal();
  }
}

// 준비중인 기능 팝업 모달 표시
function showComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.animation = 'fadeIn 0.2s ease';
  }
}

// 준비중인 기능 팝업 모달 닫기
function closeComingSoonModal() {
  const modal = document.getElementById('comingSoonModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// CreatorMoreModal 열기
function openCreatorMoreModal(button) {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && button) {
    const rect = button.getBoundingClientRect();
    modal.style.display = 'flex';
    const modalContent = modal.querySelector('.CreatorMoreModal-content');
    if (modalContent) {
      const top = rect.top;
      const right = window.innerWidth - rect.right;
      modalContent.style.top = top + 'px';
      modalContent.style.right = right + 'px';

      if (!modal.hasAttribute('data-scroll-listener')) {
        modal.setAttribute('data-scroll-listener', 'true');
        window.addEventListener('scroll', handleCreatorMoreModalScroll, { passive: true });
      }
    }
    // 모달이 열릴 때 옵션 버튼 이벤트 리스너 연결
    setTimeout(() => {
      document.querySelectorAll('.CreatorMoreModal-option').forEach(btn => {
        if (!btn.hasAttribute('data-option-listener-attached')) {
          btn.setAttribute('data-option-listener-attached', 'true');
          btn.addEventListener('click', function (e) {
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
  const modal = document.getElementById('CreatorMoreModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.2s ease';
      window.removeEventListener('scroll', handleCreatorMoreModalScroll);
      modal.removeAttribute('data-scroll-listener');
    }, 200);
  }
}

// CreatorMoreModal 스크롤 핸들러
function handleCreatorMoreModalScroll() {
  const modal = document.getElementById('CreatorMoreModal');
  if (modal && modal.style.display === 'flex') {
    closeCreatorMoreModal();
  }
}

// 게시글 상세 모달 열기
function openFeedDetailModal(card) {
  const modal = document.getElementById('feedDetailModal');
  if (modal && card) {
    // 카드 정보 가져오기
    const date = card.querySelector('.feed-date')?.textContent || '';
    const title = card.querySelector('.feed-title')?.textContent || '';
    const authorName = card.querySelector('.feed-author-name')?.textContent || '';
    const likes = card.querySelector('.stat-group .stat-item')?.textContent || '0';
    const comments = card.querySelectorAll('.stat-group .stat-item')[1]?.textContent || '0';

    // 모달 내용 업데이트
    const modalDate = modal.querySelector('.feed-detail-date');
    const modalTitle = modal.querySelector('.feed-detail-title');
    const modalAuthorName = modal.querySelector('.feed-detail-author-name');
    const modalLikes = modal.querySelectorAll('.feed-detail-stats .stat-item')[0];
    const modalComments = modal.querySelectorAll('.feed-detail-stats .stat-item')[1];

    if (modalDate) modalDate.textContent = date;
    if (modalTitle) modalTitle.textContent = title;
    if (modalAuthorName) modalAuthorName.textContent = authorName;
    if (modalLikes) modalLikes.textContent = likes;
    if (modalComments) modalComments.textContent = comments;

    modal.style.display = 'flex';
    // 상단 배경 표시를 위한 클래스 추가
    modal.classList.add('modal-open');
  }
}

// 게시글 상세 모달 닫기
window.closeFeedDetailModal = function () {
  const modal = document.getElementById('feedDetailModal');
  if (modal) {
    const modalContent = modal.querySelector('.feed-detail-modal-content');
    if (modalContent) {
      modalContent.style.animation = 'slideDown 0.3s ease forwards';
    }
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    modal.classList.remove('modal-open');
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = 'fadeIn 0.3s ease';
      if (modalContent) {
        modalContent.style.animation = 'slideUp 0.3s ease';
      }
    }, 300);
  }
};

// 모달 배경 클릭 시 닫기 및 ESC 키 처리
document.addEventListener('click', function (e) {
  const creatorMoreModal = document.getElementById('CreatorMoreModal');
  if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
    // CreatorMoreModal-option 클릭은 제외
    if (e.target.closest('.CreatorMoreModal-option')) {
      return;
    }
    if (!e.target.closest('.CreatorMoreModal-content') && !e.target.closest('.post-more-btn')) {
      closeCreatorMoreModal();
    }
  }

  const commentMoreModal = document.getElementById('commentMoreModal');
  if (commentMoreModal && commentMoreModal.style.display === 'flex') {
    if (!e.target.closest('.comment-more-modal-content') && !e.target.closest('.comment-more-btn')) {
      closeCommentMoreModal();
    }
  }

  const feedDetailModal = document.getElementById('feedDetailModal');
  if (feedDetailModal && feedDetailModal.style.display === 'flex') {
    if (e.target === feedDetailModal || e.target.closest('.feed-detail-close')) {
      closeFeedDetailModal();
    }
  }

  // 준비중인 기능 팝업 배경 클릭 시 닫기
  const comingSoonModal = document.getElementById('comingSoonModal');
  if (comingSoonModal && comingSoonModal.style.display === 'flex') {
    if (e.target === comingSoonModal || e.target.closest('.coming-soon-modal-close')) {
      closeComingSoonModal();
    }
  }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const feedDetailModal = document.getElementById('feedDetailModal');
    if (feedDetailModal && feedDetailModal.style.display === 'flex') {
      closeFeedDetailModal();
      return;
    }
    const commentModal = document.getElementById('commentModal');
    if (commentModal && commentModal.style.display === 'flex') {
      closeCommentModal();
      return;
    }
    const commentMoreModal = document.getElementById('commentMoreModal');
    if (commentMoreModal && commentMoreModal.style.display === 'flex') {
      closeCommentMoreModal();
      return;
    }
    const creatorMoreModal = document.getElementById('CreatorMoreModal');
    if (creatorMoreModal && creatorMoreModal.style.display === 'flex') {
      closeCreatorMoreModal();
      return;
    }
    const comingSoonModal = document.getElementById('comingSoonModal');
    if (comingSoonModal && comingSoonModal.style.display === 'flex') {
      closeComingSoonModal();
      return;
    }
  }
});

// coming-soon-modal-close 버튼 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector('.coming-soon-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeComingSoonModal();
    });
  }
});

