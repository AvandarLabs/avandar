-- Triggers that emit `usage_analytics_events` rows for resource deletions.
--
-- These live here rather than in `10.datasets.sql` and `10.dashboards.sql`,
-- where the per-table rule would normally put them, because they call
-- `public.util__log_analytics_event`, which `30.usage_analytics_events.sql`
-- defines. Schema files are applied in lexicographic order, so a `10.` file
-- cannot depend on a `30.` one.
--
-- Deletion is instrumented with triggers rather than client code because a
-- dataset or dashboard can disappear through several paths: the UI, an admin
-- script, a workspace-ownership transfer, or a `workspaces` cascade. A trigger
-- records every one of them, which is the whole reason the DB emitter exists.
--
-- Both triggers fire AFTER DELETE. The row is gone by then, so a failure here
-- cannot abort the delete, and `util__log_analytics_event` swallows errors on
-- top of that.
--
-- `auth.uid()` is the actor who performed the delete, which is not necessarily
-- `owner_id`: an admin can delete another member's resource. It is null for a
-- cascade or a service-role script, and the column is nullable to allow that.
--
-- Payloads carry no names or descriptions, only ids, the source type, and an
-- age in whole days. Names are user content and are barred from payloads.
--
-- Records a `dataset.deleted` event.
--
-- @returns: trigger
create or replace function public.datasets__log_deleted_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'dataset.deleted',
    old.workspace_id,
    auth.uid(),
    'data_sources'::public.app_type,
    jsonb_build_object(
      'datasetId', old.id,
      'sourceType', old.source_type,
      'ageDays', floor(extract(epoch from (now() - old.created_at)) / 86400)
    )
  );
  return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

create trigger tr__datasets__log_deleted_analytics_event
after delete on public.datasets for each row
execute function public.datasets__log_deleted_analytics_event ();

-- Records a `dashboard.deleted` event.
--
-- @returns: trigger
create or replace function public.dashboards__log_deleted_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'dashboard.deleted',
    old.workspace_id,
    auth.uid(),
    'dashboards'::public.app_type,
    jsonb_build_object(
      'dashboardId', old.id,
      'wasPublic', old.is_public,
      'ageDays', floor(extract(epoch from (now() - old.created_at)) / 86400)
    )
  );
  return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

create trigger tr__dashboards__log_deleted_analytics_event
after delete on public.dashboards for each row
execute function public.dashboards__log_deleted_analytics_event ();
