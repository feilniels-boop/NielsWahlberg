# Mail-skabeloner (dansk funnel — forretning)

Redigér copy'en her — `lib/emails.js` læser og udfylder skabelonerne for danske
leads (source "forretning*"). Samme opbygning som `mails.md`, bare på dansk.
Alle tre mails er ren tekst, sendes via Resend fra `MAIL_FROM`. Svar går til
`NOTIFY_EMAIL`.

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

Subject: {{first_name}}, her er den funnel jeg ville bygge til dig

Hej {{first_name}},

Du fortalte mig, hvad du sælger, og hvem der køber det. Her er, hvor jeg tror
du står:

{{situation}}

Og den ene ting, der holder det tilbage:

{{diagnosis}}

Jeg har skrevet hele den funnel ned, jeg ville bygge til dig — de præcise trin,
tre videoer du kunne optage i denne uge, og hvor du skal starte:

{{plan_url}}

En kort video fra mig — hvor jeg går igennem det for netop din situation —
følger inden for 48 timer. Ved du allerede, at du vil have det bygget, kan du
booke et møde direkte fra den side.

— Niels

---

## MAIL 2 — Video klar

Subject: Jeg har lavet en video til dig, {{first_name}}

Hej {{first_name}},

Jeg har optaget en kort video, hvor jeg går igennem funnel'en for din
forretning. Den ligger nu øverst på din plan her:

{{plan_url}}

Rammer den, og vil du have mig til at bygge den, så find en tid her:

{{booking_url}}

Uanset hvad vil jeg gerne høre, hvad du synes — svar bare på denne mail.

— Niels

---

## MAIL 3 — Opfølgning (dag 4)

Subject: stadig i tvivl, {{first_name}}?

Hej {{first_name}},

For et par dage siden sendte jeg dig en funnel-plan og en kort video til din
forretning. Ingen pitch her — jeg ville bare høre, om det faktisk var brugbart.

Vil du have den bygget, er den hurtigste vej et kort møde:

{{booking_url}}

Passer timingen ikke, er det helt fint. Din plan bliver liggende her, når du
har lyst:

{{plan_url}}

— Niels
