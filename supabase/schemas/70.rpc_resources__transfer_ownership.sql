/**
 * Reassigns a resource's owner without granting the caller any read access.
 *
 * Security definer so a Settings Admin can act on a row RLS hides from them
 * (P1 makes owner-private resources invisible to admins). Returns void
 * precisely so no private data can leak through a return value.
 *
 * Unblocks offboarding: `owner_id` on both resource tables is
 * ON DELETE NO ACTION, so a member who owns resources cannot otherwise be
 * removed from the workspace.
 *
 * Updates `owner_profile_id` as well as `owner_id`. Both tables declare
 * `owner_profile_id uuid not null` referencing `user_profiles` with
 * ON DELETE NO ACTION, so moving `owner_id` alone would leave that FK pointing
 * at the departing member and the removal would stay blocked while this
 * function appeared to succeed.
 *
 * @param p_new_owner_id Must already be a member of the resource's workspace.
 */
create or replace function public.rpc_resources__transfer_ownership (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_new_owner_id uuid
) returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_workspace_id uuid;
  v_current_owner_id uuid;
  v_new_profile_id uuid;
  v_app public.app_type;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id, d.owner_id
    into v_workspace_id, v_current_owner_id
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id, ds.owner_id
    into v_workspace_id, v_current_owner_id
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources';
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  if v_workspace_id is null then
    raise exception 'resource not found: % %', p_resource_type, p_resource_id;
  end if;

  if not public.util__can_manage_workspace_settings (v_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- A security definer function bypasses the resource UPDATE policy, which
  -- normally enforces that owner_id stays inside the workspace. Re-check here
  -- so this function cannot move a resource out of its workspace.
  if not exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = v_workspace_id and
      wm.user_id = p_new_owner_id
  ) then
    raise exception 'new owner must be a member of the resource workspace';
  end if;

  -- Nothing to do, and nothing worth auditing.
  if v_current_owner_id = p_new_owner_id then
    return;
  end if;

  select up.id
  into v_new_profile_id
  from public.user_profiles up
  where
    up.user_id = p_new_owner_id and
    up.workspace_id = v_workspace_id;

  if v_new_profile_id is null then
    raise exception 'new owner has no user_profile in this workspace';
  end if;

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  else
    update public.datasets
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  end if;

  insert into public.usage_analytics_events (
    workspace_id,
    user_id,
    event_name,
    app,
    payload
  )
  values (
    v_workspace_id,
    auth.uid (),
    'resource.ownership_transferred',
    v_app,
    jsonb_build_object(
      'resourceType', p_resource_type,
      'resourceId', p_resource_id,
      'previousOwnerId', v_current_owner_id,
      'newOwnerId', p_new_owner_id
    )
  );
end;
$$;
