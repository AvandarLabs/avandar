-- Generated with `supabase db diff` from supabase/schemas/ and then trimmed to
-- the statements this change owns. The generated output also carried ~880 lines
-- of pre-existing drift (unrelated grants and `analytics.*` view churn) that
-- this change does not own.
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
    raise exception
      'This workspace''s plan allows % shared or public dashboard(s)', v_max
    using errcode = '42501';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.dashboards__enforce_shareable_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.dashboards__assert_shareable_within_limit (new.id);
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.resource_shares__enforce_shareable_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    perform private.dashboards__assert_shareable_within_limit (new.resource_id);
  end if;

  return null;
end;
$function$
;

-- Hand-added. `supabase db diff` does not emit function ACLs, so these revokes
-- are absent from the generated output above even though
-- supabase/schemas/18.entitlements.dashboards.sql declares them. They matter:
-- the guard is a `security definer` read of another workspace's billing state
-- and dashboard inventory, and left callable it would be a probe for both. The
-- triggers reach these functions through the trigger machinery, which does not
-- consult EXECUTE at all.
revoke
execute on function private.dashboards__assert_shareable_within_limit (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function private.dashboards__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function private.resource_shares__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

CREATE TRIGGER tr__dashboards__enforce_shareable_limit AFTER INSERT OR UPDATE OF visibility, is_restricted ON public.dashboards FOR EACH ROW EXECUTE FUNCTION private.dashboards__enforce_shareable_limit();

CREATE TRIGGER tr__resource_shares__enforce_shareable_limit AFTER INSERT OR UPDATE ON public.resource_shares FOR EACH ROW EXECUTE FUNCTION private.resource_shares__enforce_shareable_limit();
