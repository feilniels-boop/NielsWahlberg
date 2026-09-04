"use strict";

/* ------------------------------------------------------------------
   Demo-klinikker: ÉN delt skabelon fodret af config-objekter.
   En fjerde klinik = ét nyt objekt i CLINICS. Server-renderes på
   /demo/<slug> (se server.js). Ingen backend, ingen npm-deps.
------------------------------------------------------------------ */

const { esc } = require("./util");
const { sendHtml } = require("./http");

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };

// Google Maps søge-URL (ingen embed, ingen API-nøgle).
function mapsUrl(address) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
}

/* ---- De tre demo-klinikker (opdigtede, findes ikke) ---- */
const CLINICS = {
  fysioterapi: {
    slug: "fysioterapi",
    name: "Nordvest Fysioterapi",
    type: "Fysioterapi og genoptræning",
    city: "Aarhus N",
    phone: "86 18 24 60",
    address: "Tromsøgade 8, 8200 Aarhus N",
    accent: "#1B3A5C",
    initials: "NF",
    images: {
      hero: { src: "/demo/fysioterapi/hero.jpg", alt: "rehabilitation clinic interior" },
      band: { src: "/demo/fysioterapi/break.jpg", alt: "physical therapy equipment detail" },
      om: { src: "/demo/fysioterapi/om.jpg", alt: "therapist hands treatment table" },
    },
    bookingStyle: "knap",
    tagline: "Genoptræning og behandling, der får dig tilbage til det, du holder af.",
    about:
      "Hos Nordvest Fysioterapi arbejder vi med genoptræning efter skader, kroniske smerter og forebyggelse. Du får en grundig undersøgelse og en plan, der passer til din hverdag, ikke en standardøvelse på et ark.",
    treatments: [
      { name: "Første konsultation", duration: "60 min", price: "650 kr" },
      { name: "Opfølgende behandling", duration: "30 min", price: "400 kr" },
      { name: "Træningsvejledning", duration: "45 min", price: "500 kr" },
    ],
    hours: [
      { d: "Man til tors", t: "8.00 til 17.00" },
      { d: "Fre", t: "8.00 til 14.00" },
      { d: "Lør og søn", t: "Lukket" },
    ],
    reviews: [
      { name: "Mette", month: "marts", text: "Blev endelig fri for min løbeskade. Klar plan og god opfølgning." },
      { name: "Jonas", month: "februar", text: "Dygtig og grundig. Følte mig i trygge hænder fra første besøg." },
      { name: "Anne", month: "januar", text: "Nem at booke og altid til tiden. Kan varmt anbefales." },
    ],
  },

  psykolog: {
    slug: "psykolog",
    name: "Klinik Vestervold",
    type: "Psykolog",
    city: "Aarhus C",
    phone: "86 12 47 33",
    address: "Vestergade 40, 8000 Aarhus C",
    accent: "#8C4A3C",
    initials: "KV",
    images: {
      hero: { src: "/demo/psykolog/hero.jpg", alt: "quiet interior armchair daylight" },
      band: { src: "/demo/psykolog/break.jpg", alt: "minimal room soft light" },
      om: { src: "/demo/psykolog/om.jpg", alt: "still life desk daylight" },
    },
    bookingStyle: "kontakt-først",
    tagline: "Et roligt rum til samtaler om det, der fylder.",
    about:
      "Klinik Vestervold er et roligt sted at samle tankerne. Jeg tilbyder samtaler til dig, der oplever stress, angst, tristhed eller bare har brug for at tale med et menneske, der lytter uden at dømme. Der er ingen forventning om, at du har styr på det hele, før du kommer. Første samtale handler om at forstå, hvad du står i, og hvad du gerne vil have ud af et forløb. Vi går i det tempo, der passer dig, og du bestemmer selv, hvor meget du vil dele.",
    treatments: [
      { name: "Individuel samtale", duration: "50 min", price: "1.100 kr" },
      { name: "Parsamtale", duration: "80 min", price: "1.600 kr" },
    ],
    hours: [
      { d: "Man til fre", t: "9.00 til 16.00" },
      { d: "Lør og søn", t: "Lukket" },
    ],
    reviews: [
      { name: "Sofie", month: "marts", text: "Rart at blive mødt uden at skulle forklare alt på forhånd. God ro." },
      { name: "Thomas", month: "februar", text: "Hjalp mig gennem en svær tid. Jeg følte mig hørt hele vejen." },
      { name: "Line", month: "januar", text: "Trygt og professionelt. Jeg gik derfra lettere hver gang." },
    ],
  },

  fodpleje: {
    slug: "fodpleje",
    name: "Søbakken Fodpleje",
    type: "Statsautoriseret fodterapeut",
    city: "Solbjerg",
    phone: "86 92 15 40",
    address: "Søbakken 3, 8355 Solbjerg",
    accent: "#4A6B3D",
    initials: "SF",
    images: {
      hero: { src: "/demo/fodpleje/hero.jpg", alt: "light treatment room interior" },
      band: { src: "/demo/fodpleje/break.jpg", alt: "pedicure treatment close up" },
      om: { src: "/demo/fodpleje/om.jpg", alt: "caregiver hands detail" },
    },
    bookingStyle: "knap",
    tagline: "Fodbehandling med god tid og rolige hænder, midt i Solbjerg.",
    about:
      "Fodpleje Solbjerg tager sig af dine fødder, fra almindelig pleje til negle- og bøjlebehandling. Statsautoriseret fodterapeut med rolige hænder og god tid til hver enkelt. Du er velkommen, uanset om det er første gang eller en fast aftale.",
    treatments: [
      { name: "Almindelig fodbehandling", duration: "45 min", price: "450 kr" },
      { name: "Med neglebehandling", duration: "60 min", price: "550 kr" },
      { name: "Bøjlebehandling", duration: "", price: "650 kr" },
    ],
    hours: [
      { d: "Tirs, ons og tors", t: "9.00 til 15.00" },
      { d: "Man, fre, lør og søn", t: "Lukket" },
    ],
    reviews: [
      { name: "Bent", month: "marts", text: "Mine fødder har ikke haft det så godt i årevis. Tusind tak." },
      { name: "Karen", month: "februar", text: "Grundig og nænsom. Bøjlen har gjort en kæmpe forskel." },
      { name: "Erik", month: "januar", text: "God tid, ingen hast. Man mærker rutinen." },
    ],
  },
};

/* ---- Skabelon-komponenter ---- */

function renderTreatments(c) {
  const rows = c.treatments
    .map(function (t) {
      const meta = t.duration ? esc(t.duration) : "";
      return (
        '<li class="treat">' +
        '<span class="treat-name">' + esc(t.name) + "</span>" +
        '<span class="treat-meta">' +
        (meta ? '<span class="treat-dur">' + meta + "</span>" : "") +
        '<span class="treat-price">' + esc(t.price) + "</span>" +
        "</span></li>"
      );
    })
    .join("");
  return (
    '<section class="sec" id="behandlinger"><div class="wrap">' +
    '<h2 class="h2">Behandlinger og priser</h2>' +
    '<ul class="treat-list">' + rows + "</ul>" +
    "</div></section>"
  );
}

function renderAbout(c) {
  return (
    '<section class="sec sec-alt" id="om"><div class="wrap about">' +
    imgBox(c.images && c.images.om, "about-img", true) +
    '<div><h2 class="h2">Om klinikken</h2><p class="body">' + esc(c.about) + "</p></div>" +
    "</div></section>"
  );
}

function renderHours(c) {
  const rows = c.hours
    .map(function (h) {
      return '<li><span>' + esc(h.d) + "</span><span>" + esc(h.t) + "</span></li>";
    })
    .join("");
  return (
    '<section class="sec"><div class="wrap two-col">' +
    '<div><h2 class="h2">Åbningstider</h2><ul class="hours">' + rows + "</ul></div>" +
    '<div><h2 class="h2">Find vej</h2><p class="body">' + esc(c.address) + "</p>" +
    '<a class="link-accent" href="' + esc(mapsUrl(c.address)) + '" target="_blank" rel="noopener">Se rutevejledning</a></div>' +
    "</div></section>"
  );
}

// Billed-boks. Mangler kilden, returneres en tom --ground-boks; onerror skjuler
// et evt. brækket ikon, så den rolige flade står tilbage. hero = uden lazy.
function imgBox(im, cls, lazy) {
  if (!im || !im.src) return '<div class="imgbox ' + cls + '"></div>';
  return (
    '<div class="imgbox ' + cls + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt || "") + '"' +
    (lazy ? ' loading="lazy"' : "") +
    " decoding=\"async\" onerror=\"this.style.display='none'\"></div>"
  );
}
function renderBand(c) {
  return '<div class="breakband">' + imgBox(c.images && c.images.band, "band-img", true) + "</div>";
}

function renderReviews(c) {
  const cards = c.reviews
    .map(function (r) {
      return (
        '<figure class="review">' +
        '<span class="ex-label">Eksempel</span>' +
        '<blockquote>' + esc(r.text) + "</blockquote>" +
        '<figcaption>' + esc(r.name) + ", " + esc(r.month) + "</figcaption>" +
        "</figure>"
      );
    })
    .join("");
  return (
    '<section class="sec sec-alt"><div class="wrap">' +
    '<h2 class="h2">Hvad folk siger</h2>' +
    '<div class="reviews">' + cards + "</div>" +
    "</div></section>"
  );
}

function renderContact(c) {
  const opts = c.treatments
    .map(function (t) { return '<option value="' + esc(t.name) + '">' + esc(t.name) + "</option>"; })
    .join("");
  return (
    '<section class="sec" id="kontakt"><div class="wrap">' +
    '<h2 class="h2">Skriv til os</h2>' +
    '<p class="body">Udfyld herunder, så vender vi tilbage med en tid.</p>' +
    '<form class="form" id="contactForm" novalidate>' +
    '<label>Navn<input type="text" name="navn" autocomplete="name" required /></label>' +
    '<label>Telefon<input type="tel" name="telefon" autocomplete="tel" required /></label>' +
    '<label>E-mail<input type="email" name="email" autocomplete="email" required /></label>' +
    '<label>Behandling<select name="behandling">' + opts + "</select></label>" +
    '<button class="btn btn-accent" type="submit">Send</button>' +
    '<p class="form-note" id="formNote" hidden>Tak. Dette er en eksempelside, så beskeden bliver ikke sendt.</p>' +
    "</form></div></section>"
  );
}

/* Hero varierer mærkbart efter bookingStil. */
function renderHero(c) {
  const head =
    '<p class="hero-type">' + esc(c.type) + " · " + esc(c.city) + "</p>" +
    '<h1 class="hero-h1">' + esc(c.name) + "</h1>" +
    '<p class="hero-tag">' + esc(c.tagline) + "</p>";

  if (c.bookingStyle === "knap") {
    // Handlingsorienteret: stor Book-knap + ring.
    return (
      '<section class="hero hero-knap"><div class="wrap">' +
      head +
      '<div class="hero-actions">' +
      '<a class="btn btn-accent" href="#kontakt">Book tid</a>' +
      '<a class="btn btn-outline" href="tel:' + esc(c.phone.replace(/\s/g, "")) + '">Ring ' + esc(c.phone) + "</a>" +
      "</div>" +
      imgBox(c.images && c.images.hero, "hero-img", false) +
      "</div></section>"
    );
  }
  // kontakt-først: roligere, ingen Book-knap, telefon som primær handling.
  return (
    '<section class="hero hero-kontakt"><div class="wrap">' +
    head +
    '<p class="hero-soft">Ring eller skriv, så finder vi en tid sammen. Der er ingen venteliste på at blive taget alvorligt.</p>' +
    '<div class="hero-actions">' +
    '<a class="btn btn-accent" href="tel:' + esc(c.phone.replace(/\s/g, "")) + '">Ring ' + esc(c.phone) + "</a>" +
    '<a class="btn btn-quiet" href="#kontakt">Skriv i stedet</a>' +
    "</div>" +
    imgBox(c.images && c.images.hero, "hero-img", false) +
    "</div></section>"
  );
}

function renderClinic(c) {
  const telHref = "tel:" + c.phone.replace(/\s/g, "");
  return (
    '<!doctype html><html lang="da"><head>' +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />' +
    '<meta name="robots" content="noindex" />' +
    "<title>" + esc(c.name) + " · " + esc(c.city) + "</title>" +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />' +
    "<style>" +
    ":root{--accent:" + c.accent + ";--ground:#f3f5f6;--surface:#fff;--ink:#131a1f;--muted:#5c6870;--line:#dde3e6;" +
    "--accent-soft:#eef2f2;--accent-soft:color-mix(in srgb,var(--accent) 12%,#fff);--r:10px}" +
    "*{box-sizing:border-box;margin:0;padding:0}" +
    "html{scroll-behavior:smooth}" +
    'body{font-family:"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--surface);font-size:1.0625rem;line-height:1.6;overflow-x:hidden}' +
    "h1,h2,h3{text-wrap:balance;line-height:1.1;letter-spacing:-0.02em}" +
    "a{color:inherit;text-decoration:none}" +
    "ul{list-style:none}" +
    "a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".wrap{width:100%;max-width:720px;margin-inline:auto;padding-inline:20px}" +
    ".h2{font-size:clamp(1.5rem,4vw,2rem);font-weight:600;margin-bottom:18px}" +
    ".body{color:var(--muted);max-width:60ch}" +
    // topbar (desktop) + mobil ring-bar
    ".top{display:flex;align-items:center;justify-content:space-between;height:64px;border-bottom:1px solid var(--line)}" +
    ".brand{display:flex;align-items:center;gap:10px;font-weight:600}" +
    ".brand .mk{width:32px;height:32px;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:600;font-size:.9rem}" +
    ".top .tel{display:none;font-weight:600;color:var(--accent)}" +
    "@media(min-width:640px){.top .tel{display:inline}}" +
    ".callbar{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--accent);color:#fff;text-align:center;padding:14px;font-weight:600;box-shadow:0 -6px 20px rgba(0,0,0,.12)}" +
    "@media(min-width:640px){.callbar{display:none}}" +
    "body{padding-bottom:60px}@media(min-width:640px){body{padding-bottom:0}}" +
    // knapper
    ".btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:600;padding:13px 22px;border-radius:8px;border:1px solid transparent;cursor:pointer}" +
    ".btn-accent{background:var(--accent);color:#fff}" +
    ".btn-outline{background:transparent;color:var(--ink);border-color:var(--line)}" +
    ".btn-quiet{background:transparent;color:var(--accent);padding-inline:6px}" +
    // hero-varianter
    ".hero{padding:54px 0}" +
    ".hero-type{font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:12px}" +
    ".hero-h1{font-size:clamp(2.1rem,6vw,3.2rem);font-weight:700}" +
    ".hero-tag{color:var(--muted);font-size:1.15rem;margin:14px 0 24px;max-width:32ch}" +
    ".hero-actions{display:flex;flex-wrap:wrap;gap:12px}" +
    // knap-hero: accent-soft flade, tydelig CTA-blok
    ".hero-knap{background:var(--accent-soft)}" +
    // kontakt-hero: roligt, luftigt, ingen farveflade
    ".hero-kontakt{padding:72px 0}" +
    ".hero-kontakt .hero-h1{font-weight:600}" +
    ".hero-soft{color:var(--muted);max-width:46ch;margin:0 0 24px;font-size:1.05rem}" +
    // sektioner
    ".sec{padding:44px 0;border-top:1px solid var(--line)}" +
    ".sec-alt{background:var(--ground)}" +
    ".two-col{display:grid;grid-template-columns:1fr;gap:32px}@media(min-width:620px){.two-col{grid-template-columns:1fr 1fr}}" +
    // behandlinger som liste med hårfine streger
    ".treat-list{margin-top:4px}" +
    ".treat{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:16px 0;border-top:1px solid var(--line)}" +
    ".treat:first-child{border-top:0}" +
    ".treat-name{font-weight:600}" +
    ".treat-meta{display:flex;gap:16px;align-items:baseline;color:var(--muted);white-space:nowrap}" +
    ".treat-price{color:var(--ink);font-weight:600}" +
    // om: to-spaltet med rektangulært arbejdsbillede (ikke rund avatar/headshot)
    ".about{display:grid;grid-template-columns:1fr;gap:22px;align-items:start}@media(min-width:640px){.about{grid-template-columns:5fr 6fr}}" +
    // billeder: aspect-ratio-bokse reserverer plads (ingen layout shift), object-fit cover.
    // Mangler filen, står den rolige --ground-flade tilbage (ikke grøn, ikke brækket).
    ".imgbox{position:relative;overflow:hidden;background:var(--ground);border-radius:var(--r)}" +
    ".imgbox img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".hero-img{margin-top:26px;aspect-ratio:16/9}" +
    ".about-img{aspect-ratio:4/3}" +
    ".breakband{margin:0}.breakband .imgbox{border-radius:0;aspect-ratio:16/7}@media(min-width:640px){.breakband .imgbox{aspect-ratio:24/7}}" +
    // åbningstider
    ".hours li{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--line);color:var(--muted)}" +
    ".hours li:first-child{border-top:0}" +
    ".link-accent{color:var(--accent);font-weight:600;text-decoration:underline;text-underline-offset:3px;display:inline-block;margin-top:10px}" +
    // anmeldelser
    ".reviews{display:grid;grid-template-columns:1fr;gap:16px}@media(min-width:620px){.reviews{grid-template-columns:repeat(3,1fr)}}" +
    ".review{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px}" +
    ".ex-label{display:inline-block;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--accent-soft);padding:3px 8px;border-radius:999px;margin-bottom:12px}" +
    ".review blockquote{font-size:.98rem;margin-bottom:12px}" +
    ".review figcaption{color:var(--muted);font-size:.88rem;font-weight:600}" +
    // formular
    ".form{display:grid;gap:14px;max-width:440px}" +
    ".form label{display:grid;gap:6px;font-size:.9rem;font-weight:600}" +
    ".form input,.form select{font:inherit;padding:12px 13px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)}" +
    ".form .btn{margin-top:4px}" +
    ".form-note{color:var(--accent);font-weight:600;font-size:.92rem}" +
    // footer
    ".foot{padding:40px 0 32px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}" +
    ".foot a{color:var(--accent);font-weight:600}" +
    // cookie
    ".cookie{position:fixed;left:16px;right:16px;bottom:76px;z-index:60;max-width:680px;margin-inline:auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;box-shadow:0 12px 30px rgba(0,0,0,.12)}" +
    "@media(min-width:640px){.cookie{bottom:16px}}" +
    ".cookie p{font-size:.88rem}.cookie-actions{display:flex;gap:10px}" +
    ".cookie .btn{padding:9px 14px;font-size:.88rem}.cookie .btn-solid{background:var(--ink);color:#fff}" +
    ".cookie[hidden]{display:none}" +
    "</style></head><body>" +
    // desktop topbar
    '<header class="wrap"><div class="top">' +
    '<span class="brand"><span class="mk" aria-hidden="true">' + esc(c.initials) + "</span>" + esc(c.name) + "</span>" +
    '<a class="tel" href="' + telHref + '">' + esc(c.phone) + "</a>" +
    "</div></header>" +
    renderHero(c) +
    renderTreatments(c) +
    renderBand(c) +
    renderAbout(c) +
    renderHours(c) +
    renderReviews(c) +
    renderContact(c) +
    // footer
    '<footer class="foot"><div class="wrap">' +
    "<p>Dette er en eksempelside bygget af Niels Wahlberg. Klinikken findes ikke.</p>" +
    '<p style="margin-top:6px"><a href="/klinik">Se hvad jeg kan bygge til din klinik</a></p>' +
    "</div></footer>" +
    // mobil klik-til-ring
    '<a class="callbar" href="' + telHref + '">Ring ' + esc(c.phone) + "</a>" +
    // cookiebanner (samme som resten af sitet)
    '<div class="cookie" id="cookie" hidden>' +
    "<p>Jeg bruger statistik til at se om annoncerne rammer rigtigt. Intet af det er nødvendigt for at siden virker, så du kan roligt sige nej.</p>" +
    '<div class="cookie-actions"><button class="btn btn-outline" id="ckNec" type="button">Kun nødvendige</button>' +
    '<button class="btn btn-solid" id="ckAcc" type="button">Accepter</button></div></div>' +
    "<script>" +
    "(function(){var K='klinik_cookie_v1',b=document.getElementById('cookie');" +
    "function g(){try{return localStorage.getItem(K)}catch(e){return null}}" +
    "function s(v){try{localStorage.setItem(K,v)}catch(e){}}" +
    "if(!g())b.hidden=false;" +
    "var a=document.getElementById('ckAcc'),n=document.getElementById('ckNec');" +
    "if(a)a.addEventListener('click',function(){s('all');b.hidden=true;try{window.dispatchEvent(new Event('cookie-accept'))}catch(e){}});" +
    "if(n)n.addEventListener('click',function(){s('necessary');b.hidden=true});" +
    "var f=document.getElementById('contactForm');" +
    "if(f)f.addEventListener('submit',function(e){e.preventDefault();var note=document.getElementById('formNote');if(note)note.hidden=false;});" +
    "})();" +
    "</script>" +
    // Meta-pixel (bag samtykke). Tom META_PIXEL_ID = intet script, ingen kald.
    '<script src="/meta-pixel.js"></script>' +
    "</body></html>"
  );
}

function handleDemo(req, res, slug) {
  const c = CLINICS[slug];
  if (!c) return sendHtml(res, 404, "<h1>Not found</h1>", NOINDEX);
  return sendHtml(res, 200, renderClinic(c), NOINDEX);
}

module.exports = { handleDemo, CLINICS };
