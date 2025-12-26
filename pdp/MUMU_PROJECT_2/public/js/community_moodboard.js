// =========================
// COMMUNITY MOODBOARD GALLERY (STABLE)
// =========================

import { getSupabase } from "./supabase-auth.js";

// Global Functions
window.loadCommunityMoodboards = loadCommunityMoodboards;
window.openMoodboardDetail = openMoodboardDetail;

// =========================
// MAIN LOGIC
// =========================

/**
 * Load public moodboards from 'moodboards' table
 */
async function loadCommunityMoodboards() {
  const grid = document.getElementById("communityMoodboardGrid");
  const section = document.getElementById("communityMoodboardSection");

  if (!grid || !section) return;

  try {
    const supabase = await getSupabase();
    if (!supabase) {
      console.warn("[Community] Supabase unavailable");
      return;
    }

    // QUERY: moodboards table (is_public = true)
    // Join with reader_public_profiles for author info
    const { data: moodboards, error } = await supabase
      .from("moodboards")
      .select(
        `
        id,
        title,
        thumbnail_url,
        created_at,
        owner_id,
        reader_public_profiles (
          nickname,
          profile_image_url
        )
      `
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Community] Load failed:", error);
      return;
    }

    if (!moodboards || moodboards.length === 0) {
      grid.innerHTML =
        '<div class="community-moodboard-empty">아직 공개된 무드보드가 없습니다</div>';
      section.style.display = "block";
      return;
    }

    // RENDER
    grid.innerHTML = "";
    moodboards.forEach((mb) => {
      // Data Normalization
      const authorName = mb.reader_public_profiles?.nickname || "User";
      const thumb = mb.thumbnail_url || "";

      const card = createMoodboardCard({
        id: mb.id,
        title: mb.title || "Untitled",
        author: `@${authorName}`,
        thumbnail: thumb,
        // Random height for masonry effect (keep existing visual style)
        height: Math.floor(Math.random() * 100) + 280,
      });

      grid.appendChild(card);
    });

    section.style.display = "block";
  } catch (error) {
    console.error("[Community] Critical error:", error);
  }
}

/**
 * Create Gallery Card
 */
function createMoodboardCard(data) {
  const card = document.createElement("div");
  card.className = "community-moodboard-card";
  card.style.height = `${data.height}px`;

  // NAVIGATION: Direct to Detail Page
  card.onclick = () => {
    window.location.href = `moodboard_detail.html?id=${data.id}`;
  };

  // Thumbnail Fallback Logic
  const bgStyle = data.thumbnail
    ? `background-image: url('${data.thumbnail}');`
    : `background-color: #eee;`;

  card.innerHTML = `
    <div class="community-moodboard-thumbnail" style="${bgStyle} background-size: cover; background-position: center;">
      <div class="community-moodboard-overlay"></div>
      <div class="community-moodboard-info">
        <h3 class="community-moodboard-card-title">${data.title}</h3>
        <p class="community-moodboard-card-author">${data.author}</p>
      </div>
    </div>
  `;

  return card;
}

/**
 * Legacy Support (if called from elsewhere)
 */
function openMoodboardDetail(arg) {
  const id = arg.id || arg;
  if (id) window.location.href = `moodboard_detail.html?id=${id}`;
}

// Auto-init logic if needed (e.g. Tab click)
// Kept simple: relies on 'community.js' or 'app_init.js' to call loadCommunityMoodboards()
// However, the original code had a specific tab listener. We preserve that pattern simply.

document.addEventListener("DOMContentLoaded", () => {
  // Try to bind if elements exist immediately
  const btn = document.querySelector('[data-tab="community"]');
  if (btn) {
    btn.addEventListener("click", () => {
      // Debounce or just call? Original was simple.
      // We just call it. State management handles "already loaded" if desired,
      // but for now re-fetching ensures freshness.
      loadCommunityMoodboards();
    });
  }
});
