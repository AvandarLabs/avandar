-- Private resource permissions hardening (P1).
--
-- Consolidates the eleven incremental migrations this branch originally used
-- into one. Generated with `supabase db diff` from supabase/schemas/, so it is
-- the declarative state rather than a hand-merge of the originals. Verified by
-- pg_dump comparison against the pre-consolidation database: functions,
-- triggers, indexes, tables and all 271 GRANT/REVOKE lines identical.
--
-- Timestamped before 20260813151500_STORAGE-gate-workspaces-bucket-on-dataset-access.sql
-- on purpose. That storage migration calls util__storage_object_dataset_id and
-- util__storage_object_workspace_id, both created here. Nothing in this file
-- touches storage, so nothing forces a second public migration after the
-- STORAGE ones.
--
-- The two leading `drop policy` statements repair corrupted identifiers rather
-- than changing behaviour. 20260602172559_drop_list_shared_with_me_rpc.sql was
-- generated output applied unreviewed, and it line-wrapped two policy names,
-- baking a literal newline and two spaces into the identifier. Postgres then
-- truncated the result at 63 bytes. The policies recreated below carry the
-- names supabase/schemas/30.usage_analytics_events.sql actually declares. The
-- USING and WITH CHECK expressions are unchanged.
--
drop policy if exists "
  Authenticated users can INSERT analytics events for workspac" on "public"."usage_analytics_events";

drop policy if exists "
  Workspace owners can SELECT analytics events for their works" on "public"."usage_analytics_events";

drop policy if exists "Resource admins can insert resource_shares" on "public"."resource_shares";

drop policy if exists "Resource admins can update resource_shares" on "public"."resource_shares";

create index idx_dashboards__workspace_owner on public.dashboards using btree (
  workspace_id,
  owner_id
);

create index idx_datasets__workspace_owner on public.datasets using btree (
  workspace_id,
  owner_id
);

set
  check_function_bodies = off;

create or replace function public.dashboards__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path to 'public' as $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dashboard workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.datasets__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path to 'public' as $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dataset workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.resource_shares__validate_principal_workspace () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
declare
  v_is_principal_in_workspace boolean;
begin
  if new.principal_type = 'user'::public.share_principal_type then
    select exists (
      select 1
      from public.workspace_memberships wm
      where
        wm.workspace_id = new.workspace_id and
        wm.user_id = new.principal_id
    ) into v_is_principal_in_workspace;
  elsif new.principal_type = 'user_group'::public.share_principal_type then
    select exists (
      select 1
      from public.user_groups ug
      where
        ug.workspace_id = new.workspace_id and
        ug.id = new.principal_id
    ) into v_is_principal_in_workspace;
  else
    v_is_principal_in_workspace := true;
  end if;

  if not v_is_principal_in_workspace then
    raise exception 'resource share principal must belong to the resource workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.resource_shares__validate_resource_workspace () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
declare
  v_resource_workspace_id uuid;
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = new.resource_id;
  elsif new.resource_type = 'dataset'::public.resource_type then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = new.resource_id;
  end if;

  if v_resource_workspace_id is distinct from new.workspace_id then
    raise exception 'resource share workspace must match the resource workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

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
$function$;

create or replace function public.rpc_workspaces__private_resource_counts (
  p_workspace_id uuid
) returns table (
  user_id uuid,
  private_dashboard_count bigint,
  private_dataset_count bigint
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
  )
  select
    wm.user_id,
    coalesce(pd.resource_count, 0),
    coalesce(pds.resource_count, 0)
  from public.workspace_memberships wm
  left join private_dashboards pd on pd.owner_id = wm.user_id
  left join private_datasets pds on pds.owner_id = wm.user_id
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

  return v_moved;
end;
$function$;

create or replace function public.util__auth_user_can_access_resource_in_workspace (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_required_role public.role_level
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_resource_workspace_id uuid;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id;
  else
    return false;
  end if;

  return
    v_resource_workspace_id = p_workspace_id and
    public.util__auth_user_can_access_resource (
      p_resource_type,
      p_resource_id,
      p_required_role
    );
end;
$function$;

create or replace function public.util__has_non_owner_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_owner_id uuid
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      rs.workspace_id = p_workspace_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from p_owner_id
      )
  );
$function$;

create or replace function public.util__is_resource_private_to_owner (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
  v_is_restricted boolean;
begin
  if p_resource_type = 'dashboard' then
    select
      d.owner_id,
      d.workspace_id,
      coalesce(d.is_restricted, false)
    into v_owner_id, v_workspace_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select
      ds.owner_id,
      ds.workspace_id,
      coalesce(ds.is_restricted, false)
    into v_owner_id, v_workspace_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
  else
    return false;
  end if;

  if v_owner_id is null then
    return false;
  end if;

  if not v_is_restricted then
    return false;
  end if;

  return not public.util__has_non_owner_share (
    p_resource_type,
    p_resource_id,
    v_workspace_id,
    v_owner_id
  );
end;
$function$;

create or replace function public.util__storage_object_dataset_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path to 'public' as $function$
  select case
    when split_part(p_object_name, '/', 3) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then replace(split_part(p_object_name, '/', 3), '.parquet', '')::uuid
    else null
  end;
$function$;

create or replace function public.util__storage_object_workspace_id (
  p_object_name text
) returns uuid language sql immutable
set
  search_path to 'public' as $function$
  select case
    when split_part(p_object_name, '/', 1) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 1)::uuid
    else null
  end;
$function$;

create or replace function public.util__resource_effective_role (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns public.role_level language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
  v_is_public boolean := false;
  v_app public.app_type;
  v_uid uuid := auth.uid ();
  v_max_rank int := 0;
  v_share_rank int;
  v_user_app_role public.role_level;
begin
  if v_uid is null then
    return null;
  end if;

  if p_resource_type = 'dashboard' then
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false),
      coalesce(d.is_public, false)
    into v_workspace_id, v_owner_id, v_is_restricted, v_is_public
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select
      ds.workspace_id,
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources';
  else
    return null;
  end if;

  if v_workspace_id is null then
    return null;
  end if;

  if v_owner_id = v_uid then
    return 'admin';
  end if;

  -- Settings Admins are admin on everything in this workspace EXCEPT resources
  -- their owner has kept private (restricted, zero non-owner shares). Mirrors
  -- Google Drive: an org admin cannot read an employee's private document.
  --
  -- Public dashboards are never private however `is_restricted` is set, because
  -- the anon policy already exposes them; excluding them here keeps an admin's
  -- edit rights on a dashboard the whole internet can read.
  --
  -- Composed inline from values already in scope rather than calling
  -- util__is_resource_private_to_owner, which would re-fetch the row. RLS calls
  -- this function per row.
  if public.util__is_settings_admin (v_workspace_id) and (
    v_is_public or
    not (
      v_is_restricted and
      not public.util__has_non_owner_share (
        p_resource_type,
        p_resource_id,
        v_workspace_id,
        v_owner_id
      )
    )
  ) then
    return 'admin';
  end if;

  -- Shares and app-role grants never apply to users who are not workspace
  -- members (prevents workspace-wide or direct shares from opening rows to
  -- arbitrary authenticated users). Owner and settings-admin paths above
  -- already returned.
  if not exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = v_workspace_id and
      wm.user_id = v_uid
  ) then
    return null;
  end if;

  select coalesce(max(public.util__role_level_rank (rs.role)), 0)
  into v_share_rank
  from public.resource_shares rs
  where
    rs.workspace_id = v_workspace_id and
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    (
      (
        rs.principal_type = 'user' and
        rs.principal_id = v_uid
      ) or
      (
        rs.principal_type = 'workspace' and
        rs.principal_id is null
      ) or
      (
        rs.principal_type = 'user_group' and
        rs.principal_id is not null and
        exists (
          select 1
          from public.user_group_memberships ugm
          inner join public.user_groups ug on ug.id = ugm.user_group_id
          where
            ugm.user_group_id = rs.principal_id and
            ugm.user_id = v_uid and
            ug.workspace_id = v_workspace_id
        ) and
        (
          rs.requires_app_access = false or
          public.util__get_auth_user_app_role (v_workspace_id, v_app) is not null
        )
      )
    );

  v_max_rank := greatest(v_max_rank, coalesce(v_share_rank, 0));

  if not v_is_restricted then
    select public.util__get_auth_user_app_role (v_workspace_id, v_app)
    into v_user_app_role;

    if v_user_app_role is not null then
      v_max_rank := greatest(
        v_max_rank,
        public.util__role_level_rank (v_user_app_role)
      );
    end if;
  end if;

  if v_max_rank = 0 then
    return null;
  end if;

  return public.util__rank_to_role_level (v_max_rank);
end;
$function$;

create policy "Authenticated users can INSERT analytics events for workspaces " on "public"."usage_analytics_events" as permissive for insert to authenticated
with
  check (
    (
      (
        (
          user_id is null
        ) or
        (
          user_id = auth.uid ()
        )
      ) and
      (
        (
          workspace_id is null
        ) or
        (
          exists (
            select
              1
            from
              public.workspace_memberships m
            where
              (
                (
                  m.workspace_id = usage_analytics_events.workspace_id
                ) and
                (
                  m.user_id = auth.uid ()
                )
              )
          )
        )
      )
    )
  );

create policy "Workspace managers can SELECT analytics events for their worksp" on "public"."usage_analytics_events" as permissive for
select
  to authenticated using (
    (
      (
        workspace_id is not null
      ) and
      public.util__can_manage_workspace_settings (
        workspace_id
      )
    )
  );

create policy "Resource admins can insert resource_shares" on "public"."resource_shares" as permissive for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource_in_workspace (
      resource_type,
      resource_id,
      workspace_id,
      'admin'::public.role_level
    )
  );

create policy "Resource admins can update resource_shares" on "public"."resource_shares" as permissive
for update
  to authenticated using (
    public.util__auth_user_can_access_resource_in_workspace (
      resource_type,
      resource_id,
      workspace_id,
      'admin'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_can_access_resource_in_workspace (
      resource_type,
      resource_id,
      workspace_id,
      'admin'::public.role_level
    )
  );

create trigger tr__dashboards__prevent_workspace_id_change before
update of workspace_id on public.dashboards for each row
execute function public.dashboards__prevent_workspace_id_change ();

create trigger tr__datasets__prevent_workspace_id_change before
update of workspace_id on public.datasets for each row
execute function public.datasets__prevent_workspace_id_change ();

create trigger tr__resource_shares__01_validate_resource_workspace before insert or
update on public.resource_shares for each row
execute function public.resource_shares__validate_resource_workspace ();

create trigger tr__resource_shares__02_validate_principal_workspace before insert or
update on public.resource_shares for each row
execute function public.resource_shares__validate_principal_workspace ();

-- Hand-added. `supabase db diff` does not reliably emit GRANT/REVOKE (see the
-- Known Caveats section of the supabase-declarative-schema skill), so these two
-- revokes are absent from the generated output above even though
-- supabase/schemas/16.utils.resource-permissions.sql declares them.
--
-- They matter: both helpers are `security definer` and answer "is this
-- resource private, and to whom". Left executable by `anon` and
-- `authenticated`, either one is a probe an ordinary user can call directly to
-- learn about resources they cannot read.
revoke
execute on function public.util__has_non_owner_share (
  public.resource_type,
  uuid,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated;

revoke
execute on function public.util__is_resource_private_to_owner (
  public.resource_type,
  uuid
)
from
  public,
  anon,
  authenticated;
