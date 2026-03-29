drop function if exists public.rpc_datasets__add_dataset;

drop policy "
  User can DELETE datasets__google_sheets in their workspace
" on "public"."datasets__google_sheets";

drop policy "
  User can INSERT datasets__google_sheets in their workspace
" on "public"."datasets__google_sheets";

drop policy "
  User can SELECT datasets__google_sheets in their workspace
" on "public"."datasets__google_sheets";

drop policy "
  User can UPDATE datasets__google_sheets in their workspace
" on "public"."datasets__google_sheets";

alter type "public"."datasets__source_type"
rename to "datasets__source_type__old_version_to_be_dropped";

create type "public"."datasets__source_type" as enum(
  'csv_file',
  'google_sheets',
  'virtual',
  'open_data'
);

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

create table "public"."catalog_entries__open_data" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "date_of_last_sync" timestamp with time zone,
  "date_of_last_update" timestamp with time zone,
  "coverage_start_date" timestamp with time zone,
  "coverage_end_date" timestamp with time zone,
  "external_organization_name" text not null,
  "external_service_name" text,
  "external_dataset_id" text,
  "source_url" text,
  "canonical_urls" text[],
  "license" text,
  "update_frequency" text,
  "description" text,
  "notes" text,
  "metadata" jsonb
);

alter table "public"."catalog_entries__open_data" enable row level security;

create table "public"."datasets__open_data" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "catalog_entry_id" uuid not null
);

alter table "public"."datasets__open_data" enable row level security;

alter table "public"."datasets"
alter column source_type type "public"."datasets__source_type" using source_type::text::"public"."datasets__source_type";

drop type "public"."datasets__source_type__old_version_to_be_dropped";

create unique index catalog_entries__open_data_pkey on public.catalog_entries__open_data using btree (id);

create unique index datasets__open_data_dataset_id_key on public.datasets__open_data using btree (
  dataset_id
);

create unique index datasets__open_data_pkey on public.datasets__open_data using btree (id);

alter table "public"."catalog_entries__open_data"
add constraint "catalog_entries__open_data_pkey" primary key using index "catalog_entries__open_data_pkey";

alter table "public"."datasets__open_data"
add constraint "datasets__open_data_pkey" primary key using index "datasets__open_data_pkey";

alter table "public"."datasets__open_data"
add constraint "datasets__open_data_catalog_entry_id_fkey" foreign key (
  catalog_entry_id
) references public.catalog_entries__open_data (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__open_data" validate constraint "datasets__open_data_catalog_entry_id_fkey";

alter table "public"."datasets__open_data"
add constraint "datasets__open_data_dataset_id_fkey" foreign key (
  dataset_id
) references public.datasets (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__open_data" validate constraint "datasets__open_data_dataset_id_fkey";

alter table "public"."datasets__open_data"
add constraint "datasets__open_data_dataset_id_key" unique using index "datasets__open_data_dataset_id_key";

alter table "public"."datasets__open_data"
add constraint "datasets__open_data_workspace_id_fkey" foreign key (
  workspace_id
) references public.workspaces (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__open_data" validate constraint "datasets__open_data_workspace_id_fkey";

set
  check_function_bodies = off;

create or replace function public.rpc_datasets__add_open_data_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_catalog_entry_id uuid,
  p_columns public.dataset_column_input[]
) returns public.datasets language plpgsql as $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'open_data',
    p_columns
  );

  insert into public.datasets__open_data(
    dataset_id,
    workspace_id,
    catalog_entry_id
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_catalog_entry_id
  );

  return v_dataset;
end;
$function$;

grant delete on table "public"."catalog_entries__open_data" to "anon";

grant insert on table "public"."catalog_entries__open_data" to "anon";

grant references on table "public"."catalog_entries__open_data" to "anon";

grant
select
  on table "public"."catalog_entries__open_data" to "anon";

grant trigger on table "public"."catalog_entries__open_data" to "anon";

grant
truncate on table "public"."catalog_entries__open_data" to "anon";

grant
update on table "public"."catalog_entries__open_data" to "anon";

grant delete on table "public"."catalog_entries__open_data" to "authenticated";

grant insert on table "public"."catalog_entries__open_data" to "authenticated";

grant references on table "public"."catalog_entries__open_data" to "authenticated";

grant
select
  on table "public"."catalog_entries__open_data" to "authenticated";

grant trigger on table "public"."catalog_entries__open_data" to "authenticated";

grant
truncate on table "public"."catalog_entries__open_data" to "authenticated";

grant
update on table "public"."catalog_entries__open_data" to "authenticated";

grant delete on table "public"."catalog_entries__open_data" to "service_role";

grant insert on table "public"."catalog_entries__open_data" to "service_role";

grant references on table "public"."catalog_entries__open_data" to "service_role";

grant
select
  on table "public"."catalog_entries__open_data" to "service_role";

grant trigger on table "public"."catalog_entries__open_data" to "service_role";

grant
truncate on table "public"."catalog_entries__open_data" to "service_role";

grant
update on table "public"."catalog_entries__open_data" to "service_role";

grant delete on table "public"."datasets__open_data" to "anon";

grant insert on table "public"."datasets__open_data" to "anon";

grant references on table "public"."datasets__open_data" to "anon";

grant
select
  on table "public"."datasets__open_data" to "anon";

grant trigger on table "public"."datasets__open_data" to "anon";

grant
truncate on table "public"."datasets__open_data" to "anon";

grant
update on table "public"."datasets__open_data" to "anon";

grant delete on table "public"."datasets__open_data" to "authenticated";

grant insert on table "public"."datasets__open_data" to "authenticated";

grant references on table "public"."datasets__open_data" to "authenticated";

grant
select
  on table "public"."datasets__open_data" to "authenticated";

grant trigger on table "public"."datasets__open_data" to "authenticated";

grant
truncate on table "public"."datasets__open_data" to "authenticated";

grant
update on table "public"."datasets__open_data" to "authenticated";

grant delete on table "public"."datasets__open_data" to "service_role";

grant insert on table "public"."datasets__open_data" to "service_role";

grant references on table "public"."datasets__open_data" to "service_role";

grant
select
  on table "public"."datasets__open_data" to "service_role";

grant trigger on table "public"."datasets__open_data" to "service_role";

grant
truncate on table "public"."datasets__open_data" to "service_role";

grant
update on table "public"."datasets__open_data" to "service_role";

create policy "User can select catalog_entries__open_data" on "public"."catalog_entries__open_data" as permissive for
select
  to authenticated using (true);

create policy "User can delete datasets__google_sheets in their workspace" on "public"."datasets__google_sheets" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets__google_sheets in their workspace" on "public"."datasets__google_sheets" as permissive for insert to authenticated
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

create policy "User can select datasets__google_sheets in their workspace" on "public"."datasets__google_sheets" as permissive for
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

create policy "User can update datasets__google_sheets in their workspace" on "public"."datasets__google_sheets" as permissive
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

create policy "User can delete datasets__open_data in their workspace" on "public"."datasets__open_data" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert datasets__open_data in their workspace" on "public"."datasets__open_data" as permissive for insert to authenticated
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

create policy "User can select datasets__open_data in their workspace" on "public"."datasets__open_data" as permissive for
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

create policy "User can update datasets__open_data in their workspace" on "public"."datasets__open_data" as permissive
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

create trigger tr_open_data_catalog_entries__set_updated_at before
update on public.catalog_entries__open_data for each row
execute function public.util__set_updated_at ();

create trigger tr_datasets__open_data__set_updated_at before
update on public.datasets__open_data for each row
execute function public.util__set_updated_at ();

drop policy "Anyone can select open data datasets" on "storage"."objects";

drop policy "Auth users can update open data datasets" on "storage"."objects";

drop policy "Auth users can upload open data datasets" on "storage"."objects";
