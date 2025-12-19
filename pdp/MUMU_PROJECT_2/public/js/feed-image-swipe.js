document.addEventListener('DOMContentLoaded', () => {
    const imageContainers = document.querySelectorAll('.feed-image-container');

    imageContainers.forEach((container) => {
        const scrollContainer = container.querySelector('.feed-image-scroll');
        if (!scrollContainer) return;

        const items = scrollContainer.querySelectorAll('.feed-image-item');
        if (items.length === 0) return;

        const containerWidth = container.offsetWidth;
        const itemWidth = 332.122;
        const gap = 12;
        // 중앙 정렬을 위한 오프셋 계산
        const centerOffset = (containerWidth - itemWidth) / 2;

        let currentIndex = 0;
        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let startTime = 0;
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let startScrollLeft = 0;

        // 초기 위치 설정 (첫 번째 이미지를 중앙에)
        scrollContainer.style.transform = `translateX(-${currentIndex * (itemWidth + gap) + centerOffset}px)`;

        // 인스타그램 스타일 스와이프 처리 함수
        const handleSwipeEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            const diff = startX - currentX;
            const timeDiff = Date.now() - startTime;
            const distance = Math.abs(diff);

            // 속도 계산 (px/ms)
            velocity = timeDiff > 0 ? distance / timeDiff : 0;

            // 인스타그램 스타일: 거리와 속도를 모두 고려
            const minSwipeDistance = itemWidth * 0.25; // 25% 이상 스와이프
            const minVelocity = 0.3; // 최소 속도 (px/ms)
            const shouldSwipe = distance > minSwipeDistance || velocity > minVelocity;

            if (shouldSwipe) {
                if (diff > 0 && currentIndex < items.length - 1) {
                    // 오른쪽으로 스와이프 (다음 이미지)
                    currentIndex++;
                } else if (diff < 0 && currentIndex > 0) {
                    // 왼쪽으로 스와이프 (이전 이미지)
                    currentIndex--;
                }
            }

            // 부드러운 애니메이션으로 이동
            scrollContainer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            scrollContainer.style.transform = `translateX(-${currentIndex * (itemWidth + gap) + centerOffset}px)`;
        };

        // 터치 이벤트
        container.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            currentX = startX;
            lastX = startX;
            startTime = Date.now();
            lastTime = startTime;
            startScrollLeft = currentIndex * (itemWidth + gap) + centerOffset;
            scrollContainer.style.transition = 'none';
            velocity = 0;
        });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const now = Date.now();
            currentX = e.touches[0].clientX;

            // 속도 계산 (이동 거리 / 시간)
            if (now - lastTime > 0) {
                const moveDistance = Math.abs(currentX - lastX);
                const timeDiff = now - lastTime;
                velocity = moveDistance / timeDiff;
            }

            lastX = currentX;
            lastTime = now;

            const diff = startX - currentX;
            const scrollLeft = startScrollLeft + diff;
            scrollContainer.style.transform = `translateX(-${scrollLeft}px)`;
        });

        container.addEventListener('touchend', handleSwipeEnd);
        container.addEventListener('touchcancel', handleSwipeEnd);

        // 마우스 이벤트
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            currentX = startX;
            lastX = startX;
            startTime = Date.now();
            lastTime = startTime;
            startScrollLeft = currentIndex * (itemWidth + gap) + centerOffset;
            scrollContainer.style.transition = 'none';
            container.style.cursor = 'grabbing';
            velocity = 0;
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const now = Date.now();
            currentX = e.clientX;

            // 속도 계산
            if (now - lastTime > 0) {
                const moveDistance = Math.abs(currentX - lastX);
                const timeDiff = now - lastTime;
                velocity = moveDistance / timeDiff;
            }

            lastX = currentX;
            lastTime = now;

            const diff = startX - currentX;
            const scrollLeft = startScrollLeft + diff;
            scrollContainer.style.transform = `translateX(-${scrollLeft}px)`;
        });

        container.addEventListener('mouseup', () => {
            handleSwipeEnd();
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseleave', () => {
            if (isDragging) {
                handleSwipeEnd();
                container.style.cursor = 'grab';
            }
        });
    });
});

