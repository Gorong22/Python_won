const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// 간단한 템플릿 엔진
function renderTemplate(template, data) {
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
        return key.split('.').reduce((obj, k) => (obj || {})[k], data);
    });
}

// 스크롤 잠금/해제
function lockScroll() {
    document.body.classList.add('scroll-locked');
}

function unlockScroll() {
    document.body.classList.remove('scroll-locked');
}