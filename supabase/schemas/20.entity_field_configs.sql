-- Create the entity_field_configs table
create table public.entity_field_configs (
    id uuid primary key,
    entity_config_id uuid not null references entity_configs(id)
        on update cascade
        on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Core fields
    class text not null check (class in ('dimension', 'metric')),
    base_type text not null,
    value_extractor jsonb not null,

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
    ),

    -- Validate value_extractor structure
    constraint value_extractor_schema_check check (
        case class
            when 'dimension' then
                jsonb_typeof(value_extractor) = 'object'
                and (
                    -- adjacentField extractor
                    value_extractor->>'extractorType' = 'adjacentField'
                    and value_extractor->>'valuePickerRule' in ('mostFrequent', 'first')
                    and (value_extractor->>'allowManualEdit')::boolean is not null
                    and value_extractor->>'dataset' is not null
                    and value_extractor->>'field' is not null
                )
                or (
                    -- manualEntry extractor
                    value_extractor->>'extractorType' = 'manualEntry'
                    and (value_extractor->>'allowManualEdit')::boolean = true
                )
            when 'metric' then
                jsonb_typeof(value_extractor) = 'object'
                and value_extractor->>'extractorType' = 'aggregation'
                and value_extractor->>'aggregation' in ('sum', 'max', 'count')
                and value_extractor->>'dataset' is not null
                and value_extractor->>'field' is not null
                and value_extractor->>'filter' is not null
        end
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
            where entity_configs.id = public.entity_field_configs.entity_config_id
            and entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can insert entity_field_configs"
    on public.entity_field_configs for insert
    to authenticated -- postgres role
    -- actual policy
    with check (
        exists (
            select 1
            from public.entity_configs
            where entity_configs.id = public.entity_field_configs.entity_config_id
            and entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can update entity_field_configs"
    on public.entity_field_configs for update
    to authenticated -- postgres role
    -- actual policy
    with check (
        exists (
            select 1
            from public.entity_configs
            where entity_configs.id = public.entity_field_configs.entity_config_id
            and entity_configs.owner_id = (select auth.uid())
        )
    );

create policy "User can delete entity_field_configs"
    on public.entity_field_configs for delete
    to authenticated -- postgres role
    -- actual policy
    using (
        exists (
            select 1
            from public.entity_configs
            where entity_configs.id = public.entity_field_configs.entity_config_id
            and entity_configs.owner_id = (select auth.uid())
        )
    );

-- Create updated_at trigger
create trigger tr_entity_field_config__set_updated_at
    before update on public.entity_field_configs
    for each row
    execute function public.util__set_updated_at();

-- Function to validate title and id fields
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

-- Trigger to enforce the validation
create trigger tr_entity_field_configs__validate_title_id_fields
    before insert or update on public.entity_field_configs
    for each row execute function public.entity_field_configs__validate_title_id_fields();