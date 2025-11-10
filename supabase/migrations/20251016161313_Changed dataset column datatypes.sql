-- Drop rpc functions that depend on dataset_column_input type
drop function "public"."rpc_datasets__add_dataset";

drop function "public"."rpc_datasets__add_google_sheets_dataset";

drop function "public"."rpc_datasets__add_csv_file_dataset";

drop type "public"."dataset_column_input";

-- drop all datasets just to make this easier on ourselves
truncate table "public"."datasets" cascade;

-- drop all the entity field configs to make this easier on ourselves
truncate table "public"."entity_field_configs" cascade;

alter type "public"."datasets__column_data_type"
rename to "datasets__column_data_type__old_version_to_be_dropped";

create type "public"."datasets__ava_data_type" as enum(
  'boolean',
  'bigint',
  'double',
  'time',
  'date',
  'timestamp',
  'varchar'
);

create type "public"."datasets__duckdb_data_type" as enum(
  'BOOLEAN',
  'TINYINT',
  'SMALLINT',
  'INTEGER',
  'BIGINT',
  'UBIGINT',
  'UTINYINT',
  'USMALLINT',
  'UINTEGER',
  'FLOAT',
  'DOUBLE',
  'DECIMAL',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMP_TZ',
  'TIMESTAMP WITH TIME ZONE',
  'INTERVAL',
  'VARCHAR',
  'BLOB',
  'UUID',
  'HUGEINT',
  'BIT',
  'ENUM',
  'MAP',
  'STRUCT',
  'LIST',
  'UNION',
  'JSON',
  'GEOMETRY'
);

alter table "public"."dataset_columns"
alter column data_type type "public"."datasets__ava_data_type" using data_type::text::"public"."datasets__ava_data_type";

drop type "public"."datasets__column_data_type__old_version_to_be_dropped";

alter table "public"."dataset_columns"
add column "original_data_type" text not null;

alter table "public"."dataset_columns"
add column "detected_data_type" "public"."datasets__duckdb_data_type" not null;

alter table "public"."entity_field_configs"
alter column "base_data_type" type "public"."datasets__ava_data_type" using base_data_type::text::"public"."datasets__ava_data_type";

create type "public"."dataset_column_input" as (
  "name" text,
  "description" text,
  "original_data_type" text,
  "detected_data_type" "public"."datasets__duckdb_data_type",
  "data_type" "public"."datasets__ava_data_type",
  "column_idx" integer
);

-- Add the RPC functions back
create or replace function public.rpc_datasets__add_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type public.datasets__source_type,
  p_columns public.dataset_column_input[]
) returns public.datasets as $$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  -- Ensure the workspace is one that the user admins
  if (
    p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  -- Get the owner profile id
  select public.user_profiles.id into v_owner_profile_id
  from public.user_profiles
  where
    public.user_profiles.user_id = v_owner_id
    and public.user_profiles.workspace_id = p_workspace_id;

  -- Create the dataset
  insert into public.datasets (
    id,
    owner_id,
    owner_profile_id,
    workspace_id,
    name,
    description,
    source_type
  ) values (
    p_dataset_id,
    v_owner_id,
    v_owner_profile_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    p_dataset_source_type
  ) returning * into v_dataset;

  foreach v_column in array p_columns loop
    if v_column.name is null then
      raise exception 'Column name is required';
    end if;
    if v_column.data_type is null then
      raise exception 'Column data type is required';
    end if;
    if v_column.column_idx is null then
      raise exception 'Column index is required';
    end if;

    insert into public.dataset_columns (
      dataset_id,
      workspace_id,
      name,
      original_data_type,
      detected_data_type,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.name,
      v_column.original_data_type,
      v_column.detected_data_type,
      v_column.data_type,
      v_column.description,
      v_column.column_idx
    );
  end loop;
  return v_dataset;
end;
$$ language plpgsql security invoker;

create or replace function public.rpc_datasets__add_google_sheets_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_google_account_id text,
  p_google_document_id text,
  p_rows_to_skip integer default 0
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'google_sheets',
    p_columns
  );

  insert into public.datasets__google_sheets (
    dataset_id,
    workspace_id,
    google_account_id,
    google_document_id,
    rows_to_skip
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_google_account_id,
    p_google_document_id,
    p_rows_to_skip
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;

create or replace function public.rpc_datasets__add_csv_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_size_in_bytes integer,
  p_rows_to_skip integer,
  p_quote_char public.util__nullable_text,
  p_escape_char public.util__nullable_text,
  p_delimiter text,
  p_newline_delimiter text,
  p_comment_char public.util__nullable_text,
  p_has_header boolean,
  p_date_format public.datasets__csv_file__date_format
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'csv_file',
    p_columns
  );

  insert into public.datasets__csv_file (
    dataset_id,
    workspace_id,
    size_in_bytes,
    rows_to_skip,
    quote_char,
    escape_char,
    delimiter,
    newline_delimiter,
    comment_char,
    has_header,
    date_format,
    timestamp_format
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_size_in_bytes,
    p_rows_to_skip,
    p_quote_char.value,
    p_escape_char.value,
    p_delimiter,
    p_newline_delimiter,
    p_comment_char.value,
    p_has_header,
    p_date_format.date_format,
    p_date_format.timestamp_format
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
