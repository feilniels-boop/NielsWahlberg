# CLAUDE.md — NielsWahlberg

Guidance for working in this repo. Read before making changes.

## What this is
Marketing site + a **funnel** for Niels Wahlberg. Danish coaching pages already
existed (`index.html`, `feedback.html`, `tak.html`, …). The new work is a
**lead/qualification funnel** with a server backend that stores leads, generates
a personal "funnel plan" with Claude, shows it at `/plan/[slug]`, and has an admin
+ emails + a daily cron. It runs in **two languages** sharing one backend: English
at `/en/quiz` → `/en/thanks`, and Danish at `/forretning` → `/forretning/tak` (the
Danish funnel replaced the old feedback form on `forretning.html`). Language is
derived from each lead's `source` — see "Two funnels" below.

Positioning: Niels gets high-ticket clients from videos with a couple hundred
views. The offer: "send me what you sell and who buys it, I send you the funnel
I'd build for you, as a video. Five a week, free."

## Architecture (important)
- **Vanilla Node.js HTTP server** (`server.js`), **no framework, zero npm deps.**
  Everything is raw `http` + global `fetch` (Node 18+; prod/local run Node 24).
- **No build step.** Files are served as-is. `package.json` only has `start: node server.js`.
- **Client scripts** (browser): `feedback-form.js` (the config-driven quiz),
  `tracking.js` (funnel analytics → Supabase `form_events`), `testimonials.js`.
- **Server modules** live in `lib/` (Node, `require`d lazily by `server.js`).
- Style: ES5-ish (`var`, function declarations), **Danish comments**. Match it.

## Run / dev
```
node server.js            # port 5173 (or $PORT); reads .env (see .env.example)
```
Local `.env` has Supabase + ADMIN_PASSWORD (+ optionally CHANNEL_START_DATE).
It does NOT have ANTHROPIC/Resend, so **locally a submit saves the lead but the
plan won't generate and no emails send.** Full chain only runs where those keys
exist (Railway). `.env` is gitignored — never commit real keys (not even in
`.env.example`, which must stay value-less for secrets).

Verify things in the browser with the Chrome tools; `/verify`-style end-to-end
checks are expected before committing UI changes.

## Routes (in `server.js` router, before static)
- `POST /api/feedback` — old Danish forms (unchanged).
- `POST /api/quiz` → `lib/quiz.js` — funnel submit for **both** funnels. The
  submitted `source` decides language downstream (default `funnel-en`; the Danish
  `/forretning` funnel sends `forretning*`). See "Two funnels" below.
- `GET /plan/<slug>` → `lib/plan.js` — generated plan page (noindex). Language
  from the lead's `source` (`forretning*` → Danish dictionary `T`, else English).
- `GET|POST /admin/lead/<id>` → `lib/admin.js` — Basic-Auth admin.
- `GET|POST /admin/run-cron` → manual daily-job trigger (Basic Auth).
- `GET /en/thanks` → `lib/thanks.js` (`lang="en"`) — English thank-you page.
- `GET /forretning/tak` → `lib/thanks.js` (`lang="da"`) — Danish thank-you page.
- `GET /demo/<slug>` → `lib/demo.js` — server-rendered demo clinic pages
  (`fysioterapi`/`psykolog`/`fodpleje`), `noindex`. See "The klinik track".
- `GET /tak-klinik` → static `tak-klinik.html` — klinik booking thank-you (fires
  the Meta Pixel Lead). Explicit route so the pretty URL works.
- Everything else → static files. HTML/JS/CSS served `no-store`; images cached.
  The two funnels' entry pages are static: `/en/quiz` (`en/quiz.html`, English)
  and `/forretning` (`forretning.html`, Danish — replaced the old feedback form).

## The funnel flow
1. `/en/quiz` (`en/quiz.html`) configures `window.FeedbackFormConfig` and loads
   `feedback-form.js`. Landing section (`cfg.intro`) → START → 5 questions
   (situation, offer, price band, blocker, readiness) → contact step. Mailing-list
   opt-in is **mandatory** (`newsletterRequired`). Posts to `/api/quiz`.
2. `lib/quiz.js`: validate, drop honeypots, build a **unique 16-char slug**
   (`slugify(company||firstName) + "-" + randomToken(16)`), insert lead, set an
   HttpOnly lead cookie (slug), respond `{ok:true}`, then in the background notify
   Niels and call `lib/plan.js generateForLead`.
3. `lib/plan.js generateForLead` → `lib/claude.js generatePlan` (Anthropic,
   `claude-opus-4-8`, adaptive thinking, **structured outputs** via
   `output_config.format`, system prompt from `plan-prompt.md`) → stores
   `plan` (jsonb) + `talking_points`, `status='generated'`, `generated_at`.
   `AUTO_SEND_MAIL1` (default off) can auto-send Mail 1; otherwise approve in admin.
4. `/en/thanks` (`lib/thanks.js`): reads the lead cookie → greets by first name
   (fallback if none); testimonials (`images/testimonial-*.png`); two panels —
   Danish channel dashboard (`lib/thanks-config.js`) + Cal.com inline embed.
5. `/plan/<slug>`: renders 6 blocks (situation, diagnosis, funnel, 3 video titles,
   build-first, price & booking), Loom video if `loom_url` set, "built N minutes
   after" line, logs a `page_views` row.
6. `lib/cron.js`: one daily in-process job — pings Supabase (keeps the free tier
   alive) then sends Mail 3 to leads ≥4 days old that got Mail 2 and aren't booked.

Emails (`lib/emails.js` + `mails.md`/`mails-da.md`, sent via `lib/mailer.js`/Resend,
from `MAIL_FROM`, reply-to `NOTIFY_EMAIL`): Mail 1 = plan link, Mail 2 = video is
up, Mail 3 = day-4 nudge. Mail 1 & 3 are plain text.

### Two funnels — language is derived, not stored
There are two funnels sharing one backend and one component; **no DB language
column** — language is derived from `lead.source`:
- **English:** `/en/quiz` (`en/quiz.html`), `source` defaults to `funnel-en`,
  no phone field, prices in USD bands, thank-you at `/en/thanks`.
- **Danish:** `/forretning` (`forretning.html`), `source` starts with
  `forretning`, **has** a phone field, prices in kr. bands (Under 5.000 /
  5.000–20.000 / 20.000–75.000 / Over 75.000), thank-you at `/forretning/tak`.

The single source of truth is `claude.leadLang(lead)` in `lib/claude.js`:
`source` beginning with `"forretning"` → `"da"`, otherwise `"en"`. It selects the
system prompt (`plan-prompt.md` / `plan-prompt-da.md`), the label maps, the user
message language, the plan-page dictionary `T` (`lib/plan.js`), the emails
(`mails.md` / `mails-da.md`), and the thank-you page language.

### Embedded quiz + component flags (`feedback-form.js`)
The same component powers the standalone funnel pages, the embedded quiz on the
front pages, and the old Danish `/feedback`. New behavior is behind config flags
on `window.FeedbackFormConfig` (all backward-compatible / opt-in):
- `mountSelector` (default `null`) — CSS selector of a container to mount the
  quiz into as **one** full-height section (`.funnel-embed` in `form.css`)
  instead of taking over the page. Used on `index.html` (Danish → `forretning`
  funnel) and `en.html` (English) at `#feedback`. Missing container → warns and
  no-ops rather than breaking the page.
- `showIntro` (default: on) — set `showIntro:false` to skip the START landing
  section and go straight to question 1 (e.g. links from YouTube). The `intro`
  config is preserved (just inactive) so it can be re-enabled. Both funnel pages
  currently set it `false`.
- `phoneMode` — `"dk"` (Danish) vs `"intl"` (English); `newsletterRequired`
  makes the mailing-list opt-in mandatory (funnels set it on).

## The klinik track (web-design sales page + demo clinics)
A **separate marketing track** from the coaching funnels above: Niels sells
websites to Danish clinics. All static + one server-rendered template — **no DB,
no Supabase, no Claude**; it shares nothing with the funnel backend but the server.
- `/klinik` (`klinik.html`) — the sales page. Cool clinical design with its own
  token set + Schibsted Grotesk, self-contained inline `<style>`/`<script>`.
  Sections in order: hero, problem, proces, **kunder**, **priser**, **book**,
  footer. Pricing lives in ONE `TIERS` const in the inline script: a one-off
  build fee (2.995 kr, shown once in a highlighted field above the cards) + three
  monthly tiers — Drift 395 / **Synlig 795** (featured) / Vækst 1.495 kr/md.
  Booking is a **Cal.com inline embed** at `#book` (`niels-feil-3q5gpr/15min`,
  lazy-loaded near viewport). Header phone button driven by a `PHONE` const
  (hidden if empty). "Kunder" shows real client screenshots from `/kunder/*.jpg`
  (apex, valkyrix, contentscale) with a `--ground` fallback if a file is missing.
  NB: `/klinik` resolves to `klinik.html`; the legacy `klinik/` folder is shadowed.
- `/demo/<slug>` → `lib/demo.js` — three example clinic sites (`fysioterapi`,
  `psykolog`, `fodpleje`) from ONE shared template fed by a `CLINICS` config map
  (a fourth clinic = one new object). Each: mobile click-to-call, hero that
  changes layout by `bookingStyle`, treatments list, about with a rectangular
  work image (not a headshot), Danish hours, a Google Maps **search link** (no
  embed), 3 reviews labelled "Eksempel", a contact form (name/phone/email/
  treatment dropdown — **no free-text**), an "example page" footer, own accent
  colour. `noindex`, fictional clinics.
- `/tak-klinik` (`tak-klinik.html`) — booking thank-you ("Tid booket"); fires the
  Meta Pixel Lead.

**Cookie consent + Meta Pixel.** `klinik.html`, the demo pages and
`tak-klinik.html` share a minimal cookie banner (localStorage `klinik_cookie_v1`)
and `meta-pixel.js`. The pixel loads **only after consent** (`=== "all"`); an
empty `META_PIXEL_ID` (top of `meta-pixel.js`) loads nothing and errors nowhere.
PageView on every consented klinik page, Lead on `/tak-klinik` (dedup via
`booking_event_id`). Independent of the coaching funnel's Supabase `form_events`.

**Assets & images.** Static assets are served from the **repo root**, not a
`public/` dir — client screenshots live in `kunder/…`, demo images in
`demo/<slug>/{hero,break,om}.jpg`, referenced as `/kunder/…` and `/demo/<slug>/…`.
`scripts/hent-billeder.js` fetches the nine demo images from Unsplash (needs
`UNSPLASH_ACCESS_KEY`; writes `demo/billedkreditter.md`); missing files fall back
to a calm `--ground` surface.

## Data — Supabase
- **Project `qqaudfinexdtgwhkqlsz`** ("NielsWahlberg", eu-west-1). This project is
  connected to Claude via the Supabase MCP, so you can query/apply migrations to it.
  URL: `https://qqaudfinexdtgwhkqlsz.supabase.co`.
- Tables: `leads`, `page_views`, `channel_stats`, `form_events` (tracking).
  Schema in `schema.sql` (+ `supabase/migrations/`).
- **RLS on, no anon access** to leads/page_views/channel_stats — all server-side
  via `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). `form_events` allows anon insert
  only (client tracking). The service-role key must never reach the client.
- An older Supabase project (`brskrvvnisnuslufkeqi`) is deprecated/abandoned.

## Env vars (set in Railway; see `.env.example`)
Required for the funnel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM` (verified domain, never
no-reply), `NOTIFY_EMAIL`, `ADMIN_PASSWORD`. Optional: `SITE_URL`, `BOOKING_URL`
(+ `CAL_LINK` for the embed — defaults to `niels-feil-3q5gpr/30min`), `SKOOL_URL`
(empty = Skool link hidden), `CHANNEL_START_DATE` (day of first English video,
never today; empty = no "day N"), `WELCOME_VIDEO_URL`/`_POSTER`/`_VTT` (empty =
video section hidden), `AUTO_SEND_MAIL1`. `UNSPLASH_ACCESS_KEY` is used **only**
by `scripts/hent-billeder.js` (demo images), never at runtime.

## Deploy
Railway auto-deploys **`main`**. `funnel-plan` was merged to `main` via PR #1.
**GOTCHA (bit us hard):** if any Railway variable is malformed (an empty-named
var, or a broken `${{ }}` reference — often from pasting a multi-line value) the
**build fails** and Railway keeps serving the *old* container with stale env. The
symptom is "correct value in the UI but the running app uses the old one." Always
confirm Deployments shows a green **Success**, not "Build Failed".

## Conventions
- Danish code comments and **Danish commit messages**; end commits with
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Branch off `main`; commit per logical step.
- Keep the form component backward-compatible — it's shared with the old Danish
  `/feedback`, both funnels (`/forretning`, `/en/quiz`), and the embedded quizzes
  on the front pages. New behavior goes behind config flags (`mountSelector`,
  `showIntro`, `phoneMode`, `newsletterRequired` — see "The funnel flow").
- Security: server-only secrets; the `/plan` slug IS the access control (16 random
  chars) — keep it unguessable; `/plan` and `/admin` send `X-Robots-Tag: noindex`.

## Verified channel numbers — DO NOT inflate
Left column / landing use the **real** YouTube-export numbers: **685 subscribers,
263 videos, median 272 views, 10+ paying clients, 0 spent on ads, >$50 per 1,000
views**. The old figures **37,000 subscribers / median 63 are false** and were
removed everywhere — do not reintroduce them. (The YouTube skill and
`cv-niels-wahlberg.html`, if present, may still carry the wrong numbers — external
to this funnel.)
