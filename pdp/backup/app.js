document.addEventListener('DOMContentLoaded', () => {

    // --- DATA SCHEMAS ---
    const REVIEWS = [
        { quote: "피부가 탱탱해지고 화장이 잘 먹어요! ✨", rating: 5, name: "김**", age: 32, img: "https://images.unsplash.com/photo-1580820267682-426da823b514?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "출근 전 자동 기록이라 루틴이 쉬워졌어요.", rating: 4.5, name: "박**", age: 29, img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "도시락이 아닌 뷰티 루틴이라는 점이 달라요.", rating: 5, name: "이**", age: 35, img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "속이 편안하고 아침에 일어나는게 가뿐해요.", rating: 4, name: "최**", age: 41, img: "https://images.unsplash.com/photo-1529042410759-befb1204b468?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "AI가 식단을 추천해주니 고민할 필요가 없어요.", rating: 5, name: "정**", age: 27, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "30일 챌린지 성공! 소소한 리워드도 좋네요.", rating: 5, name: "윤**", age: 33, img: "https://images.unsplash.com/photo-1590548784725-33d66d91e126?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "주 3회 배송으로 신선하게 먹을 수 있어서 만족!", rating: 4.5, name: "장**", age: 38, img: "https://images.unsplash.com/photo-157193594028a-1921a3494853?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "라운지에서 다른 분들 팁 얻는 재미가 쏠쏠해요.", rating: 5, name: "임**", age: 31, img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "슬림 플레이트 먹고 군것질이 확실히 줄었어요.", rating: 4.5, name: "한**", age: 28, img: "https://images.unsplash.com/photo-1525875092322-259403de4313?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
        { quote: "피부톤이 맑아졌다는 얘기를 자주 들어요.", rating: 5, name: "서**", age: 36, img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" },
    ];

    const PLATES = [
        { key: "glow", title: "글로우 플레이트", tagline: "비타민C + 콜라겐", img: "https://placehold.co/300x300/F8F6FB/5F0080?text=Glow" },
        { key: "slim", title: "슬림 플레이트", tagline: "균형 단백질 · 가벼운 하루", img: "https://placehold.co/300x300/F8F6FB/5F0080?text=Slim" },
        { key: "detox", title: "디톡스 플레이트", tagline: "리셋 · 식이섬유 중심", img: "https://placehold.co/300x300/F8F6FB/5F0080?text=Detox" },
        { key: "balance", title: "밸런스 플레이트", tagline: "지속 가능한 균형", img: "https://placehold.co/300x300/F8F6FB/5F0080?text=Balance" }
    ];

    const REWARDS = [
        { day: 30, title: "5,000P 적립", desc: "꾸준함을 응원합니다" },
        { day: 60, title: "영양제 세트", desc: "반 이상 왔어요!" },
        { day: 90, title: "프리미엄 기프트", desc: "완주 축하 선물" }
    ];

    const FAQS = [
        { q: "일반 도시락과 이너플레이트의 차이점은 무엇인가요?", a: "이너컬리는 단순한 식단 제공을 넘어, 앱과 커뮤니티를 통해 지속 가능한 이너뷰티 습관을 만드는 것에 집중합니다. 영양 설계는 물론, 루틴 관리를 돕는 푸디케이션 솔루션입니다." },
        { q: "앱은 꼭 써야 하나요?", a: "필수는 아니지만, 루션 앱을 통해 식단을 자동으로 기록하고 AI 추천을 받는 등 핵심적인 기능을 경험하실 수 있어 사용을 적극 권장합니다." },
        { q: "구독 배송은 언제 시작되나요?", a: "구독 신청 시 원하시는 첫 배송일을 지정할 수 있습니다. 주 3회 또는 5회, 원하시는 스케줄에 맞춰 신선하게 배송해 드립니다." },
        { q: "챌린지 리워드 수령 방법은 어떻게 되나요?", a: "챌린지 목표 달성 시 앱 내에서 자동으로 리워드 쿠폰 또는 포인트가 발급됩니다. 실물 상품의 경우 배송지를 입력하여 수령하실 수 있습니다." },
        { q: "멤버스 전용 혜택은 무엇이 있나요?", a: "멤버스에게는 전용 프리미엄 콘텐츠(전문가 칼럼, Q&A), 비공개 커뮤니티 접근 권한, 그리고 멤버스 전용으로 진행되는 특별 이벤트 참여 기회가 주어집니다." }
    ];

    // --- DYNAMIC CONTENT RENDERING ---
    function renderPlates() {
        const container = document.getElementById('plates-list');
        if (!container) return;
        container.innerHTML = PLATES.map(plate => `
            <div class="card plate-card">
                <img src="${plate.img}" alt="${plate.title} 예시 이미지" class="plate-card__img" loading="lazy">
                <div class="plate-card__content">
                    <h3 class="plate-card__title">${plate.title}</h3>
                    <p class="plate-card__tagline">${plate.tagline}</p>
                    <a href="detail.html?plate=${plate.key}" class="btn btn--ghost btn--small">자세히 보러가기</a>
                </div>
            </div>
        `).join('');
    }

    function renderChallenges() {
        const timeline = document.getElementById('challenge-timeline');
        if (!timeline) return;
        timeline.innerHTML = REWARDS.map(reward => `
            <div class="challenge-item">
                <div class="challenge-item__day">${reward.day}일</div>
                <h3 class="challenge-item__title">${reward.title}</h3>
                <p class="challenge-item__desc">${reward.desc}</p>
            </div>
        `).join('');
    }

    function renderFaqs() {
        const list = document.getElementById('faq-list');
        if (!list) return;
        list.innerHTML = FAQS.map((faq, index) => `
            <div class="faq__item">
                <h2>
                    <button class="faq__question" aria-expanded="false" aria-controls="faq-answer-${index}">
                        <span>${faq.q}</span>
                        <svg class="faq__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </h2>
                <div id="faq-answer-${index}" class="faq__answer" role="region">
                    <p>${faq.a}</p>
                </div>
            </div>
        `).join('');
    }

    function renderSwiperReviews() {
        const swiperWrapper = document.getElementById('reviews-swiper-wrapper');
        if (!swiperWrapper) return;

        swiperWrapper.innerHTML = REVIEWS.map(r => `
            <div class="swiper-slide">
                <div class="review-swiper-card">
                    <img src="${r.img}" alt="${r.name}님의 후기 이미지" class="review-swiper-card__img" loading="lazy">
                    <div class="review-swiper-card__body">
                        <p class="review-swiper-card__quote">“${r.quote}”</p>
                        <div class="review-swiper-card__rating">${'★'.repeat(Math.floor(r.rating))}${'☆'.repeat(5 - Math.floor(r.rating))}</div>
                        <p class="review-swiper-card__author">${r.name} (${r.age}세)</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function initSwiper() {
        if (typeof Swiper === 'undefined') return;

        new Swiper('.review-swiper', {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 20,
            centeredSlides: true,
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

    // --- Other Initializations ---
    function initMobileNav() {
        const navToggle = document.querySelector('.nav__toggle');
        const navMenu = document.querySelector('.nav__menu');
        if (!navToggle || !navMenu) return;
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('is-open');
            navMenu.classList.toggle('is-open');
        });
        document.querySelectorAll('.nav__link, .hero__cta').forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu.classList.contains('is-open')) {
                    navToggle.classList.remove('is-open');
                    navMenu.classList.remove('is-open');
                }
            });
        });
    }

    function initFaqAccordion() {
        const faqList = document.getElementById('faq-list');
        if (!faqList) return;
        faqList.addEventListener('click', (e) => {
            const questionBtn = e.target.closest('.faq__question');
            if (questionBtn) {
                const item = questionBtn.closest('.faq__item');
                item.classList.toggle('is-open');
                questionBtn.setAttribute('aria-expanded', item.classList.contains('is-open'));
            }
        });
    }

    function initCharts() {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.animation.duration = 1500;
        Chart.defaults.animation.easing = 'easeOutQuart';

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#ECE7F4' } },
                x: { grid: { display: false } }
            }
        };

        const vitcCtx = document.getElementById('vitcChart');
        if (vitcCtx) {
            new Chart(vitcCtx, {
                type: 'bar',
                data: {
                    labels: ['주름 외관', '노인성 건조'],
                    datasets: [{
                        label: 'Odds Ratio (OR)',
                        data: [0.89, 0.93],
                        backgroundColor: ['rgba(165, 102, 214, 0.5)', 'rgba(95, 0, 128, 0.5)'],
                        borderColor: ['rgba(165, 102, 214, 1)', 'rgba(95, 0, 128, 1)'],
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: { ...defaultOptions, scales: { y: { ...defaultOptions.scales.y, min: 0.8, max: 1.0, title: { display: true, text: 'Odds Ratio (낮을수록 위험 감소)' } } } }
            });
        }

        const antioxidantCtx = document.getElementById('antioxidantChart');
        if (antioxidantCtx) {
            new Chart(antioxidantCtx, {
                type: 'doughnut',
                data: {
                    labels: ['고 항산화 식단군 (광노화 위험도 약 10% 감소)', '대조군'],
                    datasets: [{
                        data: [90, 10],
                        backgroundColor: ['rgba(95, 0, 128, 0.7)', 'rgba(236, 231, 244, 0.5)'],
                        borderColor: ['#fff', '#fff'],
                        borderWidth: 4,
                        hoverOffset: 8
                    }]
                },
                options: { ...defaultOptions, cutout: '70%', plugins: { ...defaultOptions.plugins, legend: { display: true, position: 'bottom', labels: { boxWidth: 15, padding: 20 } } }, scales: { y: { display: false }, x: { display: false } } }
            });
        }

        const mufaCtx = document.getElementById('mufaChart');
        if (mufaCtx) {
            new Chart(mufaCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
                    datasets: [{
                        label: '광노화 위험도 (OR)',
                        data: [1.0, 0.92, 0.85, 0.78, 0.71],
                        backgroundColor: 'rgba(165, 102, 214, 0.5)',
                        borderColor: 'rgba(165, 102, 214, 1)',
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: { ...defaultOptions, scales: { y: { ...defaultOptions.scales.y, min: 0.6, title: { display: true, text: 'Odds Ratio' } }, x: { ...defaultOptions.scales.x, title: { display: true, text: '올리브오일 MUFA 섭취량 (Q1:최저 ~ Q5:최고)' } } } }
            });
        }
    }

    function initBackButton() {
        const backBtn = document.querySelector('.hero__back-btn');
        if (!backBtn) return;
        backBtn.addEventListener('click', () => {
            if (history.length > 1) {
                history.back();
            } else {
                document.querySelector('#home').scrollIntoView();
            }
        });
    }

    function initNavScroll() {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav__link');
        if(sections.length === 0 || navLinks.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-50% 0px -50% 0px' });

        sections.forEach(section => observer.observe(section));
    }
    
    function initChallengeAnimation() {
        const challengeItems = document.querySelectorAll('.challenge-item');
        if (challengeItems.length === 0) return;

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('is-visible');
                    }, index * 200);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        challengeItems.forEach(item => observer.observe(item));
    }

    // --- INITIALIZE ALL --- 
    renderPlates();
    renderChallenges();
    renderFaqs();
    renderSwiperReviews();
    initSwiper();
    initMobileNav();
    initFaqAccordion();
    initCharts();
    initBackButton();
    initNavScroll();
    initChallengeAnimation();
});