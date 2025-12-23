/* * Cal.com Embed Initialization & Manual Trigger
 * Handles both auto-init and manual click events for robustness.
 */
(function (C, A, L) { 
  let p = function (a, ar) { a.q.push(ar); }; 
  d = C.document; 
  C.Cal = C.Cal || function () { 
    let cal = C.Cal; 
    let ar = arguments; 
    if (!cal.loaded) { 
      cal.ns = {}; 
      cal.q = cal.q || []; 
      d.head.appendChild(d.createElement("script")).src = A; 
      cal.loaded = true; 
    } 
    if (ar[0] === L) { 
      const api = function () { p(api, arguments); }; 
      const namespace = ar[1]; 
      api.q = api.q || []; 
      typeof namespace === "string" ? (cal.ns[namespace] = api) : p(cal, ar); 
      return; 
    } 
    p(cal, ar); 
  }; 
})(window, "https://app.cal.com/embed/embed.js", "init");

// 1. Initialize the library
Cal("init", {origin: "https://cal.com"});

// 2. Configure the UI (Black branding, Month view)
Cal("ui", {
  "styles": {
    "branding": {
      "brandColor": "#000000" 
    }
  },
  "hideEventTypeDetails": false,
  "layout": "month_view"
});

// 3. Manual Trigger Logic (The Fix)
// This ensures that even if the auto-observer misses the button, 
// our click listener will catch it and fire the modal command.
document.addEventListener("DOMContentLoaded", () => {
  const triggers = document.querySelectorAll('[data-cal-link]');
  
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      // Prevent any default button behavior
      e.preventDefault();
      
      const link = trigger.getAttribute('data-cal-link');
      // Parse the config if it exists, otherwise empty object
      const configString = trigger.getAttribute('data-cal-config');
      const config = configString ? JSON.parse(configString) : {};

      // Explicitly tell Cal.com to open the modal
      Cal("modal", { 
        calLink: link,
        config: config
      });
    });
  });
});
