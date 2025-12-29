/**
 * MUMU Unified Onboarding System
 * 1. Feed Usage Onboarding
 * 2. Tab-Based Feature Onboarding
 * 3. Moodboard Editor Mini Onboarding
 */

(function (window) {
  const Onboarding = {
    steps: [],
    currentStepIndex: 0,
    overlay: null,
    spotlight: null,
    content: null,
    type: "", // 'feed', 'tab', 'editor'

    init() {
      if (document.getElementById("mumu-onboarding-overlay")) return;

      this.overlay = document.createElement("div");
      this.overlay.id = "mumu-onboarding-overlay";
      this.overlay.className = "mumu-onboarding-overlay";
      this.overlay.innerHTML = `
        <div class="mumu-onboarding-skip" id="mumu-onboarding-skip">건너뛰기</div>
        <div class="mumu-spotlight" id="mumu-onboarding-spotlight"></div>
        <div class="mumu-onboarding-content" id="mumu-onboarding-content">
          <p class="mumu-onboarding-message" id="mumu-onboarding-message"></p>
          <div class="mumu-onboarding-buttons">
            <button class="mumu-onboarding-btn mumu-onboarding-btn-next" id="mumu-onboarding-next">다음</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.overlay);

      this.spotlight = document.getElementById("mumu-onboarding-spotlight");
      this.content = document.getElementById("mumu-onboarding-content");
      this.message = document.getElementById("mumu-onboarding-message");
      this.nextBtn = document.getElementById("mumu-onboarding-next");
      this.skipBtn = document.getElementById("mumu-onboarding-skip");

      this.nextBtn.addEventListener("click", () => this.next());
      this.skipBtn.addEventListener("click", () => this.finish(true));
    },

    start(type) {
      if (localStorage.getItem(`mumu_onboarding_${type}_done`)) return;

      this.type = type;
      this.init();
      this.setupSteps(type);

      if (this.steps.length === 0) return;

      document.body.classList.add("onboarding-locked");
      this.overlay.classList.add("active");
      this.currentStepIndex = 0;
      this.renderStep();
    },

    setupSteps(type) {
      switch (type) {
        case "feed":
          this.steps = [
            {
              selector: ".header",
              message: "여긴 감정과 취향을 컷으로 기록하는 공간이에요.",
              pos: "bottom",
            },
            {
              selector:
                ".feed-item:first-child .feed-image-container, .hero-section",
              message:
                "좌우로 넘기면 하나의 작품 안에 담긴 여러 컷을 볼 수 있어요.",
              pos: "bottom",
            },
            {
              selector:
                ".feed-item:first-child .feed-image-container, .hero-section",
              message: "마음에 드는 컷은 꾹 눌러서 저장하세요.",
              pos: "bottom",
              hint: "pulse",
            },
            {
              selector: ".tabbar, #tabbar",
              message: "저장한 컷으로 나만의 무드보드를 만들 수 있어요.",
              pos: "top",
              btn: "시작하기",
            },
          ];
          break;
        case "tab":
          this.steps = [
            {
              selector: ".tabbar, #tabbar",
              message: "MUMU는 아래 탭을 중심으로 사용해요.",
              pos: "top",
            },
            {
              selector: ".tabbar-tab:nth-child(1)",
              message: "피드에서 감정 컷을 발견해요.",
              pos: "top",
            },
            {
              selector: ".tabbar-tab:nth-child(2), .tabbar-tab:nth-child(3)",
              message: "좋아요와 팔로우로 취향이 쌓여요.",
              pos: "top",
            },
            {
              selector: ".tabbar-tab:last-child",
              message: "저장한 컷은 무드보드가 돼요.",
              pos: "top",
              btn: "시작하기",
            },
          ];
          break;
        case "editor": // Unified editor onboarding
        case "editor_free":
        case "editor_template":
          this.steps = [
            {
              selector: ".text-layer, .sticker-layer, .editor-canvas",
              message: "한 번 탭하면 선택돼요.",
              pos: "center",
            },
            {
              selector: ".text-layer, .sticker-layer, .editor-canvas",
              message: "두 번 탭하면 이동할 수 있어요.",
              pos: "center",
            },
            {
              selector: ".editor-canvas",
              message: "완료되면 바깥을 탭하세요.",
              pos: "center",
              btn: "이해했어요",
            },
          ];
          break;
      }
    },

    renderStep() {
      const step = this.steps[this.currentStepIndex];
      const el = document.querySelector(step.selector);

      this.message.innerText = step.message;
      this.nextBtn.innerText = step.btn || "다음";

      // Clear hints
      document.querySelectorAll(".mumu-pulse-hint").forEach((h) => h.remove());

      if (el) {
        const rect = el.getBoundingClientRect();
        const pad = 10;

        this.spotlight.style.width = `${rect.width + pad * 2}px`;
        this.spotlight.style.height = `${rect.height + pad * 2}px`;
        this.spotlight.style.top = `${rect.top - pad}px`;
        this.spotlight.style.left = `${rect.left - pad}px`;
        this.spotlight.style.opacity = "1";

        // Position content
        const spacing = 40;
        if (step.pos === "top") {
          this.content.style.top = "auto";
          this.content.style.bottom = `${
            window.innerHeight - rect.top + spacing
          }px`;
        } else if (step.pos === "bottom") {
          this.content.style.bottom = "auto";
          this.content.style.top = `${rect.bottom + spacing}px`;
        } else {
          this.content.style.top = "50%";
          this.content.style.transform = "translateY(-50%)";
        }

        if (step.hint === "pulse") {
          const pulse = document.createElement("div");
          pulse.className = "mumu-pulse-hint";
          pulse.style.top = `${rect.top + rect.height / 2 - 30}px`;
          pulse.style.left = `${rect.left + rect.width / 2 - 30}px`;
          this.overlay.appendChild(pulse);
        }
      } else {
        // Fallback for missing element
        this.spotlight.style.opacity = "0";
        this.content.style.top = "50%";
        this.content.style.left = "50%";
        this.content.style.transform = "translate(-50%, -50%)";
      }
    },

    next() {
      this.currentStepIndex++;
      if (this.currentStepIndex >= this.steps.length) {
        this.finish();
      } else {
        this.renderStep();
      }
    },

    finish(skipped = false) {
      localStorage.setItem(`mumu_onboarding_${this.type}_done`, "true");
      this.overlay.classList.remove("active");
      document.body.classList.remove("onboarding-locked");

      setTimeout(() => {
        if (this.overlay) this.overlay.remove();

        // Trigger secondary onboarding if primary finished
        if (this.type === "feed" && !skipped) {
          // Tab onboarding will trigger on next load or specifically if required
          // For now, let's keep it clean
        }
      }, 400);
    },
  };

  window.MumuOnboarding = Onboarding;

  // Auto-trigger logic
  window.addEventListener("load", () => {
    // 1. Feed Onboarding (Signup check)
    if (
      localStorage.getItem("mumu_onboarding_completed") === "true" ||
      localStorage.getItem("mumu_logged_in") === "true"
    ) {
      if (!localStorage.getItem("mumu_onboarding_feed_done")) {
        setTimeout(() => MumuOnboarding.start("feed"), 1000);
      } else if (!localStorage.getItem("mumu_onboarding_tab_done")) {
        // Automatically start 'tab' onboarding after 'feed' is completed
        setTimeout(() => MumuOnboarding.start("tab"), 2000);
      }
    }
  });
})(window);
