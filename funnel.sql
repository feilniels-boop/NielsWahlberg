-- Funnel: hvor mange sessioner nåede hvert trin, og hvor mange gennemførte.
-- furthest_step = det højeste trin (step_index) der blev vist i sessionen.
-- completed = 1 hvis sessionen har et submit_success.
with sessions as (
  select session_id,
         min(created_at) as started,
         max(case when event = 'submit_success' then 1 else 0 end) as completed,
         max(case when event in ('step_view') then step_index end) as furthest_step
  from public.form_events
  group by session_id
)
select furthest_step,
       count(*) as sessions,
       sum(completed) as completed
from sessions
group by furthest_step
order by furthest_step;

-- ------------------------------------------------------------------
-- Samme funnel, men KUN for /feedback (komponenten tagger meta.source).
-- Brug denne hvis /forretning også begynder at sende events.
-- ------------------------------------------------------------------
-- with sessions as (
--   select session_id,
--          min(created_at) as started,
--          max(case when event = 'submit_success' then 1 else 0 end) as completed,
--          max(case when event in ('step_view') then step_index end) as furthest_step
--   from public.form_events
--   where meta->>'source' = 'feedback'
--   group by session_id
-- )
-- select furthest_step,
--        count(*) as sessions,
--        sum(completed) as completed
-- from sessions
-- group by furthest_step
-- order by furthest_step;
