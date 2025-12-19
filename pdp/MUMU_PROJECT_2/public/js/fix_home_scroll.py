import os

FEED_JS = '/Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public/js/feed.js'
FEED_CSS = '/Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public/css/feed.css'

# 1. Update feed.css with touch-action: pan-y
try:
    with open(FEED_CSS, 'r') as f:
        css_content = f.read()

    if ".carousel-container {" in css_content:
        # Avoid duplicate
        if "touch-action: pan-y" not in css_content:
             new_css = css_content.replace(
                 ".carousel-container {",
                 ".carousel-container {\n  touch-action: pan-y;"
             )
             with open(FEED_CSS, 'w') as f:
                 f.write(new_css)
             print("Fixed feed.css: Added touch-action: pan-y")
    else:
        print("Warning: .carousel-container not found in CSS")

except Exception as e:
    print(f"Error fixing CSS: {e}")

# 2. Append Safe Touch Handler to feed.js
SAFE_HANDLER_CODE = """
/* =========================================================================
   HOME SCROLL FIX: CAROUSEL TOUCH HANDLER
========================================================================= */
(function fixHomeScroll() {
  const carousel = document.querySelector('.carousel-container');
  if (!carousel) return;

  let startX = 0;
  let startY = 0;

  carousel.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  carousel.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startX);
    const dy = Math.abs(t.clientY - startY);

    // Block horizontal swipe (browser nav) BUT allow vertical scroll
    // Only preventDefault if purely horizontal and significant
    if (dx > dy && dx > 6) {
      if (e.cancelable) e.preventDefault();
      // Logic for generic slider would go here
    }
  }, { passive: false });
  
  const carouselImage = carousel.querySelector('.carousel-image');
  if (carouselImage) carouselImage.style.touchAction = "pan-y";
  
  console.log("Home Carousel Scroll Fix Applied");
})();
"""

try:
    with open(FEED_JS, 'r') as f:
        js_content = f.read()
    
    if "fixHomeScroll" not in js_content:
        with open(FEED_JS, 'a') as f:
            f.write("\n\n" + SAFE_HANDLER_CODE)
        print("Fixed feed.js: Appended Safe Touch Handler.")
    else:
        print("Handler already present.")
except Exception as e:
    print(f"Error fixing JS: {e}")
