"use strict";

/* ------------------------------------------------------------------
   Supabase-adgang server-side via PostgREST.
   Bruger SERVICE_ROLE_KEY (bypasser RLS) — må ALDRIG sendes til klienten.
   Nøgler læses fra miljøet (se .env.example).
------------------------------------------------------------------ */

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase er ikke konfigureret (mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function headers(extra) {
  const { key } = config();
  const h = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  };
  if (extra) for (const k in extra) h[k] = extra[k];
  return h;
}

async function rest(pathAndQuery, opts) {
  const { url } = config();
  const resp = await fetch(url + "/rest/v1" + pathAndQuery, opts);
  if (!resp.ok) {
    const text = await resp.text().catch(function () {
      return "";
    });
    const err = new Error("Supabase " + resp.status + ": " + text.slice(0, 300));
    err.status = resp.status;
    throw err;
  }
  // 204 (return=minimal) har ingen body.
  const raw = await resp.text();
  return raw ? JSON.parse(raw) : null;
}

// Indsæt ét lead. Returnerer den indsatte række (med id + created_at).
async function insertLead(row) {
  const rows = await rest("/leads", {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// Findes slug'en allerede? (til at sikre unikhed før insert)
async function slugExists(slug) {
  const rows = await rest(
    "/leads?slug=eq." + encodeURIComponent(slug) + "&select=id&limit=1",
    { method: "GET", headers: headers() }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function getLeadBySlug(slug) {
  const rows = await rest(
    "/leads?slug=eq." + encodeURIComponent(slug) + "&select=*&limit=1",
    { method: "GET", headers: headers() }
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getLeadById(id) {
  const rows = await rest("/leads?id=eq." + encodeURIComponent(id) + "&select=*&limit=1", {
    method: "GET",
    headers: headers(),
  });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// Opdater et lead. Returnerer den opdaterede række.
async function updateLead(id, patch) {
  const rows = await rest("/leads?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function logPageView(row) {
  await rest("/page_views", {
    method: "POST",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  });
}

// Leads der skal have mail 3: mindst 4 dage gamle, har fået mail 2,
// har ikke fået mail 3, og er ikke booket.
async function leadsDueForMail3(cutoffIso) {
  const q =
    "/leads?select=*" +
    "&created_at=lte." +
    encodeURIComponent(cutoffIso) +
    "&mail2_sent_at=not.is.null" +
    "&mail3_sent_at=is.null" +
    "&status=neq.booked" +
    "&order=created_at.asc" +
    "&limit=200";
  const rows = await rest(q, { method: "GET", headers: headers() });
  return Array.isArray(rows) ? rows : [];
}

// Tæl rækker via PostgREST Content-Range (count=exact). query fx "/leads?status=eq.booked".
async function countRows(query) {
  const { url } = config();
  const sep = query.indexOf("?") >= 0 ? "&" : "?";
  const resp = await fetch(url + "/rest/v1" + query + sep + "select=id", {
    method: "GET",
    headers: headers({ Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" }),
  });
  if (!resp.ok && resp.status !== 206) {
    const t = await resp.text().catch(function () {
      return "";
    });
    throw new Error("Supabase count " + resp.status + ": " + t.slice(0, 200));
  }
  const cr = resp.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

// Nyeste kanal-tal-række (eller null hvis tabellen er tom).
async function latestChannelStats() {
  const rows = await rest(
    "/channel_stats?select=videos,views,subscribers&order=recorded_at.desc,id.desc&limit=1",
    { method: "GET", headers: headers() }
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// Simpelt "er databasen i live"-kald (holder gratisplanen aktiv).
async function ping() {
  await rest("/leads?select=id&limit=1", { method: "GET", headers: headers() });
}

module.exports = {
  insertLead,
  slugExists,
  getLeadBySlug,
  getLeadById,
  updateLead,
  logPageView,
  leadsDueForMail3,
  countRows,
  latestChannelStats,
  ping,
};
