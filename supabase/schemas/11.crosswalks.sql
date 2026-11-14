/**
 * A saved mapping of many datasets with different column layouts onto one
 * set of columns, and the combined dataset that stacks them. Layouts,
 * columns, memberships, and mappings are written only through
 * `rpc_crosswalks__save`; the combined dataset and the columns that record
 * it only through `rpc_crosswalks__save_combined_dataset`.
 */
create table public.crosswalks (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this crosswalk belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. A user who still owns a crosswalk cannot be
  -- deleted.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- The owner's profile in this workspace
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the crosswalk was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the crosswalk was last updated
  updated_at timestamptz not null default now(),
  -- Name of the crosswalk
  name text not null,
  -- Description of the crosswalk
  description text,
  -- The combined dataset: a virtual dataset that stacks every mapped
  -- dataset. Set only by `rpc_crosswalks__save_combined_dataset`. Null
  -- before the first combine, and once that dataset is deleted.
  output_dataset_id uuid references public.datasets (id) on update cascade on delete set null,
  -- Whether governed columns come out as labels or as codes
  codes_output_as public.crosswalks__codes_output not null default 'labels',
  -- Whether the combined dataset starts with a `source_dataset` column
  -- naming the dataset each row came from
  adds_source_column boolean not null default true,
  -- When the combined dataset was last created or updated. Managed.
  compiled_at timestamptz,
  -- The code lists the combined dataset embedded when it was last saved,
  -- as `[{ code_list_id, fingerprint }]`, where `fingerprint` hashes the
  -- list's pairs at that time. The browser compares fingerprints to say a
  -- list changed since. An array rather than an object keyed by id, so no
  -- key transform can rewrite an id. Managed.
  compiled_code_lists jsonb,
  -- Lets child tables use a composite foreign key that keeps them in the
  -- crosswalk's workspace.
  unique (id, workspace_id),
  constraint crosswalks__name_not_blank check (btrim(name) <> ''),
  constraint crosswalks__compiled_code_lists_is_array check (
    compiled_code_lists is null or
    jsonb_typeof(compiled_code_lists) = 'array'
  )
);

alter table public.crosswalks enable row level security;

grant
select
,
  insert,
update,
delete on table public.crosswalks to authenticated,
service_role;

create policy "Data Sources viewers can select crosswalks" on public.crosswalks for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create policy "Data Sources editors can insert crosswalks they own" on public.crosswalks for insert to authenticated
with
  check (
    public.crosswalks.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.crosswalks.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "Data Sources editors can update crosswalks" on public.crosswalks
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

-- An editor deletes their own crosswalks; a Data Sources admin deletes
-- any crosswalk in the workspace.
create policy "Owners and Data Sources admins can delete crosswalks" on public.crosswalks for delete to authenticated using (
  (
    public.crosswalks.owner_id = (
      select
        auth.uid ()
    ) and
    public.util__auth_user_meets_min_app_role (
      public.crosswalks.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  ) or
  public.util__auth_user_meets_min_app_role (
    public.crosswalks.workspace_id,
    'data_sources'::public.app_type,
    'admin'::public.role_level
  )
);

/** Prevents a crosswalk from being reassigned to another workspace. */
create or replace function public.crosswalks__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'crosswalk workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.crosswalks__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Refuses direct writes by a signed-in user to the columns this schema
 * manages: the combined dataset, when it was compiled, and the code lists
 * it embedded, which only `rpc_crosswalks__save_combined_dataset` sets and
 * which a new crosswalk leaves empty, and the id and ownership, which no
 * client flow changes after insert. A whole-row update that sends the same values
 * passes. The RPCs run as the function owner, and the foreign key's
 * `on delete set null` runs as the table's owner, so both pass. When that
 * foreign key clears `output_dataset_id`, this trigger clears `compiled_at`
 * and `compiled_code_lists` with it.
 */
create or replace function public.crosswalks__guard_managed_columns () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    -- The foreign key's set null, run when the combined dataset is
    -- deleted, also forgets what that dataset was compiled from.
    if tg_op = 'UPDATE' and old.output_dataset_id is not null and new.output_dataset_id is null then
      new.compiled_at := null;
      new.compiled_code_lists := null;
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if
      new.output_dataset_id is not null or
      new.compiled_at is not null or
      new.compiled_code_lists is not null
    then
      raise exception 'a new crosswalk has no combined dataset yet'
        using errcode = '42501';
    end if;
  elsif
    new.id is distinct from old.id or
    new.owner_id is distinct from old.owner_id or
    new.owner_profile_id is distinct from old.owner_profile_id or
    new.output_dataset_id is distinct from old.output_dataset_id or
    new.compiled_at is distinct from old.compiled_at or
    new.compiled_code_lists is distinct from old.compiled_code_lists
  then
    raise exception 'a crosswalk''s owner and combined dataset are managed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke
execute on function public.crosswalks__guard_managed_columns ()
from
  public,
  anon,
  authenticated,
  service_role;

/** Ensures a crosswalk owner profile belongs to its owner and workspace. */
create or replace function public.crosswalks__validate_owner_profile () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not exists (
    select 1
    from public.user_profiles up
    where
      up.id = new.owner_profile_id and
      up.user_id = new.owner_id and
      up.workspace_id = new.workspace_id
  ) then
    raise exception 'crosswalk owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.crosswalks__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Checks, without locking anything, that the caller is a Data Sources
 * editor in the crosswalk's workspace, and returns that workspace. A
 * missing crosswalk and a forbidden one raise the same error, so no
 * crosswalk RPC can be used to probe for crosswalk ids.
 */
create or replace function public.crosswalks__require_editor (p_crosswalk_id uuid) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
begin
  select c.workspace_id
  into v_workspace_id
  from public.crosswalks c
  where c.id = p_crosswalk_id;

  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can change a crosswalk'
      using errcode = '42501', hint = 'crosswalk_editor_required';
  end if;

  return v_workspace_id;
end;
$$;

-- Runs inside the SECURITY DEFINER crosswalk RPCs and is never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.crosswalks__require_editor (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

/**
 * Checks that the caller is a Data Sources editor in the crosswalk's
 * workspace, then locks the crosswalk so two writes to it run one at a
 * time, and returns its workspace. A missing crosswalk and a forbidden
 * one raise the same error. Called first by both crosswalk RPCs that
 * write.
 */
create or replace function public.crosswalks__authorize (p_crosswalk_id uuid) returns uuid language plpgsql
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
begin
  -- Read without a lock: the caller has not been authorized yet.
  v_workspace_id := public.crosswalks__require_editor (p_crosswalk_id);

  perform 1 from public.crosswalks where id = p_crosswalk_id for update;

  if not found then
    raise exception 'Only Data Sources editors can change a crosswalk'
      using errcode = '42501', hint = 'crosswalk_editor_required';
  end if;

  return v_workspace_id;
end;
$$;

-- Runs inside the SECURITY DEFINER crosswalk RPCs and is never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.crosswalks__authorize (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__crosswalks__prevent_workspace_id_change before
update of workspace_id on public.crosswalks for each row
execute function public.crosswalks__prevent_workspace_id_change ();

create trigger tr__crosswalks__guard_managed_columns before insert or
update on public.crosswalks for each row
execute function public.crosswalks__guard_managed_columns ();

create trigger tr__crosswalks__validate_owner_profile before insert or
update of owner_id,
owner_profile_id,
workspace_id on public.crosswalks for each row
execute function public.crosswalks__validate_owner_profile ();

create trigger tr__crosswalks__set_updated_at before
update on public.crosswalks for each row
execute function public.util__set_updated_at ();

create index idx_crosswalks__workspace_owner on public.crosswalks (workspace_id, owner_id);

create index idx_crosswalks__owner_profile_id on public.crosswalks (owner_profile_id);

-- A combined dataset's rail and Used by find the crosswalk that writes it,
-- and deleting a dataset finds the crosswalk to clear, through this index.
create index idx_crosswalks__output_dataset_id on public.crosswalks (output_dataset_id)
where
  output_dataset_id is not null;
