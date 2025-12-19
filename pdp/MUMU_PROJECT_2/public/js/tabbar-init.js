/**
 * Tabbar initialization - works in both local and Firebase Hosting
 * Single source of truth for active tab detection
 */
(function () {
  function getCurrentPageKey() {
    const currentPath = window.location.pathname;
    // Handle both "/index.html" and "/" and "" cases
    let currentPage = currentPath.split("/").pop();

    // Handle root/index case
    if (!currentPage || currentPage === "" || currentPage === "index.html") {
      return "index";
    }

    // Remove .html extension if present
    if (currentPage.endsWith(".html")) {
      currentPage = currentPage.replace(".html", "");
    }

    // Map page names (with or without .html) to data-page values
    const pageMap = {
      index: "index",
      community: "community",
      explore: "explore",
      store: "store",
      mypage_reader: "mypage_reader",
      mypage_creator: "mypage_reader", // creator pages use same tab
    };

    return pageMap[currentPage] || "index";
  }

  function setActiveTab() {
    const currentPath = window.location.pathname;
    let currentPage = currentPath.split("/").pop();

    // Remove .html extension if present
    if (currentPage && currentPage.endsWith(".html")) {
      currentPage = currentPage.replace(".html", "");
    }

    // mypage_creator에서는 탭바 활성화하지 않음
    if (currentPage === "mypage_creator") {
      // Remove active from all tabs
      document.querySelectorAll(".tabbar-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      return;
    }

    const currentPageKey = getCurrentPageKey();

    // Find and activate the correct tab
    const activeTab = document.querySelector(
      `.tabbar-tab[data-page="${currentPageKey}"]`
    );

    if (activeTab) {
      // Remove active from all tabs
      document.querySelectorAll(".tabbar-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      // Add active to current tab
      activeTab.classList.add("active");
    }

    // Add click feedback (doesn't prevent navigation)
    const tabbarTabs = document.querySelectorAll(".tabbar-tab");
    tabbarTabs.forEach((tab) => {
      // Remove existing listeners to avoid duplicates
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);

      newTab.addEventListener("click", async function (e) {
        // 마이페이지 링크인 경우 사용자 타입 확인 후 라우팅
        if (
          this.id === "mypage-link" ||
          this.getAttribute("href")?.includes("mypage")
        ) {
          e.preventDefault();

          try {
            // Firebase Auth에서 현재 사용자 확인
            const firebaseUser = await window.getCurrentFirebaseUser();
            if (!firebaseUser) {
              // 로그인 안 된 경우 로그인 페이지로
              window.location.href = "login.html";
              return;
            }

            // Firestore에서 사용자 타입 확인
            const { getFirestore, doc, getDoc } = await import(
              "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
            );
            const { db } = await import("/js/firebase_init.js");

            // creators 컬렉션에서 확인
            const creatorDoc = await getDoc(
              doc(db, "creators", firebaseUser.uid)
            );
            if (creatorDoc.exists()) {
              // Creator인 경우
              window.location.href = "mypage_creator.html";
            } else {
              // Reader인 경우 (또는 기본값)
              window.location.href = "mypage_reader.html";
            }
          } catch (error) {
            console.error("사용자 타입 확인 오류:", error);
            // 오류 발생 시 기본적으로 reader 페이지로
            window.location.href = "mypage_reader.html";
          }
          return;
        }

        // Visual feedback only - navigation happens naturally
        // Don't prevent default - let href work
        document.querySelectorAll(".tabbar-tab").forEach((t) => {
          t.classList.remove("active");
        });
        this.classList.add("active");

        // Ensure active state persists (remove any image-related behavior)
        const icon = this.querySelector(".tabbar-icon");
        if (icon) {
          icon.style.filter = "";
          icon.style.opacity = "";
          icon.style.transform = "";
        }
      });
    });
  }

  function initTabbar() {
    const tabbarContainer = document.getElementById("tabbar");

    if (!tabbarContainer) {
      console.error("Tabbar container not found");
      return;
    }

    // Fetch tabbar HTML component
    fetch("components/tabbar.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch tabbar: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        // Insert tabbar HTML into container
        tabbarContainer.innerHTML = html;

        // Set active tab after HTML is loaded
        setActiveTab();

        // Force visibility
        const tabbar = tabbarContainer.querySelector(".tabbar, nav.tabbar");
        if (tabbar) {
          tabbar.style.display = "flex";
          tabbar.style.visibility = "visible";
          tabbar.style.opacity = "1";
        }
      })
      .catch((error) => {
        console.error("Error loading tabbar:", error);
        // Fallback: show error or use empty tabbar
        tabbarContainer.innerHTML = "<!-- Tabbar failed to load -->";
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTabbar);
  } else {
    initTabbar();
  }
})();
