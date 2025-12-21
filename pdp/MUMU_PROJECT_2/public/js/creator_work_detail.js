// public/js/creator_work_detail.js

console.log("[WORK_DETAIL][PAGE] 페이지 로드 시작");

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const workId = urlParams.get("work_id");

  if (!workId) {
    console.warn("[WORK_DETAIL][PAGE] work_id 파라미터 없음 - 중단");
    return;
  }

  function waitForSupabase(cb, maxAttempts = 100) {
    let attempts = 0;
    function check() {
      attempts++;
      if (window.supabase) {
        cb(window.supabase);
        return;
      }
      if (attempts >= maxAttempts) return;
      setTimeout(check, 50);
    }
    check();
  }

  waitForSupabase(async () => {
    try {
      const sb = window.supabase;

      // 1. 작품 정보 조회
      const { data: work, error: workError } = await sb
        .from("works")
        .select("*")
        .eq("id", workId)
        .single();

      if (workError || !work) {
        console.error("[WORK_DETAIL][LOAD] 작품 조회 실패:", workError);
        return;
      }

      console.log(`[WORK_DETAIL][LOAD] Title=${work.title} Creator=${work.creator_id}`);

      // UI Title Update
      const titleEl = document.querySelector(".work-detail-title");
      if (titleEl) titleEl.textContent = work.title || "작품 제목";

      // 2. 시리즈 조회 (creator_id + title 일치)
      if (!work.creator_id || !work.title) {
          console.warn("[WORK_DETAIL][SERIES] Insufficient data to find series");
          renderEpisodes([], work.title);
          return;
      }

      // Try-Catch or maybeSingle to avoid 406/Throws if no rows found or multiple found (though single expected)
      // "maybeSingle" returns null if 0 rows, but error if multiple.
      // Prompt says "creator_id = works.creator_id AND title = works.title limit 1"
      
      const { data: series, error: sError } = await sb
          .from("series")
          .select("*")
          .eq("creator_id", work.creator_id)
          .eq("title", work.title)
          .limit(1)
          .maybeSingle();

      if (sError) {
          console.error("[WORK_DETAIL][SERIES] Error finding series", sError);
          renderEpisodes([], work.title);
          return;
      }

      if (!series) {
          console.log("[WORK_DETAIL][SERIES] Not found (Single work?)");
          renderEpisodes([], work.title);
          return;
      }

      console.log(`[WORK_DETAIL][SERIES] Found series_id=${series.id}`);

      // 3. 에피소드 조회 (series_id 기준)
      // work_id 사용 금지
      const { data: episodes, error: epError } = await sb
          .from("episodes")
          .select("*")
          .eq("series_id", series.id)
          .eq("is_published", true)
          .order("episode_no", { ascending: false });

      if (epError) {
          console.error("[WORK_DETAIL][EPISODES] Load failed", epError);
          renderEpisodes([], work.title);
          return;
      }

      console.log(`[WORK_DETAIL][EPISODES] Count=${episodes ? episodes.length : 0}`);
      renderEpisodes(episodes || [], work.title);

    } catch (e) {
      console.error("[WORK_DETAIL] Exception:", e);
    }
  });
});

function renderEpisodes(episodes, workTitle) {
    const list = document.querySelector(".episode-list");
    if (!list) return;
    list.innerHTML = "";
    
    if (episodes.length === 0) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:#999">등록된 회차가 없습니다.</div>`;
        return;
    }

    episodes.forEach(ep => {
        const item = document.createElement("a");
        item.className = "episode-item";
        item.href = `creator_episode_viewer.html?episode_id=${ep.id}`;
        
        const thumb = ep.cover_url || ""; 
        const title = ep.title || workTitle;
        const num = ep.episode_no ? `EP.${String(ep.episode_no).padStart(2,'0')}` : "";

        item.innerHTML = `
           <div class="episode-thumbnail" style="background-image:url(${thumb}); background-size:cover; background-position:center"></div>
           <div class="episode-info">
             <h3 class="episode-title">${title}</h3>
             <div class="episode-date">${num}</div>
           </div>
        `;
        list.appendChild(item);
    });
}