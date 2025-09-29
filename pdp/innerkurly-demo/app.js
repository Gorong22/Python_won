(function() {
    "use strict";

    // --- State & Constants ---
    const state = {
        dataCache: {},
        settings: {
            profile: null,
            missions: {},
            likes: [],
            reviewHelpful: [],
        }
    };

    const STORAGE_KEYS = {
        PROFILE: 'innerkurly.profile',
        MISSIONS: 'innerkurly.missions',
        LIKES: 'innerkurly.likes',
        REVIEW_HELPFUL: 'innerkurly.reviewHelpful',
        EVENT_CLICK: 'innerkurly.eventClick',
    };

    // --- DOM & Utils ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const el = (tag, attrs = {}, children = []) => {
        const element = document.createElement(tag);
        for (const key in attrs) {
            element.setAttribute(key, attrs[key]);
        }
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        return element;
    };

    const getLocalStorage = (key, defaultValue) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error(`Error reading from localStorage: ${key}`, e);
            return defaultValue;
        }
    };

    const setLocalStorage = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error writing to localStorage: ${key}`, e);
        }
    };

    const loadImage = (url, alt = '') => {
        const img = new Image();
        img.loading = 'lazy';
        img.alt = alt;

        return new Promise((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => {
                const canvas = el('canvas');
                const ctx = canvas.getContext('2d');
                const size = 200;
                canvas.width = size;
                canvas.height = size;

                ctx.fillStyle = '#ccc';
                ctx.fillRect(0, 0, size, size);

                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '12px sans-serif';
                const fileName = url.split('/').pop();
                ctx.fillText(fileName, size / 2, size / 2);

                img.src = canvas.toDataURL();
                resolve(img);
            };
            img.src = url;
        });
    };

    // --- API ---
    const fetchJSON = async (path) => {
        if (state.dataCache[path]) {
            return state.dataCache[path];
        }
        try {
            const response = await fetch(`./data/${path}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            state.dataCache[path] = data;
            return data;
        } catch (error) {
            console.error(`Failed to fetch ${path}:`, error);
            Toast.show(`데이터 로딩 실패: ${path}`);
            return null;
        }
    };

    // --- Components ---
    const Toast = {
        show: (message) => {
            const toastContainer = $('#toast-container');
            const toast = el('div', { class: 'toast-message' }, [message]);
            toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    };

    const Modal = {
        open: (content, modalClass = '') => {
            const modalContainer = $('#modal-container');
            const modalContent = el('div', { class: `modal-content ${modalClass}` });
            modalContent.innerHTML = content;

            const closeBtn = el('button', { class: 'modal-close-btn', 'aria-label': '닫기' }, ['×']);
            closeBtn.onclick = () => Modal.close();
            modalContent.prepend(closeBtn);

            modalContainer.innerHTML = '';
            modalContainer.appendChild(modalContent);
            modalContainer.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) Modal.close();
            });
            document.addEventListener('keydown', Modal.handleEsc);
        },
        close: () => {
            const modalContainer = $('#modal-container');
            modalContainer.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', Modal.handleEsc);
        },
        handleEsc: (e) => {
            if (e.key === 'Escape') Modal.close();
        }
    };
    
    const Skeleton = (count = 1, type = 'card') => {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            if (type === 'card') {
                skeletonHTML += `
                    <div class="card">
                        <div class="skeleton" style="width:100%; aspect-ratio: 1/1;"></div>
                        <div class="card-body">
                            <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 8px;"></div>
                            <div class="skeleton" style="height: 16px; width: 50%;"></div>
                        </div>
                    </div>`;
            } else {
                 skeletonHTML += `<div class="skeleton" style="height: 40px; margin-bottom: 10px;"></div>`;
            }
        }
        return skeletonHTML;
    };

    const NutritionChart = (canvas, data) => {
        const ctx = canvas.getContext('2d');
        const { carb, protein, fat } = data;
        const total = carb + protein + fat;
        const pCarb = carb / total;
        const pProtein = protein / total;
        
        let currentAngle = -0.5 * Math.PI;
        
        const drawSlice = (percentage, color) => {
            const sliceAngle = 2 * Math.PI * percentage;
            ctx.beginPath();
            ctx.moveTo(100, 100);
            ctx.arc(100, 100, 80, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            currentAngle += sliceAngle;
        };
        
        drawSlice(pCarb, '#FFC107'); // 탄수화물
        drawSlice(pProtein, '#F44336'); // 단백질
        drawSlice(1 - pCarb - pProtein, '#4CAF50'); // 지방
    };

    // --- View Renderers ---
    const renderHome = async (container) => {
        container.innerHTML = `
            <div class="carousel-container">${Skeleton(1, 'carousel')}</div>
            <div class="container">
                <h2 class="section-title">정성 가득 추천</h2>
                <div class="product-grid">${Skeleton(4)}</div>
            </div>
        `;
        const trending = await fetchJSON('trending.json');
        const plates = await fetchJSON('plates.json');

        // Carousel
        const carouselHTML = `
            <div class="carousel">
                <div class="carousel-wrapper">
                    ${[1,2,3].map(i => `<div class="carousel-item"><img src="/assets/hero-${i}.jpg" alt="배너 ${i}"></div>`).join('')}
                </div>
                <div class="carousel-indicators">
                    ${[1,2,3].map((_, i) => `<div class="carousel-indicator ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
            </div>`;
        $('.carousel-container').innerHTML = carouselHTML;
        // Basic Carousel Logic
        const wrapper = $('.carousel-wrapper');
        let currentIndex = 0;
        setInterval(() => {
            currentIndex = (currentIndex + 1) % 3;
            wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
            $$('.carousel-indicator').forEach((ind, i) => ind.classList.toggle('active', i === currentIndex));
        }, 4000);

        // Recommended Plates
        const grid = $('.product-grid');
        grid.innerHTML = '';
        plates.slice(0, 4).forEach(plate => {
            const card = el('div', { class: 'card', 'data-id': plate.id });
            card.innerHTML = `
                <img class="card-img" src="/assets/${plate.id}.jpg" alt="${plate.title}" loading="lazy">
                <div class="card-body">
                    <h3 class="card-title">${plate.title}</h3>
                    <p class="card-text">${plate.tags[0]}</p>
                </div>`;
            card.onclick = () => renderPDP(plate.id);
            grid.appendChild(card);
        });
    };

    const renderPlates = async (container) => {
        container.innerHTML = `
            <div class="filter-section"></div>
            <div class="plates-grid">${Skeleton(8)}</div>
        `;
        const plates = await fetchJSON('plates.json');
        const trending = await fetchJSON('trending.json');
        
        const filterContainer = $('.filter-section');
        trending.chips.forEach(chip => {
            filterContainer.innerHTML += `<button class="chip">${chip}</button>`;
        });

        const grid = $('.plates-grid');
        grid.innerHTML = '';
        plates.forEach(plate => {
            const card = el('div', { class: 'card', 'data-id': plate.id });
            card.innerHTML = `
                <img class="card-img" src="/assets/${plate.id}.jpg" alt="${plate.title}" loading="lazy">
                <div class="card-body">
                    <h3 class="card-title">${plate.title}</h3>
                    <p class="card-text">${plate.price.toLocaleString()}원</p>
                </div>`;
            card.onclick = () => renderPDP(plate.id);
            grid.appendChild(card);
        });
    };

    const renderMissions = (container) => {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const missions = getLocalStorage(`${STORAGE_KEYS.MISSIONS}.${today}`, {eat:0, workout:0, water:0, sleep:0});

        container.innerHTML = `
            <h2 class="section-title">오늘의 미션</h2>
            <div class="mission-toggle-list">
                ${['eat', 'workout', 'water', 'sleep'].map(m => `
                    <div class="mission-item" data-mission="${m}">
                        <span>${{eat:'건강하게 먹기', workout:'운동하기', water:'물 마시기', sleep:'잘 자기'}[m]}</span>
                        <div class="toggle ${missions[m] ? 'on' : ''}"></div>
                    </div>
                `).join('')}
            </div>
            <div class="streak-container">
                <h2 class="section-title">7일 스트릭</h2>
                <p>🔥 3일 연속 달성 중!</p>
            </div>
        `;

        $$('.mission-item').forEach(item => {
            item.addEventListener('click', () => {
                const mission = item.dataset.mission;
                missions[mission] = !missions[mission];
                item.querySelector('.toggle').classList.toggle('on');
                setLocalStorage(`${STORAGE_KEYS.MISSIONS}.${today}`, missions);
                Toast.show('미션이 업데이트되었습니다!');
            });
        });
    };

    const renderLounge = async (container) => {
        container.innerHTML = `<div class="lounge-feed">${Skeleton(5, 'list')}</div>`;
        const posts = await fetchJSON('lounge.json');
        const feed = $('.lounge-feed');
        feed.innerHTML = '';
        posts.forEach(post => {
            feed.innerHTML += `
                <div class="card lounge-card" data-id="${post.id}">
                    <div class="card-body">
                        <h3 class="card-title">${post.title}</h3>
                        <p class="card-text">by ${post.author}</p>
                    </div>
                    <img class="card-img" src="${post.image}" alt="${post.title}" loading="lazy">
                    <div class="card-body">
                        <span class="chip">${post.hashtags[0]}</span>
                        <p style="margin-top: 8px;">❤️ ${post.likes} · 💬 ${post.comments}</p>
                    </div>
                </div>
            `;
        });
    };
    
    const renderEvent = (container) => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const utmSource = params.get('utm_source');
        container.innerHTML = `
            ${utmSource ? `<div class="chip primary" style="margin-bottom: 16px;">${utmSource} 채널 특별 혜택!</div>` : ''}
            <div class="event-banner" style="margin-bottom: 24px;">
                <img src="/assets/event-hero.jpg" alt="이벤트 배너">
            </div>
            <h2 class="section-title">베스트 상품</h2>
            <div class="plates-grid">${Skeleton(2)}</div>
        `;
        fetchJSON('plates.json').then(plates => {
            const grid = $('.plates-grid');
            grid.innerHTML = '';
            plates.slice(0, 2).forEach(plate => {
                const card = el('div', { class: 'card', 'data-id': plate.id });
                card.innerHTML = `
                    <img class="card-img" src="/assets/${plate.id}.jpg" alt="${plate.title}" loading="lazy">
                    <div class="card-body">
                        <h3 class="card-title">${plate.title}</h3>
                        <p class="card-text">${plate.price.toLocaleString()}원</p>
                    </div>`;
                card.onclick = () => renderPDP(plate.id);
                grid.appendChild(card);
            });
        });
    };

    const renderMy = async (container) => {
        container.innerHTML = Skeleton(1, 'profile');
        const profile = await fetchJSON('profile.json');
        container.innerHTML = `
            <div class="profile-summary">
                <h2>${profile.name}님</h2>
                <p>포인트: ${profile.points.toLocaleString()}P | 컬리캐시: ${profile.kurlyCash.toLocaleString()}원</p>
                <p>🔥 ${profile.streak}일 연속 달성</p>
            </div>
            <div class="container">
                <h3 class="section-title">주간 리포트</h3>
                <div class="weekly-chart">
                ${Object.keys(profile.weekly).map(day => `
                    <div class="bar">
                        <div class="fill" style="height: ${profile.weekly[day]}%;"></div>
                    </div>
                `).join('')}
                </div>
            </div>
            <button class="btn secondary" style="width: 100%; margin-top: 16px;">목표/알러지 편집</button>
        `;
    };

    const renderPDP = async (id) => {
        const plate = (await fetchJSON('plates.json')).find(p => p.id === id);
        if (!plate) return;

        const isDesktop = window.innerWidth >= 1200;
        let bodyContent;

        if (isDesktop) {
            bodyContent = `
                <div class="desktop-fallback">
                    <h3>상세 정보는 모바일 앱에서 확인해주세요.</h3>
                    <p>영양 정보, 섭취 가이드, 전체 리뷰 등 모든 정보는 모바일 앱에 최적화되어 있습니다.</p>
                    <div class="qr-code" title="모바일 앱 QR 코드"></div>
                </div>
            `;
        } else {
            bodyContent = `
                <div class="pdp-section">
                    <h3 class="section-title">식단 구성</h3>
                    <div class="items-grid">
                        ${plate.items.map(item => `<div class="chip">${item.name}</div>`).join('')}
                    </div>
                </div>
                <div class="pdp-section">
                    <h3 class="section-title">영양 정보</h3>
                    <canvas id="nutrition-chart" width="200" height="200"></canvas>
                </div>
                <div class="pdp-section">
                    <h3 class="section-title">리뷰 (${plate.reviews.summary.count})</h3>
                    <p>⭐ ${plate.reviews.summary.average.toFixed(1)}</p>
                </div>
            `;
        }

        const pdpHTML = `
            <div class="pdp-header">
                <h2>${plate.title}</h2>
                <p>${plate.price.toLocaleString()}원 / ${plate.periodDays}일</p>
                <div>${plate.tags.map(t => `<span class="chip">${t}</span>`).join(' ')}</div>
            </div>
            <div class="pdp-body">
                <img src="/assets/${plate.id}.jpg" alt="${plate.title}" style="width:100%; border-radius: var(--radius); margin-bottom: 24px;">
                ${bodyContent}
            </div>
            <div class="pdp-cta">
                <button class="btn secondary">담기</button>
                <button class="btn primary">정기구독하기</button>
            </div>
        `;
        
        Modal.open(pdpHTML, 'pdp-modal');
        
        if (!isDesktop && plate.nutrition) {
            NutritionChart($('#nutrition-chart'), plate.nutrition);
        }
    };

    // --- Router ---
    const Router = {
        routes: {
            '': renderHome,
            'home': renderHome,
            'plates': renderPlates,
            'missions': renderMissions,
            'lounge': renderLounge,
            'event': renderEvent,
            'my': renderMy,
            'pdp': (container, params) => renderPDP(params.get('id')),
        },
        init: () => {
            window.addEventListener('hashchange', Router.render);
            window.addEventListener('DOMContentLoaded', () => {
                // Load initial settings from localStorage
                state.settings.profile = getLocalStorage(STORAGE_KEYS.PROFILE, {});
                state.settings.likes = getLocalStorage(STORAGE_KEYS.LIKES, []);
                state.settings.reviewHelpful = getLocalStorage(STORAGE_KEYS.REVIEW_HELPFUL, []);
                
                Router.render();
            });
        },
        render: () => {
            const hash = window.location.hash.slice(1);
            const [path, queryString] = hash.split('?');
            const params = new URLSearchParams(queryString);
            
            const viewFn = Router.routes[path] || Router.routes['home'];
            const container = $('#view-container');
            
            viewFn(container, params);
            Router.updateNav(path || 'home');
        },
        updateNav: (currentPath) => {
            $$('.tab-item, .nav-item').forEach(el => {
                el.classList.remove('active');
                if (el.getAttribute('href') === `#${currentPath}`) {
                    el.classList.add('active');
                }
            });
        }
    };

    // --- App Initialization ---
    Router.init();

})();