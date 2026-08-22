"use strict";

const db = require("./supabase");
const claude = require("./claude");
const { esc } = require("./util");
const { sendHtml } = require("./http");

// PLACEHOLDER BOOKING URL — udskift med den rigtige Cal.com-URL.
const BOOKING_URL = process.env.BOOKING_URL || "https://cal.com/nielswahlberg";

/* ------------------------------------------------------------------
   Generér plan for et lead (kaldes i baggrunden fra /api/quiz).
------------------------------------------------------------------ */
function autoSendOn() {
  const v = String(process.env.AUTO_SEND_MAIL1 || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function generateForLead(lead) {
  const result = await claude.generatePlan(lead);
  const updated = await db.updateLead(lead.id, {
    plan: result.plan,
    talking_points: result.talking_points || [],
    status: "generated",
    generated_at: new Date().toISOString(),
  });
  console.log("Plan genereret for lead " + lead.id + " (" + lead.slug + ").");

  // Auto-send af mail 1 er som standard FRA — godkendes manuelt i admin.
  // Slå til med AUTO_SEND_MAIL1=1 når du er klar.
  if (autoSendOn()) {
    try {
      const emails = require("./emails");
      await emails.sendMail1(updated || lead);
      await db.updateLead(lead.id, {
        mail1_sent_at: new Date().toISOString(),
        status: "mail1_sent",
      });
      console.log("Mail 1 auto-sendt til lead " + lead.id + ".");
    } catch (e) {
      console.error("Auto-send af mail 1 fejlede:", e && e.message);
    }
  }
}

/* ------------------------------------------------------------------
   /plan/[slug] — render planen.
------------------------------------------------------------------ */
function minutesBetween(a, b) {
  const t1 = a ? new Date(a).getTime() : NaN;
  const t2 = b ? new Date(b).getTime() : NaN;
  if (isNaN(t1) || isNaN(t2)) return null;
  return Math.max(0, Math.round((t2 - t1) / 60000));
}

function builtLine(lead) {
  const n = minutesBetween(lead.created_at, lead.generated_at);
  if (n == null) return "";
  if (n <= 1) return "This page was built less than a minute after you filled in the form.";
  return "This page was built " + n + " minutes after you filled in the form.";
}

// Loom (og lignende) share-URL → embed-URL.
function embedUrl(url) {
  const u = String(url || "").trim();
  const m = u.match(/loom\.com\/share\/([a-z0-9]+)/i);
  if (m) return "https://www.loom.com/embed/" + m[1];
  return u; // brug som den er (fx allerede en embed-URL)
}

function renderVideo(lead) {
  if (!lead.loom_url) return "";
  return (
    '<div class="plan-video"><div class="plan-video-frame">' +
    '<iframe src="' + esc(embedUrl(lead.loom_url)) + '" frameborder="0" ' +
    'allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>' +
    "</div></div>"
  );
}

function renderFunnel(funnel) {
  if (!Array.isArray(funnel) || !funnel.length) return "";
  const items = funnel
    .map(function (s, i) {
      return (
        '<li><span class="plan-step-n">' + (i + 1) + "</span>" +
        '<div><strong>' + esc(s && s.step) + "</strong>" +
        "<p>" + esc(s && s.detail) + "</p></div></li>"
      );
    })
    .join("");
  return '<ol class="plan-funnel">' + items + "</ol>";
}

function renderTitles(titles) {
  if (!Array.isArray(titles) || !titles.length) return "";
  return (
    '<ul class="plan-titles">' +
    titles
      .map(function (t) {
        return "<li>" + esc(t) + "</li>";
      })
      .join("") +
    "</ul>"
  );
}

function block(kicker, title, inner) {
  return (
    '<section class="plan-block"><p class="plan-kicker">' + esc(kicker) + "</p>" +
    (title ? "<h2>" + esc(title) + "</h2>" : "") +
    inner +
    "</section>"
  );
}

function renderPlanPage(lead) {
  const plan = lead.plan || {};
  const name = lead.name ? esc(lead.name.split(/\s+/)[0]) : "there";
  const parts = [];

  parts.push(renderVideo(lead));

  parts.push(block("Your situation", "", "<p>" + esc(plan.situation) + "</p>"));
  parts.push(block("The diagnosis", "", "<p>" + esc(plan.diagnosis) + "</p>"));
  parts.push(block("The funnel I'd build for you", "", renderFunnel(plan.funnel)));
  parts.push(block("Three videos you could film this week", "", renderTitles(plan.video_titles)));
  parts.push(block("What I'd build first", "", "<p>" + esc(plan.build_first) + "</p>"));
  parts.push(
    block(
      "Price & next step",
      "",
      "<p>" + esc(plan.price_and_booking) + "</p>" +
        '<a class="btn btn-primary plan-book" href="' + esc(BOOKING_URL) + '">Book a call</a>'
    )
  );

  const built = builtLine(lead);

  return (
    "<!doctype html><html lang=\"en\"><head>" +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex" />' +
    "<title>Your funnel plan | Niels Wahlberg</title>" +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />' +
    '<link rel="stylesheet" href="/styles.css" />' +
    "<style>" +
    ".plan-wrap{width:min(720px,calc(100% - 40px));margin:0 auto;padding:48px 0 96px}" +
    ".plan-head{padding:8px 0 8px}.plan-head h1{font-size:clamp(1.9rem,5vw,2.8rem);letter-spacing:-0.04em;line-height:1.05;margin:0 0 10px}" +
    ".plan-built{color:var(--muted);font-size:0.9rem;font-weight:700;margin:0 0 8px}" +
    ".plan-video{margin:22px 0 8px}.plan-video-frame{position:relative;padding-top:56.25%;border-radius:18px;overflow:hidden;background:#101010}" +
    ".plan-video-frame iframe{position:absolute;inset:0;width:100%;height:100%}" +
    ".plan-block{padding:26px 0;border-top:1px solid var(--line)}" +
    ".plan-kicker{font-size:0.76rem;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:var(--warm);margin:0 0 10px}" +
    ".plan-block p{font-size:1.05rem;line-height:1.6;color:var(--text);margin:0 0 12px}" +
    ".plan-funnel{list-style:none;margin:0;padding:0;display:grid;gap:16px}" +
    ".plan-funnel li{display:flex;gap:14px;align-items:flex-start}" +
    ".plan-step-n{flex:0 0 auto;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#101010;color:#fff;font-weight:900;font-size:0.85rem}" +
    ".plan-funnel strong{display:block;margin-bottom:2px}.plan-funnel p{margin:0;color:var(--muted);font-size:1rem}" +
    ".plan-titles{margin:0;padding:0;list-style:none;display:grid;gap:10px}" +
    ".plan-titles li{padding:14px 16px;background:rgba(255,255,255,0.66);border:1px solid var(--line);border-radius:14px;font-weight:700}" +
    ".plan-book{margin-top:10px}" +
    "</style></head><body>" +
    '<div class="plan-wrap">' +
    '<header class="plan-head">' +
    (built ? '<p class="plan-built">' + esc(built) + "</p>" : "") +
    "<h1>" + name + ", here's the funnel I'd build for you.</h1>" +
    "</header>" +
    parts.join("") +
    "</div></body></html>"
  );
}

function renderPendingPage(lead) {
  const name = lead.name ? esc(lead.name.split(/\s+/)[0]) : "there";
  return (
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" />" +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex" /><meta http-equiv="refresh" content="20" />' +
    "<title>Your funnel plan | Niels Wahlberg</title>" +
    '<link rel="stylesheet" href="/styles.css" />' +
    "<style>.plan-wrap{width:min(620px,calc(100% - 40px));margin:0 auto;padding:80px 0}" +
    ".plan-wrap h1{font-size:2rem;letter-spacing:-0.03em;margin:0 0 12px}" +
    ".plan-wrap p{color:var(--muted);font-size:1.05rem;line-height:1.6}</style></head><body>" +
    '<div class="plan-wrap"><h1>' + name + ", your plan is being written.</h1>" +
    "<p>Give it a minute — this page refreshes automatically. Your plan also lands " +
    "in your inbox shortly, with a personal video from me within 48 hours.</p></div></body></html>"
  );
}

async function handlePlanPage(req, res, slug) {
  let lead;
  try {
    lead = await db.getLeadBySlug(slug);
  } catch (e) {
    console.error("Plan-opslag fejlede:", e && e.message);
    return sendHtml(res, 500, "<h1>Something went wrong</h1>");
  }
  if (!lead) return sendHtml(res, 404, "<h1>Not found</h1>");

  // Log visning (fire and forget).
  db.logPageView({
    lead_id: lead.id,
    slug: lead.slug,
    referrer: (req.headers && req.headers.referer) || null,
    user_agent: (req.headers && req.headers["user-agent"]) || null,
  }).catch(function (e) {
    console.error("page_view-logning fejlede:", e && e.message);
  });

  if (!lead.plan) return sendHtml(res, 200, renderPendingPage(lead));
  return sendHtml(res, 200, renderPlanPage(lead));
}

module.exports = { generateForLead, handlePlanPage };
