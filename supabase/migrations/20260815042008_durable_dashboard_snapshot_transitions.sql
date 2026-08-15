create type "public"."dashboard_snapshot_transition_kind" as enum(
  'publish',
  'unpublish',
  'delete'
);

alter table "public"."dashboards"
add column "snapshot_transition_kind" public.dashboard_snapshot_transition_kind;

alter table "public"."dashboards"
add column "snapshot_transition_prior_revision" uuid;

alter table "public"."dashboards"
add column "snapshot_transition_prior_visibility" public.dashboard_visibility;

alter table "public"."dashboards"
add column "snapshot_transition_revision" uuid;

alter table "public"."dashboards"
add column "snapshot_transition_target_visibility" public.dashboard_visibility;

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
            snapshot_transition_kind = 'publish'::public.dashboard_snapshot_transition_kind
          ) and
          (
            snapshot_transition_target_visibility = any (
              array[
                'workspace'::public.dashboard_visibility,
                'public'::public.dashboard_visibility
              ]
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
        ) and (
          dashboards.snapshot_revision is distinct from
            public.util__storage_object_snapshot_revision (p_object_name) or
          dashboards.snapshot_transition_kind in ('unpublish', 'delete') or (
            dashboards.snapshot_transition_kind = 'publish' and
            dashboards.snapshot_transition_revision =
              public.util__storage_object_snapshot_revision (p_object_name)
          )
        )
    ),
    false
  );
$function$;

create or replace function public.util__auth_user_can_write_dashboard_snapshot_object (
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
        dashboards.snapshot_transition_kind = 'publish' and
        dashboards.snapshot_transition_revision =
          public.util__storage_object_snapshot_revision (p_object_name)
    ),
    false
  );
$function$;

create or replace function public.util__auth_user_can_modify_dashboard_snapshot_object (
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select public.util__auth_user_can_delete_dashboard_snapshot_object (
    p_object_name
  );
$function$;
