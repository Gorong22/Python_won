/**
 * MUMU User Settings System (Isolated)
 * Simplified Version: Shows "Coming Soon" Popup
 */

(function () {
  // UI Elements
  const overlay = document.getElementById("systemSettingsOverlay");

  // Global Exports
  window.openSystemSettings = async function () {
    // 사용자의 요청에 따라 복잡한 설정 대신 "준비중" 팝업을 띄웁니다.
    if (typeof window.showCustomAlert === "function") {
      await window.showCustomAlert(
        "시스템 설정 기능은 현재 준비 중입니다!",
        "알림"
      );
    } else {
      alert("시스템 설정 기능은 현재 준비 중입니다!");
    }
  };

  window.closeSystemSettings = function () {
    if (overlay) {
      overlay.classList.remove("show");
    }
  };

  window.saveSystemSettings = function () {
    // 팝업 버전에서는 사용되지 않음
    window.closeSystemSettings();
  };
})();
