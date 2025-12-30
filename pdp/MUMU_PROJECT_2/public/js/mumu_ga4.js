/**
 * MUMU GA4 Calibration Utility
 * Mirrors Supabase 'discovery_exposures' to GA4 for A-stage verification.
 * Identity: Firebase UID (setUserId)
 * Source of Truth: Supabase
 */

import {
  getAnalytics,
  logEvent,
  setUserId,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { app } from "./firebase_init.js";

const analytics = getAnalytics(app);

// For console-level debugging as requested
if (typeof window !== "undefined") {
  window.ga4Analytics = analytics;
}

/**
 * identifyUserForGA4
 * Sets the global user ID in GA4.
 * Must be called whenever a user logs in or auth state changes.
 */
export const identifyUserForGA4 = (userId) => {
  if (!userId) return;
  setUserId(analytics, userId);
  console.log("[GA4] User identified:", userId);
};

/**
 * recordDiscoveryMirror
 * Mirrors a successful Supabase discovery_exposures insert to GA4.
 * @param {Object} row - The inserted row from Supabase
 */
export const recordDiscoveryMirror = (row) => {
  if (!row) return;

  logEvent(analytics, "discovery_exposure_test", {
    work_id: row.work_id,
    session_id: row.session_id,
    surface: row.surface,
    is_first_exposure: true,
    debug_source: "manual_test",
  });

  console.log("[GA4] Mirror event sent: discovery_exposure_test", {
    work_id: row.work_id,
    session_id: row.session_id,
  });
};

// --- Manual Test Hook ---
if (typeof window !== "undefined") {
  window.mumu_ga4_test = () => {
    console.log("[GA4] Running manual discovery test...");
    const testData = {
      work_id: "cf734f19-3221-4191-933e-13768467da67", // Sample UUID
      session_id: crypto.randomUUID(),
      surface: "manual_console_debug",
    };

    logEvent(analytics, "discovery_exposure_test", {
      ...testData,
      is_first_exposure: true,
      debug_source: "manual_test",
    });

    console.log("[GA4] Manual test event sent to Realtime.", testData);
  };
}
