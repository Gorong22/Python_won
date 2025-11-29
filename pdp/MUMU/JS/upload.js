(function() {
    function initUploadPage() {
        if(window.appState.role === 'guest') {
            window.app.showLoginModal();
            // Redirect back to feed after modal shows
            setTimeout(() => router.navigate('feed'), 100);
            return;
        }

        const steps = $$('.upload-step');
        let currentStep = 1;
        
        const workData = {
            thumbnail: '',
            title: '',
            tags: ''
        };

        const showStep = (stepNumber) => {
            currentStep = stepNumber;
            steps.forEach((step, index) => {
                step.classList.toggle('active', (index + 1) === stepNumber);
            });
        };

        // Step 1 Logic
        const thumbnailInput = $('#thumbnail-input');
        const thumbnailPreview = $('#thumbnail-preview');
        const thumbnailPlaceholder = $('#thumbnail-placeholder');
        const goToStep2Btn = $('#go-to-step-2');

        thumbnailInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    workData.thumbnail = event.target.result;
                    thumbnailPreview.src = workData.thumbnail;
                    thumbnailPreview.style.display = 'block';
                    thumbnailPlaceholder.style.display = 'none';
                    goToStep2Btn.disabled = false;
                };
                reader.readAsDataURL(file);
            }
        });

        goToStep2Btn.addEventListener('click', () => showStep(2));

        // Step 2 Logic
        const workTitleInput = $('#work-title');
        const workTagsInput = $('#work-tags');
        
        $('#back-to-step-1').addEventListener('click', () => showStep(1));
        $('#go-to-step-3').addEventListener('click', () => {
             workData.title = workTitleInput.value;
             workData.tags = workTagsInput.value;
             if (!workData.title) {
                 alert('제목을 입력해주세요.');
                 return;
             }
             showStep(3);
        });

        // Step 3 Logic
        $('#back-to-step-2').addEventListener('click', () => showStep(2));
        $('#finish-upload').addEventListener('click', () => {
            const newWork = {
                id: Date.now(),
                title: workData.title,
                thumbnail: workData.thumbnail,
                views: 0,
                likes: 0,
                type: 'scroll', // default
                iconClass: 'fa-scroll',
            };
            window.appState.myWorks.push(newWork);
            alert('작품이 성공적으로 업로드되었습니다!');
            
            const targetPage = window.appState.role === 'creator' ? 'mypage_creator' : 'mypage_reader';
            window.router.navigate(targetPage);
        });
    }

    window.router.registerPageScript('upload', initUploadPage);
})();