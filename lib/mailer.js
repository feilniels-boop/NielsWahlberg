"use strict";

/* ------------------------------------------------------------------
   Afsendelse via Resend. Fra eget domæne (MAIL_FROM), aldrig no-reply.
   Notifikation til Niels (NOTIFY_EMAIL). Selve lead-mailene (1/2/3)
   ligger i lib/emails.js og bygger oven på sendEmail() herfra.
------------------------------------------------------------------ */

function siteUrl() {
  return (process.env.SITE_URL || "https://nielswahlberg.dk").replace(/\/+$/, "");
}

// Kerne-afsendelse. text = ren tekst (mail 1 og 3 skal være ren tekst).
async function sendEmail(opts) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey) throw new Error("Mangler RESEND_API_KEY.");
  if (!from) throw new Error("Mangler MAIL_FROM (afsender på eget domæne).");
  if (!opts || !opts.to || !opts.subject) throw new Error("sendEmail: to/subject mangler.");

  const payload = {
    from: from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
  };
  if (opts.text != null) payload.text = opts.text;
  if (opts.html != null) payload.html = opts.html;
  if (opts.replyTo) payload.reply_to = opts.replyTo;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(function () {
      return "";
    });
    throw new Error("Resend " + resp.status + ": " + t.slice(0, 300));
  }
  return resp.json().catch(function () {
    return {};
  });
}

// Notifikation til Niels når et nyt lead lander.
async function notifyNewLead(lead) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) throw new Error("Mangler NOTIFY_EMAIL.");
  const base = siteUrl();
  const lines = [
    "Nyt funnel-lead: " + (lead.name || "(uden navn)"),
    "",
    "Firma/website: " + (lead.company || "(ikke oplyst)"),
    "E-mail: " + (lead.email || "(ikke oplyst)"),
    "Telefon/WhatsApp: " + (lead.phone || "(ikke oplyst)"),
    "Nyhedsbrev: " + (lead.newsletter ? "Ja" : "Nej"),
    "",
    "Plan-side: " + base + "/plan/" + lead.slug,
    "Admin: " + base + "/admin/lead/" + lead.id,
    "",
    "----- Svar -----",
    "",
  ];
  (lead.answers || []).forEach(function (a, i) {
    lines.push(i + 1 + ". " + a.question);
    lines.push((a.display && String(a.display).trim()) || "(tomt)");
    lines.push("");
  });
  return sendEmail({
    to: to,
    subject: "Nyt funnel-lead: " + (lead.name || lead.email || lead.slug),
    text: lines.join("\n"),
    replyTo: lead.email || undefined,
  });
}

module.exports = { sendEmail, notifyNewLead, siteUrl };
