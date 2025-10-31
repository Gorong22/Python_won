
document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('cart-items'); const totalEl = document.getElementById('cart-total');
  function render(){
    const items = Cart.list(); let total=0;
    if(items.length===0){ wrap.innerHTML='<p class="small">장바구니가 비어 있습니다.</p>'; totalEl.textContent='0원'; return; }
    wrap.innerHTML = items.map(it => { total += it.price; return `<div class="card pad"><div class="row" style="justify-content:space-between"><div class="col"><strong>${it.name}</strong><span class="small">${it.plan}</span></div><div class="price">${it.price.toLocaleString()}원</div></div></div>`; }).join('');
    totalEl.textContent = total.toLocaleString()+'원';
  } render();
});
