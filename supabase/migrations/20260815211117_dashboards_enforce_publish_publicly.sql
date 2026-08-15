drop policy "Users with editor app role can insert dashboards" on "public"."dashboards";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.dashboards__enforce_publish_publicly()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  -- The rule governs end-user requests, which PostgREST runs as `authenticated`
  -- with a JWT. The service role and direct psql writes (migrations, seeds,
  -- pgTAP setup) already bypass RLS entirely, so gating them here would break
  -- trusted paths without adding a boundary.
  --
  -- Both halves are load-bearing. `auth.uid()` alone is not enough because a
  -- psql session that switches to `postgres` can still carry a leftover
  -- `request.jwt.claims`, which is exactly what the storage pgTAP fixtures do.
  -- `current_user` alone is not enough because an `authenticated` request with
  -- no resolvable subject has no role to check against. The function is
  -- SECURITY INVOKER on purpose: under SECURITY DEFINER `current_user` would be
  -- the function owner rather than the caller.
  if current_user <> 'authenticated' or auth.uid () is null then
    return new;
  end if;

  if (
    (
      new.visibility = 'public'::public.dashboard_visibility and
      old.visibility is distinct from 'public'::public.dashboard_visibility
    ) or
    (
      new.snapshot_transition_target_visibility =
        'public'::public.dashboard_visibility and
      old.snapshot_transition_target_visibility is distinct from
        'public'::public.dashboard_visibility
    )
  )
    -- The role is checked against OLD.workspace_id, never NEW.workspace_id.
    -- NEW is attacker-controlled in the same statement, so reading it would let
    -- a caller name a workspace they are admin of to authorize publishing a
    -- dashboard that lives somewhere else.
    -- `tr__dashboards__prevent_workspace_id_change` also rejects that, but only
    -- because its name happens to sort after this one, and trigger firing order
    -- is not a boundary worth depending on.
    and not public.util__auth_user_meets_min_app_role (
      old.workspace_id,
      'dashboards'::public.app_type,
      'admin'::public.role_level
    ) then
    raise exception 'Publishing a dashboard publicly requires the Dashboards admin role'
    using errcode = '42501';
  end if;

  return new;
end;
$function$
;

revoke all on function private.dashboards__enforce_publish_publicly()
  from public, anon, authenticated, service_role;

  create policy "Users with editor app role can insert dashboards"
  on "public"."dashboards"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_insert_workspace_resource(workspace_id, 'dashboard'::public.resource_type, owner_id) AND (snapshot_transition_kind IS NULL) AND (visibility = 'draft'::public.dashboard_visibility)));

CREATE TRIGGER tr__dashboards__enforce_publish_publicly BEFORE UPDATE OF visibility, snapshot_transition_target_visibility ON public.dashboards FOR EACH ROW EXECUTE FUNCTION private.dashboards__enforce_publish_publicly();
