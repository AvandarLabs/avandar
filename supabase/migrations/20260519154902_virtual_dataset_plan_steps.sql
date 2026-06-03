-- Phase 3 — Plans + DAG: persist the analytic plan that produced a
-- virtual dataset onto the dataset itself, so re-opening the dataset
-- restores the full step-by-step canvas instead of only the final SQL.
--
-- Shape: a JSONB blob containing `{ steps, rootMessage }` matching the
-- `ChatPlan` shape from `shared/types/chat.types.ts`. NULL when the
-- dataset was saved from a one-shot SQL query (not a plan) — most
-- existing rows.
alter table public.datasets__virtual
  add column if not exists plan_steps jsonb;

comment on column public.datasets__virtual.plan_steps is
  'When the dataset was produced by a multi-step LLM-proposed analytic plan, the plan as JSON { steps, rootMessage }. Used to reopen the analysis. NULL for one-shot queries.';
