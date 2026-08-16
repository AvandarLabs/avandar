-- Generated with `supabase db diff` from supabase/schemas/ and then trimmed to
-- the statements this change owns. The generated output also carried ~880 lines
-- of pre-existing drift (unrelated grants and `analytics.*` view churn) that
-- this change does not own.
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__workspace_max_shareable_dashboards(p_workspace_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_free_limit constant integer := 1;
  v_status public.subscriptions__status;
  v_max integer;
begin
  select s.subscription_status, s.max_shareable_dashboards_allowed
  into v_status, v_max
  from public.subscriptions s
  where s.workspace_id = p_workspace_id
  limit 1;

  if v_status is null then
    return v_free_limit;
  end if;

  if v_status not in ('active'::public.subscriptions__status,
                      'trialing'::public.subscriptions__status) then
    return v_free_limit;
  end if;

  return v_max;
end;
$function$
;

-- Hand-added. `supabase db diff` does not reliably emit GRANT/REVOKE, so this
-- revoke is absent from the generated output above even though
-- supabase/schemas/18.entitlements.dashboards.sql declares it. It matters: the
-- helper is `security definer` and reads a billing row the caller may not be
-- able to select.
revoke
execute on function public.util__workspace_max_shareable_dashboards (uuid)
from
  public,
  anon,
  authenticated;
