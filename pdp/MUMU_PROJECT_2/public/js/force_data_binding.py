import re

FILE_PATH = '/Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public/js/feed.js'

with open(FILE_PATH, 'r') as f:
    content = f.read()

# ==========================================
# DEFINE MISSING LOGIC (GLOBAL SCOPE)
# ==========================================

RESTORED_LOGIC = """
/* =========================================================================
   RESTORED LOGIC: STRICT FEED & SAFE IMAGES (Global Singleton)
   - FeedPager: Manage 3 items dom
   - SafeImageLoader: Resize URLs
   - Data Binding: Mapped imageGroups
========================================================================= */

if (!window.SafeImageLoader) {
    window.SafeImageLoader = function SafeImageLoader(img) {
        if(!(this instanceof SafeImageLoader)) return new SafeImageLoader(img);
    };
    
    window.SafeImageLoader.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    window.SafeImageLoader.getSafeUrl = function(url) {
        if (!this.isMobile || !url) return url;
        if (url.includes('width=1600')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}width=1600`;
    };
    
    window.SafeImageLoader.handleError = function(img) {
        if (this.isMobile) {
            console.warn("Mobile Image Load Failed:", img.src);
            img.style.display = 'none';
        }
    };
}

if (!window.FeedPager) {
    window.FeedPager = {
        data: [],
        currentIndex: 0,
        itemsPerPage: 3,
        isReplacing: false,
        
        init: function(data) {
            this.data = data;
            this.currentIndex = 0;
            this.isReplacing = false;
            
            // Loader Style
            if (!document.getElementById('feed-loader-style')) {
                const style = document.createElement('style');
                style.id = 'feed-loader-style';
                style.textContent = "#feed-page-loader { position: fixed; inset: 0; background: rgba(255,255,255,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: #333; backdrop-filter: blur(2px); }";
                document.head.appendChild(style);
            }
            
            this.renderBatch();
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        },
        
        renderBatch: function() {
            const feedList = document.getElementById("feedList");
            if (!feedList) return;
            
            feedList.innerHTML = "";
            feedList.style.paddingTop = "0px";
            window.scrollTo(0, 0); 
            
            const CDN_BASE = "https://ecimg.cafe24img.com/pg2040b87246657025/mare5587/ex_img/";
            const imageGroups = [
                ["a1.webp", "a2.webp", "a3.webp", "a4.webp"], 
                ["b3.webp", "b4.webp"], 
                ["c1.webp", "c2.webp", "c3.webp", "c4.webp"], 
                ["d1.webp", "d2.webp", "d3.webp", "d4.webp"], 
                ["e1.webp", "e2.webp", "e3.webp", "e4.webp"], 
                ["f1.webp", "f2.webp", "f3.webp", "f4.webp"], 
                ["g1.webp", "g2.webp", "g3.webp", "g4.webp"], 
                ["h1.webp", "h2.webp", "h3.webp", "h4.webp"], 
                ["i1.webp", "i2.webp", "i3.webp", "i4.webp"], 
                ["j1.webp", "j2.webp", "j3.webp", "j4.webp"], 
            ];
            
            const nextBatch = this.data.slice(this.currentIndex, this.currentIndex + this.itemsPerPage);

            if (nextBatch.length === 0) {
                this.currentIndex = 0;
                this.renderBatch(); // Loop
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            nextBatch.forEach((item, batchIndex) => {
                 const tempDiv = document.createElement('div');
                 // Safe DOM Parsing
                 if (typeof createFeedCard === 'function') {
                    tempDiv.innerHTML = createFeedCard(item).trim();
                 }

                 // --- IMAGE INJECTION LOOP ---
                 const sectionIndex = this.currentIndex + batchIndex;
                 const placeholders = tempDiv.querySelectorAll(".content-placeholder");
                 const imageGroup = imageGroups[sectionIndex % imageGroups.length];
                 
                 if (placeholders && imageGroup) {
                     placeholders.forEach((placeholder, placeholderIndex) => {
                          placeholder.innerHTML = "";
                          const fileName = imageGroup[placeholderIndex % imageGroup.length];
                          
                          let imageUrl = CDN_BASE + fileName;
                          if (!imageUrl.startsWith('http')) imageUrl = "https:" + imageUrl;
                          
                          const img = document.createElement("img");
                          img.alt = "Feed image";
                          img.style.display = "block";
                          
                          // Safe URL (Mobile)
                          if (window.SafeImageLoader && window.SafeImageLoader.getSafeUrl) {
                              img.src = window.SafeImageLoader.getSafeUrl(imageUrl);
                              img.onerror = () => window.SafeImageLoader.handleError(img);
                          } else {
                              img.src = imageUrl;
                          }
                          
                          placeholder.appendChild(img);
                     });
                 }
                 // ----------------------------

                 while (tempDiv.firstChild) {
                     fragment.appendChild(tempDiv.firstChild);
                 }
            });
            
            feedList.appendChild(fragment);
            
            if (!feedList.hasAttribute("data-delegated")) {
                 feedList.setAttribute("data-delegated", "true");
                 feedList.addEventListener("click", handleFeedClick);
            }
            
            if (typeof initSliderDotsSync === 'function') {
                setTimeout(initSliderDotsSync, 50);
            }
        },
        
        handleScroll: function() {
            if (this.isReplacing) return;
            const threshold = 100;
            const dist = document.documentElement.offsetHeight - (window.scrollY + window.innerHeight);
            if (dist < threshold) {
                this.startPageFlip();
            }
        },
        
        startPageFlip: function() {
            this.isReplacing = true;
            document.body.style.overflow = 'hidden';
            let loader = document.getElementById('feed-page-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'feed-page-loader';
                loader.innerHTML = '<span>Loading...</span>'; 
                document.body.appendChild(loader);
            }
            loader.style.display = 'flex';
            setTimeout(() => {
                this.currentIndex += this.itemsPerPage;
                this.renderBatch();
                document.body.style.overflow = '';
                loader.style.display = 'none';
                setTimeout(() => { this.isReplacing = false; }, 100);
            }, 600);
        }
    };
}

function loadMockFeed() {
  fetch("/data/mock_feed.json")
    .then((res) => res.json())
    .then((data) => {
       if (window.FeedPager) window.FeedPager.init(data);
    });
}
"""

anchor = "function handleFeedClick"
anchor_idx = content.find(anchor)

if anchor_idx != -1:
    new_content = content[:anchor_idx] + "\n\n" + RESTORED_LOGIC + "\n\n" + content[anchor_idx:]
    with open(FILE_PATH, 'w') as f:
        f.write(new_content)
    print("SUCCESS: Data Binding Forced.")
else:
    print("Error: Anchor not found.")

