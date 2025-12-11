function goMyFeed() {
  window.location.href = "mypage_creator.html";
}

// 창작자모드 버튼 클릭 시 독자 페이지로 이동
const creatorModeBtn = document.querySelector(".creator-mode-btn");
if (creatorModeBtn) {
  creatorModeBtn.addEventListener("click", () => {
    window.location.href = "mypage_reader.html";
  });
}


const ctx = document.getElementById('salesChart').getContext('2d');

// 그라데이션 생성
const gradient = ctx.createLinearGradient(0, 0, 0, 300);
gradient.addColorStop(0, 'rgba(255, 99, 71, 0.3)');   // 위쪽 연한 오렌지
gradient.addColorStop(1, 'rgba(255, 99, 71, 0)');     // 아래쪽 투명

new Chart(ctx, {
  type: 'line',
  data: {
    labels: ["", "", "", "", "", "", ""],  // X축 라벨 필요 없으면 빈 문자열
    datasets: [{
      data: [10, 12, 13, 15, 18, 18, 22],
      borderColor: '#FF6633',
      borderWidth: 2,
      backgroundColor: gradient,
      fill: true,
      tension: 0,   // 꺾인 라인
      pointRadius: 0 // 점 숨김
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false },
      y: { display: false }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  }
});
