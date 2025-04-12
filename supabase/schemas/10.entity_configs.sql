-- Create the entity_config table
create table public.entity_configs (
    id uuid primary key,
    owner_id uuid not null
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
create policy "User can see their own entity_configs"
    on public.entity_configs for select
    to authenticated
    using ((select auth.uid()) = owner_id);

create policy "User can insert entity_configs"
    on public.entity_configs for insert
    to authenticated
    with check ((select auth.uid()) = owner_id);

create policy "User can update their own entity_configs"
    on public.entity_configs for update
    to authenticated
    with check ((select auth.uid()) = owner_id);

create policy "User can delete their own entity_configs"
    on public.entity_configs for delete
    to authenticated
    using ((select auth.uid()) = owner_id);

-- Create updated_at trigger
create trigger tr_entity_config__set_updated_at
    before update on public.entity_configs
    for each row
    execute function public.util__set_updated_at();