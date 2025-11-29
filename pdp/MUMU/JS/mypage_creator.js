(function() {
    function initMyPageCreator() {
        const container = $('#my-works-list');
        if (!container) return;

        const myWorks = window.appState.myWorks;
        if (myWorks.length === 0) {
            container.innerHTML = `<p class="text-center text-secondary mt-3">아직 업로드한 작품이 없어요.</p>`;
            return;
        }

        const workItemsHTML = myWorks.map(work => `
            <div class="mypage-item">
                <img src="${work.thumbnail}" alt="${work.title}">
                <div class="item-info">
                    <p class="font-medium">${work.title}</p>
                    <p class="text-xs text-secondary">조회수 ${work.views} · 좋아요 ${work.likes}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = workItemsHTML;
    }

    window.router.registerPageScript('mypage_creator', initMyPageCreator);
})();