// public/js/creator_works_list.js

console.log("[WORKS_LIST][PAGE] 페이지 로드 시작");

async function getCurrentFirebaseUid() {
  try {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      return user?.uid || null;
    }
    const { auth } = await import("/js/firebase_init.js");
    return auth.currentUser?.uid || null;
  } catch (error) {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let creatorId = urlParams.get("creator_id");

  if (!creatorId) {
    const authUid = await getCurrentFirebaseUid();
    if (authUid) creatorId = authUid;
  }

  if (!creatorId) {
    console.warn("creator_id missing");
    return;
  }

  function waitForSupabase(cb) {
      if (window.supabase) cb(window.supabase);
      else setTimeout(() => waitForSupabase(cb), 50);
  }

  waitForSupabase(async () => {
      const sb = window.supabase;

      // 1. Creator Load (to get PK)
      const { data: creator, error: cError } = await sb
        .from("creators")
        .select("*")
        .eq("firebase_uid", creatorId)
        .single();
      
      if (cError || !creator) {
          console.error("Creator load failed", cError);
          return;
      }

      // Title Update
      const titleEl = document.querySelector(".works-list-title");
      if (titleEl) titleEl.textContent = `${creator.pen_name || "작가"}의 작품`;

      // 2. Works Load (using creator_id = creator.id)
      const { data: works, error: wError } = await sb
          .from("works")
          .select("*")
          .eq("creator_id", creator.id)
          .eq("is_deleted", false)
          .eq("is_published", true)
          .order("created_at", { ascending: false });

      if (wError) {
          console.error("Works load failed", wError);
          return;
      }

      renderWorksList(works || []);
  });
});

function renderWorksList(works) {
    const container = document.querySelector(".works-list-content");
    if (!container) return;
    container.innerHTML = "";

    if (works.length === 0) {
        container.innerHTML = `<div style="padding:40px; text-align:center; color:#999">등록된 작품이 없습니다.</div>`;
        return;
    }

    works.forEach(work => {
        const item = document.createElement("a");
        item.href = `creator_work_detail.html?work_id=${work.id}`;
        item.className = "work-item";
        
        const thumb = work.thumbnail_url || work.cover_url || "";
        const title = work.title || "무제";
        
        // Date handling if created_at exists, else empty
        const date = work.created_at ? new Date(work.created_at).toLocaleDateString('ko-KR') : "";

        item.innerHTML = `
          <div class="work-item-thumbnail" style="background-image: url(${thumb}); background-size: cover; background-position: center;"></div>
          <div class="work-item-info">
            <h3 class="work-item-title">${title}</h3>
            <div class="work-item-date">${date}</div>
          </div>
          <div class="work-item-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="15" viewBox="0 0 21 15" fill="none">
              <path d="M1 6.36328C0.447715 6.36328 0 6.811 0 7.36328C0 7.91557 0.447715 8.36328 1 8.36328V7.36328V6.36328ZM20.421 8.07039C20.8115 7.67986 20.8115 7.0467 20.421 6.65617L14.057 0.292213C13.6665 -0.0983109 13.0333 -0.0983109 12.6428 0.292213C12.2523 0.682738 12.2523 1.3159 12.6428 1.70643L18.2997 7.36328L12.6428 13.0201C12.2523 13.4107 12.2523 14.0438 12.6428 14.4343C13.0333 14.8249 13.6665 14.8249 14.057 14.4343L20.421 8.07039ZM1 7.36328V8.36328H19.7139V7.36328V6.36328H1V7.36328Z" fill="#A0A0A0"/>
            </svg>
          </div>
        `;
        container.appendChild(item);
    });
}