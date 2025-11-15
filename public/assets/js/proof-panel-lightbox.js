// assets/js/proof-panel-lightbox.js
// Hook the 3-panel proof image into the existing lightbox,
// but treat it as a single image (no prev/next arrows).

(function () {
  function initPanelLightbox() {
    const trigger = document.querySelector("[data-panel-open]");
    if (!trigger) return;

    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const lbImg = lightbox.querySelector(".lb__img");
    const lbCaption = lightbox.querySelector("#lb-caption");
    const lbNav = lightbox.querySelector(".lb__nav");
    const closeEls = lightbox.querySelectorAll("[data-close]");

    // Keep track of the original nav display so we can restore it
    let navOriginalDisplay = lbNav ? lbNav.style.display : "";

    function hideNav() {
      if (!lbNav) return;
      navOriginalDisplay = lbNav.style.display || "";
      lbNav.style.display = "none";
    }

    function restoreNav() {
      if (!lbNav) return;
      lbNav.style.display = navOriginalDisplay || "";
    }

    // When the 3-panel is clicked, show it in the lightbox and hide nav
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

      // Hide prev/next arrows for this single-image view
      hideNav();

      // Show the lightbox
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
    });

    // When the lightbox is closed, restore the nav visibility
    closeEls.forEach(function (el) {
      el.addEventListener("click", restoreNav);
    });

    // Also restore nav if user closes via Escape key
    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" || evt.key === "Esc") {
        restoreNav();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPanelLightbox);
  } else {
    initPanelLightbox();
  }
})();
