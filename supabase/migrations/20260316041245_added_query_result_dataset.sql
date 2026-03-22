drop function if exists public.rpc_datasets__add_dataset;

drop policy "
  User can DELETE datasets in their workspace
" on "public"."datasets";

drop policy "
  User can INSERT datasets in their workspace
" on "public"."datasets";

drop policy "
  User can SELECT datasets in their workspace
" on "public"."datasets";

drop policy "User can UPDATE datasets in their workspace" on "public"."datasets";

drop policy "
  User can DELETE datasets__csv_file in their workspace
" on "public"."datasets__csv_file";

drop policy "
  User can INSERT datasets__csv_file in their workspace
" on "public"."datasets__csv_file";

drop policy "
  User can SELECT datasets__csv_file in their workspace
" on "public"."datasets__csv_file";

drop policy "
  User can UPDATE datasets__csv_file in their workspace
" on "public"."datasets__csv_file";

alter type "public"."datasets__source_type"
rename to "datasets__source_type__old_version_to_be_dropped";

create type "public"."datasets__source_type" as enum(
  'csv_file',
  'google_sheets',
  'virtual'
);

create table "public"."datasets__virtual" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "raw_sql" text not null
);

alter table "public"."datasets__virtual" enable row level security;

alter table "public"."datasets"
alter column source_type type "public"."datasets__source_type" using source_type::text::"public"."datasets__source_type";

drop type "public"."datasets__source_type__old_version_to_be_dropped";

create unique index datasets__virtual_dataset_id_key on public.datasets__virtual using btree (
  dataset_id
);

create unique index datasets__virtual_pkey on public.datasets__virtual using btree (id);

alter table "public"."datasets__virtual"
add constraint "datasets__virtual_pkey" primary key using index "datasets__virtual_pkey";

alter table "public"."datasets__virtual"
add constraint "datasets__virtual_dataset_id_fkey" foreign key (
  dataset_id
) references public.datasets (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__virtual" validate constraint "datasets__virtual_dataset_id_fkey";

alter table "public"."datasets__virtual"
add constraint "datasets__virtual_dataset_id_key" unique using index "datasets__virtual_dataset_id_key";

alter table "public"."datasets__virtual"
add constraint "datasets__virtual_workspace_id_fkey" foreign key (
  workspace_id
) references public.workspaces (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__virtual" validate constraint "datasets__virtual_workspace_id_fkey";

grant delete on table "public"."datasets__virtual" to "anon";

grant insert on table "public"."datasets__virtual" to "anon";

grant references on table "public"."datasets__virtual" to "anon";

grant
select
  on table "public"."datasets__virtual" to "anon";

grant trigger on table "public"."datasets__virtual" to "anon";

grant
truncate on table "public"."datasets__virtual" to "anon";

grant
update on table "public"."datasets__virtual" to "anon";

grant delete on table "public"."datasets__virtual" to "authenticated";

grant insert on table "public"."datasets__virtual" to "authenticated";

grant references on table "public"."datasets__virtual" to "authenticated";

grant
select
  on table "public"."datasets__virtual" to "authenticated";

grant trigger on table "public"."datasets__virtual" to "authenticated";

grant
truncate on table "public"."datasets__virtual" to "authenticated";

grant
update on table "public"."datasets__virtual" to "authenticated";

grant delete on table "public"."datasets__virtual" to "service_role";

grant insert on table "public"."datasets__virtual" to "service_role";

grant references on table "public"."datasets__virtual" to "service_role";

grant
select
  on table "public"."datasets__virtual" to "service_role";

grant trigger on table "public"."datasets__virtual" to "service_role";

grant
truncate on table "public"."datasets__virtual" to "service_role";

grant
update on table "public"."datasets__virtual" to "service_role";

create policy "User can delete datasets in their workspace" on "public"."datasets" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets in their workspace" on "public"."datasets" as permissive for insert to authenticated
with
  check (
    (
      (
        workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
          )
        )
      ) and
      (
        owner_id = (
          select
            auth.uid () as uid
        )
      )
    )
  );

create policy "User can select datasets in their workspace" on "public"."datasets" as permissive for
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

create policy "User can update datasets in their workspace" on "public"."datasets" as permissive
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
      (
        workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
          )
        )
      ) and
      (
        owner_id = any (
          array(
            select
              public.util__get_workspace_members (
                datasets.workspace_id
              ) as util__get_workspace_members
          )
        )
      )
    )
  );

create policy "User can delete datasets__csv_file in their workspace" on "public"."datasets__csv_file" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets__csv_file in their workspace" on "public"."datasets__csv_file" as permissive for insert to authenticated
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

create policy "User can select datasets__csv_file in their workspace" on "public"."datasets__csv_file" as permissive for
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

create policy "User can update datasets__csv_file in their workspace" on "public"."datasets__csv_file" as permissive
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

create policy "User can delete datasets__virtual in their workspace" on "public"."datasets__virtual" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets__virtual in their workspace" on "public"."datasets__virtual" as permissive for insert to authenticated
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

create policy "User can select datasets__virtual in their workspace" on "public"."datasets__virtual" as permissive for
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

create policy "User can update datasets__virtual in their workspace" on "public"."datasets__virtual" as permissive
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

create trigger tr_datasets__virtual__set_updated_at before
update on public.datasets__virtual for each row
execute function public.util__set_updated_at ();

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
