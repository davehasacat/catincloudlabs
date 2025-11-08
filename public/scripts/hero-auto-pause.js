document.addEventListener('DOMContentLoaded', () => {
  const v = document.querySelector('.ci-hero__video');
  if (!v || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting && !v.paused) v.pause();
      if (e.isIntersecting && v.paused) v.play().catch(()=>{});
    });
  }, { threshold: 0.1 });
  io.observe(v);
});
