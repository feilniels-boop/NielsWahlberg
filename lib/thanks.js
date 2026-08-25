"use strict";

/* ------------------------------------------------------------------
   /en/thanks — server-renderet.
   1) kort bekræftelse med fornavn
   2) tre testimonials (billeder)
   3) to paneler: venstre = dansk kanal-dashboard, højre = Cal.com-widget
      (mobil: testimonials → kalender → dashboard)
   4) Skool-link, stille, nederst
   Video vises kun hvis WELCOME_VIDEO_URL er sat.
------------------------------------------------------------------ */

const db = require("./supabase");
const { esc } = require("./util");
const { sendHtml } = require("./http");
const { leadSlug } = require("./cookies");
const channelCfg = require("./thanks-config");

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };
const CAL_LINK = process.env.CAL_LINK || "niels-feil-3q5gpr/30min";
// Sæt SKOOL_URL til det direkte Skool-link. Er den tom, skjules linket helt.
const SKOOL_URL = (process.env.SKOOL_URL || "").trim();

// Sprogtekster til takkesiden (en = /en/thanks, da = /forretning/tak).
const TT = {
  en: {
    htmlLang: "en",
    title: "Thanks — your funnel plan is on its way | Niels Wahlberg",
    heading: function (first) {
      return first
        ? "Thanks, " + esc(first) + ". Your plan is being built."
        : "Thanks. Your plan is being built.";
    },
    home: "/en",
    calHead: "Book a call",
    calSub: "If you already know you want it built, skip the wait.",
    skool: function (url) {
      return (
        'Not ready for a call? <a href="' +
        esc(url) +
        '">Join the community on Skool</a> and follow along.'
      );
    },
    footer: "Terms &amp; Support · Privacy Policy",
  },
  da: {
    htmlLang: "da",
    title: "Tak — din funnel-plan er på vej | Niels Wahlberg",
    heading: function (first) {
      return first
        ? "Tak, " + esc(first) + ". Din plan er ved at blive bygget."
        : "Tak. Din plan er ved at blive bygget.";
    },
    home: "/",
    calHead: "Book et møde",
    calSub: "Ved du allerede, at du vil have det bygget, så spring ventetiden over.",
    skool: function (url) {
      return (
        'Ikke klar til et møde? <a href="' +
        esc(url) +
        '">Bliv en del af fællesskabet på Skool</a> og følg med.'
      );
    },
    footer: "Vilkår &amp; support · Privatlivspolitik",
  },
};

const TESTIMONIALS = [
  { src: "/images/testimonial-kasper.png", alt: "Testimonial from Kasper, 1:1 client" },
  { src: "/images/testimonial-mikkel.png", alt: "Testimonial from Mikkel, 1:1 client" },
  { src: "/images/testimonial-alfred.png", alt: "Testimonial from Alfred, 1:1 client" },
];

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

// Video-sektion. Tom WELCOME_VIDEO_URL → skjules helt (ingen tom afspiller).
function videoType(url) {
  var u = url.toLowerCase();
  if (u.indexOf(".webm") >= 0) return "video/webm";
  if (u.indexOf(".mov") >= 0) return "video/quicktime";
  if (u.indexOf(".ogg") >= 0 || u.indexOf(".ogv") >= 0) return "video/ogg";
  return "video/mp4";
}
function renderVideoSection() {
  var url = (process.env.WELCOME_VIDEO_URL || "").trim();
  if (!url) return "";
  var poster = (process.env.WELCOME_VIDEO_POSTER || "/hero-niels.png").trim();
  var vtt = (process.env.WELCOME_VIDEO_VTT || "").trim();
  var track = vtt
    ? '<track kind="subtitles" srclang="en" label="English" src="' + esc(vtt) + '" default />'
    : "";
  return (
    '<section class="tak-video"><div class="container">' +
    '<video class="welcome-video" controls preload="none" playsinline poster="' +
    esc(poster) +
    '">' +
    '<source src="' + esc(url) + '" type="' + videoType(url) + '" />' +
    track +
    "</video></div></section>"
  );
}

function renderTestimonials() {
  var cards = TESTIMONIALS.map(function (t) {
    return '<img class="tm-card" src="' + esc(t.src) + '" alt="' + esc(t.alt) + '" loading="lazy" />';
  }).join("");
  return '<section class="tak-tm"><div class="container"><div class="tm-grid">' + cards + "</div></div></section>";
}

// Venstre panel: dansk kanal-dashboard (statiske, verificerede tal).
function renderDanishPanel() {
  var lines = channelCfg.danishChannel.lines
    .map(function (line) {
      return "<li>" + esc(line) + "</li>";
    })
    .join("");
  return (
    '<div class="panel panel-dash">' +
    '<p class="panel-head">' + esc(channelCfg.danishChannel.heading) + "</p>" +
    '<ul class="dash-list">' + lines + "</ul></div>"
  );
}

// Højre panel: Cal.com inline embed (booker direkte på siden).
function renderCalPanel(t) {
  return (
    '<div class="panel panel-cal">' +
    '<p class="panel-head">' + esc(t.calHead) + "</p>" +
    '<p class="panel-sub">' + esc(t.calSub) + "</p>" +
    '<div class="cal-embed" id="my-cal-inline-30min"></div>' +
    "</div>"
  );
}

function calScript() {
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

async function renderPage(req, lang) {
  const t = TT[lang] || TT.en;
  const first = await firstNameFromCookie(req);
  const heading = t.heading(first);

  const videoHtml = renderVideoSection();
  const skoolHtml = SKOOL_URL
    ? '<section class="tak-skool"><div class="container"><p>' +
      t.skool(SKOOL_URL) +
      "</p></div></section>"
    : "";

  return (
    '<!doctype html><html lang="' + t.htmlLang + '"><head>' +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex" />' +
    "<title>" + esc(t.title) + "</title>" +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />' +
    '<link rel="stylesheet" href="/styles.css" />' +
    "<style>" +
    ".tak-confirm{padding:36px 0 4px}" +
    ".tak-confirm h1{font-size:clamp(1.6rem,4vw,2.35rem);line-height:1.08;letter-spacing:-0.035em;margin:0}" +
    ".tak-tm{padding:22px 0 6px}" +
    ".tm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}" +
    ".tm-card{display:block;width:100%;height:auto;border-radius:16px;border:1px solid var(--line)}" +
    "@media (max-width:700px){.tm-grid{grid-template-columns:1fr;gap:12px;max-width:420px;margin:0 auto}}" +
    ".tak-video{padding:18px 0 4px}" +
    ".welcome-video{display:block;width:100%;max-width:560px;margin:0 auto;border-radius:18px;background:#101010;aspect-ratio:16/9}" +
    ".tak-panels-wrap{padding:22px 0 8px}" +
    ".tak-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}" +
    "@media (max-width:700px){.tak-panels{grid-template-columns:1fr}.panel-cal{order:-1}}" +
    ".panel{padding:22px 22px 24px;background:rgba(255,255,255,0.6);border:1px solid var(--line);border-radius:18px}" +
    ".panel-head{margin:0 0 6px;font-size:0.76rem;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:var(--warm,#101010)}" +
    ".panel-sub{margin:0 0 16px;color:var(--muted);font-size:0.95rem;line-height:1.45}" +
    ".panel-dash .panel-head{margin-bottom:16px}" +
    ".dash-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}" +
    ".dash-list li{font-size:1.08rem;font-weight:700;line-height:1.35}" +
    ".cal-embed{width:100%;min-height:600px;overflow:auto;border-radius:14px}" +
    ".tak-skool{text-align:center;padding:22px 0 clamp(60px,8vw,100px)}" +
    ".tak-skool p{margin:0;color:var(--muted);font-size:0.98rem;line-height:1.55}" +
    ".tak-skool a{color:var(--muted);font-weight:700;text-decoration:underline;text-underline-offset:3px}" +
    ".tak-skool a:hover{color:#101010}" +
    "</style></head><body>" +
    '<div class="page">' +
    '<nav class="nav" aria-label="Primary navigation"><div class="container nav-inner">' +
    '<a class="brand" href="' + t.home + '" aria-label="Niels Wahlberg">' +
    '<span class="brand-mark" aria-hidden="true"></span>' +
    '<span class="brand-text"><span class="brand-name">Niels Wahlberg</span>' +
    '<span class="brand-subtitle">Unedited</span></span></a>' +
    "</div></nav>" +
    '<main id="top">' +
    // 1. Kort bekræftelse (kun overskrift)
    '<header class="tak-confirm"><div class="container"><h1>' + heading + "</h1></div></header>" +
    // 2. Testimonials
    renderTestimonials() +
    // (video vises kun hvis sat)
    videoHtml +
    // 3. Paneler: dansk dashboard + Cal-widget
    '<section class="tak-panels-wrap"><div class="container"><div class="tak-panels">' +
    renderDanishPanel() +
    renderCalPanel(t) +
    "</div></div></section>" +
    // 4. Skool
    skoolHtml +
    "</main>" +
    '<footer><div class="container footer-inner">' +
    "<span>Niels Wahlberg</span><span>" + t.footer + "</span>" +
    "</div></footer>" +
    "</div>" +
    calScript() +
    "</body></html>"
  );
}

async function handleThanksPage(req, res, lang) {
  const html = await renderPage(req, lang || "en");
  return sendHtml(res, 200, html, NOINDEX);
}

module.exports = { handleThanksPage };
