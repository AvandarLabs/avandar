-- Generated with `supabase db diff` from supabase/schemas/ and then trimmed to
-- the statements this change owns. The generated output also carried ~880 lines
-- of pre-existing drift (unrelated grants and `analytics.*` view churn) that
-- this change does not own.
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__dashboard_counts_as_shareable(p_dashboard_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (
      select
        d.visibility = 'public'::public.dashboard_visibility or
        (
          d.visibility = 'workspace'::public.dashboard_visibility and
          not public.util__is_resource_private_to_owner (
            'dashboard'::public.resource_type,
            d.id
          )
        )
      from public.dashboards d
      where d.id = p_dashboard_id
    ),
    false
  );
$function$
;

-- Hand-added. `supabase db diff` does not reliably emit GRANT/REVOKE, so this
-- revoke is absent from the generated output above even though
-- supabase/schemas/18.entitlements.dashboards.sql declares it. It matters: the
-- helper is `security definer` and reads dashboards the caller may not be able
-- to select, so left executable by `anon` and `authenticated` it is a probe an
-- ordinary user can call to learn about resources they cannot read.
revoke
execute on function public.util__dashboard_counts_as_shareable (uuid)
from
  public,
  anon,
  authenticated;
