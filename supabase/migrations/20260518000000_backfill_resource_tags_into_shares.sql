-- Backfill resource_user_group_tags into resource_shares with
-- requires_app_access=true, then drop the table in the follow-up migration
-- (20260518000010_drop_resource_user_group_tags_table.sql). This file is the
-- DATA migration; the table-drop is the SCHEMA migration. Order matters: the
-- backfill must run BEFORE the table drop.
--
-- Role-translation caveat
-- -----------------------
-- The legacy tag mechanism granted each user *their own* app role on a tagged
-- resource (e.g. one member might have effectively been editor, another only
-- viewer, depending on each user's app role on the resource's app). The new
-- mechanism stores a single share-level role per (resource, user_group) pair.
-- There is no lossless translation. This migration picks 'editor' as the
-- converted role because it preserves edit capability for analyst-style
-- groups, which is the most common configuration today. requires_app_access
-- is set to true so members without the resource's app role remain locked
-- out, matching the legacy behavior for the no-app-role case. Workspaces
-- relying on per-user app-role variance via tags will need to add
-- finer-grained shares post-migration; see release notes.
--
-- Safety
-- ------
-- - `on conflict do nothing` on the insert means re-running this migration is
--   safe (idempotent).
-- - The update path only flips requires_app_access from false to true; it
--   never downgrades an existing share's role.
-- Insert a user_group share for each tag row that has no existing
-- (workspace_id, resource_type, resource_id, principal_type='user_group',
-- principal_id=<user_group_id>) share. The unique partial index
-- resource_shares__uniq_user_group_principal lets us use the index-inference
-- on-conflict form: list the same columns + the partial WHERE predicate.
insert into
  public.resource_shares (
    workspace_id,
    resource_type,
    resource_id,
    principal_type,
    principal_id,
    role,
    requires_app_access
  )
select
  rugt.workspace_id,
  rugt.resource_type,
  rugt.resource_id,
  'user_group'::public.share_principal_type,
  rugt.user_group_id,
  'editor'::public.role_level,
  true
from
  public.resource_user_group_tags rugt
on conflict (
  resource_type,
  resource_id,
  principal_type,
  principal_id
)
where
  principal_type = 'user_group'::public.share_principal_type do nothing;

-- For existing user_group shares whose (resource, group) pair matches a tag
-- row but where requires_app_access is still false, flip the flag on. We do
-- NOT downgrade the existing role: the share retains whatever role was set
-- explicitly. This preserves Drive-style union semantics while restoring the
-- "tag intersection" capability via the new flag.
update public.resource_shares rs
set
  requires_app_access = true,
  updated_at = now()
from
  public.resource_user_group_tags rugt
where
  rs.workspace_id = rugt.workspace_id and
  rs.resource_type = rugt.resource_type and
  rs.resource_id = rugt.resource_id and
  rs.principal_type = 'user_group'::public.share_principal_type and
  rs.principal_id = rugt.user_group_id and
  rs.requires_app_access = false;
