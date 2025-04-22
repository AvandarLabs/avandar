-- Create the entity_config table
create table public.entity_configs (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null default auth.uid()
        references auth.users(id)
        on update cascade
        on delete no action,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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