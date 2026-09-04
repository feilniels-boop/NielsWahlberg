"use strict";

/* ------------------------------------------------------------------
   Henter billeder til de tre demosider fra Unsplash.
   Nøgle: UNSPLASH_ACCESS_KEY i .env (eller miljøet).
   Kør:   node scripts/hent-billeder.js
   Ingen npm-deps: bruger Node's globale fetch + fs.
------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// --- Læs .env (samme simple parser som resten af projektet) ---
function loadEnv() {
  const env = {};
  const p = path.join(ROOT, ".env");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[m[1]] = v;
    }
  }
  return env;
}

const KEY = (loadEnv().UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY || "").trim();
if (!KEY) {
  console.error("Mangler UNSPLASH_ACCESS_KEY i .env (eller miljøet).");
  process.exit(1);
}
const AUTH = { Authorization: "Client-ID " + KEY };

// --- De ni poster. query = primær, alt2 = alternativ hvis primær fejler
//     eller giver under tre resultater. alt = billedets alt-tekst. ---
const POSTS = [
  { dir: "demo/fysioterapi", file: "hero.jpg",  query: "physiotherapy clinic treatment room",     alt2: "medical clinic interior room",        alt: "rehabilitation clinic interior" },
  { dir: "demo/fysioterapi", file: "break.jpg", query: "rehabilitation exercise resistance band", alt2: "gym resistance band equipment",        alt: "physical therapy equipment detail" },
  { dir: "demo/fysioterapi", file: "om.jpg",    query: "physiotherapist treating patient shoulder", alt2: "physical therapy hands treatment",   alt: "therapist hands treatment table" },

  { dir: "demo/psykolog", file: "hero.jpg",  query: "therapy room two armchairs window light", alt2: "cozy armchair interior window",     alt: "quiet interior armchair daylight", noFaces: true },
  { dir: "demo/psykolog", file: "break.jpg", query: "calm interior plant daylight wall",        alt2: "minimalist interior plant light",    alt: "minimal room soft light",          noFaces: true },
  { dir: "demo/psykolog", file: "om.jpg",    query: "notebook table window quiet",             alt2: "notebook desk still life daylight",  alt: "still life desk daylight",         noFaces: true },

  { dir: "demo/fodpleje", file: "hero.jpg",  query: "bright clinic room chair simple interior", alt2: "minimal clinic room interior",  alt: "light treatment room interior" },
  { dir: "demo/fodpleje", file: "break.jpg", query: "foot care treatment hands",                alt2: "pedicure hands close up",       alt: "pedicure treatment close up" },
  { dir: "demo/fodpleje", file: "om.jpg",    query: "hands care treatment close up",            alt2: "caregiver hands care detail",   alt: "caregiver hands detail" },
];

// Groft heuristisk ansigts-/personfilter (Unsplash oplyser ikke ansigter i
// API'et). Bruges kun på noFaces-poster: springer resultater med person-ord i
// beskrivelsen over, så vi undgår genkendelige personer på psykologsiden.
function harPerson(photo) {
  const t = ((photo.alt_description || "") + " " + (photo.description || "")).toLowerCase();
  return /\b(person|people|man|men|woman|women|girl|boy|kid|child|face|portrait|model|human|selfie|smil|sitting|standing|posing)\b/.test(t);
}

async function api(url) {
  const r = await fetch(url, { headers: AUTH });
  if (!r.ok) throw new Error("HTTP " + r.status + " på " + url.split("?")[0]);
  return r.json();
}

async function search(query) {
  const url =
    "https://api.unsplash.com/search/photos?query=" + encodeURIComponent(query) +
    "&orientation=landscape&content_filter=high&per_page=10";
  const data = await api(url);
  return Array.isArray(data.results) ? data.results : [];
}

function pickPhoto(results, noFaces) {
  if (!noFaces) return results[0];
  for (const p of results) if (!harPerson(p)) return p;
  return null; // ingen faceless kandidat
}

async function download(photo, dest) {
  const base = photo.urls.raw;
  const sized = base + (base.includes("?") ? "&" : "?") + "w=1600&q=80&fm=jpg&fit=crop";
  const r = await fetch(sized);
  if (!r.ok) throw new Error("Kunne ikke hente billedfil: HTTP " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  // Unsplash-vilkår: registrér download-hændelsen. MÅ IKKE springes over.
  try {
    await api(photo.links.download_location);
  } catch (e) {
    console.warn("  advarsel: download-registrering fejlede:", e.message);
  }
}

(async () => {
  const report = [];
  const credits = [];

  for (const post of POSTS) {
    const rel = post.dir + "/" + post.file;
    const dest = path.join(ROOT, post.dir, post.file);
    let usedQuery = null;
    let photo = null;

    for (const [label, q] of [["primær", post.query], ["alternativ", post.alt2]]) {
      let results;
      try {
        results = await search(q);
      } catch (e) {
        console.warn(rel + ": " + label + '-query "' + q + '" fejlede: ' + e.message);
        continue;
      }
      if (results.length < 3) {
        console.warn(rel + ": " + label + '-query "' + q + '" gav kun ' + results.length + " resultater.");
        continue;
      }
      const p = pickPhoto(results, post.noFaces);
      if (!p) {
        console.warn(rel + ": " + label + '-query "' + q + '" gav kun billeder med personer (noFaces).');
        continue;
      }
      photo = p;
      usedQuery = { label: label, q: q };
      break;
    }

    if (!photo) {
      console.error(rel + ": begge queries fejlede — PLADSHOLDER står. Bygger ikke videre.");
      report.push({ rel: rel, status: "PLADSHOLDER", query: post.query });
      continue;
    }

    try {
      await download(photo, dest);
    } catch (e) {
      console.error(rel + ": hentning fejlede (" + e.message + ") — PLADSHOLDER står.");
      report.push({ rel: rel, status: "PLADSHOLDER", query: post.query });
      continue;
    }

    const profil = (photo.user.links && photo.user.links.html ? photo.user.links.html : "") +
      "?utm_source=nielswahlberg&utm_medium=referral";
    credits.push({
      sti: rel,
      fotograf: photo.user.name || "ukendt",
      profil: profil,
      billede: (photo.links && photo.links.html) || "",
    });
    report.push({ rel: rel, status: "OK", query: usedQuery.q, label: usedQuery.label, fotograf: photo.user.name });
    console.log("hentet " + rel + '  ("' + usedQuery.q + '", ' + usedQuery.label + ")");
  }

  // Skriv billedkreditter (licensen kræver det ikke, men sporet ønskes).
  const md =
    "# Billedkreditter (demo-sider)\n\n" +
    "Billeder fra Unsplash. Licensen kræver ikke kreditering, men her er sporet.\n\n" +
    credits
      .map(function (c) {
        return "- **" + c.sti + "** — " + c.fotograf + " · [profil](" + c.profil + ") · [billede](" + c.billede + ")";
      })
      .join("\n") +
    "\n";
  const mdPath = path.join(ROOT, "demo", "billedkreditter.md");
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, md, "utf8");

  // Slutrapport: de ni stier + hvilken query der gav hvad.
  console.log("\n==================== RAPPORT ====================");
  for (const r of report) {
    if (r.status === "OK") {
      console.log(r.rel.padEnd(28) + " OK   [" + r.label + '] "' + r.query + '"  (' + r.fotograf + ")");
    } else {
      console.log(r.rel.padEnd(28) + " PLADSHOLDER  (query: \"" + r.query + '")');
    }
  }
  console.log("Kreditter skrevet: demo/billedkreditter.md");
})();
