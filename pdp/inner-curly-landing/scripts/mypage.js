
document.addEventListener('DOMContentLoaded', () => {
  const u = Auth.current(); const box = document.getElementById('user-info');
  box.textContent = u? `${u.name} (${u.email})` : '로그인이 필요합니다.';
  document.getElementById('btn-logout').addEventListener('click', ()=>{ Auth.logout(); location.href='./index.html'; });
});
