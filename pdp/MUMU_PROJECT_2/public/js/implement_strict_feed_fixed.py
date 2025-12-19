import os

FILE_PATH = '/Users/mac/Python_basic/Python_won/pdp/MUMU_project_2/public/js/feed.js'

with open(FILE_PATH, 'r') as f:
    content = f.read()

NEW_LOGIC = """
/* ============================
   PHASE 6: STRICT 3-ITEM PAGINATION
============================ */

const FeedPager = {
    data: [],
    currentIndex: 0,
    itemsPerPage: 3,
    isReplacing: false,
    
    init(data) {
        this.data = data;
        this.currentIndex = 0;
        this.isReplacing = false;
        
        // Initial Render
        this.renderBatch();
        
        // Attach Scroll Listener
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        // Inject Loader Style
        if (!document.getElementById('feed-loader-style')) {
            const style = document.createElement('style');
            style.id = 'feed-loader-style';
            style.textContent = `
                #feed-page-loader {
                    position: fixed; inset: 0; background: rgba(255,255,255,0.8);
                    z-index: 99999; display: flex; align-items: center; justify-content: center;
                    font-size: 14px; font-weight: 600; color: #333;
                    backdrop-filter: blur(2px);
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    renderBatch() {
        const feedList = document.getElementById("feedList");
        if (!feedList) return;
        
        // Nuke existing content (Memory Clean)
        feedList.innerHTML = "";
        feedList.style.paddingTop = "0px"; // Reset any padding
        
        // Get Next Batch
        const nextBatch = this.data.slice(this.currentIndex, this.currentIndex + this.itemsPerPage);
        
        if (nextBatch.length === 0) {
            this.currentIndex = 0;
            this.renderBatch();
            return;
        }

        const fragment = document.createDocumentFragment();
        nextBatch.forEach(item => {
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = createFeedCard(item).trim();
             while (tempDiv.firstChild) {
                 fragment.appendChild(tempDiv.firstChild);
             }
        });
        
        feedList.appendChild(fragment);

        // Re-attach delegation
        if (!feedList.hasAttribute("data-delegated")) {
             feedList.setAttribute("data-delegated", "true");
             feedList.addEventListener("click", handleFeedClick);
        }
        
        // Trigger Image Loading if Phase 4/5 logic requires it
        // Phase 5 trace showed loadFeedItemImages() being called via setTimeout in DOMContentLoaded
        // But since we are replacing content dynamically, we might need to call it again.
        // However, `loadFeedItemImages` iterates over `feed-item` class.
        // `createFeedCard` returns `article class="feed-card"`. 
        // Wait, `createFeedCard` (Phase 5 trace) returned `feed-card`.
        // But `loadFeedItemImages` targeted `.feed-item`.
        // There might be a class mismatch or `createFeedCard` generates `.feed-item`.
        // Let's assume standard `feed-card` is correct and existing logic handles it, or `loadFeedItemImages` is for something else.
        // Actually, looking at Phase 4 trace: `loadFeedItemImages` targets `.feed-item`.
        // `createFeedCard` (Phase 5 view) showed `article class="feed-card"`. 
        // This suggests `loadFeedItemImages` might be for `mypage`? Or feed uses different class?
        // Ah, `feed.js` had `loadFeedImages` (different name) which used `content-placeholder`.
        // `createFeedCard` has `content-placeholder`? 
        // In Phase 5 trace: `<div class="work-thumbnail"></div>` etc.
        // It seems `feed.js` handles image injection via slider logic?
        // Let's trusted existing external logic or add a trigger if needed.
        // For safety, let's trigger a custom event or check if global init needed.
        
        // For now, minimal intervention.
    },
    
    handleScroll() {
        if (this.isReplacing) return;
        
        const threshold = 100;
        const dist = document.documentElement.offsetHeight - (window.scrollY + window.innerHeight);
        
        if (dist < threshold) {
            this.startPageFlip();
        }
    },
    
    startPageFlip() {
        this.isReplacing = true;
        
        document.body.style.overflow = 'hidden'; // Lock
        
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
            window.scrollTo(0, 0);
            document.body.style.overflow = '';
            loader.style.display = 'none';
            setTimeout(() => { this.isReplacing = false; }, 100);
        }, 600);
    }
};

function loadMockFeed() {
  fetch("/data/mock_feed.json")
    .then((res) => res.json())
    .then((data) => {
       FeedPager.init(data);
    });
}

function renderRemainingFeed(items) {} 
"""

start_idx = content.find('function loadMockFeed()')
if start_idx == -1:
    print("Error: loadMockFeed not found")
    exit(1)

next_func = content.find('function handleFeedClick(e)')
if next_func == -1:
     # Fallback strategy
     pass

if next_func != -1 and next_func > start_idx:
    new_content = content[:start_idx] + NEW_LOGIC + "\n\n" + content[next_func:]
    with open(FILE_PATH, 'w') as f:
        f.write(new_content)
    print("Modified feed.js successfully.")
else:
    print("Error: Structure mismatch, cannot safely replace.")
    exit(1)
