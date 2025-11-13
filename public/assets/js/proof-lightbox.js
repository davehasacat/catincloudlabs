// public/assets/js/proof-lightbox.js
// Handles the Proof of Success carousel + lightbox

(() => {
  // Slides: card + modal share the same list
  const slides = [
    {
      webp: "/assets/proof/proof-success-ingest.v1.1920w.webp",
      jpg:  "/assets/proof/proof-success-ingest.v1.1920w.jpg",
      caption: "Ingest: API -> S3 (RAW)",
      alt: "Ingest: Airflow DAG writing gzipped ticker JSON files to the S3 RAW bucket."
    },
    {
      webp: "/assets/proof/proof-success-load.v1.1920w.webp",
      jpg:  "/assets/proof/proof-success-load.v1.1920w.jpg",
      caption: "Load: Snowflake COPY from S3",
      alt: "Load: Airflow load DAG running Snowflake COPY INTO from the S3 stage into RAW tables."
    },
    {
      webp: "/assets/proof/proof-success-transform.v1.1920w.webp",
      jpg:  "/assets/proof/proof-success-transform.v1.1920w.jpg",
      caption: "Transform: dbt models in Snowflake",
      alt: "Transform: dbt builds typed staging and mart models in Snowflake with precise decimals."
    }
  ];

  const thumbImg   = document.querySelector("[data-proof-img]");
  const captionEl  = document.querySelector("[data-proof-caption]");
  const prevBtn    = document.querySelector("[data-proof-prev]");
  const nextBtn    = document.querySelector("[data-proof-next]");
  const openBtn    = document.querySelector("[data-proof-open]");
  const lb         = document.getElementById("lightbox");

  if (!thumbImg || !captionEl || !prevBtn || !nextBtn || !openBtn || !lb) return;

  const lbImg      = lb.querySelector(".lb__img");
  const lbCaption  = lb.querySelector(".lb__caption");
  const lbPrev     = lb.querySelector(".lb__prev");
  const lbNext     = lb.querySelector(".lb__next");
  const lbCloseEls = lb.querySelectorAll("[data-close]");

  let index = 0;
  let lastFocus = null;

  const srcFor = (slide) => slide.webp || slide.jpg;

  function applyFallback(imgEl, slide) {
    imgEl.onerror = null; // prevent loops
    if (slide.jpg && imgEl.src.endsWith(".webp")) {
      imgEl.src = slide.jpg;
    }
  }

  function renderCard() {
    const slide = slides[index];
    thumbImg.src = srcFor(slide);
    thumbImg.alt = slide.alt;
    thumbImg.onerror = () => applyFallback(thumbImg, slide);
    captionEl.textContent = slide.caption;
  }

  function renderModal() {
    const slide = slides[index];
    lbImg.src = srcFor(slide);
    lbImg.alt = slide.alt;
    lbImg.onerror = () => applyFallback(lbImg, slide);
    lbCaption.textContent = slide.caption;

    // Preload neighbors
    const prevSlide = slides[(index - 1 + slides.length) % slides.length];
    const nextSlide = slides[(index + 1) % slides.length];
    [prevSlide, nextSlide].forEach((s) => {
      const img = new Image();
      img.src = srcFor(s);
    });
  }

  function openLightbox() {
    renderModal();
    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    lastFocus = document.activeElement;
    document.body.style.overflow = "hidden";

    const closeBtn = lb.querySelector(".lb__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    lb.setAttribute("aria-hidden", "true");
    lb.hidden = true;
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");

    if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus();
    }
  }

  function changeSlide(delta) {
    index = (index + delta + slides.length) % slides.length;
    renderCard();
    if (!lb.hidden) renderModal();
  }

  // Initial render
  renderCard();

  // Card controls
  prevBtn.addEventListener("click", () => changeSlide(-1));
  nextBtn.addEventListener("click", () => changeSlide(1));
  openBtn.addEventListener("click", openLightbox);

  // Modal controls
  lbPrev.addEventListener("click", () => changeSlide(-1));
  lbNext.addEventListener("click", () => changeSlide(1));

  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lb__backdrop")) {
      closeLightbox();
    }
  });

  lbCloseEls.forEach((el) => el.addEventListener("click", closeLightbox));

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      changeSlide(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      changeSlide(1);
    }
  });
})();
