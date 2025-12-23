// 페이지 로드 전에 즉시 실행하여 해시 스크롤 방지
(function () {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // 즉시 최상단으로
    window.scrollTo(0, 0);

    // 해시가 있으면 제거
    if (window.location.hash) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
    }
})();

document.addEventListener("DOMContentLoaded", function () {
    // 처음 진입 시 해시로 인한 자동 스크롤 방지
    window.scrollTo(0, 0);

    // 추가 안전장치: 여러 시점에서 최상단 유지
    setTimeout(() => window.scrollTo(0, 0), 0);
    setTimeout(() => window.scrollTo(0, 0), 100);
    setTimeout(() => window.scrollTo(0, 0), 300);

    const fadeInElements = document.querySelectorAll('.fade-in');

    if (fadeInElements.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        fadeInElements.forEach(el => {
            observer.observe(el);
        });
    }

    // 1. [Tab Switching] 독자/작가 뷰 전환
    const tabs = document.querySelectorAll('.mode-tab');
    const views = document.querySelectorAll('.content-view');
    const headerCta = document.querySelector('.cta-button');

    function handleTabSwitch(tab) {
        const target = tab.getAttribute('data-target');

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        views.forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(target);
        if (targetView) {
            targetView.classList.add('active');
        }

        // CTA 버튼 텍스트/링크 변경
        if (headerCta) {
            if (target === 'writer-view') {
                headerCta.textContent = "작가 지원하기";
                headerCta.href = "#feedback";
            } else {
                headerCta.textContent = "베타테스터 시작하기";
                headerCta.href = "#beta-form";
            }
        }

        // 페이지 최상단으로 이동 (스무스 스크롤 없이 즉시 이동하여 맥락 전환 강조)
        window.scrollTo(0, 0);
    }

    tabs.forEach(tab => {
        // 클릭 이벤트
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleTabSwitch(tab);
        });

        // 모바일 터치 이벤트도 추가
        tab.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleTabSwitch(tab);
        });
    });

    // 2. [Form] 전체 동의하기 기능
    const allAgreeCheckbox = document.getElementById('allAgree');
    const privacyCheckboxes = document.querySelectorAll('.privacy-checkbox');

    if (allAgreeCheckbox && privacyCheckboxes.length > 0) {
        // 전체 동의 체크박스 클릭 시
        allAgreeCheckbox.addEventListener('change', function () {
            privacyCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });

        // 개별 체크박스 클릭 시 전체 동의 체크박스 상태 업데이트
        privacyCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const allChecked = Array.from(privacyCheckboxes).every(cb => cb.checked);
                allAgreeCheckbox.checked = allChecked;
            });
        });
    }

    // 3. [Popup] 프로젝트 진정성 팝업 제어
    const popup = document.getElementById('project-popup');
    const closeBtn = document.getElementById('close-popup');

    if (popup && closeBtn) {
        // localStorage 확인하여 1회만 노출
        if (!localStorage.getItem('mumu_opened')) {
            setTimeout(() => {
                popup.classList.remove('hidden');
            }, 800);
        } else {
            popup.style.display = 'none';
        }

        closeBtn.addEventListener('click', () => {
            popup.classList.add('hidden');
            localStorage.setItem('mumu_opened', 'true');
        });
    }

    // 3. [Form] 베타테스터 신청 전송 (Google Apps Script)
    const betaForm = document.getElementById('betaTesterForm');
    const successPopup = document.getElementById('successPopup');
    // Google Apps Script Web App URL - 아래 설정 가이드 참고
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxpeM-mj3JyI9AjCs4p33MCGTX1YFCTdNw4TkTJtdXeXLLw9mEDfSYxJWOzC4SzAlQ/exec";

    if (betaForm) {
        betaForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // 폼 유효성 검사
            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            const btn = this.querySelector('.submit-button');
            const originalTxt = btn.textContent;

            btn.disabled = true;
            btn.textContent = "신청 데이터를 전송 중입니다...";

            const formData = new FormData(this);


            function getRadioText(name) {
                const selected = document.querySelector(`input[name="${name}"]:checked`);

                if (selected) {
                    const label = selected.closest('label');
                    const spans = label.querySelectorAll('span');

                    // 두 번째 span (spans[1])에 텍스트가 있음
                    // 첫 번째 span (spans[0])은 radio-circle 클래스
                    if (spans.length >= 2) {
                        return spans[1].textContent.trim();
                    }

                    // 혹시 span이 1개만 있으면 그것 반환
                    if (spans.length === 1) {
                        return spans[0].textContent.trim();
                    }
                }
                return '';
            }

            // 모든 폼 데이터 수집
            const data = {
                timestamp: new Date().toLocaleString('ko-KR'),
                name: formData.get('name'),
                gender: formData.get('gender'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                interview: getRadioText('feedback_ready'),        // ✅ 변경
                agree: getRadioText('contact_agreement'),         // ✅ 변경
                expect: getRadioText('expect'),                   // ✅ 변경
                reason: getRadioText('tired_reason'),             // ✅ 변경
                tired: getRadioText('tired_moment'),              // ✅ 변경
                behavior: getRadioText('after_find'),             // ✅ 변경
                privacy1: formData.get('privacy1') ? '동의' : '미동의',
                privacy2: formData.get('privacy2') ? '동의' : '미동의',
                privacy3: formData.get('privacy3') ? '동의' : '미동의',
                privacy4: formData.get('privacy4') ? '동의' : '미동의'
            };

            console.log('전송할 데이터:', data);  // 디버깅용

            // Google Apps Script로 데이터 전송
            fetch(GAS_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
                .then(() => {
                    // 성공 팝업 표시
                    if (successPopup) {
                        successPopup.classList.remove('hidden');
                    }
                    // 폼 초기화
                    betaForm.reset();
                })
                .catch(err => {
                    console.error('Form submission error:', err);
                    alert("전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                })
                .finally(() => {
                    btn.disabled = false;
                    btn.textContent = originalTxt;
                });
        });
    }
});