/**
 * Suggested Works Section Logic
 * Fetches works based on reader preferences or recent additions
 */

async function initSuggestedWorks() {
  const container = document.querySelector(".suggested-works-scroll");
  if (!container) return;

  try {
    // 1. Get Supabase client
    const supabase =
      typeof window.getSupabase === "function"
        ? await window.getSupabase()
        : null;
    if (!supabase) {
      console.warn("[SUGGESTED] Supabase client not available");
      return;
    }

    // 2. Try to get current user preferences
    let preferredGenres = [];
    const firebaseUser =
      typeof window.getCurrentFirebaseUser === "function"
        ? await window.getCurrentFirebaseUser()
        : null;

    if (firebaseUser) {
      const { data: prefData } = await supabase
        .from("reader_preferences")
        .select("preferred_genres")
        .eq("reader_id", firebaseUser.uid)
        .maybeSingle();

      if (prefData && Array.isArray(prefData.preferred_genres)) {
        preferredGenres = prefData.preferred_genres;
      }
    }

    // 3. Fetch works
    let worksQuery = supabase
      .from("works")
      .select("id, title, thumbnail_url, creator_id, genre")
      .eq("is_public", true);

    // If preferred genres exist, prioritize them
    if (preferredGenres && preferredGenres.length > 0) {
      // Use overlaps for array column
      worksQuery = worksQuery.overlaps("genre", preferredGenres);
    }

    // Limit and order
    worksQuery = worksQuery.order("created_at", { ascending: false }).limit(10);

    const { data: works, error } = await worksQuery;

    if (error) {
      console.warn(
        "[SUGGESTED] Genre overlap query failed, falling back to all works",
        error
      );
    }

    if (!works || works.length === 0) {
      // Fallback: If no works match preferred genres, fetch any public works ordered by creation date
      const { data: fallbackWorks } = await supabase
        .from("works")
        .select("id, title, thumbnail_url, creator_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);

      renderWorks(fallbackWorks, container);
    } else {
      renderWorks(works, container);
    }
  } catch (err) {
    console.error("[SUGGESTED] Failed to load suggested works:", err);
  }
}

/**
 * Render works list to UI
 */
function renderWorks(works, container) {
  if (!works || works.length === 0) {
    // Keep mockup or show empty? Best to show something.
    return;
  }

  // Clear container
  container.innerHTML = "";

  works.forEach((work) => {
    const card = document.createElement("div");
    card.className = "suggested-work-card";
    card.style.cursor = "pointer";

    // Fallback image if thumbnail_url is missing
    const thumbUrl = work.thumbnail_url || "assets/images/Frame 99.png";

    card.innerHTML = `
      <img src="${thumbUrl}" class="suggested-work-thumb" alt="${work.title}" onerror="this.src='assets/images/Frame 99.png'">
      <div class="suggested-work-name">${work.title}</div>
    `;

    card.onclick = () => {
      // Navigate to series detail for binge reading
      if (work.id) {
        window.location.href = `series_detail.html?work_id=${work.id}`;
      }
    };

    container.appendChild(card);
  });
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Give it a small delay to ensure mumu-lib is initialized
  setTimeout(initSuggestedWorks, 500);
});
