(function() {
    function initFeedPage() {
        const container = $('#feed-grid-container');
        if (!container) return;

        const feedCardTemplate = window.app.getComponentHTML('feed_card');
        const feedHTML = window.appState.feed.map(item => {
            return renderTemplate(feedCardTemplate, item);
        }).join('');
        
        container.innerHTML = feedHTML;
    }

    window.router.registerPageScript('feed', initFeedPage);
})();