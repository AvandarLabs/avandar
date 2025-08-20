create table public.entity_configs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- User id of the owner.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- Workspace this entity config belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Name of the entity config
  name text not null,
  -- Optional description of the entity config
  description text,
  -- Timestamp when the entity config was created.
  created_at timestamptz not null default now(),
  -- Timestamp of the last update to the entity config.
  updated_at timestamptz not null default now(),
  -- Whether users can manually create entities for this config.
  allow_manual_creation boolean not null
);

-- Enable row level security
alter table public.entity_configs enable row level security;

-- Policies
create policy "User can SELECT entity_configs" on public.entity_configs for
select
  to authenticated using (
    public.entity_configs.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT entity_configs
" on public.entity_configs for insert to authenticated
with
  check (
    public.entity_configs.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can UPDATE entity_configs" on public.entity_configs
for update
  to authenticated
with
  check (
    public.entity_configs.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE entity_configs
" on public.entity_configs for delete to authenticated using (
  public.entity_configs.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_entity_config__set_updated_at before
update on public.entity_configs for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_entity_configs__workspace_id on public.entity_configs (
  workspace_id
);
