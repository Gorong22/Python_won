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
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu.classList.contains('is-open')) {
                    navToggle.classList.remove('is-open');
                    navMenu.classList.remove('is-open');
                }
            });
        });
    }

    // --- Swiper Initialization for Reviews ---
    function initReviewSwipers() {
        if (typeof Swiper === 'undefined') return;

        // Main page reviews swiper
        const mainReviewSwiperElement = document.querySelector('.reviews .swiper');
        if (mainReviewSwiperElement) {
            new Swiper(mainReviewSwiperElement, {
                slidesPerView: 1,
                spaceBetween: 20,
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                breakpoints: {
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 30,
                    },
                    1200: {
                        slidesPerView: 3,
                        spaceBetween: 40,
                    },
                },
            });
        }

        // PDP review gallery swiper
        const pdpReviewSwiperElement = document.querySelector('.pdp-reviews .pdp-review-swiper');
        if (pdpReviewSwiperElement) {
            new Swiper(pdpReviewSwiperElement, {
                slidesPerView: 1,
                spaceBetween: 10,
                loop: true,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                breakpoints: {
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 20,
                    },
                },
            });
        }
    }

    // --- FAQ Accordion Initialization ---
    function initFaqAccordion() {
        const faqLists = document.querySelectorAll('.faq__list');
        faqLists.forEach(faqList => {
            faqList.addEventListener('click', (e) => {
                const questionBtn = e.target.closest('.faq__question');
                if (questionBtn) {
                    const item = questionBtn.closest('.faq__item');
                    item.classList.toggle('is-open');
                    questionBtn.setAttribute('aria-expanded', item.classList.contains('is-open'));
                }
            });
        });
    }

    // --- Cart Quantity and Total Calculation ---
    function initCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');
        const purchaseButton = document.querySelector('.cart-summary .btn--primary');
        const purchaseModal = document.getElementById('purchase-modal');
        const modalConfirmBtn = document.getElementById('modal-confirm-btn');

        if (!cartItemsContainer || !cartTotalElement || !purchaseButton || !purchaseModal || !modalConfirmBtn) return;

        function updateCartTotal() {
            let total = 0;
            cartItemsContainer.querySelectorAll('.cart-item').forEach(item => {
                const priceText = item.querySelector('.cart-item__price').textContent;
                const price = parseInt(priceText.replace(/[^0-9]/g, ''));
                const quantity = parseInt(item.querySelector('.quantity-input').value);
                total += price * quantity;
            });
            cartTotalElement.textContent = total.toLocaleString() + '원';
        }

        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            let inputElement;

            if (target.classList.contains('quantity-minus')) {
                inputElement = target.nextElementSibling;
                let value = parseInt(inputElement.value);
                if (value > 1) {
                    inputElement.value = value - 1;
                    updateCartTotal();
                }
            } else if (target.classList.contains('quantity-plus')) {
                inputElement = target.previousElementSibling;
                let value = parseInt(inputElement.value);
                inputElement.value = value + 1;
                updateCartTotal();
            }
        });

        cartItemsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                let value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                    e.target.value = 1; // Reset to 1 if invalid
                }
                updateCartTotal();
            }
        });

        purchaseButton.addEventListener('click', () => {
            purchaseModal.classList.add('is-open');
        });

        modalConfirmBtn.addEventListener('click', () => {
            purchaseModal.classList.remove('is-open');
            window.location.href = 'index.html'; // Redirect to main page
        });

        updateCartTotal(); // Initial calculation
    }

    // --- Graph Animation (Intersection Observer) ---
    function initGraphAnimation() {
        const graphItems = document.querySelectorAll('.insight__graph-item[data-animate="on-scroll"]');

        if (graphItems.length === 0) return;

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        graphItems.forEach(item => {
            observer.observe(item);
        });
    }

    // --- Challenge Animation ---
    function initChallengeAnimation() {
        const challengeTimelines = document.querySelectorAll('.challenge-timeline');
        challengeTimelines.forEach(timeline => {
            const challengeItems = timeline.querySelectorAll('.challenge-item');
            if (challengeItems.length === 0) return;

            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('is-visible');
                        }, index * 200);
                        // observer.unobserve(entry.target); // Keep observing if items can go out and come back
                    }
                });
            }, { threshold: 0.1 });

            challengeItems.forEach(item => observer.observe(item));
        });
    }

    // --- INITIALIZE ALL ---
    initMobileNav();
    initReviewSwipers();
    initFaqAccordion();
    initCart(); // Only runs if cart-items and cart-total exist
    initGraphAnimation(); // Only runs if graph items exist
    initChallengeAnimation();
});
