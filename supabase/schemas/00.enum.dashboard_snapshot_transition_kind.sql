-- The claim a dashboard holds while its snapshot objects and its `visibility`
-- are being moved into agreement. A dashboard is idle when
-- `dashboards.snapshot_transition_kind` is null.
--
--   publish       - staging a new snapshot generation for the audience named
--                   by `snapshot_transition_target_visibility`.
--   abort_publish - fences an abandoned `publish` so its staged generation can
--                   be cleaned up, restoring the prior visibility and revision.
--   unpublish     - withdrawing a published dashboard.
--   delete        - removing the snapshot objects and then the row. Not
--                   terminal: it settles like `unpublish`, so an abandoned
--                   delete leaves a usable draft rather than an unrepairable
--                   row.
--
-- Which values may be claimed from idle, and which only as a fence over an
-- existing claim, is defined by
-- `private.dashboards__snapshot_claim_is_valid` and
-- `private.dashboards__snapshot_progress_is_valid`.
--
-- Keep new values at the end: moving one forces a full rebuild of the type and
-- a rewrite of every column using it.
create type public.dashboard_snapshot_transition_kind as enum(
  'publish',
  'abort_publish',
  'unpublish',
  'delete'
);
