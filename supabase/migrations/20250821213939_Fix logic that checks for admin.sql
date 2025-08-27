set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_dataset(p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type datasets__source_type, p_columns dataset_column_input[])
 RETURNS datasets
 LANGUAGE plpgsql
AS $function$
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
    owner_id,
    owner_profile_id,
    workspace_id,
    name,
    description,
    source_type
  ) values (
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
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.name,
      v_column.data_type,
      v_column.description,
      v_column.column_idx
    );
  end loop;
  return v_dataset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__add_user(p_workspace_id uuid, p_user_id uuid, p_full_name text, p_display_name text, p_user_role text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_membership_id uuid;
begin
  -- Ensure the workspace is one that the user owns or admins.
  -- We need to check for ownership first, because if the workspace was just
  -- created then a `user_roles` row does not exist yet, because we still
  -- haven't finished created the user owner's role.
  if (
    p_workspace_id != all(public.util__get_auth_user_owned_workspaces()) and
    p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise 'The requesting user is not an admin of this workspace';
  end if;

  -- Create the workspace membership
  insert into public.workspace_memberships (
    workspace_id,
    user_id
  ) values (
    p_workspace_id,
    p_user_id
  ) returning id into v_membership_id;

  -- Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    p_workspace_id,
    p_user_id,
    v_membership_id,
    p_full_name,
    p_display_name
  );

  -- Create the user role
  insert into public.user_roles (
    workspace_id,
    user_id,
    membership_id,
    role
  ) values (
    p_workspace_id,
    p_user_id,
    v_membership_id,
    p_user_role
  );
  return v_membership_id;
end;
$function$
;


