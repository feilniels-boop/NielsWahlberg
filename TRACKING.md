# Funnel-tracking på /feedback

Instrumentering af multi-step-formularen så vi kan se **hvor folk falder fra**
og **om et trin fejler lydløst**. Kun adfærd logges — **ingen persondata**
(ingen svar, navne, mails eller telefonnumre). Derfor kræver målingen ikke et
samtykkebanner.

## Filer
- `tracking.js` — lille tracking-modul (ingen dependency). Sender events til
  Supabase-tabellen `public.form_events` via REST-endpointet. Alt er fire-and-forget
  i `try/catch`; fejler tracking (fx Supabase nede), kører formularen præcis som før.
- `feedback-form.js` — den fælles formular-komponent kalder `NWTrack.track(...)`
  på de relevante lifecycle-punkter.
- `feedback.html` — indlæser `tracking.js` (kun her → kun `/feedback` trackes).
- `supabase/migrations/20260807000000_create_form_events_tracking.sql` — tabel + RLS.
- `funnel.sql` — funnel-forespørgslen.

## Events

| event | hvornår | step_index | meta |
|---|---|---|---|
| `page_view` | `/feedback` mountes | – | `{source}` |
| `form_start` | første ægte interaktion med trin 1 (ikke autofokus) | 0 | `{source}` |
| `step_view` | hvert trin vises (dedupliceret pr. trin) | trinnets index | `{source}` |
| `step_complete` | brugeren går videre fra et trin | trinnet der forlades | `{source}` |
| `step_back` | brugeren går tilbage | trinnet der forlades | `{source}` |
| `validation_error` | et trin afviser at gå videre | trinnet | `{message}` eller `{errors}` |
| `submit_attempt` | submit sendes | kontakt-trinnet | `{source}` |
| `submit_success` | backend bekræfter | kontakt-trinnet | `{source}` |
| `submit_error` | submit fejler | kontakt-trinnet | `{status, message}` |
| `abandon` | siden forlades uden `submit_success` (sendBeacon på `visibilitychange`→hidden + `pagehide`) | nuværende trin | `{source}` |

**`step_key`** er et kort, stabilt navn for spørgsmålet (spørgsmålets `id`), ikke
teksten — så navnene ikke ændrer sig når spørgsmål omformuleres:

- `/feedback`: `situation`, `change`, `drain`, `future`, `readiness`, og `contact` (kontakt-trinnet).
- `step_index` er nulindekseret. Kontakt-trinnet har `step_index = 5` (antal spørgsmål).

**`ms_since_prev`** = millisekunder siden forrige event i samme session. Højt tal på
et `step_view` → folk sidder fast på det spørgsmål.

**`meta.source`** er `"feedback"` (så data let kan adskilles hvis `/forretning`
senere også trackes).

## Sådan læser du funnel-tallet

Kør `funnel.sql` (Supabase → SQL Editor). Du får én række pr. `furthest_step`:

| furthest_step | sessions | completed |
|---|---|---|
| 0 | 40 | 0 | ← nåede kun spørgsmål 1
| 1 | 12 | 0 |
| … | | |
| 5 | 30 | 28 | ← nåede kontakt-trinnet; 28 gennemførte

- `furthest_step` = højeste trin sessionen så. Falder tallet kraftigt fra et trin
  til det næste, er det der folk springer fra.
- `sessions` = antal sessioner der nåede så langt (men ikke længere).
- `completed` = antal med `submit_success`.

**Lydløse fejl:** kig efter `submit_error` (med `status`/`message` i `meta`) og efter
sessioner der har mange `step_view` men aldrig `step_complete` på samme trin — det
er et trin der blokerer for nogen. Fx:

```sql
select event, meta, count(*) from public.form_events
where event in ('submit_error','validation_error')
group by event, meta order by count desc;
```

## Sikkerhed (RLS)
- RLS er slået til. Præcis én policy: `anon` må **kun `insert`**.
- `anon` har ikke `select` — data kan ikke læses fra klienten (verificeret: et
  anon-select afvises med `permission denied`).
- Anon-nøglen i `tracking.js` er offentlig (som al Supabase anon-nøgler) og kan kun
  indsætte.

## Flyt til et andet Supabase-projekt
Tracking-data ligger p.t. i projektet **`contentops-scratch`** (`brskrvvnisnuslufkeqi`),
valgt fordi der ikke fandtes et nielswahlberg-projekt. Sådan flytter du:

1. Kør migrationen (`supabase/migrations/20260807000000_create_form_events_tracking.sql`)
   i det ønskede projekt.
2. Skift `SUPABASE_URL` og `SUPABASE_ANON_KEY` øverst i `tracking.js` til det projekts
   værdier (Supabase → Project Settings → API).

Ikke andet skal ændres.
