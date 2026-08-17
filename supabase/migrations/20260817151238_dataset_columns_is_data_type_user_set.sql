-- Records whether a dataset column's queryable `data_type` was chosen by the
-- user rather than derived from `detected_data_type`.
--
-- Query time projects `try_cast(col as data_type)` over the stored parquet only
-- for user-set types. It cannot infer that by comparing `data_type` against
-- `detected_data_type`, because those two also diverge when a re-parse revises
-- `detected_data_type` underneath a column the user never touched.
alter table "public"."dataset_columns"
add column "is_data_type_user_set" boolean not null default false;

-- Added as an attribute rather than a drop-and-recreate of the composite type,
-- so the five `rpc_datasets__add_*_dataset` functions that take
-- `dataset_column_input[]` in their signatures keep their dependency intact.
alter type "public"."dataset_column_input"
add attribute "is_data_type_user_set" boolean cascade;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type public.datasets__source_type, p_columns public.dataset_column_input[])
 RETURNS public.datasets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  -- Ensure the workspace is one that the user admins
  if (
    not public.util__can_manage_workspace_settings (p_workspace_id)
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
      column_idx,
      is_data_type_user_set
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.original_name,
      v_column.name,
      v_column.original_data_type,
      v_column.detected_data_type,
      v_column.data_type,
      v_column.description,
      v_column.column_idx,
      coalesce(v_column.is_data_type_user_set, false)
    );
  end loop;
  return v_dataset;
end;
$function$
;
