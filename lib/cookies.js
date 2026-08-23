"use strict";

/* ------------------------------------------------------------------
   Små cookie-hjælpere. Lead-cookien identificerer det netop oprettede
   lead, så /en/thanks kan hilse med fornavn — server-side, aldrig i URL.
   Indhold: slug'en (ugætteligt), ikke det numeriske id (som kan enumereres).
   HttpOnly + SameSite=Lax + Secure (i produktion) + 30 min levetid.
------------------------------------------------------------------ */

var COOKIE_NAME = "nw_lead";
var MAX_AGE = 30 * 60; // 30 minutter

function parse(req) {
  var out = {};
  var raw = (req.headers && req.headers.cookie) || "";
  raw.split(";").forEach(function (pair) {
    var i = pair.indexOf("=");
    if (i < 0) return;
    var k = pair.slice(0, i).trim();
    var v = pair.slice(i + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch (e) {
        out[k] = v;
      }
    }
  });
  return out;
}

function isSecure(req) {
  var proto = req.headers && req.headers["x-forwarded-proto"];
  if (proto) return String(proto).split(",")[0].trim() === "https";
  var host = (req.headers && req.headers.host) || "";
  return !/^(localhost|127\.|\[::1\])/i.test(host); // lokalt: ingen Secure, så cookien virker over http
}

function leadCookie(slug, req) {
  var parts = [
    COOKIE_NAME + "=" + encodeURIComponent(slug),
    "Max-Age=" + MAX_AGE,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isSecure(req)) parts.push("Secure");
  return parts.join("; ");
}

function leadSlug(req) {
  return parse(req)[COOKIE_NAME] || null;
}

module.exports = { parse, leadCookie, leadSlug, COOKIE_NAME };
