// ============================
// 이미지 업로드 기능
// ============================
document.addEventListener('DOMContentLoaded', () => {
    const uploadImageArea = document.getElementById('uploadImageArea');
    const imageInput = document.getElementById('imageInput');
    const backBtn = document.getElementById('backBtn');
    const tempSaveBtn = document.getElementById('tempSaveBtn');
    const publishBtn = document.getElementById('publishBtn');
    const tagArea = document.getElementById('tagArea');

    if (!uploadImageArea || !imageInput || !tempSaveBtn || !publishBtn) {
        console.error('Required elements not found');
        return;
    }

    // 뒤로가기 버튼
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // 타입 선택 버튼 (단일 선택)
    const formatButtons = document.querySelectorAll('.select-btn[data-format]');
    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // 임시저장 버튼
    tempSaveBtn.addEventListener('click', () => {
        const title = document.getElementById('titleInput').value;
        const description = document.getElementById('descriptionInput').value;
        const image = imageInput.files[0];
        const selectedFormat = document.querySelector('.select-btn.active')?.dataset.format;
        const selectedTags = Array.from(tagArea.querySelectorAll('.tag-btn.active'))
            .map(btn => btn.textContent);

        console.log('임시저장 데이터:', {
            image,
            title,
            description,
            format: selectedFormat,
            tags: selectedTags
        });

        alert('임시저장되었습니다.');
    });

    // 발행 버튼
    publishBtn.addEventListener('click', () => {
        const title = document.getElementById('titleInput').value;
        const description = document.getElementById('descriptionInput').value;
        const image = imageInput.files[0];
        const selectedFormat = document.querySelector('.select-btn.active')?.dataset.format;
        const selectedTags = Array.from(tagArea.querySelectorAll('.tag-btn.active'))
            .map(btn => btn.textContent);

        if (!image) {
            alert('이미지를 선택해주세요.');
            return;
        }

        if (!title.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        if (!selectedFormat) {
            alert('타입을 선택해주세요.');
            return;
        }

        // TODO: 실제 발행 로직 구현
        console.log('발행 데이터:', {
            image,
            title,
            description,
            format: selectedFormat,
            tags: selectedTags
        });

        alert('발행이 완료되었습니다.');
        // 발행 후 마이페이지로 이동
        window.location.href = 'mypage_creator.html';
    });

    // 이미지 업로드 영역 클릭 시 파일 선택
    uploadImageArea.addEventListener('click', () => {
        imageInput.click();
    });

    // 파일 선택 시 이미지 미리보기
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;

                // 기존 이미지 제거
                const existingImg = uploadImageArea.querySelector('img');
                const placeholder = uploadImageArea.querySelector('.upload-image-placeholder');
                if (existingImg) existingImg.remove();
                if (placeholder) placeholder.remove();

                // 새 이미지 추가
                uploadImageArea.appendChild(img);
                uploadImageArea.classList.add('has-image');

                // 삭제 버튼 추가
                if (!uploadImageArea.querySelector('.upload-image-remove')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'upload-image-remove';
                    removeBtn.textContent = '×';
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        img.remove();
                        removeBtn.remove();
                        uploadImageArea.classList.remove('has-image');
                        imageInput.value = '';

                        // placeholder 다시 추가
                        const newPlaceholder = document.createElement('div');
                        newPlaceholder.className = 'upload-image-placeholder';
                        uploadImageArea.appendChild(newPlaceholder);
                    });
                    uploadImageArea.appendChild(removeBtn);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // 태그 버튼 토글
    const tagButtons = document.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });
});
