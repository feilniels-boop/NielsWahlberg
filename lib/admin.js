"use strict";

const db = require("./supabase");
const { esc, safeEqual } = require("./util");
const { readBody, sendHtml, sendJson } = require("./http");
const { PRICE_LABELS, SITUATION_LABELS } = require("./claude");

/* ------------------------------------------------------------------
   /admin/lead/[id] — beskyttet med ét kodeord (ADMIN_PASSWORD) via
   HTTP Basic Auth. Intet brugersystem. Er ADMIN_PASSWORD ikke sat,
   nægtes al adgang (aldrig åben som standard).
------------------------------------------------------------------ */
function requireAuth(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    sendHtml(res, 500, "<h1>Admin er ikke konfigureret (mangler ADMIN_PASSWORD).</h1>");
    return false;
  }
  const header = req.headers && req.headers.authorization;
  if (header && /^Basic /i.test(header)) {
    let decoded = "";
    try {
      decoded = Buffer.from(header.replace(/^Basic /i, ""), "base64").toString("utf8");
    } catch (e) {}
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(pass, expected)) return true;
  }
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Niels admin", charset="UTF-8"',
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end("<h1>401 — kodeord kræves</h1>");
  return false;
}

function labelFor(lead) {
  return {
    situation: SITUATION_LABELS[lead.situation] || lead.situation || "?",
    price: PRICE_LABELS[lead.price] || lead.price || "?",
  };
}

function fmtTs(ts) {
  return ts ? esc(ts) : "—";
}

function renderAnswers(lead) {
  const arr = Array.isArray(lead.answers) ? lead.answers : [];
  if (!arr.length) return "<p>(ingen svar gemt)</p>";
  return (
    '<table class="kv">' +
    arr
      .map(function (a) {
        return (
          "<tr><th>" + esc(a.question || a.id) + "</th><td>" +
          esc((a.display && String(a.display)) || "(tomt)") + "</td></tr>"
        );
      })
      .join("") +
    "</table>"
  );
}

function renderTalking(lead) {
  const tp = lead.talking_points;
  if (!Array.isArray(tp) || !tp.length) return "<p>(ingen endnu)</p>";
  return "<ul>" + tp.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
}

function banner(q) {
  const ok = {
    saved: "Gemt.",
    mail1: "Mail 1 sendt.",
    mail2: "Mail 2 sendt.",
    booked: "Markeret som booket.",
  };
  if (q.ok && ok[q.ok]) return '<div class="flash ok">' + esc(ok[q.ok]) + "</div>";
  if (q.err) return '<div class="flash err">' + esc(q.err) + "</div>";
  return "";
}

function renderPage(lead, opts) {
  opts = opts || {};
  const l = labelFor(lead);
  const planText =
    opts.planText != null
      ? opts.planText
      : lead.plan
      ? JSON.stringify(lead.plan, null, 2)
      : "";
  const loomText = opts.loomText != null ? opts.loomText : lead.loom_url || "";
  const siteBase = (process.env.SITE_URL || "").replace(/\/+$/, "");
  const planLink = (siteBase || "") + "/plan/" + lead.slug;

  return (
    "<!doctype html><html lang=\"da\"><head><meta charset=\"utf-8\" />" +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex" />' +
    "<title>Admin — " + esc(lead.name || lead.slug) + "</title>" +
    "<style>" +
    "body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:820px;margin:0 auto;padding:24px 18px 80px;color:#111;line-height:1.5}" +
    "h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.05rem;margin:26px 0 8px;border-top:1px solid #e5e0d8;padding-top:18px}" +
    "a{color:#0645ad}.muted{color:#666;font-size:0.9rem}" +
    "table.kv{border-collapse:collapse;width:100%}table.kv th{text-align:left;vertical-align:top;width:38%;padding:6px 10px 6px 0;color:#444;font-weight:600}" +
    "table.kv td{padding:6px 0;border-bottom:1px solid #f0ece4}" +
    "textarea,input[type=text]{width:100%;box-sizing:border-box;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.9rem;padding:10px;border:1px solid #ccc;border-radius:8px}" +
    "textarea{min-height:320px}label{display:block;font-weight:600;margin:14px 0 6px}" +
    ".row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}" +
    "button{font:inherit;font-weight:700;padding:11px 16px;border-radius:8px;border:1px solid #111;background:#111;color:#fff;cursor:pointer}" +
    "button.sec{background:#fff;color:#111}" +
    ".flash{padding:10px 14px;border-radius:8px;margin:12px 0}.flash.ok{background:#e7f6e7;border:1px solid #9ad19a}.flash.err{background:#fde8e8;border:1px solid #f0a3a3}" +
    ".status{display:inline-block;padding:2px 10px;border-radius:999px;background:#eee;font-size:0.85rem;font-weight:700}" +
    "ul{margin:6px 0;padding-left:20px}" +
    "</style></head><body>" +
    banner(opts.query || {}) +
    "<h1>" + esc(lead.name || "(uden navn)") + "</h1>" +
    '<p class="muted">' + esc(lead.email || "") + (lead.phone ? " · " + esc(lead.phone) : "") +
    (lead.company ? " · " + esc(lead.company) : "") + "</p>" +
    '<p><span class="status">' + esc(lead.status || "?") + "</span> " +
    'lead #' + esc(lead.id) + " · slug " + esc(lead.slug) + " · " +
    '<a href="' + esc(planLink) + '" target="_blank" rel="noopener">åbn plan-side ↗</a></p>' +

    "<h2>Formularsvar</h2>" + renderAnswers(lead) +
    '<table class="kv"><tr><th>Situation</th><td>' + esc(l.situation) + "</td></tr>" +
    "<tr><th>Pris</th><td>" + esc(l.price) + "</td></tr>" +
    "<tr><th>Readiness</th><td>" + esc(lead.readiness != null ? lead.readiness : "?") + "</td></tr>" +
    "<tr><th>Nyhedsbrev</th><td>" + (lead.newsletter ? "Ja" : "Nej") + "</td></tr></table>" +

    "<h2>Talking points (til din video)</h2>" + renderTalking(lead) +

    "<h2>Tidslinje</h2>" +
    '<table class="kv">' +
    "<tr><th>Oprettet</th><td>" + fmtTs(lead.created_at) + "</td></tr>" +
    "<tr><th>Plan genereret</th><td>" + fmtTs(lead.generated_at) + "</td></tr>" +
    "<tr><th>Mail 1 sendt</th><td>" + fmtTs(lead.mail1_sent_at) + "</td></tr>" +
    "<tr><th>Mail 2 sendt</th><td>" + fmtTs(lead.mail2_sent_at) + "</td></tr>" +
    "<tr><th>Mail 3 sendt</th><td>" + fmtTs(lead.mail3_sent_at) + "</td></tr>" +
    "<tr><th>Booket</th><td>" + fmtTs(lead.booked_at) + "</td></tr></table>" +

    "<h2>Rediger & send</h2>" +
    '<form method="POST">' +
    '<label for="loom">Loom-URL (vises øverst på plan-siden)</label>' +
    '<input type="text" id="loom" name="loom_url" value="' + esc(loomText) + '" placeholder="https://www.loom.com/share/..." />' +
    '<label for="plan">Plan (rå JSON — kan redigeres før afsendelse)</label>' +
    '<textarea id="plan" name="plan">' + esc(planText) + "</textarea>" +
    '<div class="row">' +
    '<button type="submit" name="action" value="save" class="sec">Gem</button>' +
    '<button type="submit" name="action" value="mail1">Send mail 1</button>' +
    '<button type="submit" name="action" value="mail2">Send mail 2</button>' +
    '<button type="submit" name="action" value="booked" class="sec">Markér booket</button>' +
    "</div></form>" +
    "</body></html>"
  );
}

async function handleAdminLead(req, res, id, query) {
  if (!requireAuth(req, res)) return;

  let lead;
  try {
    lead = await db.getLeadById(id);
  } catch (e) {
    console.error("Admin-opslag fejlede:", e && e.message);
    return sendHtml(res, 500, "<h1>Fejl ved opslag</h1>");
  }
  if (!lead) return sendHtml(res, 404, "<h1>Lead ikke fundet</h1>");

  if (req.method === "GET") {
    return sendHtml(res, 200, renderPage(lead, { query: query || {} }));
  }

  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "GET, POST" });
    res.end("Method Not Allowed");
    return;
  }

  // POST: gem ændringer og evt. udfør handling.
  let raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return sendHtml(res, 400, "<h1>Ugyldig forespørgsel</h1>");
  }
  const form = new URLSearchParams(raw);
  const action = form.get("action") || "save";
  const loomText = (form.get("loom_url") || "").trim();
  const planText = form.get("plan") || "";

  // Valider plan-JSON hvis feltet ikke er tomt.
  let planObj = lead.plan || null;
  if (planText.trim()) {
    try {
      planObj = JSON.parse(planText);
    } catch (e) {
      return sendHtml(
        res,
        200,
        renderPage(lead, {
          planText: planText,
          loomText: loomText,
          query: { err: "Plan er ikke gyldig JSON: " + (e && e.message) },
        })
      );
    }
  }

  const patch = { loom_url: loomText || null, plan: planObj };
  const nowIso = new Date().toISOString();
  let redirectOk = "saved";

  try {
    if (action === "mail1" || action === "mail2") {
      // Gem først, så redigeringer er med i mailen.
      const saved = await db.updateLead(id, patch);
      const emails = require("./emails");
      const fresh = saved || lead;
      if (action === "mail1") {
        await emails.sendMail1(fresh);
        await db.updateLead(id, { mail1_sent_at: nowIso, status: "mail1_sent" });
        redirectOk = "mail1";
      } else {
        await emails.sendMail2(fresh);
        await db.updateLead(id, { mail2_sent_at: nowIso, status: "mail2_sent" });
        redirectOk = "mail2";
      }
    } else if (action === "booked") {
      await db.updateLead(id, Object.assign({}, patch, { status: "booked", booked_at: nowIso }));
      redirectOk = "booked";
    } else {
      await db.updateLead(id, patch);
      redirectOk = "saved";
    }
  } catch (e) {
    console.error("Admin-handling fejlede:", e && e.message);
    return sendHtml(
      res,
      200,
      renderPage(lead, {
        planText: planText,
        loomText: loomText,
        query: { err: "Handling fejlede: " + (e && e.message) },
      })
    );
  }

  // PRG: redirect tilbage til GET.
  res.writeHead(303, { Location: "/admin/lead/" + encodeURIComponent(id) + "?ok=" + redirectOk });
  res.end();
}

// Manuel kørsel af det daglige job (test/backup) — beskyttet.
async function handleRunCron(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    const cron = require("./cron");
    const result = await cron.runDailyJob();
    return sendJson(res, 200, { ok: true, result: result });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: (e && e.message) || "fejl" });
  }
}

module.exports = { handleAdminLead, handleRunCron };
