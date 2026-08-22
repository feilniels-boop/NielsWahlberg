"use strict";

/* ------------------------------------------------------------------
   Funnel-mails (1/2/3). Skabeloner læses fra mails.md; afsendelse via
   lib/mailer.js (Resend, eget domæne). Ren tekst, ingen billeder.
------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const mailer = require("./mailer");

let TEMPLATES = null;

function parseTemplates(md) {
  const out = {};
  // Split på "## MAIL N ..." — parts: [preamble, "1", body1, "2", body2, ...]
  const parts = md.split(/^##\s*MAIL\s*(\d)[^\n]*$/gm);
  for (let i = 1; i < parts.length; i += 2) {
    const num = parts[i];
    const body = parts[i + 1] || "";
    const m = body.match(/^\s*Subject:\s*(.+)\s*$/m);
    const subject = m ? m[1].trim() : "";
    let text = body;
    if (m) text = body.slice(body.indexOf(m[0]) + m[0].length);
    // Fjern en evt. afsluttende "---" separator og trim.
    text = text.replace(/\n---\s*$/, "").replace(/^\s+/, "").replace(/\s+$/, "");
    out["mail" + num] = { subject: subject, text: text };
  }
  return out;
}

function templates() {
  if (TEMPLATES == null) {
    const md = fs.readFileSync(path.join(__dirname, "..", "mails.md"), "utf8");
    TEMPLATES = parseTemplates(md);
  }
  return TEMPLATES;
}

function fill(str, vars) {
  return String(str).replace(/\{\{(\w+)\}\}/g, function (_, k) {
    return vars[k] != null ? vars[k] : "";
  });
}

function varsFor(lead) {
  const base = (process.env.SITE_URL || "https://nielswahlberg.dk").replace(/\/+$/, "");
  const booking = process.env.BOOKING_URL || "https://cal.com/nielswahlberg";
  return {
    name: lead.name || "",
    first_name: (lead.name || "there").split(/\s+/)[0],
    plan_url: base + "/plan/" + lead.slug,
    booking_url: booking,
  };
}

async function send(key, lead) {
  if (!lead || !lead.email) throw new Error("Lead mangler e-mail.");
  const tpl = templates()[key];
  if (!tpl) throw new Error("Skabelon " + key + " findes ikke i mails.md.");
  const vars = varsFor(lead);
  return mailer.sendEmail({
    to: lead.email,
    subject: fill(tpl.subject, vars),
    text: fill(tpl.text, vars),
    replyTo: process.env.NOTIFY_EMAIL || undefined,
  });
}

function sendMail1(lead) {
  return send("mail1", lead);
}
function sendMail2(lead) {
  return send("mail2", lead);
}
function sendMail3(lead) {
  return send("mail3", lead);
}

module.exports = { sendMail1, sendMail2, sendMail3, parseTemplates, _templates: templates };
