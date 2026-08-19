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
  -- Status of the individual
  status text not null,
  -- Unique constraint to ensure one external_id per concept
  constraint individuals__concept_external_id_unique unique (concept_id, external_id)
);

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

create policy "User can INSERT individuals in their workspace" on public.individuals for insert to authenticated
with
  check (
    public.individuals.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can UPDATE individuals in their workspace" on public.individuals
for update
  to authenticated using (
    public.individuals.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can DELETE individuals in their workspace" on public.individuals for delete to authenticated using (
  public.individuals.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_individuals__set_updated_at before
update on public.individuals for each row
execute function public.util__set_updated_at ();
