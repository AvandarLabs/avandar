create schema if not exists "private";

revoke all on schema private
from
  public,
  anon,
  authenticated,
  service_role;

grant usage on schema private to authenticated;

alter table "public"."dashboards"
add constraint "dashboards__settled_snapshot_consistent" check (
  (
    (
      snapshot_transition_kind is not null
    ) or
    (
      (
        visibility = 'draft'::public.dashboard_visibility
      ) and
      (
        snapshot_revision is null
      )
    ) or
    (
      (
        visibility = any (
          array[
            'workspace'::public.dashboard_visibility,
            'public'::public.dashboard_visibility
          ]
        )
      ) and
      (
        snapshot_revision is not null
      )
    )
  )
) not valid;

alter table "public"."dashboards" validate constraint "dashboards__settled_snapshot_consistent";

set
  check_function_bodies = off;

create or replace function private.util__auth_user_can_delete_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to '' as $function$
  select coalesce(
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.util__storage_object_dashboard_id (p_object_name)
    ) and
    exists (
      select 1
      from public.dashboards
      where
        dashboards.id = public.util__storage_object_dashboard_id (
          p_object_name
        ) and
        case dashboards.snapshot_transition_kind
          when 'unpublish' then true
          when 'delete' then true
          when 'abort_publish' then
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
          when 'publish' then
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name) and
            dashboards.snapshot_transition_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
          else
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
        end
    ),
    false
  );
$function$;

revoke all on function private.util__auth_user_can_delete_dashboard_snapshot_object (
  text,
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_delete_dashboard_snapshot_object (
  text,
  text
) to authenticated;

create or replace function private.util__auth_user_can_write_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language plpgsql security definer
set
  search_path to '' as $function$
declare
  can_write boolean;
begin
  select
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      dashboards.id
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
$function$;

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
