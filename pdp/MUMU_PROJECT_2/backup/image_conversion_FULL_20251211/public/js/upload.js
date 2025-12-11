// ============================
// 이미지 업로드 기능
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const uploadImageArea = document.getElementById('uploadImageArea');
  const imageInput = document.getElementById('imageInput');
  const backBtn = document.getElementById('backBtn');
  const tempSaveBtn = document.getElementById('tempSaveBtn');
  const publishBtn = document.getElementById('publishBtn');
  const tagInput = document.getElementById('tagInput');
  const tagSearchBtn = document.getElementById('tagSearchBtn');
  const tagChips = document.getElementById('tagChips');
  const privacyToggle = document.getElementById('privacyToggle');

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

  // 임시저장 버튼
  tempSaveBtn.addEventListener('click', () => {
    const title = document.getElementById('titleInput').value;
    const description = document.getElementById('descriptionInput').value;
    const image = imageInput.files[0];
    const selectedTags = Array.from(tagChips.querySelectorAll('.tag-chip span'))
      .map(chip => chip.textContent);
    const isPublic = privacyToggle.checked;

    console.log('임시저장 데이터:', {
      image,
      title,
      description,
      tags: selectedTags,
      isPublic
    });

    alert('임시저장되었습니다.');
  });

  // 발행 버튼
  publishBtn.addEventListener('click', () => {
    const title = document.getElementById('titleInput').value;
    const description = document.getElementById('descriptionInput').value;
    const image = imageInput.files[0];
    const selectedTags = Array.from(tagChips.querySelectorAll('.tag-chip span'))
      .map(chip => chip.textContent);
    const isPublic = privacyToggle.checked;

    if (!image) {
      alert('이미지를 선택해주세요.');
      return;
    }

    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    // TODO: 실제 발행 로직 구현
    console.log('발행 데이터:', {
      image,
      title,
      description,
      tags: selectedTags,
      isPublic
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

  // 태그 검색 버튼 클릭 또는 Enter 키 입력
  function addTag() {
    const tagText = tagInput.value.trim();
    if (tagText && !tagChips.querySelector(`.tag-chip span:contains("${tagText}")`)) {
      // 이미 존재하는 태그인지 확인
      const existingTags = Array.from(tagChips.querySelectorAll('.tag-chip span'))
        .map(span => span.textContent.trim());

      if (!existingTags.includes(tagText)) {
        const tagChip = document.createElement('div');
        tagChip.className = 'tag-chip';
        tagChip.innerHTML = `
          <span>${tagText}</span>
          <button class="tag-chip-remove">×</button>
        `;

        // 삭제 버튼 이벤트
        const removeBtn = tagChip.querySelector('.tag-chip-remove');
        removeBtn.addEventListener('click', () => {
          tagChip.remove();
        });

        tagChips.appendChild(tagChip);
        tagInput.value = '';
      }
    }
  }

  tagSearchBtn.addEventListener('click', addTag);

  tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });

  // 기존 태그 칩 삭제 버튼 이벤트
  tagChips.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.addEventListener('click', function () {
      this.closest('.tag-chip').remove();
    });
  });
});
