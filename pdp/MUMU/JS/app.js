(function() {
    const appFrame = $('#app-frame');
    const splashScreen = $('#splash-screen');
    const headerContainer = $('#header-container');
    const tabbarContainer = $('#tabbar-container');
    const modalContainer = $('#modal-container');

    // Global state
    window.appState = {
        role: localStorage.getItem('role') || 'guest', // guest, reader, creator
        currentPage: null,
        isViewerOpen: false,
        feed: [
            { id: 1, title: '나 혼자만 레벨업', thumbnail: 'https://picsum.photos/300/420?random=1', type: 'scroll', views: '1.2M', likes: '120K', iconClass: 'fa-scroll' },
            { id: 2, title: '전지적 독자 시점', thumbnail: 'https://picsum.photos/300/420?random=2', type: 'cut', views: '2.5M', likes: '340K', iconClass: 'fa-grip-lines' },
            { id: 3, title: '화산귀환', thumbnail: 'https://picsum.photos/300/420?random=3', type: 'scroll', views: '3.1M', likes: '410K', iconClass: 'fa-scroll' },
            { id: 4, title: '템빨', thumbnail: 'https://picsum.photos/300/420?random=4', type: 'cut', views: '980K', likes: '88K', iconClass: 'fa-grip-lines' },
            { id: 5, title: '유미의 세포들', thumbnail: 'https://picsum.photos/300/420?random=5', type: 'scroll', views: '5M', likes: '1.1M', iconClass: 'fa-scroll' },
            { id: 6, title: '신의 탑', thumbnail: 'https://picsum.photos/300/420?random=6', type: 'cut', views: '10M', likes: '2.3M', iconClass: 'fa-grip-lines' },
        ],
        myWorks: [],
        recentViewed: [],
    };

    let componentHTML = {}; // Cache for component HTML

    async function loadComponents() {
        const components = ['header', 'tabbar', 'modal', 'feed_card'];
        for (const name of components) {
            const res = await fetch(`./components/${name}.html`);
            componentHTML[name] = await res.text();
        }
    }

    function init() {
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            appFrame.style.display = 'flex';
            setTimeout(() => splashScreen.remove(), 500);

            const initialPage = new URLSearchParams(window.location.search).get('page') || 'feed';
            router.navigate(initialPage);
        }, 1500);

        headerContainer.innerHTML = componentHTML.header;
        tabbarContainer.innerHTML = componentHTML.tabbar;

        tabbarContainer.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            if (!tabItem) return;
            e.preventDefault();
            
            let page = tabItem.dataset.page;
            if (page === 'mypage_reader' && window.appState.role === 'creator') {
                page = 'mypage_creator';
            }
             if (window.appState.role === 'guest' && page.includes('mypage')) {
                showLoginModal();
                return;
            }
            router.navigate(page);
        });
    }

    function showLoginModal() {
        const modalData = {
            title: '로그인이 필요해요',
            body: 'MUMU의 모든 기능을 즐기려면 로그인해주세요!',
            confirmText: '로그인/회원가입',
            cancelText: '다음에 할게요',
        };
        const modal = renderTemplate(componentHTML.modal, modalData);
        modalContainer.innerHTML = modal;

        $('#modal-cancel-btn').addEventListener('click', () => modalContainer.innerHTML = '');
        $('#modal-confirm-btn').addEventListener('click', () => router.navigate('login'));
    }

    function openViewer(type, work) {
        if (window.appState.role === 'guest') {
            showLoginModal();
            return;
        }

        window.appState.isViewerOpen = true;
        router.updateTabbar(window.appState.currentPage); // Hide tabbar
        lockScroll();

        const viewerHTML = `
            <div class="modal-overlay viewer-modal">
                <div class="modal-content">
                    <div class="viewer-header">
                        <span>${work.title || '작품 보기'}</span>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="viewer-content">
                        ${type === 'scroll' ? createScrollContent() : createCutContent()}
                    </div>
                </div>
            </div>
        `;
        modalContainer.innerHTML = viewerHTML;

        $('.viewer-modal .close-btn').addEventListener('click', closeViewer);

        if (type === 'cut') initCutViewerEvents();
    }
    
    function createScrollContent() {
        return `<div class="scroll-viewer"><img src="https://via.placeholder.com/600x3000.png/000000/FFFFFF?text=Long+Scroll+Image" alt="scroll content"></div>`;
    }

    function createCutContent() {
        let images = '';
        for (let i = 1; i <= 5; i++) {
            images += `<img src="https://picsum.photos/600/1000?random=${10 + i}" class="cut-image" alt="cut image ${i}">`;
        }
        return `<div class="cut-viewer" style="width: ${5 * 100}vw">${images}</div>`;
    }

    function initCutViewerEvents() {
        const viewer = $('.cut-viewer');
        if (!viewer) return;

        let currentCut = 0;
        const totalCuts = viewer.children.length;
        let startX = 0;
        let diffX = 0;

        viewer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
        });

        viewer.addEventListener('touchmove', (e) => {
            diffX = e.touches[0].pageX - startX;
            viewer.style.transition = 'none';
            viewer.style.transform = `translateX(${-currentCut * window.innerWidth + diffX}px)`;
        });

        viewer.addEventListener('touchend', () => {
            viewer.style.transition = 'transform 0.3s ease-out';
            if (diffX < -50 && currentCut < totalCuts - 1) { // Swipe left
                currentCut++;
            } else if (diffX > 50 && currentCut > 0) { // Swipe right
                currentCut--;
            }
            viewer.style.transform = `translateX(${-currentCut * window.innerWidth}px)`;
            diffX = 0;
        });
    }

    function closeViewer() {
        modalContainer.innerHTML = '';
        window.appState.isViewerOpen = false;
        unlockScroll();
        router.updateTabbar(window.appState.currentPage); // Show tabbar
    }

    function switchToCreator() {
        window.appState.role = 'creator';
        localStorage.setItem('role', 'creator');
        router.navigate('mypage_creator');
    }
    
    function switchToReader() {
        window.appState.role = 'reader';
        localStorage.setItem('role', 'reader');
        router.navigate('mypage_reader');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await loadComponents();
        init();
    });

    window.app = {
        showLoginModal,
        openViewer,
        switchToCreator,
        switchToReader,
        getComponentHTML: (name) => componentHTML[name],
    };
})();