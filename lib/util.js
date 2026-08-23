"use strict";

const crypto = require("crypto");

// HTML-escape til server-renderet output (plan- og admin-sider).
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// slug-venlig streng: små bogstaver, bindestreger, ingen specialtegn.
function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // fjern accenter (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Fire tilfældige tegn (kryptografisk), uden let-forvekslelige tegn.
function randomToken(len) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // ingen l/o/0/1
  const bytes = crypto.randomBytes(len || 4);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Konstant-tids sammenligning af to strenge (til admin-kodeord).
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { esc, slugify, randomToken, safeEqual };
