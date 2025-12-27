/**
 * Series Detail JS
 * Loads series info and ordered episodes from works table.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const seriesId = urlParams.get("series_id");

  if (!seriesId) {
    alert("잘못된 접근입니다.");
    window.history.back();
    return;
  }

  const seriesTitle = document.getElementById("seriesTitle");
  const seriesDesc = document.getElementById("seriesDesc");
  const seriesThumbImg = document
    .getElementById("seriesThumb")
    .querySelector("img");
  const episodeCount = document.getElementById("episodeCount");
  const episodesGrid = document.getElementById("episodesGrid");
  const bingeBtn = document.getElementById("bingeBtn");

  async function loadSeriesData() {
    // Fallback if import doesn't work as expected
    const sb =
      typeof window.getSupabase === "function"
        ? await window.getSupabase()
        : window.supabase;
    if (!sb || typeof sb.from !== "function") {
      console.warn("[SERIES] Supabase client not ready, retrying...");
      return;
    }

    // 1. 시리즈 기본 정보
    const { data: series, error: sError } = await sb
      .from("series")
      .select("*")
      .eq("id", seriesId)
      .single();

    if (sError || !series) {
      console.error("[SERIES] Load error:", sError);
      seriesTitle.textContent = "시리즈를 찾을 수 없습니다.";
      return;
    }

    seriesTitle.textContent = series.title;
    seriesDesc.textContent = series.description || "등록된 설명이 없습니다.";
    seriesThumbImg.src =
      series.thumbnail_url || "/assets/placeholder-series.png";

    // 2. 에피소드 리스트 (works 테이블에서 series_id로 조회)
    // ✅ 개발/테스트 편의를 위해 is_public뿐만 아니라 approved, published, under_review 상태도 보이도록 함
    const { data: episodes, error: epError } = await sb
      .from("works")
      .select("id, title, thumbnail_url, episode_number, created_at, status")
      .eq("series_id", seriesId)
      .or(
        "is_public.eq.true,status.eq.approved,status.eq.published,status.eq.under_review"
      )
      .order("episode_number", { ascending: true });

    if (epError) {
      console.error("[EPISODES] Load error:", epError);
      return;
    }

    episodeCount.textContent = `${episodes.length}화`;
    renderEpisodes(episodes);

    // 3. 정주행 버튼 (첫 화로 이동)
    if (episodes.length > 0) {
      bingeBtn.onclick = () => {
        window.location.href = `creator_episode_viewer.html?work_id=${episodes[0].id}`;
      };
    } else {
      bingeBtn.style.display = "none";
    }
  }

  function renderEpisodes(episodes) {
    episodesGrid.innerHTML = "";

    // 정렬된 에피소드를 역순(최신순)으로 표시할지 결정 (일반적으로 목록은 최신순)
    const displayList = [...episodes].reverse();

    displayList.forEach((ep) => {
      const card = document.createElement("a");
      card.className = "episode-card";
      card.href = `creator_episode_viewer.html?work_id=${ep.id}`;

      const thumb = ep.thumbnail_url || "/assets/placeholder-work.png";
      const dateStr = ep.created_at
        ? new Date(ep.created_at).toLocaleDateString()
        : "";
      const epNum = ep.episode_number
        ? `EP.${String(ep.episode_number).padStart(2, "0")}`
        : "";

      card.innerHTML = `
                <div class="ep-thumb">
                    <img src="${thumb}" alt="${ep.title}">
                </div>
                <div class="ep-info">
                    <h3 class="ep-title">${ep.title}</h3>
                    <div class="ep-meta">${dateStr}</div>
                </div>
                <div class="ep-number">${epNum}</div>
            `;
      episodesGrid.appendChild(card);
    });
  }

  // Supabase 준비 대기 후 로드
  if (window.supabase) {
    loadSeriesData();
  } else {
    setTimeout(loadSeriesData, 1000);
  }
});
