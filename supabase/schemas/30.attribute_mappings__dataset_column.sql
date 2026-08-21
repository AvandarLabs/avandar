create type public.attribute_mappings__value_picker_rule_type as enum(
  'most_frequent',
  'first',
  'sum',
  'avg',
  'count',
  'max',
  'min'
);

create table public.attribute_mappings__dataset_column (
  id uuid primary key default gen_random_uuid(),
  -- Workspace this attribute mapping belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concept_attribute_id uuid not null unique references concept_attributes (id) on update cascade on delete cascade,
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type not null,
  dataset_id uuid not null,
  dataset_column_id uuid not null
);

-- Enable row level security
alter table public.attribute_mappings__dataset_column enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.attribute_mappings__dataset_column to authenticated,
service_role;

-- Policies
create policy "
  User can SELECT attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for
select
  to authenticated using (
    public.attribute_mappings__dataset_column.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for insert to authenticated
with
  check (
    public.attribute_mappings__dataset_column.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column
for update
  to authenticated
with
  check (
    public.attribute_mappings__dataset_column.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for delete to authenticated using (
  public.attribute_mappings__dataset_column.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_attribute_mappings__dataset_column_set_updated_at before
update on public.attribute_mappings__dataset_column for each row
execute function public.util__set_updated_at ();

-- Index for concept attribute + workspace filtering. The name omits the `_id`
-- suffixes because the fully spelled version exceeds Postgres' 63-byte
-- identifier limit and would be silently truncated.
create index idx_attribute_mappings__dataset_column__attribute_workspace on public.attribute_mappings__dataset_column (concept_attribute_id, workspace_id);
