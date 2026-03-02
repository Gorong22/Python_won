document.addEventListener("DOMContentLoaded", () => {
  // Scroll animation
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("on");
      });
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll(".sa").forEach((el) => observer.observe(el));

  // Smooth nav scroll
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });
});
