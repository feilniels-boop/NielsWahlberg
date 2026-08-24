# Mail-skabeloner (funnel)

Redigér copy'en her — `lib/emails.js` læser og udfylder skabelonerne.
Alle tre mails er ren tekst (ingen HTML-skabelon, ingen billeder), sendes via
Resend fra `MAIL_FROM` (eget domæne, aldrig no-reply). Svar går til `NOTIFY_EMAIL`.

Pladsholdere der udfyldes automatisk:
- `{{first_name}}` — modtagerens fornavn
- `{{name}}` — fulde navn
- `{{plan_url}}` — link til plan-siden (SITE_URL/plan/slug)
- `{{booking_url}}` — Cal.com bookinglink (BOOKING_URL)
- `{{situation}}` — planens "situation"-blok (bruges som teaser i Mail 1)
- `{{diagnosis}}` — planens "diagnosis"-blok (bruges som teaser i Mail 1)

Hver mail starter med en linje `## MAIL N`, derefter `Subject:` og selve brødteksten.

---

## MAIL 1 — Plan leveret

Subject: {{first_name}}, here's the funnel I'd build for you

Hi {{first_name}},

You told me what you sell and who buys it. Here's where I think you are:

{{situation}}

And the one thing holding it back:

{{diagnosis}}

I've written out the full funnel I'd build for you — the exact steps, three
videos you could film this week, and where to start:

{{plan_url}}

A short video from me — walking through this for your specific situation —
follows within 48 hours. If you already know you want it built, you can book a
call straight from that page.

— Niels

---

## MAIL 2 — Video klar

Subject: I made you a video, {{first_name}}

Hi {{first_name}},

I recorded a short video walking through the funnel for your business. It's now
at the top of your plan here:

{{plan_url}}

If it lands and you want me to build it, grab a time here:

{{booking_url}}

Either way, I'd like to hear what you think — just reply to this email.

— Niels

---

## MAIL 3 — Opfølgning (dag 4)

Subject: still thinking it over, {{first_name}}?

Hi {{first_name}},

A few days ago I sent you a funnel plan and a short video for your business.
No pitch here — I just wanted to check whether it was actually useful.

If you want it built, the fastest way is a quick call:

{{booking_url}}

If the timing isn't right, no worries at all. Your plan stays up here whenever
you want it:

{{plan_url}}

— Niels
