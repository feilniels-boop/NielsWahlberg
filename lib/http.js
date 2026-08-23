"use strict";

// Læs request-body med størrelsesgrænse. Resolver med rå streng.
function readBody(req, maxBytes) {
  const limit = maxBytes || 100 * 1024;
  return new Promise(function (resolve, reject) {
    let body = "";
    let tooBig = false;
    req.on("data", function (chunk) {
      body += chunk;
      if (body.length > limit) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on("end", function () {
      if (tooBig) reject(Object.assign(new Error("too big"), { code: "TOO_BIG" }));
      else resolve(body);
    });
    req.on("error", reject);
  });
}

async function readJson(req, maxBytes) {
  const raw = await readBody(req, maxBytes);
  try {
    return JSON.parse(raw || "{}");
  } catch (e) {
    throw Object.assign(new Error("invalid json"), { code: "BAD_JSON" });
  }
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendHtml(res, status, html, extraHeaders) {
  const headers = Object.assign(
    { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    extraHeaders || {}
  );
  res.writeHead(status, headers);
  res.end(html);
}

function sendText(res, status, text, extraHeaders) {
  const headers = Object.assign(
    { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    extraHeaders || {}
  );
  res.writeHead(status, headers);
  res.end(text);
}

module.exports = { readBody, readJson, sendJson, sendHtml, sendText };
