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
const channelCfg = require("./thanks-config");

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };
const CAL_LINK = process.env.CAL_LINK || "niels-feil-3q5gpr/30min";
// Sæt SKOOL_URL til det direkte Skool-link. Er den tom, skjules linket helt
// (et dødt link til skool.com's forside er værre end intet link).
const SKOOL_URL = (process.env.SKOOL_URL || "").trim();

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

// Video-sektion. Er WELCOME_VIDEO_URL tom, skjules hele sektionen (ingen
// tom afspiller). Ellers: almindeligt <video>, poster med Niels' ansigt,
// controls, ingen autoplay, lazy (preload="none"), undertekster default on
// hvis en VTT-fil er sat.
function videoType(url) {
  var u = url.toLowerCase();
  if (u.indexOf(".webm") >= 0) return "video/webm";
  if (u.indexOf(".mov") >= 0) return "video/quicktime";
  if (u.indexOf(".ogg") >= 0 || u.indexOf(".ogv") >= 0) return "video/ogg";
  return "video/mp4";
}
function renderVideoSection() {
  var url = (process.env.WELCOME_VIDEO_URL || "").trim();
  if (!url) return ""; // ingen video sat → skjul sektionen helt
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

/* ---- Tallene (trin 3) ---- */
const NUMBERS_TTL_MS = 5 * 60 * 1000; // cache i mindst 5 minutter
let numbersCache = { at: 0, data: null };

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString("en-US") : String(n);
}

function startDate() {
  const raw = (process.env.CHANNEL_START_DATE || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function dayNumber() {
  const s = startDate();
  if (!s) return null;
  const n = Math.floor((Date.now() - s.getTime()) / 86400000) + 1;
  return n > 0 ? n : 1;
}

function formatStartDate() {
  const s = startDate();
  if (!s) return null;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[s.getUTCMonth()] + " " + s.getUTCDate() + ", " + s.getUTCFullYear();
}

// Hent tal (cachet). channel_stats kan være null (tabellen tom).
async function getNumbers() {
  if (numbersCache.data && Date.now() - numbersCache.at < NUMBERS_TTL_MS) {
    return numbersCache.data;
  }
  // "plans requested" = alle leads (ikke kun afsendte mails), så den der
  // netop har udfyldt formularen ser sig selv i tallet med det samme.
  const [plans, calls, clients, stats] = await Promise.all([
    db.countRows("/leads"),
    db.countRows("/leads?status=eq.booked"),
    db.countRows("/leads?status=eq.closed"),
    db.latestChannelStats(),
  ]);
  const data = { plans: plans, calls: calls, clients: clients, stats: stats };
  numbersCache = { at: Date.now(), data: data };
  return data;
}

function row(value, label) {
  return (
    '<li><span class="num-v">' + esc(fmt(value)) + '</span> ' +
    '<span class="num-l">' + esc(label) + "</span></li>"
  );
}

async function renderNumbersSection() {
  let n;
  try {
    n = await getNumbers();
  } catch (e) {
    console.error("Thanks: kunne ikke hente tal:", e && e.message);
    return ""; // hellere ingen sektion end en halv/fejlende
  }

  const L = channelCfg.englishChannel.labels;
  const dn = dayNumber();
  const rightHeading =
    channelCfg.englishChannel.heading + (dn != null ? ", day " + dn : "");

  // Højre kolonne: video/visninger KUN hvis channel_stats findes.
  let right = "";
  if (n.stats) {
    right += row(n.stats.videos, L.videos);
    right += row(n.stats.views, L.views);
  }
  right += row(n.plans, L.plans);
  right += row(n.calls, L.calls);
  right += row(n.clients, L.clients);

  const left = channelCfg.danishChannel.lines
    .map(function (line) {
      return '<li><span class="num-static">' + esc(line) + "</span></li>";
    })
    .join("");

  const startFmt = formatStartDate();
  const foot = startFmt
    ? channelCfg.footnoteWithDate.replace("{date}", startFmt)
    : channelCfg.footnoteNoDate;

  return (
    '<section class="tak-numbers"><div class="container">' +
    '<div class="num-cols">' +
    '<div class="num-col"><p class="num-head">' + esc(channelCfg.danishChannel.heading) + "</p>" +
    '<ul class="num-list">' + left + "</ul></div>" +
    '<div class="num-col"><p class="num-head">' + esc(rightHeading) + "</p>" +
    '<ul class="num-list">' + right + "</ul></div>" +
    "</div>" +
    '<p class="num-foot">' + esc(foot) + "</p>" +
    "</div></section>"
  );
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
    ".tak-video{padding:26px 0 8px}" +
    ".welcome-video{display:block;width:100%;max-width:560px;margin:0 auto;border-radius:18px;background:#101010;aspect-ratio:16/9}" +
    ".tak-numbers{padding:30px 0}" +
    ".num-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}" +
    "@media (max-width:600px){.num-cols{grid-template-columns:1fr}}" +
    ".num-col{padding:22px 22px 24px;background:rgba(255,255,255,0.6);border:1px solid var(--line);border-radius:18px}" +
    ".num-head{margin:0 0 14px;font-size:0.76rem;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:var(--warm,#101010)}" +
    ".num-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}" +
    ".num-list li{line-height:1.3}" +
    ".num-v{font-size:1.5rem;font-weight:900;letter-spacing:-0.02em}" +
    ".num-l{color:var(--muted);font-size:0.98rem;font-weight:600}" +
    ".num-static{font-size:1.05rem;font-weight:700}" +
    ".num-foot{margin:18px 0 0;color:var(--muted);font-size:0.95rem;line-height:1.5}" +
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
    // 5. Skool (skjules hvis SKOOL_URL ikke er sat)
    (SKOOL_URL
      ? '<section class="tak-skool"><div class="container"><p>' +
        'Not ready for a call? <a href="' + esc(SKOOL_URL) + '">Join the community on Skool</a> and follow along.' +
        "</p></div></section>"
      : "") +
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
