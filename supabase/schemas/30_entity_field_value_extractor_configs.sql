-- Create enums
create type public.value_extractor_config__value_picker_rule_type as enum ('most_frequent', 'first');
create type public.value_extractor_config__aggregation_type as enum ('sum', 'max', 'count');

-- Create the value_extractor_config__dataset_column_value table
create table public.value_extractor_config__dataset_column_value (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    entity_field_config_id uuid not null references entity_field_configs(id)
        on update cascade
        on delete cascade,
    value_picker_rule_type public.value_extractor_config__value_picker_rule_type not null,
    dataset_id uuid not null,
    dataset_field_id uuid not null
);

-- Create the value_extractor_config__manual_entry table
create table public.value_extractor_config__manual_entry (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    entity_field_config_id uuid not null references entity_field_configs(id)
        on update cascade
        on delete cascade
);

-- Create the value_extractor_config__aggregation table
create table public.value_extractor_config__aggregation (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    entity_field_config_id uuid not null references entity_field_configs(id)
        on update cascade
        on delete cascade,
    aggregation_type public.value_extractor_config__aggregation_type not null,
    dataset_id uuid not null,
    dataset_field_id uuid not null,
    filter jsonb
);

-- Enable row level security
alter table public.value_extractor_config__dataset_column_value enable row level security;
alter table public.value_extractor_config__manual_entry enable row level security;
alter table public.value_extractor_config__aggregation enable row level security;

-- Create policies

-- `select` policies
create policy "User can SELECT value_extractor_config__dataset_column_value"
    on public.value_extractor_config__dataset_column_value for select
    to authenticated -- postgres role
    -- actual policy
    using (true);

create policy "User can SELECT value_extractor_config__manual_entry"
    on public.value_extractor_config__manual_entry for select
    to authenticated -- postgres role
    -- actual policy
    using (true);

create policy "User can SELECT value_extractor_config__aggregation"
    on public.value_extractor_config__aggregation for select
    to authenticated -- postgres role
    -- actual policy
    using (true);

-- `insert` policies
create policy "User can INSERT value_extractor_config__dataset_column_value"
    on public.value_extractor_config__dataset_column_value for insert
    to authenticated -- postgres role
    -- actual policy
    with check (true);

create policy "User can INSERT value_extractor_config__manual_entry"
    on public.value_extractor_config__manual_entry for insert
    to authenticated -- postgres role
    -- actual policy
    with check (true);

create policy "User can INSERT value_extractor_config__aggregation"
    on public.value_extractor_config__aggregation for insert
    to authenticated -- postgres role
    -- actual policy
    with check (true);

-- `update` policies
create policy "User can UPDATE value_extractor_config__dataset_column_value"
    on public.value_extractor_config__dataset_column_value for update
    to authenticated -- postgres role
    -- actual policy
    with check (true);

create policy "User can UPDATE value_extractor_config__manual_entry"
    on public.value_extractor_config__manual_entry for update
    to authenticated -- postgres role
    -- actual policy
    with check (true);

create policy "User can UPDATE value_extractor_config__aggregation"
    on public.value_extractor_config__aggregation for update
    to authenticated -- postgres role
    -- actual policy
    with check (true);

-- `delete` policies
create policy "User can DELETE value_extractor_config__dataset_column_value"
    on public.value_extractor_config__dataset_column_value for delete
    to authenticated -- postgres role
    -- actual policy
    using (true);

create policy "User can DELETE value_extractor_config__manual_entry"
    on public.value_extractor_config__manual_entry for delete
    to authenticated -- postgres role
    -- actual policy
    using (true);

create policy "User can DELETE value_extractor_config__aggregation"
    on public.value_extractor_config__aggregation for delete
    to authenticated -- postgres role
    -- actual policy
    using(true);

-- Create updated_at triggers
create trigger tr_value_extractor_config__dataset_column_value_set_updated_at
    before update on public.value_extractor_config__dataset_column_value
    for each row
    execute function public.util__set_updated_at();

create trigger tr_value_extractor_config__manual_entry_set_updated_at
    before update on public.value_extractor_config__manual_entry
    for each row
    execute function public.util__set_updated_at();

create trigger tr_value_extractor_config__aggregation_set_updated_at
    before update on public.value_extractor_config__aggregation
    for each row
    execute function public.util__set_updated_at();