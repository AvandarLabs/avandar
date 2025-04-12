-- Create the entity_config table
create table public.entity_configs (
    id uuid primary key,
    owner_id uuid not null
        references auth.users(id)
        on update cascade on delete no action,
    name text not null,
    description text,
    title_field uuid not null
        references entity_field_configs(id)
        on update cascade on delete no action,
    id_field uuid not null
        references entity_field_configs(id)
        on update cascade on delete no action,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- constraints section
    -- ensure title_field belongs to this entity
    constraint title_field_belongs_to_entity check (
        title_field in (
            select id from entity_field_configs
            where entity_config_id = entity_configs.id
        )
    ),

    -- ensure id_field belongs to this entity
    constraint id_field_belongs_to_entity check (
        id_field in (
            select id from entity_field_configs
            where entity_config_id = entity_configs.id
        )
    )
);

-- Enable row level security
alter table public.entity_configs enable row level security;

-- Create policies
create policy "User can see their own entity_configs"
    on public.entity_configs for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "User can insert entity_configs"
    on public.entity_configs for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "User can update their own entity_configs"
    on public.entity_configs for update
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "User can delete their own entity_configs"
    on public.entity_configs for delete
    to authenticated
    with check ((select auth.uid()) = user_id);

-- Create updated_at trigger
create trigger update_entity_config_updated_at
    before update on public.entity_configs
    for each row
    execute function public.update_updated_at();