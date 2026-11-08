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
  -- The rule that reduces the field's rows to one value. Null for a field
  -- that keeps every value; `rpc_concepts__create` enforces which is which.
  value_picker_rule_type public.attribute_mappings__value_picker_rule_type,
  dataset_id uuid not null,
  dataset_column_id uuid not null,
  -- The date or timestamp column of this dataset that places each row in a
  -- period. Set exactly when the field has a `bucket_grain`, which
  -- `tr__attribute_mappings__dataset_column__validate_bucket_column` checks.
  -- A bare id, like `dataset_column_id`.
  bucket_column_id uuid
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

-- Mappings are part of a case type's design, so every write requires
-- `case_types` editor.
create policy "
  User can INSERT attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can UPDATE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.attribute_mappings__dataset_column.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE attribute_mappings__dataset_column
" on public.attribute_mappings__dataset_column for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.attribute_mappings__dataset_column.workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  )
);

create trigger tr_attribute_mappings__dataset_column_set_updated_at before
update on public.attribute_mappings__dataset_column for each row
execute function public.util__set_updated_at ();

/**
 * Checks a dataset-column mapping's `bucket_column_id` against its field and
 * its dataset: it is set exactly when the field has a `bucket_grain`, and it
 * then names a `date` or `timestamp` column of the mapping's own dataset.
 * The concept view groups the field's rows by that column, so any other
 * column would group nothing or fail to bind.
 *
 * Runs on the mapping rather than on `concept_attributes`, because
 * `rpc_concepts__create` inserts a case type's fields before their mappings,
 * so the field is always there when its mapping arrives.
 *
 * SECURITY DEFINER so the check reads the field and the column whatever the
 * caller's RLS allows: it validates the mapping's shape, not the caller's
 * access to the dataset. A BEFORE trigger runs ahead of the RLS `with check`
 * on this table, so any signed-in user can reach it. Both lookups are
 * therefore scoped to the mapping's own workspace, and its errors name only
 * the ids the caller supplied, so a refusal reveals nothing about another
 * workspace's fields or columns. A field or column outside the workspace
 * reads as missing.
 */
create or replace function public.attribute_mappings__dataset_column__validate_bucket_column () returns trigger language plpgsql security definer
set
  search_path = '' as $$
declare
  v_bucket_grain public.concept_attributes__bucket_grain;
  v_column_dataset_id uuid;
  v_column_data_type public.datasets__ava_data_type;
begin
  select attribute.bucket_grain
  into v_bucket_grain
  from public.concept_attributes attribute
  where
    attribute.id = new.concept_attribute_id
    and attribute.workspace_id = new.workspace_id;

  if v_bucket_grain is null then
    if new.bucket_column_id is not null then
      raise exception 'A mapping for a field without a bucket_grain cannot have a bucket_column_id'
        using
          errcode = '23514',
          hint = 'bucket_column_not_allowed',
          detail = format('concept_attribute_id %s', new.concept_attribute_id);
    end if;
    return new;
  end if;

  if new.bucket_column_id is null then
    raise exception 'A mapping for a field with a bucket_grain needs a bucket_column_id'
      using
        errcode = '23514',
        hint = 'bucket_column_required',
        detail = format('concept_attribute_id %s', new.concept_attribute_id);
  end if;

  select dataset_column.dataset_id, dataset_column.data_type
  into v_column_dataset_id, v_column_data_type
  from public.dataset_columns dataset_column
  where
    dataset_column.id = new.bucket_column_id
    and dataset_column.workspace_id = new.workspace_id;

  -- A column that does not exist, or that belongs to another workspace,
  -- leaves both variables null, which lands here too.
  if v_column_dataset_id is distinct from new.dataset_id then
    raise exception 'bucket_column_id must be a column of the mapping''s dataset'
      using
        errcode = '23514',
        hint = 'bucket_column_not_in_dataset',
        detail = format(
          'bucket_column_id %s, dataset_id %s',
          new.bucket_column_id,
          new.dataset_id
        );
  end if;

  if v_column_data_type not in ('date', 'timestamp') then
    raise exception 'bucket_column_id must be a date or timestamp column'
      using
        errcode = '23514',
        hint = 'bucket_column_not_a_date',
        detail = format('bucket_column_id %s', new.bucket_column_id);
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no Data
-- API role needs a grant for the trigger to fire.
revoke
execute on function public.attribute_mappings__dataset_column__validate_bucket_column ()
from
  public,
  anon,
  authenticated,
  service_role;

-- `before`, so a refused mapping never reaches the unique or foreign key
-- checks and the error names the real problem. Updates are checked only when
-- they change a column the check reads, so retyping a date column later does
-- not lock every other edit to its mapping.
create trigger tr__attribute_mappings__dataset_column__validate_bucket_column before insert or
update of concept_attribute_id,
dataset_id,
bucket_column_id on public.attribute_mappings__dataset_column for each row
execute function public.attribute_mappings__dataset_column__validate_bucket_column ();

-- Index for concept attribute + workspace filtering. The name omits the `_id`
-- suffixes because the fully spelled version exceeds Postgres' 63-byte
-- identifier limit and would be silently truncated.
create index idx_attribute_mappings__dataset_column__attribute_workspace on public.attribute_mappings__dataset_column (concept_attribute_id, workspace_id);
