document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const user = Auth.current();

  // ✅ 로그인 안 된 상태일 경우 접근 제한
  if (!user || !user.email) {
    alert("로그인 후 이용해주세요.");
    location.href = "./login.html";
    return;
  }

  // ✅ 유저별 장바구니 키 설정 (cart_useremail)
  const cartKey = `cart_${user.email}`;

  // ✅ Cart Utility Override (공통 Cart 객체 사용 시 확장)
  const CartEx = {
    list() {
      try {
        return JSON.parse(localStorage.getItem(cartKey) || "[]");
      } catch {
        return [];
      }
    },
    save(items) {
      localStorage.setItem(cartKey, JSON.stringify(items));
    },
    remove(index) {
      const items = CartEx.list();
      items.splice(index, 1);
      CartEx.save(items);
    },
    clear() {
      localStorage.removeItem(cartKey); // ✅ setItem -> removeItem
    },
  };

  /* -----------------------------
     ✅ 렌더링 함수
  ----------------------------- */
  function render() {
    const items = CartEx.list();
    let total = 0;

    if (items.length === 0) {
      wrap.innerHTML = '<p class="small">장바구니가 비어 있습니다 🛒</p>';
      totalEl.textContent = "0원";
      return;
    }

    wrap.innerHTML = items
      .map((it, idx) => {
        total += Number(it.price) || 0; // ✅ 숫자형 변환 안정화
        return `
        <div class="card pad cart-item">
          <div class="row" style="justify-content:space-between; align-items:center;">
            <div class="col">
              <strong>${it.name}</strong><br/>
              <span class="small">${it.plan || ""}</span>
            </div>
            <div class="price">${Number(it.price).toLocaleString()}원</div>
          </div>
          <button class="btn btn--danger btn-remove" data-index="${idx}">
            삭제
          </button>
        </div>`;
      })
      .join("");

    totalEl.textContent = total.toLocaleString() + "원";
  }

  render();

  /* -----------------------------
     ✅ 삭제 이벤트
  ----------------------------- */
  wrap.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remove")) {
      const idx = parseInt(e.target.dataset.index);
      const scrollY = window.scrollY; // ✅ 스크롤 복원
      CartEx.remove(idx);
      render();
      window.scrollTo(0, scrollY);
      if (typeof toast === "function") toast("상품이 삭제되었습니다.");
      else alert("상품이 삭제되었습니다.");
    }
  });

  /* -----------------------------
     ✅ 전체 비우기 (선택)
  ----------------------------- */
  const clearBtn = document.getElementById("btn-clear-cart");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("장바구니를 모두 비우시겠습니까?")) {
        CartEx.clear();
        render();
        if (typeof toast === "function") toast("장바구니가 비워졌습니다.");
        else alert("장바구니가 비워졌습니다.");
      }
    });
  }
});
