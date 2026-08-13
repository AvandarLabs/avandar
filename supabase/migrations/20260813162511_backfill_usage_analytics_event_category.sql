-- Backfill `event_category` for rows written before the column existed.
--
-- An earlier migration added the column with a `default 'other'`, which is what every
-- pre-existing row received. This recomputes them from the event name.
--
-- Scoped to `event_category = 'other'` so the statement is idempotent and so
-- re-running it can never overwrite a correctly categorised row. A row whose
-- name genuinely maps to `other` is simply rewritten to `other`.
--
-- `client` is deliberately not backfilled: its `web` default is already
-- correct for every pre-existing row, because the browser client was the only
-- writer before this change.
update public.usage_analytics_events
set
  event_category = public.util__analytics_event_category(event_name)
where
  event_category = 'other';
