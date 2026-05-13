drop policy "User can delete datasets__xls_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can insert datasets__xls_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can select datasets__xls_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can update datasets__xls_file in their workspace" on "public"."datasets__xlsx_file";

alter table "public"."datasets__xlsx_file"
drop constraint "datasets__xls_file_dataset_id_fkey";

alter table "public"."datasets__xlsx_file"
drop constraint "datasets__xls_file_dataset_id_key";

alter table "public"."datasets__xlsx_file"
drop constraint "datasets__xls_file_workspace_id_fkey";

alter table "public"."datasets__xlsx_file"
drop constraint "datasets__xls_file_pkey";

drop index if exists "public"."datasets__xls_file_dataset_id_key";

drop index if exists "public"."datasets__xls_file_pkey";

create unique index datasets__xlsx_file_dataset_id_key on public.datasets__xlsx_file using btree (
  dataset_id
);

create unique index datasets__xlsx_file_pkey on public.datasets__xlsx_file using btree (id);

alter table "public"."datasets__xlsx_file"
add constraint "datasets__xlsx_file_pkey" primary key using index "datasets__xlsx_file_pkey";

alter table "public"."datasets__xlsx_file"
add constraint "datasets__xlsx_file_dataset_id_fkey" foreign key (
  dataset_id
) references public.datasets (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__xlsx_file" validate constraint "datasets__xlsx_file_dataset_id_fkey";

alter table "public"."datasets__xlsx_file"
add constraint "datasets__xlsx_file_dataset_id_key" unique using index "datasets__xlsx_file_dataset_id_key";

alter table "public"."datasets__xlsx_file"
add constraint "datasets__xlsx_file_workspace_id_fkey" foreign key (
  workspace_id
) references public.workspaces (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__xlsx_file" validate constraint "datasets__xlsx_file_workspace_id_fkey";

set
  check_function_bodies = off;

create or replace function public.rpc_datasets__add_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type public.datasets__source_type,
  p_columns public.dataset_column_input[]
) returns public.datasets language plpgsql as $function$
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
$function$;

create or replace function public.rpc_workspaces__create_with_owner (
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) returns public.workspaces language plpgsql as $function$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
  v_membership_id uuid;
begin
  -- Create the workspace
  insert into public.workspaces (
    owner_id,
    name,
    slug
  ) values (
    v_owner_id,
    p_workspace_name,
    p_workspace_slug
  ) returning * into v_workspace;

  -- Create the workspace membership (owner = Global Admin preset)
  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role_group_id
  )
  select
    v_workspace.id,
    v_owner_id,
    rg.id
  from
    public.role_groups rg
  where
    rg.workspace_id = v_workspace.id and
    rg.name = 'Global Admin' and
    rg.is_builtin
  returning id into v_membership_id;

  -- Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    v_workspace.id,
    v_owner_id,
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
    v_workspace.id,
    v_owner_id,
    v_membership_id,
    'admin'
  );

  return v_workspace;
end;
$function$;

create policy "User can delete datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file" as permissive for insert to authenticated
with
  check (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "User can select datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file" as permissive for
select
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "User can update datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file" as permissive
for update
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  )
with
  check (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );
