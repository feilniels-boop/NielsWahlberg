"use strict";

/* ------------------------------------------------------------------
   Ét dagligt job:
   1) Pinger Supabase ALTID (også uden leads), så gratisplanen ikke
      pauser efter en uges inaktivitet.
   2) Sender mail 3 til leads der er mindst 4 dage gamle, har fået mail 2,
      ikke har fået mail 3, og ikke er booket.

   Kører in-process (samme server). Kort efter opstart + hver 24. time.
------------------------------------------------------------------ */

const db = require("./supabase");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAIL3_AFTER_DAYS = 4;

async function runDailyJob() {
  const result = { pinged: false, due: 0, sent: 0, errors: 0 };

  // 1) Hold Supabase i live — altid, uanset leads.
  try {
    await db.ping();
    result.pinged = true;
  } catch (e) {
    console.error("Cron: Supabase-ping fejlede:", e && e.message);
  }

  // 2) Mail 3 til de leads der er klar.
  try {
    const cutoff = new Date(Date.now() - MAIL3_AFTER_DAYS * DAY_MS).toISOString();
    const leads = await db.leadsDueForMail3(cutoff);
    result.due = leads.length;
    const emails = require("./emails");
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        await emails.sendMail3(lead);
        // eslint-disable-next-line no-await-in-loop
        await db.updateLead(lead.id, {
          mail3_sent_at: new Date().toISOString(),
          status: "mail3_sent",
        });
        result.sent++;
        console.log("Cron: mail 3 sendt til lead " + lead.id + " (" + lead.slug + ").");
      } catch (e) {
        result.errors++;
        console.error("Cron: mail 3 fejlede for lead " + lead.id + ":", e && e.message);
      }
    }
  } catch (e) {
    console.error("Cron: opslag af leads fejlede:", e && e.message);
  }

  console.log("Cron kørt: " + JSON.stringify(result));
  return result;
}

let started = false;
function start() {
  if (started) return;
  started = true;
  // Kør kort efter opstart (så nye deploys/genstarter også pinger + rydder op),
  // derefter én gang i døgnet.
  const kickoff = setTimeout(function () {
    runDailyJob().catch(function () {});
  }, 60 * 1000);
  const daily = setInterval(function () {
    runDailyJob().catch(function () {});
  }, DAY_MS);
  // Lad timerne ikke blokere en ellers ren nedlukning.
  if (kickoff.unref) kickoff.unref();
  if (daily.unref) daily.unref();
  console.log("Dagligt cron-job planlagt (mail 3 + Supabase keep-alive).");
}

module.exports = { start, runDailyJob };
