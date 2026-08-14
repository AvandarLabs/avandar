/**
 * Makes a resource private to its owner in one transaction: deletes every
 * non-owner share and sets `is_restricted`.
 *
 * SECURITY INVOKER, deliberately, unlike every other rpc_ function in this
 * schema. It never needs to touch a row the caller cannot already see: the
 * owner short-circuits to `admin` in util__resource_effective_role, which
 * satisfies both the resource_shares DELETE policy and the resource UPDATE
 * policy. Running as the caller keeps existing RLS as the backstop and adds no
 * new privilege surface. It also closes the existence oracle that
 * rpc_resources__transfer_ownership has to handle by hand: the lookup below is
 * subject to the resource SELECT policy, so a row the caller cannot see and a
 * row that does not exist both leave v_owner_id null and raise the same error.
 *
 * Owner-only. A non-owner resource admin who ran this would delete their own
 * share and lock themselves out on the spot, so they are refused, not warned.
 *
 * @returns void. Nothing about a newly private resource is worth returning.
 */
create or replace function public.rpc_resources__make_private (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns void language plpgsql
set
  search_path = public as $$
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
  -- function is SECURITY INVOKER, so it could only call the helper if that
  -- revoke were undone for every caller. Reading through the caller's own RLS
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
$$;
