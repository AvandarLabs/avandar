alter table "public"."dashboards"
drop constraint "dashboards__snapshot_transition_consistent";

alter type "public"."dashboard_snapshot_transition_kind"
rename to "dashboard_snapshot_transition_kind__old_version_to_be_dropped";

create type "public"."dashboard_snapshot_transition_kind" as enum(
  'publish',
  'abort_publish',
  'unpublish',
  'delete'
);

alter table "public"."dashboards"
alter column snapshot_transition_kind type "public"."dashboard_snapshot_transition_kind" using snapshot_transition_kind::text::"public"."dashboard_snapshot_transition_kind";

drop type "public"."dashboard_snapshot_transition_kind__old_version_to_be_dropped";

alter table "public"."dashboards"
add constraint "dashboards__snapshot_transition_consistent" check (
  (
    (
      (
        snapshot_transition_kind is null
      ) and
      (
        snapshot_transition_revision is null
      ) and
      (
        snapshot_transition_prior_revision is null
      ) and
      (
        snapshot_transition_prior_visibility is null
      ) and
      (
        snapshot_transition_target_visibility is null
      )
    ) or
    (
      (
        snapshot_transition_kind is not null
      ) and
      (
        snapshot_transition_revision is not null
      ) and
      (
        snapshot_transition_prior_visibility is not null
      ) and
      (
        (
          (
            snapshot_transition_kind = any (
              array[
                'publish'::public.dashboard_snapshot_transition_kind,
                'abort_publish'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility = any (
              array[
                'workspace'::public.dashboard_visibility,
                'public'::public.dashboard_visibility
              ]
            )
          ) and
          (
            visibility = snapshot_transition_prior_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        ) or
        (
          (
            snapshot_transition_kind = any (
              array[
                'unpublish'::public.dashboard_snapshot_transition_kind,
                'delete'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility is null
          ) and
          (
            visibility = 'draft'::public.dashboard_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        )
      )
    )
  )
) not valid;

alter table "public"."dashboards" validate constraint "dashboards__snapshot_transition_consistent";

set
  check_function_bodies = off;

create or replace function public.util__auth_user_can_delete_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
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

create or replace function public.util__auth_user_can_write_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language plpgsql security definer
set
  search_path to 'public' as $function$
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

create or replace function public.util__auth_user_can_write_dashboard_snapshot_object (
  p_object_name text
) returns boolean language sql volatile security definer
set
  search_path to 'public' as $function$
  select false;
$function$;

create or replace function public.util__auth_user_can_delete_dashboard_snapshot_object (
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select false;
$function$;

create or replace function public.util__auth_user_can_modify_dashboard_snapshot_object (
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select false;
$function$;
