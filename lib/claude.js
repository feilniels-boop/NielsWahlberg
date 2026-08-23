"use strict";

/* ------------------------------------------------------------------
   Kald til Claude API (Anthropic) — KUN server-side.
   Rå HTTP via fetch, i tråd med resten af projektet (ingen dependencies).
   ANTHROPIC_API_KEY læses fra miljøet og må aldrig nå klienten.
------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// Systemprompten ligger i plan-prompt.md (læses én gang og caches).
let SYSTEM_PROMPT = null;
function systemPrompt() {
  if (SYSTEM_PROMPT == null) {
    SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, "..", "plan-prompt.md"), "utf8");
  }
  return SYSTEM_PROMPT;
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

// Byg brugerbeskeden ud fra lead'ets svar.
function buildUserMessage(lead) {
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
    system: systemPrompt(),
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

module.exports = { generatePlan, PRICE_LABELS, SITUATION_LABELS };
