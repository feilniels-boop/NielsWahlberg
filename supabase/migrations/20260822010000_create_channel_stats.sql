create table if not exists public.channel_stats (
  id           bigserial primary key,
  recorded_at  date not null default current_date,
  videos       integer not null,
  views        integer not null,
  subscribers  integer,
  note         text
);

create index if not exists channel_stats_recorded_at_idx on public.channel_stats (recorded_at desc);

alter table public.channel_stats enable row level security;
revoke all on table public.channel_stats from anon, authenticated;
