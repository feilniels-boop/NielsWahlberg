-- ============================================================
-- Funnel-plan: leads + page_views.
--
-- Kør denne fil i Supabase (SQL Editor) på DET SAMME projekt som
-- tracking.js peger på (SUPABASE_URL). Tabellerne indeholder PERSONDATA
-- (navn, mail, telefon, svar) — derfor har den offentlige anon-nøgle
-- INGEN adgang. Al læsning/skrivning sker server-side med
-- SUPABASE_SERVICE_ROLE_KEY (som bypasser RLS).
--
-- Samme indhold ligger som migration i
-- supabase/migrations/20260822000000_create_leads.sql
-- ============================================================

create table if not exists public.leads (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  slug           text unique not null,
  source         text,

  -- Kontakt
  name           text,
  company        text,
  email          text not null,
  phone          text,
  newsletter     boolean not null default false,

  -- Svar. answers = fuldt struktureret array [{id,type,question,value,display}].
  -- De tre felter herunder er kopieret ud for nem filtrering/triage.
  answers        jsonb,
  situation      text,     -- spørgsmål 1, valg A–E (E = track 2)
  price          text,     -- spørgsmål 3, valg A–E (vigtigste datapunkt)
  readiness      int,      -- spørgsmål 5, 1–5

  -- Genereret af Claude
  plan            jsonb,   -- {situation, diagnosis, funnel[4], video_titles[3], build_first, price_and_booking}
  talking_points  jsonb,   -- til admin: stikord til den personlige video
  loom_url        text,

  -- Workflow. status: new → generated → mail1_sent → mail2_sent → mail3_sent, samt booked.
  status          text not null default 'new',
  generated_at    timestamptz,
  notified_at     timestamptz,
  mail1_sent_at   timestamptz,
  mail2_sent_at   timestamptz,
  mail3_sent_at   timestamptz,
  booked_at       timestamptz
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- Sidevisninger af /plan/[slug].
create table if not exists public.page_views (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  lead_id      bigint references public.leads (id) on delete set null,
  slug         text,
  referrer     text,
  user_agent   text
);

create index if not exists page_views_lead_id_idx on public.page_views (lead_id);
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

-- Kanal-tal til /en/thanks. Niels udfylder én række om ugen (mandagstal).
-- Siden læser den nyeste række; er tabellen tom, vises kun leads-tallene.
create table if not exists public.channel_stats (
  id           bigserial primary key,
  recorded_at  date not null default current_date,
  videos       integer not null,
  views        integer not null,
  subscribers  integer,
  note         text
);

create index if not exists channel_stats_recorded_at_idx on public.channel_stats (recorded_at desc);

-- RLS slået til, INGEN policies → anon/authenticated kan intet.
-- service_role bypasser RLS, så serveren har fuld adgang.
alter table public.leads enable row level security;
alter table public.page_views enable row level security;
alter table public.channel_stats enable row level security;

-- Fjern enhver default-adgang for de offentlige roller (bælte + seler).
revoke all on table public.leads from anon, authenticated;
revoke all on table public.page_views from anon, authenticated;
revoke all on table public.channel_stats from anon, authenticated;
