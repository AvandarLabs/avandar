-- Give every published dashboard an immutable snapshot generation pointer, so
-- a republish writes a NEW folder of objects instead of overwriting the live
-- one.
--
-- The `update` backfill at the bottom is an operation a schema diff cannot
-- infer: `db diff` compares schema, never data. Without it every dashboard that
-- is published today would keep a NULL `snapshot_revision` and stop resolving
-- its snapshot objects.
alter table "public"."dashboards"
add column "snapshot_revision" uuid;

set
  check_function_bodies = off;

-- The sibling of `public.util__storage_object_dashboard_id`, which the previous
-- migration defines. Unversioned paths predate generation folders and map to
-- the reserved legacy revision the backfill below assigns.
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

-- Snapshots published before generation folders use the reserved legacy UUID.
-- Draft dashboards had no readable snapshot and retain a NULL pointer.
update public.dashboards
set
  snapshot_revision = '00000000-0000-0000-0000-000000000000'::uuid
where
  visibility <> 'draft'::public.dashboard_visibility and
  snapshot_revision is null;
