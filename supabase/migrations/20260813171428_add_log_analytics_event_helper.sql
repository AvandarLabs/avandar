set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__log_analytics_event(p_event_name text, p_workspace_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_app public.app_type DEFAULT NULL::public.app_type, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.usage_analytics_events (
    event_name,
    workspace_id,
    user_id,
    app,
    payload,
    client
  ) values (
    p_event_name,
    p_workspace_id,
    p_user_id,
    p_app,
    p_payload,
    'db'
  );
exception
  when others then
    null;
end;
$function$
;

revoke execute on function public.util__log_analytics_event (
  text,
  uuid,
  uuid,
  public.app_type,
  jsonb
) from public, anon, authenticated;
