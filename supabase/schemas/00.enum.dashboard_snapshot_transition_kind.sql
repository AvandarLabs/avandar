-- The durable claim a dashboard holds while its snapshot objects and its
-- `visibility` are being moved into agreement. A dashboard is idle when
-- `dashboards.snapshot_transition_kind` is null; every other value names a
-- transition that some client has claimed and is expected to settle.
--
-- Only `publish`, `unpublish` and `delete` can be CLAIMED from the idle state
-- (`private.dashboards__snapshot_claim_is_valid`). `abort_publish` is reachable
-- only as a fence applied to an already-claimed `publish`
-- (`private.dashboards__snapshot_progress_is_valid`), which is why it is not
-- claimable on its own.
--
--   publish       - claimed by a dashboard editor before staging a new snapshot
--                   generation into `published` or `published-private`.
--                   `snapshot_transition_target_visibility` names the audience
--                   being published to. Settles by adopting that visibility and
--                   the staged `snapshot_transition_revision`.
--   abort_publish - a fence a client (or a later recovery pass) applies to its
--                   own abandoned `publish` claim so the staged generation can
--                   be cleaned up. Settles by restoring
--                   `snapshot_transition_prior_visibility` and
--                   `snapshot_transition_prior_revision`, so the previously
--                   published snapshot survives the failed attempt untouched.
--   unpublish     - claimed by a dashboard editor to withdraw a published
--                   dashboard. The claim itself already sets `visibility` to
--                   `draft`; settling clears `snapshot_revision` once the
--                   objects are gone.
--   delete        - claimed by someone with delete rights on the dashboard
--                   before its snapshot objects are removed and the row itself
--                   is deleted. It is NOT terminal: the claim also settles like
--                   `unpublish` (draft with no `snapshot_revision`), so a delete
--                   abandoned by a crashed client or a failed storage cleanup
--                   leaves a usable draft rather than a row that can never be
--                   published, deleted or repaired again. Settling never
--                   restores the prior visibility, because a `delete` claim
--                   authorises removing EVERY generation of the dashboard's
--                   snapshots (see
--                   `private.util__auth_user_can_delete_dashboard_snapshot_object`),
--                   so the objects the prior visibility pointed at may already
--                   be gone.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.dashboard_snapshot_transition_kind as enum(
  'publish',
  'abort_publish',
  'unpublish',
  'delete'
);
