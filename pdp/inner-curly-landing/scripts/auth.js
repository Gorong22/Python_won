
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email=form.email.value, pw=form.password.value;
    if(pw!=='1234'){ alert('데모 비밀번호는 1234'); return; }
    Auth.login(email, email.split('@')[0]||'사용자'); fireEvent('login',{method:'email',email}); location.href='./mypage.html';
  });
});
