/* * Cal.com Embed Initialization & Robust Trigger
 * Version: 2.0 (Hardcoded Config)
 */

// 1. Core Cal.com Loader (The Engine)
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

// 3. Global UI Styles
Cal("ui", {
  "styles": {
    "branding": {
      "brandColor": "#000000"
    }
  },
  "hideEventTypeDetails": false,
  "layout": "month_view"
});

// 4. Click Listener (Debugged)
// We wait for the element to exist, then force the modal open.
const initCalBtn = () => {
  const trigger = document.querySelector('[data-cal-link]');
  
  if (!trigger) {
    console.warn("Cal.com: Button not found yet.");
    return;
  }

  // Remove old listeners (clone node) to ensure no duplicate firings
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);

  newTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("Cal.com: Button clicked. Opening modal...");
    
    const link = newTrigger.getAttribute('data-cal-link');
    
    // Direct command to open modal with specific config
    Cal("modal", { 
      calLink: link,
      config: {
        "layout": "month_view"
      }
    });
  });
  
  console.log("Cal.com: Event listener attached successfully.");
};

// Run immediately if at bottom of body, otherwise wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalBtn);
} else {
  initCalBtn();
}
