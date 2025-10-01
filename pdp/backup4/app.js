document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Navigation Toggle ---
    function initMobileNav() {
        const navToggle = document.querySelector('.nav__toggle');
        const navMenu = document.querySelector('.nav__menu');
        if (!navToggle || !navMenu) return;
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('is-open');
            navMenu.classList.toggle('is-open');
        });
    }

    // --- Swiper Initialization ---
    function initSwipers() {
        if (typeof Swiper === 'undefined') return;
        const reviewSwiperElement = document.querySelector('.review-swiper');
        if (reviewSwiperElement) {
            new Swiper(reviewSwiperElement, {
                slidesPerView: 1,
                spaceBetween: 20,
                loop: true,
                pagination: { el: '.swiper-pagination', clickable: true },
                breakpoints: {
                    768: { slidesPerView: 2, spaceBetween: 30 },
                    1200: { slidesPerView: 3, spaceBetween: 30 },
                },
            });
        }
    }

    // --- FAQ Accordion ---
    function initFaqAccordion() {
        const faqList = document.querySelector('.faq__list');
        if (faqList) {
            faqList.addEventListener('click', (e) => {
                const questionBtn = e.target.closest('.faq__question');
                if (questionBtn) {
                    questionBtn.closest('.faq__item').classList.toggle('is-open');
                }
            });
        }
    }

    // --- Scroll Animations ---
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        if (animatedElements.length === 0) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.animateDelay) || 0;
                    setTimeout(() => entry.target.classList.add('is-visible'), delay);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => observer.observe(el));
    }

    // --- Cart Functionality ---
    function initCart() {
        const cartBadge = document.querySelector('.cart-badge');
        const getCart = () => JSON.parse(localStorage.getItem('innerKurlyCart')) || [];
        const setCart = (cart) => localStorage.setItem('innerKurlyCart', JSON.stringify(cart));

        const updateCartBadge = () => {
            const cart = getCart();
            const count = cart.reduce((sum, item) => sum + item.quantity, 0);
            if (cartBadge) {
                cartBadge.textContent = count;
                if (count > 0) {
                    cartBadge.classList.add('updated');
                    setTimeout(() => cartBadge.classList.remove('updated'), 300);
                }
            }
        };

        const addToCart = (item) => {
            let cart = getCart();
            const existingItem = cart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ ...item, quantity: 1 });
            }
            setCart(cart);
            updateCartBadge();
        };

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const item = {
                    id: e.target.dataset.itemId,
                    name: e.target.dataset.itemName,
                    price: parseInt(e.target.dataset.itemPrice),
                    image: e.target.dataset.itemImage,
                };
                addToCart(item);
                if (e.target.closest('.pdp-hero-section__actions')) {
                    window.location.href = 'cart.html';
                }
            });
        });

        if (document.body.classList.contains('cart-page')) {
            renderCartPage();
        }
        updateCartBadge(); // Initial update on any page
    }

    function renderCartPage() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartSummary = {
            subtotal: document.getElementById('summary-subtotal'),
            shipping: document.getElementById('summary-shipping'),
            total: document.getElementById('summary-total'),
        };
        const getCart = () => JSON.parse(localStorage.getItem('innerKurlyCart')) || [];
        const setCart = (cart) => localStorage.setItem('innerKurlyCart', JSON.stringify(cart));

        const render = () => {
            const cart = getCart();
            cartItemsContainer.innerHTML = '';
            let subtotal = 0;

            if (cart.length === 0) {
                cartItemsContainer.innerHTML = `
                    <div class="cart-empty-message">
                        <p>장바구니가 비어 있습니다.</p>
                        <a href="index.html#plates" class="btn btn--primary">식단 보러가기</a>
                    </div>`;
            } else {
                cart.forEach(item => {
                    subtotal += item.price * item.quantity;
                    const itemHtml = `
                        <div class="cart-item" data-id="${item.id}">
                            <img src="${item.image}" alt="${item.name}" class="cart-item__image">
                            <div class="cart-item__details">
                                <h3>${item.name}</h3>
                                <p>${item.price.toLocaleString()}원</p>
                            </div>
                            <div class="cart-item__quantity">
                                <button class="quantity-btn" data-action="decrease">-</button>
                                <input type="text" value="${item.quantity}" readonly>
                                <button class="quantity-btn" data-action="increase">+</button>
                            </div>
                            <div class="cart-item__total-price">${(item.price * item.quantity).toLocaleString()}원</div>
                            <button class="cart-item__remove" data-action="remove">×</button>
                        </div>`;
                    cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
                });
            }

            const shipping = subtotal > 0 && subtotal < 50000 ? 3000 : 0;
            const total = subtotal + shipping;
            cartSummary.subtotal.textContent = `${subtotal.toLocaleString()}원`;
            cartSummary.shipping.textContent = shipping > 0 ? `${shipping.toLocaleString()}원` : '무료';
            cartSummary.total.textContent = `${total.toLocaleString()}원`;
        };

        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const itemDiv = target.closest('.cart-item');
            if (!itemDiv) return;

            const itemId = itemDiv.dataset.id;
            let cart = getCart();
            const itemIndex = cart.findIndex(item => item.id === itemId);
            if (itemIndex === -1) return;

            const action = target.dataset.action;
            if (action === 'increase') {
                cart[itemIndex].quantity++;
            } else if (action === 'decrease') {
                if (cart[itemIndex].quantity > 1) {
                    cart[itemIndex].quantity--;
                } else {
                    cart.splice(itemIndex, 1);
                }
            } else if (action === 'remove') {
                cart.splice(itemIndex, 1);
            }

            setCart(cart);
            render();
            // Also update the badge in the header
            const count = cart.reduce((sum, item) => sum + item.quantity, 0);
            const cartBadge = document.querySelector('.cart-badge');
            if(cartBadge) cartBadge.textContent = count;
        });

        render();
    }

    // --- INITIALIZE ALL ---
    initMobileNav();
    initSwipers();
    initFaqAccordion();
    initScrollAnimations();
    initCart();
    if (document.querySelector('.cart-section')) {
        document.body.classList.add('cart-page');
        renderCartPage();
    }
});