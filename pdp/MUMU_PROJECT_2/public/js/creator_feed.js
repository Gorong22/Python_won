// Creator Feed 관리 스크립트
// - feeds 목록 조회/렌더
// - 수동 피드 생성
// - 공개/비공개 토글
// - 수동 피드 삭제
// - 추천 피드 노출 (수정/삭제 불가)

const state = {
  supabaseClient: null,
  feeds: [],
};
document.addEventListener("DOMContentLoaded", () => {
  initPage();
});

async function initPage() {
  try {
    await loadHeaderAndTabbar();
    await initializeSupabase();
    ensureCreatorId();
    await loadWorks();
    renderWorkSelect();
    bindCreateButton();
    await loadFeeds();
    renderFeedList();
  } catch (error) {
    console.error("Creator feed init failed:", error);
    showStatus("피드를 불러오는 중 문제가 발생했습니다.", "error");
  }
}

async function loadHeaderAndTabbar() {
  try {
    const headerRes = await fetch("components/header.html");
    if (headerRes.ok) {
      const html = await headerRes.text();
      const headerEl = document.getElementById("header");
      if (headerEl) {
        headerEl.innerHTML = html;
      }
    }
  } catch (e) {
    console.warn("Header load failed:", e);
  }

  try {
    const tabRes = await fetch("components/tabbar.html");
    if (tabRes.ok) {
      const html = await tabRes.text();
      const tabEl = document.getElementById("tabbar");
      if (tabEl) {
        tabEl.innerHTML = html;
      }
    }
  } catch (e) {
    console.warn("Tabbar load failed:", e);
  }
}

function ensureCreatorId() {
  if (!window.__CREATOR_ID__) {
    throw new Error(
      "creator_id가 설정되지 않았습니다. 로그인 후 다시 시도하세요."
    );
  }
}

async function initializeSupabase() {
  const { getSupabase } = await import("./auth.js");
  state.supabaseClient = getSupabase();
}

function showStatus(message, type = "info") {
  const statusEl = document.getElementById("create-feed-status");
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `status-text ${type}`;
}

async function loadWorks() {
  const { data, error } = await state.supabaseClient
    .from("works")
    .select("id, title, thumbnail_url, created_at")
    .eq("creator_id", window.__CREATOR_ID__)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to load works:", error);
    state.works = [];
    return;
  }

  state.works = data || [];
}

function renderWorkSelect() {
  const select = document.getElementById("work-select");
  if (!select) return;

  select.innerHTML = '<option value="">작품을 선택하세요</option>';
  state.works.forEach((work) => {
    const option = document.createElement("option");
    option.value = work.id;
    option.textContent = work.title || work.id;
    select.appendChild(option);
  });
}

function bindCreateButton() {
  const btn = document.getElementById("create-feed-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (state.creating) return;
    const select = document.getElementById("work-select");
    const workId = select?.value;
    if (!workId) {
      showStatus("먼저 작품을 선택하세요.", "error");
      return;
    }
    await createManualFeed(workId);
  });
}

async function createManualFeed(workId) {
  state.creating = true;
  showStatus("피드를 생성 중입니다...", "info");
  try {
    const work = state.works.find((w) => w.id === workId);
    if (!work) {
      showStatus("선택한 작품을 찾을 수 없습니다.", "error");
      return;
    }

    const thumbnailUrl = await resolveWorkThumbnail(workId, work.thumbnail_url);
    const insertPayload = {
      creator_id: window.__CREATOR_ID__,
      type: "work",
      ref_id: workId,
      title: work.title || "작품",
      thumbnail_url: thumbnailUrl || null,
      source: "manual",
      is_public: true,
    };

    const { error } = await state.supabaseClient
      .from("feeds")
      .insert(insertPayload);
    if (error) {
      console.warn("Failed to create feed:", error);
      showStatus("피드 생성에 실패했습니다. 다시 시도해주세요.", "error");
      return;
    }

    showStatus("피드가 생성되었습니다.", "success");
    await loadFeeds();
    renderFeedList();
  } catch (error) {
    console.warn("createManualFeed error:", error);
    showStatus("피드 생성 중 오류가 발생했습니다.", "error");
  } finally {
    state.creating = false;
  }
}

async function resolveWorkThumbnail(workId, fallbackThumbnail) {
  const { data, error } = await state.supabaseClient
    .from("cuts")
    .select("image_url")
    .eq("work_id", workId)
    .order("order_index", { ascending: true })
    .limit(1);

  if (error) {
    console.warn("Failed to resolve work thumbnail:", error);
  }

  const firstCutUrl =
    Array.isArray(data) && data.length > 0 ? data[0].image_url : null;
  return firstCutUrl || fallbackThumbnail || null;
}

async function loadFeeds() {
  state.loadingFeeds = true;
  const { data, error } = await state.supabaseClient
    .from("feeds")
    .select("*")
    .eq("creator_id", window.__CREATOR_ID__)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to load feeds:", error);
    state.feeds = [];
  } else {
    state.feeds = data || [];
  }
  state.loadingFeeds = false;
}

function renderFeedList() {
  const list = document.getElementById("feed-list");
  const empty = document.getElementById("feed-empty");
  if (!list) return;

  list.innerHTML = "";

  if (!state.feeds.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  state.feeds.forEach((feed) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.dataset.feedId = feed.id;

    const thumb = document.createElement("div");
    thumb.className = "feed-thumb";
    if (feed.thumbnail_url) {
      const img = document.createElement("img");
      img.src = feed.thumbnail_url;
      img.alt = feed.title || "피드 썸네일";
      img.loading = "lazy";
      img.style.objectFit = "cover";
      thumb.appendChild(img);
    } else {
      thumb.textContent = "썸네일 없음";
    }

    const meta = document.createElement("div");
    meta.className = "feed-meta";

    const title = document.createElement("div");
    title.className = "feed-title";
    title.textContent = feed.title || "(제목 없음)";

    const badges = document.createElement("div");
    badges.className = "feed-badges";

    const typeBadge = document.createElement("span");
    typeBadge.className = "badge badge-type";
    typeBadge.textContent = feed.type === "cut" ? "컷" : "작품";
    badges.appendChild(typeBadge);

    const sourceBadge = document.createElement("span");
    sourceBadge.className = "badge badge-source";
    sourceBadge.textContent = feed.source === "algorithm" ? "추천" : "수동";
    badges.appendChild(sourceBadge);

    if (feed.source === "algorithm" && typeof feed.score === "number") {
      const scoreBadge = document.createElement("span");
      scoreBadge.className = "badge badge-score";
      scoreBadge.textContent = `추천점수 ${feed.score}`;
      badges.appendChild(scoreBadge);
    }

    if (!feed.is_public) {
      const privateBadge = document.createElement("span");
      privateBadge.className = "badge badge-private";
      privateBadge.textContent = "비공개";
      badges.appendChild(privateBadge);
    }

    meta.appendChild(title);
    meta.appendChild(badges);

    const actions = document.createElement("div");
    actions.className = "feed-actions";

    if (feed.source === "manual") {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn-secondary";
      toggleBtn.textContent = feed.is_public ? "비공개로 전환" : "공개로 전환";
      toggleBtn.addEventListener("click", () => toggleFeedVisibility(feed));
      actions.appendChild(toggleBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-danger";
      deleteBtn.textContent = "삭제";
      deleteBtn.addEventListener("click", () => deleteFeed(feed));
      actions.appendChild(deleteBtn);
    } else {
      const info = document.createElement("span");
      info.className = "badge badge-disabled";
      info.textContent = "추천됨";
      actions.appendChild(info);
    }

    card.appendChild(thumb);
    card.appendChild(meta);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

async function toggleFeedVisibility(feed) {
  const next = !feed.is_public;
  const { error } = await state.supabaseClient
    .from("feeds")
    .update({ is_public: next })
    .eq("id", feed.id)
    .eq("creator_id", window.__CREATOR_ID__);

  if (error) {
    console.warn("Failed to toggle feed visibility:", error);
    showStatus("공개 상태 변경에 실패했습니다.", "error");
    return;
  }

  const target = state.feeds.find((f) => f.id === feed.id);
  if (target) target.is_public = next;
  renderFeedList();
  showStatus("공개 상태가 변경되었습니다.", "success");
}

async function deleteFeed(feed) {
  if (feed.source !== "manual") return;
  const { error } = await state.supabaseClient
    .from("feeds")
    .delete()
    .eq("id", feed.id)
    .eq("creator_id", window.__CREATOR_ID__)
    .eq("source", "manual");

  if (error) {
    console.warn("Failed to delete feed:", error);
    showStatus("피드 삭제에 실패했습니다.", "error");
    return;
  }

  state.feeds = state.feeds.filter((f) => f.id !== feed.id);
  renderFeedList();
  showStatus("피드가 삭제되었습니다.", "success");
}
