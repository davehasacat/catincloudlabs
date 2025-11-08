// Auto-pause the hero video when it’s not at least 25% visible
(() => {
  const v = document.querySelector('.ci-hero__video');
  if (!v || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    if (entry.isIntersecting) {
      if (v.paused) v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
    }
  }, { threshold: 0.25 });

  io.observe(v);
})();
