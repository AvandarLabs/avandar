drop function if exists "public"."rpc_workspaces__private_resource_counts" (
  p_workspace_id uuid
);

set
  check_function_bodies = off;

create or replace function public.rpc_resources__transfer_ownership (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_new_owner_id uuid
) returns void language plpgsql security definer
set
  search_path to 'public' as $function$
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
    where d.id = p_resource_id
    for update;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id, ds.owner_id
    into v_workspace_id, v_current_owner_id
    from public.datasets ds
    where ds.id = p_resource_id
    for update;
    v_app := 'data_sources';
  elsif p_resource_type = 'map' then
    select m.workspace_id, m.owner_id
    into v_workspace_id, v_current_owner_id
    from public.maps m
    where m.id = p_resource_id
    for update;
    v_app := 'gis';
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  -- A missing resource raises the SAME error as an unauthorised caller, on
  -- purpose. This function is security definer, so its lookup above spans every
  -- workspace, not just the caller's. Raising a distinct "not found" here would
  -- turn the function into an existence oracle: any authenticated user could
  -- probe arbitrary ids and learn from which error came back whether a resource
  -- exists anywhere in the system, all before any authorisation check runs.
  --
  -- Authorisation cannot simply be checked first, because the workspace to
  -- authorise against is only known after the lookup. Making the two cases
  -- indistinguishable is the fix. The cost is that an authorised admin passing
  -- a genuinely stale id also sees insufficient_privilege; that only happens on
  -- a delete race, and leaking existence to everyone is the worse trade.
  if
    v_workspace_id is null or
    not public.util__can_manage_workspace_settings (v_workspace_id)
  then
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
  elsif p_resource_type = 'dataset' then
    update public.datasets
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  else
    update public.maps
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
$function$;

create or replace function public.rpc_workspaces__private_resource_counts (
  p_workspace_id uuid
) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint,
  private_map_count bigint
) language plpgsql security definer
set
  search_path to 'public' as $function$
#variable_conflict use_column
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  with private_dashboards as (
    select d.owner_id, count(*) as resource_count
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.is_restricted and
      not d.is_public and
      not public.util__has_non_owner_share (
        'dashboard'::public.resource_type,
        d.id,
        d.workspace_id,
        d.owner_id
      )
    group by d.owner_id
  ),
  private_datasets as (
    select ds.owner_id, count(*) as resource_count
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.is_restricted and
      not public.util__has_non_owner_share (
        'dataset'::public.resource_type,
        ds.id,
        ds.workspace_id,
        ds.owner_id
      )
    group by ds.owner_id
  ),
  private_maps as (
    select m.owner_id, count(*) as resource_count
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.is_restricted and
      not public.util__has_non_owner_share (
        'map'::public.resource_type,
        m.id,
        m.workspace_id,
        m.owner_id
      )
    group by m.owner_id
  )
  select
    wm.user_id,
    coalesce(pd.resource_count, 0),
    coalesce(pds.resource_count, 0),
    coalesce(pm.resource_count, 0)
  from public.workspace_memberships wm
  left join private_dashboards pd on pd.owner_id = wm.user_id
  left join private_datasets pds on pds.owner_id = wm.user_id
  left join private_maps pm on pm.owner_id = wm.user_id
  where wm.workspace_id = p_workspace_id;
end;
$function$;

create or replace function public.rpc_workspaces__transfer_all_owned_resources (
  p_workspace_id uuid,
  p_from_user_id uuid,
  p_new_owner_id uuid
) returns integer language plpgsql security definer
set
  search_path to 'public' as $function$
declare
  v_moved integer := 0;
  v_resource_id uuid;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_resource_id in
    select d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dashboard'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dataset'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select m.id
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'map'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$function$;
