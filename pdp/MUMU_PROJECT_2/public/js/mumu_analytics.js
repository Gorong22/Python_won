/**
 * MUMU PASSIVE ANALYTICS ENGINE (MOBILE-SAFE)
 * Downstream-only observer for Anti-Gravity Architecture.
 */

(function (window) {
  const EVENT_QUEUE = [];
  const MAX_BATCH_SIZE = 5;
  const FLUSH_INTERVAL = 10000; // 10s
  let session_id = crypto.randomUUID();
  let flushTimer = null;

  const Analytics = {
    /**
     * Core Logging Method
     * Passive, non-blocking, fail-silent.
     */
    log(eventName, targetType = null, targetId = null, metadata = {}) {
      // Requirement 1: No auth state reads. Use already resolved identity if possible.
      const userId = window.App?.user?.uid || null;
      if (!userId) return; // Drop events if not authenticated (Shadow Observer Rule)

      EVENT_QUEUE.push({
        user_id: userId,
        session_id: session_id,
        event_name: eventName,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata,
        created_at: new Date().toISOString(),
      });

      if (EVENT_QUEUE.length >= MAX_BATCH_SIZE) {
        this.flush();
      } else if (!flushTimer) {
        flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL);
      }
    },

    async flush() {
      if (EVENT_QUEUE.length === 0) return;

      const batch = EVENT_QUEUE.splice(0, MAX_BATCH_SIZE);
      clearTimeout(flushTimer);
      flushTimer = null;

      // Requirement 4: Mobile-safe, non-blocking.
      if (typeof window.getSupabase !== "function") return;

      try {
        const supabase = await window.getSupabase();
        await supabase.from("user_events").insert(batch);
      } catch (e) {
        // Fail silently (Requirement 4)
        console.warn("[ANALYTICS] Flush failed", e);
      }
    },

    /**
     * Specialized Trackers (Taxonomy mapping)
     */
    trackView(type, id) {
      this.log("content_view", type, id);
    },
    trackInteraction(type, id, action) {
      this.log("content_interaction", type, id, { action });
    },
    trackSave(type, id) {
      this.log("content_save", type, id);
    },
  };

  // Lifecycle: Flush on background/visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") Analytics.flush();
  });

  window.MumuAnalytics = Analytics;

  // Passive Autotrack Hook
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const action = el.dataset.action;
      const targetId = el.dataset.targetId || el.dataset.feedId;

      if (["like", "comment", "follow"].includes(action)) {
        Analytics.trackInteraction(
          action === "follow" ? "creator" : "feed",
          targetId,
          action
        );
      }
    },
    true
  );
})(window);
