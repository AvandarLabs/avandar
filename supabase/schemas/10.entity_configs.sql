-- Create the entity_config table
create table public.entity_configs (
    -- Primary key
    id uuid primary key default gen_random_uuid(),

    -- User id of the owner.
    owner_id uuid not null default auth.uid()
        references auth.users(id)
        on update cascade
        on delete no action,

    -- Name of the entity config
    name text not null,

    -- Optional description of the entity config
    description text,

    -- ID of the dataset this entity is created from.
    dataset_id uuid,

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
comment on column public.entity_configs.name is
    'Name of the entity configuration.';
comment on column public.entity_configs.description is
    'Optional description of the entity configuration.';
comment on column public.entity_configs.dataset_id is
    'ID of the dataset this entity is created from.';
comment on column public.entity_configs.created_at is
    'Timestamp when the entity configuration was created.';
comment on column public.entity_configs.updated_at is
    'Timestamp of the last update to the entity configuration.';
comment on column public.entity_configs.allow_manual_creation is
    'Whether users can manually create entities for this config.';

-- Enable row level security
alter table public.entity_configs enable row level security;

-- Create policies
create policy "User can SELECT entity_configs"
    on public.entity_configs for select
    to authenticated -- postgres role
    -- actual policy
    using ((select auth.uid()) = public.entity_configs.owner_id);

create policy "User can INSERT entity_configs"
    on public.entity_configs for insert
    to authenticated -- postgres role
    -- actual policy
    with check ((select auth.uid()) = public.entity_configs.owner_id);

create policy "User can UPDATE entity_configs"
    on public.entity_configs for update
    to authenticated -- postgres role
    -- actual policy
    with check ((select auth.uid()) = public.entity_configs.owner_id);

create policy "User can DELETE entity_configs"
    on public.entity_configs for delete
    to authenticated -- postgres role
    -- actual policy
    using ((select auth.uid()) = public.entity_configs.owner_id);

-- Create updated_at trigger
create trigger tr_entity_config__set_updated_at
    before update on public.entity_configs
    for each row
    execute function public.util__set_updated_at();