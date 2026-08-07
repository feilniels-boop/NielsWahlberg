-- Funnel-tracking for lead magnet-formularen.
-- Kun adfærd — INGEN persondata (ingen svar, navne, mails, telefonnumre).

create table public.form_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  session_id   uuid not null,
  event        text not null,
  step_index   int,
  step_key     text,
  ms_since_prev int,
  device       text,
  viewport_w   int,
  user_agent   text,
  referrer     text,
  meta         jsonb
);

create index on public.form_events (session_id);
create index on public.form_events (created_at desc);
create index on public.form_events (event);

alter table public.form_events enable row level security;

-- Præcis én policy: anon må KUN insert (intet select/update/delete).
create policy "anon can insert form_events"
  on public.form_events
  for insert
  to anon
  with check (true);

-- Tabel-privilegier: anon får kun insert (ingen select), så data ikke kan læses fra klienten.
revoke all on table public.form_events from anon;
grant insert on table public.form_events to anon;
