-- Recreate `datasets__source_type` without the unused `xls_file` label.
drop function if exists public.rpc_datasets__add_dataset (
  uuid,
  uuid,
  text,
  text,
  public.datasets__source_type,
  public.dataset_column_input[]
);

alter type public.datasets__source_type
rename to datasets__source_type__old_without_xls_file;

create type public.datasets__source_type as enum(
  'csv_file',
  'google_sheets',
  'virtual',
  'open_data',
  'xlsx_file'
);

alter table public.datasets
alter column source_type type public.datasets__source_type using (
  case source_type::text
    when 'xls_file' then 'xlsx_file'::public.datasets__source_type
    else source_type::text::public.datasets__source_type
  end
);

drop type public.datasets__source_type__old_without_xls_file;

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
  if (
    p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  select public.user_profiles.id into v_owner_profile_id
  from public.user_profiles
  where
    public.user_profiles.user_id = v_owner_id
    and public.user_profiles.workspace_id = p_workspace_id;

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
    if v_column.original_name is null then
      raise exception 'Column original name is required';
    end if;
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
      original_name,
      name,
      original_data_type,
      detected_data_type,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.original_name,
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
