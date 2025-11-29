(function() {
    function initStorePage() {
        const container = $('#store-item-list');
        if (!container) return;

        const role = window.appState.role;
        let items = [];

        if (role === 'creator') {
            items = [
                { name: '프리미엄 연재권 (30일)', price: '₩50,000' },
                { name: '작품 홍보 배너', price: '₩25,000' },
            ];
        } else { // guest or reader
             items = [
                { name: 'MUMU 무제한 이용권', price: '₩9,900' },
                { name: '대여권 10개', price: '₩2,000' },
            ];
        }
        
        const itemsHTML = items.map(item => `
             <div class="store-item">
                <p class="font-medium">${item.name}</p>
                <button class="btn btn-primary">${item.price}</button>
            </div>
        `).join('');
        
        container.innerHTML = itemsHTML;
    }
    window.router.registerPageScript('store', initStorePage);
})();