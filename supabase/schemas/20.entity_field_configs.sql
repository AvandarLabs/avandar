-- Create enums
create type public.entity_field_config__class as enum ('dimension', 'metric');
create type public.entity_field_config__base_type as enum ('string', 'number', 'date');
create type public.entity_field_config__extractor_type as enum ('adjacent_field', 'manual_entry', 'aggregation');

-- Create the entity_field_configs table
create table public.entity_field_configs (
    id uuid primary key default gen_random_uuid(),
    entity_config_id uuid not null references entity_configs(id)
        on update cascade
        on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Discriminating columns
    class public.entity_field_config__class not null,
    base_type public.entity_field_config__base_type not null,
    extractor_type public.entity_field_config__extractor_type not null,

    -- Dimension-related columns
    is_title_field boolean not null default false,
    is_id_field boolean not null default false,
    is_array boolean,
    allow_manual_edit boolean,

    -- Constraints
    -- Ensure title and id fields are only set on "dimension" fields
    constraint title_field_is_dimension check (
        is_title_field and class = 'dimension'
    ),
    constraint id_field_is_dimension check (
        is_id_field and class = 'dimension'
    )
);

-- Enable row level security
alter table public.entity_field_configs enable row level security;

-- Create policies
create policy "User can see entity_field_configs"
    on public.entity_field_configs for select
    to authenticated -- postgres role
    -- actual policy
    using (
        exists (
            select 1
            from public.entity_configs
            where public.entity_configs.id = public.entity_field_configs.entity_config_id
            and public.entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can INSERT entity_field_configs"
    on public.entity_field_configs for insert
    to authenticated -- postgres role
    -- actual policy
    with check (
        exists (
            select 1
            from public.entity_configs
            where public.entity_configs.id = public.entity_field_configs.entity_config_id
            and public.entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can UPDATE entity_field_configs"
    on public.entity_field_configs for update
    to authenticated -- postgres role
    -- actual policy
    with check (
        exists (
            select 1
            from public.entity_configs
            where public.entity_configs.id = public.entity_field_configs.entity_config_id
            and public.entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can DELETE entity_field_configs"
    on public.entity_field_configs for delete
    to authenticated -- postgres role
    -- actual policy
    using (
        exists (
            select 1
            from public.entity_configs
            where public.entity_configs.id = public.entity_field_configs.entity_config_id
            and public.entity_configs.owner_id = (select auth.uid())
        )
    );

-- Create updated_at trigger
create trigger tr_entity_field_config__set_updated_at
    before update on public.entity_field_configs
    for each row
    execute function public.util__set_updated_at();

-- Function to validate title and id fields
-- An entity_config should have at least 1 entity_field_config with
-- `is_title_field` and at least 1 with `is_id_field`
create or replace function public.entity_field_configs__validate_title_id_fields()
returns trigger as $$
begin
    -- Count title fields for this entity_config
    if (
        select count(*) from public.entity_field_configs
        where entity_config_id = new.entity_config_id and is_title_field
    ) != 1 then
        raise exception 'There must be exactly one title field per entity config';
    end if;

    -- Count id fields for this entity_config
    if (
        select count(*) from public.entity_field_configs
        where entity_config_id = new.entity_config_id and is_id_field
    ) != 1 then
        raise exception 'There must be exactly one id field per entity config';
    end if;

    return new;
end;
$$ language plpgsql;

-- Trigger to enforce the title and id field validations
create trigger tr_entity_field_configs__validate_title_id_fields
    after insert or update on public.entity_field_configs
    for each row execute function public.entity_field_configs__validate_title_id_fields();