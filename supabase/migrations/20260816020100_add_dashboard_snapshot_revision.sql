alter table "public"."dashboards"
add column "snapshot_revision" uuid;

set
  check_function_bodies = off;

create or replace function public.util__storage_object_snapshot_revision (
  p_object_name text
) returns uuid language sql immutable
set
  search_path to 'public' as $function$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then split_part(p_object_name, '/', 4)::uuid
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then '00000000-0000-0000-0000-000000000000'::uuid
    else null
  end;
$function$;

create or replace function public.util__storage_object_dashboard_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path to 'public' as $function$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
      or p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$function$;

create or replace function public.util__auth_user_can_modify_dashboard_snapshot_object (
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
        dashboards.snapshot_revision is distinct from
          public.util__storage_object_snapshot_revision (p_object_name)
    ),
    false
  );
$function$;

-- Snapshots published before generation folders use the reserved legacy UUID.
-- Draft dashboards had no readable snapshot and retain a NULL pointer.
update public.dashboards
set
  snapshot_revision = '00000000-0000-0000-0000-000000000000'::uuid
where
  visibility <> 'draft'::public.dashboard_visibility and
  snapshot_revision is null;
