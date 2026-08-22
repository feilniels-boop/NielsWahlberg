"use strict";

/* ------------------------------------------------------------------
   /en/thanks — server-renderet.
   1) bekræftelse med fornavn (fra lead-cookie, server-side)
   2) video (WELCOME_VIDEO_URL)            [tilføjes i trin 2]
   3) tallene (leads + channel_stats)      [tilføjes i trin 3]
   4) book a call (Cal.com inline embed)
   5) Skool-link, stille, nederst
------------------------------------------------------------------ */

const db = require("./supabase");
const { esc } = require("./util");
const { sendHtml } = require("./http");
const { leadSlug } = require("./cookies");

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };
const CAL_LINK = process.env.CAL_LINK || "niels-feil-3q5gpr/30min";
// PLACEHOLDER SKOOL URL — udskift med det rigtige community-link.
const SKOOL_URL = process.env.SKOOL_URL || "https://www.skool.com/";

// Fornavn fra lead-cookie. Fejler ALDRIG siden — tom streng = ingen navn.
async function firstNameFromCookie(req) {
  try {
    const slug = leadSlug(req);
    if (!slug) return "";
    const lead = await db.getLeadBySlug(slug);
    if (!lead || !lead.name) return "";
    return String(lead.name).trim().split(/\s+/)[0] || "";
  } catch (e) {
    console.error("Thanks: kunne ikke slå lead op:", e && e.message);
    return "";
  }
}

// Video-sektion — implementeres i trin 2 (WELCOME_VIDEO_URL).
function renderVideoSection() {
  return "";
}

// Tal-sektion — implementeres i trin 3 (leads + channel_stats).
async function renderNumbersSection() {
  return "";
}

// Book a call: Cal.com inline embed (ikke et link).
function renderBookingSection() {
  return (
    '<section class="tak-book"><div class="container">' +
    "<p>If you already know you want it built, skip the wait and book a call.</p>" +
    '<div class="cal-embed" id="my-cal-inline-30min"></div>' +
    "</div></section>"
  );
}

function calScript() {
  // Officiel Cal.com inline embed. calLink styres af CAL_LINK.
  return (
    "<script type=\"text/javascript\">\n" +
    "(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement(\"script\")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === \"string\"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, [\"initNamespace\", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, \"https://app.cal.com/embed/embed.js\", \"init\");\n" +
    'Cal("init", "30min", {origin:"https://app.cal.com"});\n' +
    'Cal.ns["30min"]("inline", { elementOrSelector:"#my-cal-inline-30min", config: {"layout":"month_view","useSlotsViewOnSmallScreen":"true"}, calLink: "' +
    CAL_LINK +
    '" });\n' +
    'Cal.ns["30min"]("ui", {"hideEventTypeDetails":false,"layout":"month_view"});\n' +
    "</script>"
  );
}

async function renderPage(req) {
  const first = await firstNameFromCookie(req);
  const heading = first
    ? "Thanks, " + esc(first) + ". Your plan is being built."
    : "Thanks. Your plan is being built.";

  const videoHtml = renderVideoSection();
  const numbersHtml = await renderNumbersSection();

  return (
    "<!doctype html><html lang=\"en\"><head>" +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex" />' +
    "<title>Thanks — your funnel plan is on its way | Niels Wahlberg</title>" +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />' +
    '<link rel="stylesheet" href="/styles.css" />' +
    "<style>" +
    ".tak-confirm{padding:44px 0 6px}" +
    ".tak-eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 0 10px;font-size:0.8rem;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#101010}" +
    ".tak-confirm h1{font-size:clamp(1.9rem,5vw,2.8rem);line-height:1.05;letter-spacing:-0.04em;margin:0 0 12px}" +
    ".tak-line{max-width:46rem;margin:0;color:var(--muted);font-size:1.05rem;line-height:1.55}" +
    ".tak-book{padding:30px 0 6px}" +
    ".tak-book p{max-width:46rem;margin:0 0 18px;font-size:1.05rem;line-height:1.5}" +
    ".cal-embed{width:100%;min-height:640px;overflow:auto;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,0.5)}" +
    ".tak-skool{text-align:center;padding:22px 0 clamp(60px,8vw,100px)}" +
    ".tak-skool p{margin:0;color:var(--muted);font-size:0.98rem;line-height:1.55}" +
    ".tak-skool a{color:var(--muted);font-weight:700;text-decoration:underline;text-underline-offset:3px}" +
    ".tak-skool a:hover{color:#101010}" +
    "</style></head><body>" +
    '<div class="page">' +
    '<nav class="nav" aria-label="Primary navigation"><div class="container nav-inner">' +
    '<a class="brand" href="/en" aria-label="Niels Wahlberg">' +
    '<span class="brand-mark" aria-hidden="true"></span>' +
    '<span class="brand-text"><span class="brand-name">Niels Wahlberg</span>' +
    '<span class="brand-subtitle">Unedited</span></span></a>' +
    "</div></nav>" +
    '<main id="top">' +
    // 1. Bekræftelse
    '<header class="tak-confirm"><div class="container">' +
    '<p class="tak-eyebrow">✓ Thanks — your answers are in</p>' +
    "<h1>" + heading + "</h1>" +
    '<p class="tak-line">It lands in your inbox in a few minutes. A video from me follows within 48 hours.</p>' +
    "</div></header>" +
    // 2. Video
    videoHtml +
    // 3. Tallene
    numbersHtml +
    // 4. Book a call
    renderBookingSection() +
    // 5. Skool
    '<section class="tak-skool"><div class="container"><p>' +
    'Not ready for a call? <a href="' + esc(SKOOL_URL) + '">Join the community on Skool</a> and follow along.' +
    "</p></div></section>" +
    "</main>" +
    '<footer><div class="container footer-inner">' +
    "<span>Niels Wahlberg</span><span>Terms &amp; Support · Privacy Policy</span>" +
    "</div></footer>" +
    "</div>" +
    calScript() +
    "</body></html>"
  );
}

async function handleThanksPage(req, res) {
  const html = await renderPage(req);
  return sendHtml(res, 200, html, NOINDEX);
}

module.exports = { handleThanksPage };
