const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 5173;

// Minimal .env-loader (ingen dependency). Læser en .env-fil hvis den findes,
// så nøgler kan sættes lokalt. På Railway sættes de i stedet som Variables.
try {
  const envPath = path.join(root, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .forEach(function (line) {
        if (!line || line.trim().startsWith("#")) return;
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (!m) return;
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (process.env[m[1]] === undefined) process.env[m[1]] = v;
      });
  }
} catch (e) {
  /* ignorér */
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/* ------------------------------------------------------------------
   Feedback-endpoint: sender formularsvar som mail via Resend.
   Nøgler læses fra miljøvariabler (se .env.example) — aldrig hardcodet.
------------------------------------------------------------------ */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function buildEmailText(data) {
  const parts = [];
  parts.push("Navn: " + (data.name || "(ikke oplyst)"));
  parts.push("Telefon: " + (data.phone || "(ikke oplyst)"));
  if (data.email) parts.push("E-mail: " + data.email);
  parts.push("Nyhedsbrev: " + (data.newsletter ? "Ja tak" : "Nej tak"));
  parts.push("");
  parts.push("----- Svar -----");
  parts.push("");
  (data.lines || []).forEach(function (line, i) {
    parts.push(i + 1 + ". " + line.q);
    parts.push((line.a && String(line.a).trim()) || "(tomt)");
    parts.push("");
  });
  return parts.join("\n");
}

function handleFeedback(req, res) {
  let body = "";
  let tooBig = false;
  req.on("data", function (chunk) {
    body += chunk;
    if (body.length > 100 * 1024) {
      tooBig = true;
      req.destroy();
    }
  });
  req.on("end", async function () {
    if (tooBig) return sendJson(res, 413, { ok: false, error: "For stor forespørgsel" });

    let data;
    try {
      data = JSON.parse(body || "{}");
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Ugyldig forespørgsel" });
    }

    // Honeypot: udfyldt = bot. Svar OK uden at sende, så botten ikke lærer noget.
    if (data.hp && String(data.hp).trim() !== "") {
      return sendJson(res, 200, { ok: true });
    }

    if (!data.name || !data.phone) {
      return sendJson(res, 400, { ok: false, error: "Manglende felter" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.FEEDBACK_TO_EMAIL;
    const from = process.env.FEEDBACK_FROM_EMAIL || "Niels Wahlberg <onboarding@resend.dev>";

    if (!apiKey || !to) {
      console.error("Mangler RESEND_API_KEY eller FEEDBACK_TO_EMAIL i miljøet.");
      return sendJson(res, 500, { ok: false, error: "Server er ikke konfigureret" });
    }

    if (typeof fetch !== "function") {
      console.error("global fetch ikke tilgængelig — kræver Node 18+.");
      return sendJson(res, 500, { ok: false, error: "Server-fejl" });
    }

    const payload = {
      from: from,
      to: [to],
      subject: "Ny feedback-anmodning: " + data.name,
      text: buildEmailText(data),
    };
    if (data.email) payload.reply_to = data.email;

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(function () {
          return "";
        });
        console.error("Resend-fejl", resp.status, errText);
        return sendJson(res, 502, { ok: false, error: "Kunne ikke sende mail" });
      }
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error("Fejl ved afsendelse:", err);
      return sendJson(res, 502, { ok: false, error: "Kunne ikke sende mail" });
    }
  });
}

/* ------------------------------------------------------------------
   Static file server med pæne URL'er (/feedback, /tak → *.html)
------------------------------------------------------------------ */
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  // Fjern afsluttende slash (undtagen roden)
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    urlPath = urlPath.slice(0, -1);
  }

  let requestedPath;
  if (urlPath === "/") {
    requestedPath = "/index.html";
  } else if (!path.extname(urlPath)) {
    // Pæn URL uden filendelse → prøv tilsvarende .html
    requestedPath = urlPath + ".html";
  } else {
    requestedPath = urlPath;
  }

  const filePath = path.normalize(path.join(root, requestedPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (error, data) {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer(function (req, res) {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/api/feedback") {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      res.end("Method Not Allowed");
      return;
    }
    return handleFeedback(req, res);
  }

  serveStatic(req, res);
});

server.listen(port, "0.0.0.0", function () {
  console.log("NielsWahlberg site running on port " + port);
});
