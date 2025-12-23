/* * Cal.com Embed Initialization & Event Delegation
 * Version: 3.0 (Bulletproof)
 */

// 1. Core Cal.com Loader
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

// 2. Initialize
Cal("init", {origin: "https://cal.com"});

// 3. UI Styles
Cal("ui", {
  "styles": {
    "branding": {
      "brandColor": "#000000"
    }
  },
  "hideEventTypeDetails": false,
  "layout": "month_view"
});

// 4. Global Click Listener (Event Delegation)
// This catches the click at the document level, so it never misses.
document.addEventListener('click', (e) => {
  // Check if the clicked element (or its parent) has the data-cal-link attribute
  const trigger = e.target.closest('[data-cal-link]');
  
  if (trigger) {
    e.preventDefault(); // Stop it from acting like a normal link
    
    const link = trigger.getAttribute('data-cal-link');
    console.log("Cal.com: Click detected on", link);

    // Open the modal
    Cal("modal", { 
      calLink: link,
      config: {
        "layout": "month_view"
      }
    });
  }
});

console.log("Cal.com: Global listener active.");
