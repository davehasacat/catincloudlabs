/* * Cal.com Embed Initialization (Version 4.0 - Namespaced & Debugged)
 * Uses explicit namespacing "discovery" to prevent global conflicts.
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
      
      // Explicit Script Injection with Logging
      let s = d.createElement("script");
      s.src = A;
      s.async = true;
      s.onload = () => console.log("Cal.com: Engine (embed.js) loaded successfully.");
      s.onerror = () => console.error("Cal.com: Engine failed to load. Check Network/AdBlock.");
      d.head.appendChild(s);
      
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

// 1. Initialize a named instance "discovery"
Cal("init", "discovery", {origin: "https://cal.com"});

// 2. Configure UI for this specific instance
Cal.ns.discovery("ui", {
  "styles": {
    "branding": {
      "brandColor": "#000000"
    }
  },
  "hideEventTypeDetails": false,
  "layout": "month_view"
});

// 3. Global Click Listener using the Named Instance
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-cal-link]');
  
  if (trigger) {
    e.preventDefault();
    let link = trigger.getAttribute('data-cal-link');
    
    // Safety: Ensure no double slashes, but ensure leading slash is handled by Cal
    console.log("Cal.com: Click detected. Attempting to open:", link);

    // Trigger the modal on our specific namespace
    Cal.ns.discovery("modal", { 
      calLink: link,
      config: {
        "layout": "month_view"
      }
    });
  }
});

console.log("Cal.com: Listener (v4.0) active.");
