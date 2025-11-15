// assets/js/proof-panel-lightbox.js
// Hook the 3-panel proof image into the existing lightbox

(function () {
  function initPanelLightbox() {
    const trigger = document.querySelector("[data-panel-open]");
    if (!trigger) return;

    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const lbImg = lightbox.querySelector(".lb__img");
    const lbCaption = lightbox.querySelector("#lb-caption");

    trigger.addEventListener("click", function () {
      if (!lbImg) return;

      const img = trigger.querySelector("img");
      if (!img) return;

      // Set image source + alt
      lbImg.src = img.src;
      lbImg.alt = img.alt || "";

      // Caption: prefer data-caption, fall back to img alt
      if (lbCaption) {
        lbCaption.textContent =
          trigger.dataset.caption || img.alt || "";
      }

      // Show the lightbox
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPanelLightbox);
  } else {
    initPanelLightbox();
  }
})();
