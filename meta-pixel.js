/* =========================================================
   Meta-pixel — bag samtykke. FÆLLES fil for klinik.html,
   demosiderne (lib/demo.js) og tak-klinik.html.

   INDSÆT dit pixel-ID i META_PIXEL_ID nedenfor. Er den TOM,
   injiceres INTET script, der laves ingen kald til facebook.net,
   og intet andet sted i koden kaster fejl af den grund.

   Pixel'en indlæses FØRST når brugeren har accepteret i
   cookiebanneret (samme nøgle som banneret, "klinik_cookie_v1"
   === "all"). Accepterer hun i samme sidevisning, fyrer banneret
   en "cookie-accept"-hændelse, og pixel'en loades med det samme
   uden genindlæsning.
   ========================================================= */
var META_PIXEL_ID = "1841164606872762"; // Meta-pixel (tom = intet script/kald)

(function () {
  "use strict";

  var CONSENT_KEY = "klinik_cookie_v1"; // SAMME nøgle som cookiebanneret sætter
  var EVENT_KEY = "booking_event_id"; // eventID til dedup af Lead på tværs af sider
  var loaded = false;

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === "all";
    } catch (e) {
      return false;
    }
  }

  // Indlæs Metas pixel-script (kun én gang, kun med et udfyldt ID).
  function loadPixel() {
    if (loaded) return;
    if (!META_PIXEL_ID) return; // tomt ID → gør intet, ingen fejl
    loaded = true;
    // Metas officielle pixel-loader. fbq sættes synkront (kø), fbevents.js
    // hentes asynkront. Kald før hentning lægges i køen og afvikles bagefter.
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    try {
      window.fbq("init", META_PIXEL_ID);
      window.fbq("track", "PageView");
    } catch (e) {}
  }

  if (hasConsent()) {
    loadPixel();
  } else {
    // Accept i samme visning → banneret dispatcher "cookie-accept".
    window.addEventListener("cookie-accept", loadPixel);
  }

  // Hent-eller-opret et eventID og gem det i sessionStorage, så BEGGE
  // affyringssteder (Cal-embedden på /klinik og /tak-klinik) bruger samme ID.
  // Meta slår de to Lead-hændelser sammen på eventID.
  function bookingEventId() {
    var id = null;
    try {
      id = sessionStorage.getItem(EVENT_KEY);
    } catch (e) {}
    if (!id) {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        id = window.crypto.randomUUID();
      } else {
        id = "ev-" + new Date().getTime() + "-" + Math.random().toString(16).slice(2);
      }
      try {
        sessionStorage.setItem(EVENT_KEY, id);
      } catch (e) {}
    }
    return id;
  }

  // Fyr Lead med dedup-eventID. Er pixel'en ikke loadet (tomt ID eller
  // manglende samtykke), gør funktionen intet og kaster ikke fejl.
  window.trackLead = function () {
    try {
      var id = bookingEventId();
      if (window.fbq) window.fbq("track", "Lead", {}, { eventID: id });
    } catch (e) {}
  };
})();
