/**
 * Episode Viewer JS
 * Handles vertical scrolling of cuts and series navigation.
 */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const workId = urlParams.get("work_id");

  if (!workId) {
    alert("작품 ID가 없습니다.");
    window.history.back();
    return;
  }

  const titleEl = document.querySelector(".episode-viewer-title");
  const contentEl = document.querySelector(".episode-viewer-content");
  const navPrev = document.querySelector(".episode-nav-prev");
  const navNext = document.querySelector(".episode-nav-next");
  const navLabel = document.querySelector(".episode-nav-label");

  async function loadEpisode() {
    const sb =
      typeof window.getSupabase === "function"
        ? await window.getSupabase()
        : window.supabase;
    if (!sb || typeof sb.from !== "function") {
      console.warn("[VIEWER] Supabase client not ready, retrying...");
      return;
    }

    // 1. 작품 정보 및 컷 로드
    const { data: work, error: workError } = await sb
      .from("works")
      .select(
        `
                *,
                cuts(*)
            `
      )
      .eq("id", workId)
      .single();

    if (workError || !work) {
      console.error("[VIEWER] Load error:", workError);
      return;
    }

    titleEl.textContent = work.title;
    navLabel.textContent = work.episode_number
      ? `EP.${String(work.episode_number).padStart(2, "0")}`
      : "단편";

    // 컷 렌더링 (가로 슬라이드 방식 - 피드와 동일한 UI)
    contentEl.innerHTML = "";
    const sortedCuts = (work.cuts || []).sort(
      (a, b) => a.order_index - b.order_index
    );

    if (sortedCuts.length === 0) {
      contentEl.innerHTML =
        '<div style="padding:100px 20px; text-align:center; color:#999;">이미지가 없습니다.</div>';
    } else {
      const imageItems = sortedCuts
        .map((cut, idx) => {
          // 개별 컷 편집 구도 적용 (scale, x_position, y_position)
          const imgStyle = `width: 100%; height: 100%; object-fit: cover; transform: scale(${
            cut.scale || 1
          }); transform-origin: ${cut.x_position || 50}% ${
            cut.y_position || 50
          }%; display: block;`;

          return `
            <div class="feed-image-item" style="background-color: #f7f7f7; width:100%; flex-shrink:0; aspect-ratio:1/1;">
              <img src="${cut.image_url}" style="${imgStyle}" loading="lazy" />
            </div>
          `;
        })
        .join("");

      const dots = sortedCuts
        .map(
          (_, idx) =>
            `<span class="pagination-dot${idx === 0 ? " active" : ""}"></span>`
        )
        .join("");

      contentEl.innerHTML = `
        <div class="feed-image-container" style="position:relative; width:100%; aspect-ratio:1/1; overflow:hidden;">
          <div class="feed-image-scroll" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; -ms-overflow-style:none; scrollbar-width:none;">
            ${imageItems}
          </div>
          ${
            sortedCuts.length > 1
              ? `
            <button class="slide-prev" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.3); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center;">&lt;</button>
            <button class="slide-next" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.3); color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center;">&gt;</button>
            <div class="pagination-dots" style="position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:5;">${dots}</div>
            `
              : ""
          }
        </div>
      `;

      // 스크롤 및 화살표 로직
      const scrollContainer = contentEl.querySelector(".feed-image-scroll");
      const btnPrev = contentEl.querySelector(".slide-prev");
      const btnNext = contentEl.querySelector(".slide-next");

      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", () => {
          const index = Math.round(
            scrollContainer.scrollLeft / scrollContainer.clientWidth
          );
          const dotsList = contentEl.querySelectorAll(".pagination-dot");
          dotsList.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
          });
        });

        if (btnPrev) {
          btnPrev.onclick = () => {
            scrollContainer.scrollBy({
              left: -scrollContainer.clientWidth,
              behavior: "smooth",
            });
          };
        }
        if (btnNext) {
          btnNext.onclick = () => {
            scrollContainer.scrollBy({
              left: scrollContainer.clientWidth,
              behavior: "smooth",
            });
          };
        }
      }
    }

    // 2. 시리즈 내비게이션 (이전/다음 화) - is_deleted 필터 추가 및 정렬 로직 강화
    if (work.series_id) {
      const { data: neighbors, error: nError } = await sb
        .from("works")
        .select("id, episode_number")
        .eq("series_id", work.series_id)
        .eq("is_deleted", false) // 삭제된 작품 제외
        .or("is_public.eq.true,status.eq.approved,status.eq.published") // 공개/승인 된 것만
        .order("episode_number", { ascending: true });

      if (!nError && neighbors) {
        const currentIndex = neighbors.findIndex((n) => n.id === workId);

        // 이전 화
        if (currentIndex > 0) {
          const prev = neighbors[currentIndex - 1];
          navPrev.onclick = () =>
            (window.location.href = `creator_episode_viewer.html?work_id=${prev.id}`);
          navPrev.style.opacity = "1";
          navPrev.style.pointerEvents = "auto";
        } else {
          navPrev.style.opacity = "0.3";
          navPrev.style.pointerEvents = "none";
        }

        // 다음 화
        if (currentIndex < neighbors.length - 1) {
          const next = neighbors[currentIndex + 1];
          navNext.onclick = () =>
            (window.location.href = `creator_episode_viewer.html?work_id=${next.id}`);
          navNext.style.opacity = "1";
          navNext.style.pointerEvents = "auto";

          // 다음 화 보기 버튼 추가
          addNextEpisodeButton(next.id, next.episode_number);
        } else {
          navNext.style.opacity = "0.3";
          navNext.style.pointerEvents = "none";
        }
      }
    } else {
      navPrev.style.display = "none";
      navNext.style.display = "none";
    }
  }

  function addNextEpisodeButton(nextId, nextNum) {
    const existing = document.getElementById("next-ep-footer-btn");
    if (existing) existing.remove();

    const btn = document.createElement("button");
    btn.id = "next-ep-footer-btn";
    btn.style.cssText =
      "width:calc(100% - 40px); margin:40px 20px; height:56px; background:#ff5e00; color:#fff; border:none; border-radius:12px; font-size:16px; font-weight:700; cursor:pointer;";
    btn.textContent = `다음 화 (EP.${String(nextNum).padStart(2, "0")}) 보기`;
    btn.onclick = () =>
      (window.location.href = `creator_episode_viewer.html?work_id=${nextId}`);
    contentEl.appendChild(btn);
  }

  if (window.getSupabase) {
    loadEpisode();
  } else {
    setTimeout(loadEpisode, 500);
  }
});
