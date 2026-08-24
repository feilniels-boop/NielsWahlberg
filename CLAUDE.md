# CLAUDE.md — NielsWahlberg

Guidance for working in this repo. Read before making changes.

## What this is
Marketing site + a **funnel** for Niels Wahlberg. Danish coaching pages already
existed (`index.html`, `feedback.html`, `forretning.html`, `tak.html`, …). The
new work is an **English lead/qualification funnel** at `/en/quiz` → `/en/thanks`,
with a server backend that stores leads, generates a personal "funnel plan" with
Claude, shows it at `/plan/[slug]`, and has an admin + emails + a daily cron.

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
- `POST /api/quiz` → `lib/quiz.js` — new funnel submit.
- `GET /plan/<slug>` → `lib/plan.js` — generated plan page (noindex).
- `GET|POST /admin/lead/<id>` → `lib/admin.js` — Basic-Auth admin.
- `GET|POST /admin/run-cron` → manual daily-job trigger (Basic Auth).
- `GET /en/thanks` → `lib/thanks.js` — server-rendered thank-you page.
- Everything else → static files. HTML/JS/CSS served `no-store`; images cached.

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

Emails (`lib/emails.js` + `mails.md`, sent via `lib/mailer.js`/Resend, from
`MAIL_FROM`, reply-to `NOTIFY_EMAIL`): Mail 1 = plan link, Mail 2 = video is up,
Mail 3 = day-4 nudge. Mail 1 & 3 are plain text.

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
video section hidden), `AUTO_SEND_MAIL1`.

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
- Keep the form component backward-compatible — it's shared with the Danish forms
  (`/feedback`, `/forretning`). New behavior goes behind config flags.
- Security: server-only secrets; the `/plan` slug IS the access control (16 random
  chars) — keep it unguessable; `/plan` and `/admin` send `X-Robots-Tag: noindex`.

## Verified channel numbers — DO NOT inflate
Left column / landing use the **real** YouTube-export numbers: **685 subscribers,
263 videos, median 272 views, 10+ paying clients, 0 spent on ads, >$50 per 1,000
views**. The old figures **37,000 subscribers / median 63 are false** and were
removed everywhere — do not reintroduce them. (The YouTube skill and
`cv-niels-wahlberg.html`, if present, may still carry the wrong numbers — external
to this funnel.)
