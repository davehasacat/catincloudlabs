// /assets/js/proof-panel-lightbox.js
// Lightweight lightbox opener for single images that use data-panel-open.
// Used by: diagrams + 3-panel proof image.

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const imgEl = lightbox.querySelector(".lb__img");
    const captionEl = lightbox.querySelector("#lb-caption");
    const navEl = lightbox.querySelector(".lb__nav");

    const triggers = document.querySelectorAll("[data-panel-open]");
    if (!triggers.length) return;

    function openFromButton(btn) {
      const img = btn.querySelector("img");
      if (!img) return;

      const src = img.getAttribute("src");
      const alt = img.getAttribute("alt") || "";
      const caption = btn.getAttribute("data-caption") || alt;

      imgEl.src = src;
      imgEl.alt = alt;
      captionEl.textContent = caption;

      // Hide nav arrows for these single images (the proof carousel
      // still controls them via its own script)
      if (navEl) navEl.style.display = "none";

      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      imgEl.removeAttribute("src");
      imgEl.alt = "";

      // Let the proof carousel script / CSS decide nav visibility again
      if (navEl) navEl.style.display = "";
      document.body.style.overflow = "";
    }

    // Wire up every data-panel-open trigger (both diagrams + 3-panel)
    triggers.forEach((btn) => {
      btn.addEventListener("click", function () {
        openFromButton(btn);
      });
    });

    // Close buttons / backdrop
    lightbox
      .querySelectorAll("[data-close]")
      .forEach((el) => el.addEventListener("click", closeLightbox));

    // Esc to close
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeLightbox();
      }
    });
  });
})();
