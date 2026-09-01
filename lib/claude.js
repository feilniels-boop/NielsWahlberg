"use strict";

/* ------------------------------------------------------------------
   Kald til Claude API (Anthropic) — KUN server-side.
   Rå HTTP via fetch, i tråd med resten af projektet (ingen dependencies).
   ANTHROPIC_API_KEY læses fra miljøet og må aldrig nå klienten.
------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// Sprog udledes af lead.source: "forretning*" → dansk, ellers engelsk.
function leadLang(lead) {
  return lead && String(lead.source || "").indexOf("forretning") === 0 ? "da" : "en";
}

// Systemprompten ligger i plan-prompt.md (en) / plan-prompt-da.md (da).
// Læses én gang pr. sprog og caches.
const SYSTEM_PROMPTS = {};
function systemPrompt(lang) {
  if (SYSTEM_PROMPTS[lang] == null) {
    const file = lang === "da" ? "plan-prompt-da.md" : "plan-prompt.md";
    SYSTEM_PROMPTS[lang] = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  }
  return SYSTEM_PROMPTS[lang];
}

// JSON-schema for det strukturerede svar (garanterer gyldig JSON).
const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    plan: {
      type: "object",
      additionalProperties: false,
      properties: {
        situation: { type: "string" },
        diagnosis: { type: "string" },
        funnel: {
          type: "array",
          // BEMÆRK: minItems/maxItems (array-constraints) understøttes IKKE af
          // structured outputs og gav 400 fra Anthropic → planen blev aldrig
          // genereret. Antallet styres i stedet af prompten ("EXACTLY 4 steps"),
          // og render'en (lib/plan.js renderFunnel) filtrerer evt. tomme trin fra.
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              step: { type: "string" },
              detail: { type: "string" },
            },
            required: ["step", "detail"],
          },
        },
        // Antal styres af prompten ("EXACTLY 3"); ingen array-constraints (400).
        video_titles: { type: "array", items: { type: "string" } },
        build_first: { type: "string" },
        price_and_booking: { type: "string" },
      },
      required: [
        "situation",
        "diagnosis",
        "funnel",
        "video_titles",
        "build_first",
        "price_and_booking",
      ],
    },
    talking_points: { type: "array", items: { type: "string" } },
  },
  required: ["plan", "talking_points"],
};

const PRICE_LABELS = {
  A: "Under $500",
  B: "$500 to $2,000",
  C: "$2,000 to $10,000",
  D: "Over $10,000",
  E: "Not selling anything yet",
};
const SITUATION_LABELS = {
  A: "Has a business and clients, but nobody finds them online",
  B: "Has a business; every client comes from referrals",
  C: "Runs ads and wants a channel that costs less",
  D: "Has something to sell and has never posted",
  E: "Hasn't started anything yet",
};
// Danske labels (forretning-funnel) — samme keys som forretning.html.
const PRICE_LABELS_DA = {
  A: "Under 5.000 kr",
  B: "5.000–20.000 kr",
  C: "20.000–75.000 kr",
  D: "Over 75.000 kr",
  E: "Sælger ikke noget endnu",
};
const SITUATION_LABELS_DA = {
  A: "Har en forretning og kunder, men ingen finder dem online",
  B: "Har en forretning; alle kunder kommer via anbefalinger",
  C: "Kører annoncer og vil have en kanal der koster mindre",
  D: "Har noget at sælge og har aldrig postet",
  E: "Er ikke gået i gang med noget endnu",
};

function answerDisplay(lead, id) {
  const arr = Array.isArray(lead.answers) ? lead.answers : [];
  for (let i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
  return null;
}
function textAnswer(lead, id) {
  const a = answerDisplay(lead, id);
  if (!a) return "(not answered)";
  if (a.display && String(a.display).trim()) return String(a.display).trim();
  if (a.value != null) return String(a.value);
  return "(not answered)";
}

// Byg brugerbeskeden ud fra lead'ets svar (sprogbevidst).
function buildUserMessage(lead) {
  if (leadLang(lead) === "da") {
    const situation = SITUATION_LABELS_DA[lead.situation] || textAnswer(lead, "situation");
    const price = PRICE_LABELS_DA[lead.price] || textAnswer(lead, "price");
    const lines = [
      "Her er hvad en potentiel kunde har indsendt. Skriv deres funnel-plan.",
      "",
      "Hvad de sælger, og hvem der køber det: " + textAnswer(lead, "offer"),
      "Hvor de er lige nu: " + situation,
      "Hvad deres tilbud koster: " + price,
      "Hvad har stoppet dem fra at poste: " + textAnswer(lead, "blocker"),
      "Hvor klar de er til at investere (1–5): " + (lead.readiness != null ? lead.readiness : textAnswer(lead, "readiness")),
      "",
      "Navn: " + (lead.name || "(ikke oplyst)"),
      "Virksomhed eller hjemmeside: " + (lead.company || "(ikke oplyst)"),
    ];
    return lines.join("\n");
  }
  const situation = SITUATION_LABELS[lead.situation] || textAnswer(lead, "situation");
  const price = PRICE_LABELS[lead.price] || textAnswer(lead, "price");
  const lines = [
    "Here is what a prospect submitted. Write their funnel plan.",
    "",
    "What they sell, and who buys it: " + textAnswer(lead, "offer"),
    "Where they are right now: " + situation,
    "What their offer costs: " + price,
    "What has stopped them from posting: " + textAnswer(lead, "blocker"),
    "How ready they are to invest (1–5): " + (lead.readiness != null ? lead.readiness : textAnswer(lead, "readiness")),
    "",
    "Name: " + (lead.name || "(not given)"),
    "Company or website: " + (lead.company || "(not given)"),
  ];
  return lines.join("\n");
}

// Generér plan + talking points. Returnerer { plan, talking_points }.
async function generatePlan(lead) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Mangler ANTHROPIC_API_KEY.");

  const body = {
    model: MODEL,
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    system: systemPrompt(leadLang(lead)),
    output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
    messages: [{ role: "user", content: buildUserMessage(lead) }],
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(function () {
      return "";
    });
    throw new Error("Anthropic " + resp.status + ": " + t.slice(0, 400));
  }

  const data = await resp.json();
  if (data.stop_reason === "refusal") {
    throw new Error("Claude afviste forespørgslen (refusal).");
  }

  // Find tekst-blokken (kan komme efter thinking-blokke) og parse JSON'en.
  const blocks = Array.isArray(data.content) ? data.content : [];
  let text = "";
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i] && blocks[i].type === "text" && blocks[i].text) text += blocks[i].text;
  }
  if (!text.trim()) throw new Error("Tomt svar fra Claude.");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Kunne ikke parse JSON fra Claude: " + text.slice(0, 200));
  }
  if (!parsed || !parsed.plan) throw new Error("Svar mangler 'plan'.");
  return parsed;
}

module.exports = { generatePlan, leadLang, PRICE_LABELS, SITUATION_LABELS };
