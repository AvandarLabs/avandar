-- Generated with `supabase db diff` from supabase/schemas/ and then trimmed to
-- the single statement this change owns. The generated output also carried
-- ~880 lines of pre-existing drift (unrelated grants and `analytics.*` view
-- churn) that this change does not own.
--
-- The change itself is one line inside the guard: the raise now carries
-- `hint = 'shareable_dashboard_limit'`. PostgREST forwards `hint` to the
-- client, which gives the frontend a stable marker to match on instead of the
-- English message text.
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.dashboards__assert_shareable_within_limit(p_dashboard_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_workspace_id uuid;
  v_max integer;
  v_count integer;
begin
  -- The same exemption as `private.dashboards__enforce_publish_publicly`, and
  -- for the same reason: end-user traffic arrives as `authenticated` through
  -- PostgREST, while the service role, edge functions, migrations and pgTAP
  -- fixtures write through paths that already bypass RLS, so gating them here
  -- would break trusted work without adding a boundary. `auth.uid()` alone is
  -- not enough, because a psql session that switches to `postgres` can still
  -- carry a leftover `request.jwt.claims`.
  --
  -- `current_setting('role')` rather than that trigger's `current_user`, and
  -- the difference is load-bearing. This function is SECURITY DEFINER, so
  -- `current_user` here is its owner and never the caller: phrased on
  -- `current_user` the exemption would fire for everybody and silently disable
  -- the entire cap. The `role` GUC is what `set role` writes, so it still
  -- reports `authenticated` inside a definer function, which was verified
  -- directly before this was written. It reads `none` on a psql session that
  -- never switched role.
  if
    coalesce(current_setting('role', true), 'none') <> 'authenticated' or
    auth.uid () is null
  then
    return;
  end if;

  if not public.util__dashboard_counts_as_shareable (p_dashboard_id) then
    return;
  end if;

  select d.workspace_id into v_workspace_id
  from public.dashboards d
  where d.id = p_dashboard_id;

  if v_workspace_id is null then
    return;
  end if;

  v_max := public.util__workspace_max_shareable_dashboards (v_workspace_id);

  if v_max is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.dashboards d
  where
    d.workspace_id = v_workspace_id and
    d.id <> p_dashboard_id and
    public.util__dashboard_counts_as_shareable (d.id);

  if v_count >= v_max then
    -- The `hint` is a CONTRACT with the client and must not be reworded.
    -- PostgREST passes `hint` through to the JSON error body, so
    -- `isShareableDashboardLimitError` in
    -- `src/utils/isShareableDashboardLimitError/isShareableDashboardLimitError.ts`
    -- matches on this exact string to tell the plan limit apart from every
    -- other rejection. Matching on the message instead would break the moment
    -- the copy is edited, and `42501` alone is raised by other policies
    -- (`dashboards__enforce_publish_publicly` among them), so neither the
    -- message nor the code is usable as the marker on its own.
    raise exception
      'This workspace''s plan allows % shared or public dashboard(s)', v_max
    using errcode = '42501', hint = 'shareable_dashboard_limit';
  end if;
end;
$function$
;

-- Hand-added. `supabase db diff` does not emit function ACLs, so a
-- `CREATE OR REPLACE` of a function whose EXECUTE was revoked leaves the
-- revoke in place on an existing database but would not restate it on a fresh
-- one built from migrations alone. Restated here so both arrive at the same
-- grants. The guard is a `security definer` read of another workspace's
-- billing state and dashboard inventory, and left callable it would be a probe
-- for both; the triggers reach it through the trigger machinery, which does
-- not consult EXECUTE at all.
revoke
execute on function private.dashboards__assert_shareable_within_limit (uuid)
from
  public,
  anon,
  authenticated,
  service_role;
