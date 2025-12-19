
// Home Page Scripts
// Scoped to main.feed-page only

(function () {
  "use strict";

  // Hero slider dots sync
  const feedPage = document.querySelector("main.feed-page");
  if (!feedPage) return;

  const heroSlider = feedPage.querySelector("#heroSlider");
  const heroDots = feedPage.querySelector("#heroDots");

  if (heroSlider && heroDots) {
    const dots = heroDots.querySelectorAll(".dot");
    const slides = heroSlider.querySelectorAll(".hero-slide");

    function updateHeroDots() {
      const scrollLeft = heroSlider.scrollLeft;
      const slideWidth = heroSlider.offsetWidth;
      const currentIndex = Math.round(scrollLeft / slideWidth);

      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex);
      });
    }

    heroSlider.addEventListener("scroll", () => {
      let scrollTimeout;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateHeroDots, 50);
    });

    heroSlider.addEventListener("scrollend", updateHeroDots);
  }
})();
