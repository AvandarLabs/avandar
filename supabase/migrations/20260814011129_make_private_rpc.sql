set
  check_function_bodies = off;

create or replace function public.rpc_resources__make_private (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns void language plpgsql
set
  search_path to 'public' as $function$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
begin
  -- `for update` on an RLS table also applies the UPDATE policy's USING
  -- clause, not just the SELECT policy. The owner satisfies both.
  if p_resource_type = 'dashboard' then
    select d.owner_id, d.workspace_id
    into v_owner_id, v_workspace_id
    from public.dashboards d
    where d.id = p_resource_id
    for update;
  elsif p_resource_type = 'dataset' then
    select ds.owner_id, ds.workspace_id
    into v_owner_id, v_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id
    for update;
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  if v_owner_id is null or v_owner_id <> auth.uid () then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- Shares first, restriction second. Not load-bearing while this is
  -- owner-only, because the owner short-circuit does not read is_restricted.
  -- Written this way so that if the gate is ever widened past the owner,
  -- restricting first cannot revoke the caller's own DELETE rights midway.
  delete from public.resource_shares rs
  where
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    rs.workspace_id = v_workspace_id and
    (
      rs.principal_type <> 'user'::public.share_principal_type or
      rs.principal_id is distinct from v_owner_id
    );

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set is_restricted = true
     where id = p_resource_id;
  else
    update public.datasets
       set is_restricted = true
     where id = p_resource_id;
  end if;

  -- The DELETE above is RLS-filtered. If a policy silently skipped a row, this
  -- would return success on a still-shared resource, which is the exact
  -- failure mode the function exists to remove. Raise so the whole transaction
  -- rolls back rather than half-landing. Purely a tripwire: no known
  -- configuration reaches it, so no test provokes it.
  --
  -- Repeats util__has_non_owner_share's predicate rather than calling it.
  -- Execute on that helper is revoked from `authenticated` precisely so it
  -- cannot be used as a "does this resource have shares" probe, and this
  -- function is SECURITY INVOKER, so it could not call the helper unless
  -- execute were granted back to `authenticated`, which would re-open exactly
  -- the probe the revoke exists to close. Reading through the caller's own RLS
  -- loses nothing here: the resource_shares SELECT policy shows a workspace
  -- member every share row in their workspace, so no surviving share on their
  -- own resource can hide from this check.
  if exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      rs.workspace_id = v_workspace_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from v_owner_id
      )
  ) then
    raise exception 'make_private_incomplete';
  end if;
end;
$function$;
