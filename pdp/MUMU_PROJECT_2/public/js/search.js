/* ========================== 
   뒤로가기 버튼
========================== */
const searchBackBtn = document.getElementById("searchBackBtn");
if (searchBackBtn) {
    searchBackBtn.addEventListener("click", () => {
        history.back();
    });
}

/* ========================== 
   Tabbar 로드
========================== */
fetch("components/tabbar.html")
    .then((r) => {
        if (!r.ok) throw new Error("tabbar load failed");
        return r.text();
    })
    .then((html) => (document.getElementById("tabbar").innerHTML = html))
    .catch((error) => console.error("Error fetching tabbar.html:", error));

/* ========================== 
   Category Filter 클릭
========================== */
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("category-filter")) {
        // 모든 필터에서 active 제거
        document.querySelectorAll(".category-filter").forEach((btn) => {
            btn.classList.remove("active");
        });
        // 클릭한 필터에 active 추가
        e.target.classList.add("active");
    }
});

