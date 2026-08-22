"use strict";

const { readJson, sendJson } = require("./http");
const { slugify, randomToken } = require("./util");
const db = require("./supabase");
const mailer = require("./mailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Find ét svar i det strukturerede answers-array.
function findAnswer(answers, id) {
  if (!Array.isArray(answers)) return null;
  for (let i = 0; i < answers.length; i++) if (answers[i] && answers[i].id === id) return answers[i];
  return null;
}
function choiceKey(answers, id) {
  const a = findAnswer(answers, id);
  return a && a.value && a.value.key ? a.value.key : null;
}
function scaleValue(answers, id) {
  const a = findAnswer(answers, id);
  const n = a ? parseInt(a.value, 10) : NaN;
  return isNaN(n) ? null : n;
}

// Byg en unik slug. Slug'en er DEN eneste adgangskontrol på /plan/[slug],
// og siden indeholder persondata — derfor 16 kryptografisk tilfældige tegn
// (~80 bit, reelt ugætteligt). Firmanavnet foran er kun for læsbarhed og
// tilføjer ikke entropi.
const SLUG_RANDOM_LEN = 16;
async function makeUniqueSlug(company, name) {
  let base = slugify(company);
  if (!base) base = slugify(String(name || "").split(/\s+/)[0]);
  if (!base) base = "lead";
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = base + "-" + randomToken(SLUG_RANDOM_LEN);
    // eslint-disable-next-line no-await-in-loop
    if (!(await db.slugExists(slug))) return slug;
  }
  // Ekstremt usandsynligt — fald tilbage til endnu længere token.
  return base + "-" + randomToken(24);
}

async function handleQuiz(req, res) {
  let data;
  try {
    data = await readJson(req);
  } catch (e) {
    if (e.code === "TOO_BIG") return sendJson(res, 413, { ok: false, error: "For stor forespørgsel" });
    return sendJson(res, 400, { ok: false, error: "Ugyldig forespørgsel" });
  }

  // Honeypot: udfyldt = bot. Svar OK uden at gemme, så botten intet lærer.
  if (data.hp && String(data.hp).trim() !== "") {
    console.log("Honeypot udløst i /api/quiz — gemmer IKKE lead.");
    return sendJson(res, 200, { ok: true });
  }

  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const contact = data.contact || {};
  const company = String(contact.company || "").trim();
  const phone = String(data.phone || contact.phone || "").trim();

  if (!name || !email || !EMAIL_RE.test(email)) {
    return sendJson(res, 400, { ok: false, error: "Manglende eller ugyldige felter" });
  }

  const answers = Array.isArray(data.answers) ? data.answers : [];

  let slug;
  let lead;
  try {
    slug = await makeUniqueSlug(company, name);
    lead = await db.insertLead({
      slug: slug,
      source: data.source || "funnel-en",
      name: name,
      company: company || null,
      email: email,
      phone: phone || null,
      newsletter: !!data.newsletter,
      answers: answers,
      situation: choiceKey(answers, "situation"),
      price: choiceKey(answers, "price"),
      readiness: scaleValue(answers, "readiness"),
      status: "new",
    });
  } catch (err) {
    console.error("Kunne ikke gemme lead:", err && err.message);
    return sendJson(res, 502, { ok: false, error: "Kunne ikke gemme dine svar" });
  }

  // Svar til brugeren med det samme — resten sker i baggrunden, så
  // submit hverken venter på mail eller Claude, og ikke fejler hvis de gør.
  sendJson(res, 200, { ok: true });

  // Notifikation til Niels (fire and forget).
  mailer.notifyNewLead(lead).catch(function (e) {
    console.error("Notifikation fejlede:", e && e.message);
  });

  // Plan-generering (Claude) kobles på i trin 4.
  try {
    const plan = require("./plan");
    plan.generateForLead(lead).catch(function (e) {
      console.error("Plan-generering fejlede:", e && e.message);
    });
  } catch (e) {
    // plan-modulet findes endnu ikke (før trin 4) — det er ok.
  }
}

module.exports = { handleQuiz, makeUniqueSlug };
