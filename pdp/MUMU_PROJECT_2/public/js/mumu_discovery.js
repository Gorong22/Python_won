/**
 * MUMU DISCOVERY TRACKER
 * Handles atomic discovery events: User seeing a work for the first time.
 * Enforces DB-first strategy and GA4 mirroring.
 */

import { getSupabase } from "./supabase-auth.js";
import { recordDiscoveryMirror } from "./mumu_ga4.js";

const DISCOVERY_OBSERVER_OPTIONS = {
  root: null,
  rootMargin: "0px",
  threshold: 0.5, // 50% visible means "discovered"
};

let currentMumuSessionId = localStorage.getItem("mumu_session_id");
if (!currentMumuSessionId) {
  currentMumuSessionId = crypto.randomUUID();
  localStorage.setItem("mumu_session_id", currentMumuSessionId);
}

const DiscoveryTracker = {
  async init() {
    this.createObserver();
    this.observeExistingItems();

    // Listen for new items being added to DOM
    this.setupMutationObserver();

    console.log(
      "[DISCOVERY] Tracker initialized. Session:",
      currentMumuSessionId
    );
  },

  createObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const workId = el.dataset.workId || el.dataset.feedId;
          const surface = el.dataset.surface || "feed_recommended"; // Default surface

          if (workId) {
            this.recordDiscovery(workId, surface);
            this.observer.unobserve(el); // Only track once per element session
          }
        }
      });
    }, DISCOVERY_OBSERVER_OPTIONS);
  },

  observeExistingItems() {
    const items = document.querySelectorAll(
      ".feed-item, [data-track-discovery]"
    );
    items.forEach((item) => this.observer.observe(item));
  },

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // ELEMENT_NODE
            if (node.matches(".feed-item") || node.dataset.trackDiscovery) {
              this.observer.observe(node);
            }
            // Check children
            node
              .querySelectorAll(".feed-item, [data-track-discovery]")
              .forEach((child) => {
                this.observer.observe(child);
              });
          }
        });
      });
    });

    const feedList = document.getElementById("feedList") || document.body;
    observer.observe(feedList, { childList: true, subtree: true });
  },

  _isSessionVerified: false,
  _syncPromise: null,

  /**
   * ensureSessionExists
   * Lifecycle Task 3: ALWAYS ensure the session row exists FIRST.
   * Verify session existence with a SELECT after upsert.
   */
  async ensureSessionExists(supabase, userId) {
    if (this._isSessionVerified) return true;
    if (this._syncPromise) return await this._syncPromise;

    this._syncPromise = (async () => {
      console.log("[SESSION] ensureSessionExists CALLED", currentMumuSessionId);

      // 1. Upsert session row
      const { error: upsertError } = await supabase.from("sessions").upsert(
        {
          id: currentMumuSessionId,
          user_id: userId,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        console.error("[SESSION] Upsert failed:", upsertError);
        throw upsertError;
      }

      // 2. Double-check with SELECT (Hard verification)
      const { data: verified, error: selectError } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", currentMumuSessionId)
        .single();

      if (selectError || !verified) {
        console.error("[SESSION] Verification failed:", selectError);
        throw new Error("Session not found after upsert");
      }

      console.log("[SESSION] Verified in DB", currentMumuSessionId);
      this._isSessionVerified = true;
      return true;
    })();

    return await this._syncPromise;
  },

  /**
   * recordDiscovery
   * Lifecycle Task 2: Unified Write Gateway.
   * ALL discovery inserts MUST go through this function.
   */
  async recordDiscovery(workId, surface) {
    const userId = window.App?.user?.uid || (await this.getUserId());
    if (!userId) return;

    try {
      const supabase = await getSupabase();

      // Lifecycle Task 3: Enforced Session-First Lifecycle
      await this.ensureSessionExists(supabase, userId);

      console.log("[DISCOVERY] Insert attempted AFTER session verified", {
        workId,
        session_id: currentMumuSessionId,
      });

      // Step 1: DB First - Insert into discovery_exposures
      const { data, error } = await supabase
        .from("discovery_exposures")
        .insert([
          {
            user_id: userId,
            work_id: workId,
            session_id: currentMumuSessionId,
            surface: surface,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique violation: Already discovered. Ignore.
          return;
        }
        console.error("[DISCOVERY] DB Insert failed:", error);
        return;
      }

      // Step 2: GA4 Second - Mirror successful discovery
      if (data) {
        recordDiscoveryMirror(data);
      }
    } catch (e) {
      console.error("[DISCOVERY] Write gateway failed:", e);
    }
  },

  async getUserId() {
    if (typeof window.getCurrentFirebaseUser === "function") {
      const user = await window.getCurrentFirebaseUser();
      return user?.uid;
    }
    return null;
  },
};

// Initialize on load
if (typeof window !== "undefined") {
  window.DiscoveryTracker = DiscoveryTracker;
  document.addEventListener("DOMContentLoaded", () => DiscoveryTracker.init());
}

export default DiscoveryTracker;
