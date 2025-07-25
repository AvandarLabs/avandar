-- Table: entity_configs
create table public.entity_configs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- User id of the owner.
  owner_id uuid not null default auth.uid()
    references auth.users(id)
    on update cascade
    on delete no action,
  
  -- Workspace this entity config belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

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

-- Column documentation
comment on column public.entity_configs.id is
  'Unique identifier for the entity config.';
comment on column public.entity_configs.owner_id is
  'User ID of the owner. References auth.users(id).';
comment on column public.entity_configs.workspace_id is
  'Workspace this entity config belongs to. References workspaces(id).';
comment on column public.entity_configs.name is
  'Name of the entity configuration.';
comment on column public.entity_configs.description is
  'Optional description of the entity configuration.';
comment on column public.entity_configs.created_at is
  'Timestamp when the entity configuration was created.';
comment on column public.entity_configs.updated_at is
  'Timestamp of the last update to the entity configuration.';
comment on column public.entity_configs.allow_manual_creation is
  'Whether users can manually create entities for this config.';

-- Enable row level security
alter table public.entity_configs enable row level security;

-- Policies: entity_configs
create policy "User can SELECT entity_configs"
  on public.entity_configs for select
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can INSERT entity_configs"
  on public.entity_configs for insert
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can UPDATE entity_configs"
  on public.entity_configs for update
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can DELETE entity_configs"
  on public.entity_configs for delete
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

-- Trigger: update `updated_at` on row modification
create trigger tr_entity_config__set_updated_at
  before update on public.entity_configs
  for each row
  execute function public.util__set_updated_at();

-- Indexes to improve performance
create index idx_entity_configs__workspace_id on public.entity_configs(workspace_id);