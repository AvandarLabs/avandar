set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.dashboards__log_deleted_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__log_deleted_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.util__analytics_event_category(p_event_name text)
 RETURNS public.usage_analytics_events__category
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (
    case p_event_name
      -- acquisition
      when 'waitlist.code_verified' then 'acquisition'
      when 'waitlist.code_claimed' then 'acquisition'
      when 'user.registered' then 'acquisition'
      when 'user.email_confirmed' then 'acquisition'
      -- activation
      when 'workspace.created' then 'activation'
      when 'dataset.imported' then 'activation'
      when 'query.ran' then 'activation'
      when 'dashboard.published' then 'activation'
      -- engagement
      when 'user.signed_in' then 'engagement'
      when 'chat.message_sent' then 'engagement'
      when 'chat.sql_generated' then 'engagement'
      when 'chat.turn_completed' then 'engagement'
      when 'chat.turn_failed' then 'engagement'
      when 'dashboard.block_added_via_chat' then 'engagement'
      when 'dashboard.filter_changed' then 'engagement'
      when 'dashboard.share_settings_updated' then 'engagement'
      when 'dashboard.pdf_export_opened' then 'engagement'
      when 'dashboard.pdf_exported' then 'engagement'
      when 'query.failed' then 'engagement'
      -- expansion
      when 'workspace.invite_sent' then 'expansion'
      when 'workspace.invite_accepted' then 'expansion'
      when 'member.removed' then 'expansion'
      when 'dashboard.public_viewed' then 'expansion'
      -- Deletions are shrink signals, and `expansion` is the only category
      -- that models the account shrinking (see the enum's own comment, and
      -- `member.removed` above). Filing them under `engagement` would inflate
      -- engagement with churn.
      when 'dataset.deleted' then 'expansion'
      when 'dashboard.deleted' then 'expansion'
      -- revenue
      when 'subscription.created' then 'revenue'
      when 'subscription.plan_changed' then 'revenue'
      when 'subscription.status_changed' then 'revenue'
      else 'other'
    end
  )::public.usage_analytics_events__category;
$function$
;

CREATE TRIGGER tr__dashboards__log_deleted_analytics_event AFTER DELETE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.dashboards__log_deleted_analytics_event();

CREATE TRIGGER tr__datasets__log_deleted_analytics_event AFTER DELETE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.datasets__log_deleted_analytics_event();


