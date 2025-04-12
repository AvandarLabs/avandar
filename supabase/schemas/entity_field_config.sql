-- Create the entity_field_configs table
create table public.entity_field_configs (
    id uuid primary key,
    entity_config_id uuid not null references entity_configs(id)
        on update cascade on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- core fields
    class text not null check (class in ('dimension', 'metric')),
    base_type text not null,
    value_extractor jsonb not null,

    -- dimension-related columns
    is_array boolean,
    allow_manual_edit boolean,

    -- constraints
    -- validate value_extractor structure
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
create policy "User can see their own entity_field_configs"
    on public.entity_field_configs for select
    to authenticated -- postgres role
    using ((select auth.uid()) = user_id); -- actual policy

create policy "User can insert entity_field_configs"
    on public.entity_field_configs for insert
    to authenticated -- postgres role
    with check ((select auth.uid()) = user_id); -- actual policy

create policy "User can update their own entity_field_configs"
    on public.entity_field_configs for update
    to authenticated -- postgres role
    with check ((select auth.uid()) = user_id); -- actual policy

create policy "User can delete their own entity_field_configs"
    on public.entity_field_configs for delete
    to authenticated -- postgres role
    with check ((select auth.uid()) = user_id); -- actual policy

-- Create updated_at trigger
create trigger update_entity_field_config_updated_at
    before update on public.entity_field_configs
    for each row
    execute function public.update_updated_at();