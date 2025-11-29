(function() {
    const appScroll = $('#app-scroll');
    let pageScripts = {};

    async function navigate(pageName, isPopState = false) {
        if (window.appState.currentPage === pageName) return;

        try {
            const res = await fetch(`${pageName}.html`);
            if (!res.ok) throw new Error('Page not found');
            const pageHTML = await res.text();

            appScroll.innerHTML = pageHTML;

            // 페이지별 스크립트 실행
            if (pageScripts[pageName]) {
                pageScripts[pageName]();
            }

            if (!isPopState) {
                history.pushState({ page: pageName }, null, `?page=${pageName}`);
            }
            
            window.appState.currentPage = pageName;
            updateHeader(pageName);
            updateTabbar(pageName);
            window.scrollTo(0, 0);

        } catch (error) {
            console.error('Navigation error:', error);
            navigate('feed'); // Fallback to feed
        }
    }

    function updateHeader(pageName) {
        const headerTitleEl = $('#header-container .header-title');
        if (!headerTitleEl) return;

        let title = "MUMU";
        if (pageName.includes('feed')) title = "피드";
        else if (pageName === 'explore') title = "탐색";
        else if (pageName === 'store') title = "스토어";
        else if (pageName.includes('mypage')) title = "마이페이지";
        else if (pageName === 'upload') title = "업로드";
        
        headerTitleEl.textContent = title;
    }

    function updateTabbar(pageName) {
        const tabbar = $('#tabbar-container');
        if (!tabbar) return;

        // 뷰어 열릴 때 탭바 숨김 처리는 app.js에서 제어
        if (window.appState.isViewerOpen) {
            tabbar.classList.add('hidden');
            return;
        } else {
             tabbar.classList.remove('hidden');
        }

        const pageId = pageName.split('_')[0]; // mypage_reader -> mypage
        $$('.tab-item').forEach(item => {
            if (item.dataset.page.startsWith(pageId)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.page) {
            navigate(event.state.page, true);
        }
    });

    // 페이지별 초기화 함수 등록
    function registerPageScript(pageName, script) {
        pageScripts[pageName] = script;
    }

    window.router = {
        navigate,
        registerPageScript,
        updateHeader,
        updateTabbar,
    };
})();