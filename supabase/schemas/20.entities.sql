create table public.entities (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the entity was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the entity was last updated.
  updated_at timestamptz not null default now(),
  -- Workspace this entity belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Name of the entity
  name text not null,
  -- Entity config this entity belongs to. If an entity config is deleted,
  -- all associated entities are deleted too.
  entity_config_id uuid not null references public.entity_configs (id) on update cascade on delete cascade,
  -- External id of the entity to match across different datasources
  external_id text not null,
  -- User id of the owner. We cannot delete users that are still assigned to entities.
  assigned_to uuid references auth.users (id) on update cascade on delete no action,
  -- Status of the entity
  status text not null,
  -- Unique constraint to ensure one external_id per entity_config
  constraint entities__entity_config_external_id_unique unique (
    entity_config_id,
    external_id
  )
);

-- Enable row level security
alter table public.entities enable row level security;

-- Policies
create policy "User can SELECT entities in their workspace" on public.entities for
select
  to authenticated using (
    public.entities.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can INSERT entities in their workspace" on public.entities for insert to authenticated
with
  check (
    public.entities.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can UPDATE entities in their workspace" on public.entities
for update
  to authenticated using (
    public.entities.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can DELETE entities in their workspace" on public.entities for delete to authenticated using (
  public.entities.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_entities__set_updated_at before
update on public.entities for each row
execute function public.util__set_updated_at ();
