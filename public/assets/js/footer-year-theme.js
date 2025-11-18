// footer-year-theme.js
// Sets the current year in the footer and aligns the theme-color meta tag
// with the computed --bg-page value, if present.

(function () {
  // Update footer year
  var yearEl = document.getElementById("y");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Sync theme-color meta with CSS variable
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    var root = document.documentElement;
    var bg = getComputedStyle(root).getPropertyValue("--bg-page").trim();
    if (bg) {
      metaTheme.setAttribute("content", bg);
    }
  }
})();
