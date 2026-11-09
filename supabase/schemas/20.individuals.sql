create table public.individuals (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the individual was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the individual was last updated.
  updated_at timestamptz not null default now(),
  -- Workspace this individual belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Name of the individual
  name text not null,
  -- Concept this individual belongs to. This column is the concept assertion:
  -- it is what makes the row an individual of that concept. If a concept is
  -- deleted, all of its individuals are deleted too.
  concept_id uuid not null references public.concepts (id) on update cascade on delete cascade,
  -- External id of the individual to match across different datasources
  external_id text not null,
  -- User id of the owner. We cannot delete users that are still assigned to
  -- individuals.
  assigned_to uuid references auth.users (id) on update cascade on delete no action,
  -- Set when this individual's external_id stops appearing in any source
  -- dataset on a sync. Clear the timestamp if it reappears. NULL means it
  -- is present.
  missing_from_source_at timestamptz,
  -- Status of this record: one of its case type's statuses. Filled with the
  -- case type's default when an insert names none.
  status_id uuid not null,
  -- Unique constraint to ensure one external_id per concept
  constraint individuals__concept_external_id_unique unique (concept_id, external_id),
  -- Keeps the status inside the record's own case type. `no action` rather
  -- than `restrict`: deleting a case type cascades to its statuses and its
  -- records in one statement, and `no action` is checked at the end of that
  -- statement, when the records are gone too.
  constraint individuals__status_fkey foreign key (status_id, concept_id) references public.concept_statuses (id, concept_id)
);

create index idx_individuals__workspace_id on public.individuals (workspace_id);

-- Enable row level security
alter table public.individuals enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.individuals to authenticated,
service_role;

-- Policies
create policy "User can SELECT individuals in their workspace" on public.individuals for
select
  to authenticated using (
    public.individuals.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- A refresh writes records as a `case_types` editor, and the people working
-- the records write them as a `case_records` editor, so either role may insert
-- and update a record. Deleting one requires `case_records` admin.
create policy "User can INSERT individuals in their workspace" on public.individuals for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can UPDATE individuals in their workspace" on public.individuals
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) or
    public.util__auth_user_meets_min_app_role (
      public.individuals.workspace_id,
      'case_records'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can DELETE individuals in their workspace" on public.individuals for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.individuals.workspace_id,
    'case_records'::public.app_type,
    'admin'::public.role_level
  )
);

create trigger tr_individuals__set_updated_at before
update on public.individuals for each row
execute function public.util__set_updated_at ();

-- Serves the records list's status filter and the status foreign key's
-- check when a status is deleted.
create index idx_individuals__concept_id_status_id on public.individuals (concept_id, status_id);

/**
 * Fills a new record's status with its case type's default when the insert
 * names none. Sync never sends a status, so every synced record starts in
 * the default.
 */
create or replace function public.individuals__set_default_status () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.status_id is null then
    select c.default_status_id
    into new.status_id
    from public.concepts c
    where c.id = new.concept_id;
  end if;
  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.individuals__set_default_status ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr_individuals__set_default_status before insert on public.individuals for each row
execute function public.individuals__set_default_status ();

/**
 * Refuses a status change by a signed-in user who is not a Case Records
 * editor in the record's workspace. RLS lets Case Types editors insert and
 * update records so they can sync them, and a policy cannot single out one
 * column, so this trigger guards `status_id`.
 *
 * An insert that names no status, or the case type's default, passes. Only
 * Data API requests (`current_user = 'authenticated'`) are checked: SECURITY
 * DEFINER functions such as `rpc_concept_statuses__save` run as their owner
 * and check roles themselves, and `service_role` is trusted.
 */
create or replace function public.individuals__check_status_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status_id is not distinct from old.status_id then
    return new;
  end if;

  if tg_op = 'INSERT' and (
    new.status_id is null or
    new.status_id = (
      select c.default_status_id
      from public.concepts c
      where c.id = new.concept_id
    )
  ) then
    return new;
  end if;

  if not public.util__auth_user_meets_min_app_role (
    new.workspace_id,
    'case_records'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Records editors can change a record''s status'
      using errcode = '42501', hint = 'case_records_editor_required';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.individuals__check_status_change ()
from
  public,
  anon,
  authenticated,
  service_role;

-- Fires before `tr_individuals__set_default_status` (triggers fire in name
-- order), so an insert that names no status is checked before the default
-- fills it in.
create trigger tr_individuals__check_status_change before insert or
update of status_id on public.individuals for each row
execute function public.individuals__check_status_change ();

/**
 * Refuses an assignee change by a signed-in user who is not a Case Records
 * editor, and refuses an assignee who is not a member of the record's
 * workspace. RLS lets Case Types editors update records so they can sync
 * them, and a policy cannot single out one column, so this trigger guards
 * `assigned_to`.
 *
 * An insert that leaves the assignee empty passes, which is how Sync inserts
 * a record. Only Data API requests (`current_user = 'authenticated'`) are
 * checked. `service_role` is trusted.
 */
create or replace function public.individuals__check_assignment_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  if tg_op = 'INSERT' and new.assigned_to is null then
    return new;
  end if;

  if not public.util__auth_user_meets_min_app_role (
    new.workspace_id,
    'case_records'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Records editors can assign a record'
      using errcode = '42501', hint = 'case_records_editor_required';
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = new.workspace_id
      and membership.user_id = new.assigned_to
  ) then
    raise exception 'A record can only be assigned to a member of its workspace'
      using errcode = '23514', hint = 'assignee_not_in_workspace';
  end if;

  return new;
end;
$$;

revoke
execute on function public.individuals__check_assignment_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr_individuals__check_assignment_change before insert or
update of assigned_to on public.individuals for each row
execute function public.individuals__check_assignment_change ();

create index idx_individuals__workspace_id_assigned_to on public.individuals (workspace_id, assigned_to);
