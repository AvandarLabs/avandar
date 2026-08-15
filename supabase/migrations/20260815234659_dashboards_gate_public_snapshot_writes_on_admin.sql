-- Gate writes into the world-readable `published` snapshot bucket on the
-- Dashboards admin role. `private.dashboards__enforce_publish_publicly` already
-- guards the DECISION to expose a dashboard to the open internet; this guards
-- the CONTENT that decision publishes, so an editor can no longer overwrite the
-- objects of an admin's open public claim. `published-private` stays
-- editor-tier because publishing internally is ordinary editor work.

CREATE OR REPLACE FUNCTION private.util__auth_user_can_write_dashboard_snapshot_object(p_bucket_id text, p_object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  can_write boolean;
begin
  select
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      dashboards.id
    ) and
    (
      p_bucket_id <> 'published' or
      public.util__auth_user_meets_min_app_role (
        dashboards.workspace_id,
        'dashboards'::public.app_type,
        'admin'::public.role_level
      )
    ) and
    dashboards.snapshot_transition_kind = 'publish' and
    dashboards.snapshot_transition_revision =
      public.util__storage_object_snapshot_revision (p_object_name) and
    (
      (
        dashboards.snapshot_transition_target_visibility = 'public' and
        p_bucket_id = 'published'
      ) or (
        dashboards.snapshot_transition_target_visibility = 'workspace' and
        p_bucket_id = 'published-private'
      )
    )
  into can_write
  from public.dashboards
  where
    dashboards.id = public.util__storage_object_dashboard_id (p_object_name)
  for share;

  return coalesce(can_write, false);
end;
$function$
;

revoke all on function private.util__auth_user_can_write_dashboard_snapshot_object (
  text,
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_write_dashboard_snapshot_object (
  text,
  text
) to authenticated;
