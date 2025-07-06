-- Enums for entity_field_configs
create type public.entity_field_configs__class as enum ('dimension', 'metric');
create type public.entity_field_configs__base_data_type as enum ('string', 'number', 'date');
create type public.entity_field_configs__value_extractor_type as enum ('dataset_column_value', 'manual_entry', 'aggregation');

-- Table: entity_field_configs
create table public.entity_field_configs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),

  -- Workspace this entity field config belongs to
  workspace_id uuid not null
    references public.workspaces(id)
    on update cascade
    on delete cascade,

  entity_config_id uuid not null
    references entity_configs(id)
    on update cascade
    on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Discriminating columns
  class public.entity_field_configs__class not null,
  base_data_type public.entity_field_configs__base_data_type not null,
  value_extractor_type public.entity_field_configs__value_extractor_type not null,

  -- Dimension-related columns
  is_title_field boolean not null default false,
  is_id_field boolean not null default false,
  is_array boolean,
  allow_manual_edit boolean not null default false,

  -- Constraints
  -- Ensure title and id fields can never be "metric" fields
  constraint metrics_cant_be_titles check (
    not (class = 'metric' and is_title_field)
  ),
  constraint metrics_cant_be_ids check (
    not (class = 'metric' and is_id_field)
  ),

  -- Ensure metrics can never allow manual editing
  constraint metrics_dont_allow_manual_edit check (
    not (class = 'metric' and allow_manual_edit)
  )
);

-- Enable row level security
alter table public.entity_field_configs enable row level security;

-- Policies: entity_field_configs
create policy "User can SELECT entity_field_configs"
  on public.entity_field_configs for select
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can INSERT entity_field_configs"
  on public.entity_field_configs for insert
  to authenticated
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can UPDATE entity_field_configs"
  on public.entity_field_configs for update
  to authenticated 
  with check (public.util__auth_user_is_workspace_member(workspace_id));

create policy "User can DELETE entity_field_configs"
  on public.entity_field_configs for delete
  to authenticated
  using (public.util__auth_user_is_workspace_member(workspace_id));

-- Trigger: update `updated_at` on row modification
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
$$
language plpgsql;

-- Trigger: enforce title and id field validations on insert or update
-- NOTE: this trigger is intentionally set for *after* insert or update.
-- This is because when an Entity Config is inserted, the fields do not exist
-- yet, so if we triggered this "before" insert, then the fields count will
-- be 0, so it will raise an error. But, because we insert fields via a bulk
-- insert, then *after* the insert we know the fields are fair game to query
-- now. On the flip side, the disadvantage is that if there's an error now,
-- we need to manually rollback the changes. 
create trigger tr_entity_field_configs__validate_title_id_fields
  after insert or update on public.entity_field_configs
  for each row execute function public.entity_field_configs__validate_title_id_fields();

-- Indexes to improve performance
create index idx_entity_field_configs__entity_config_id_workspace_id on public.entity_field_configs(entity_config_id, workspace_id);