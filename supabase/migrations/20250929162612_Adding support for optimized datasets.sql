drop trigger if exists "tr_datasets__local_csv__set_updated_at" on "public"."datasets__local_csv";

drop trigger if exists "tr_entity_field_values__set_updated_at" on "public"."entity_field_values";

drop policy "
  User can DELETE datasets__local_csv in their workspace
" on "public"."datasets__local_csv";

drop policy "
  User can INSERT datasets__local_csv in their workspace
" on "public"."datasets__local_csv";

drop policy "
  User can SELECT datasets__local_csv in their workspace
" on "public"."datasets__local_csv";

drop policy "
  User can UPDATE datasets__local_csv in their workspace
" on "public"."datasets__local_csv";

drop policy "
  User can DELETE entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can INSERT entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can SELECT entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can UPDATE entity field values in their workspace
" on "public"."entity_field_values";

revoke delete on table "public"."datasets__local_csv"
from
  "anon";

revoke insert on table "public"."datasets__local_csv"
from
  "anon";

revoke references on table "public"."datasets__local_csv"
from
  "anon";

revoke
select
  on table "public"."datasets__local_csv"
from
  "anon";

revoke trigger on table "public"."datasets__local_csv"
from
  "anon";

revoke
truncate on table "public"."datasets__local_csv"
from
  "anon";

revoke
update on table "public"."datasets__local_csv"
from
  "anon";

revoke delete on table "public"."datasets__local_csv"
from
  "authenticated";

revoke insert on table "public"."datasets__local_csv"
from
  "authenticated";

revoke references on table "public"."datasets__local_csv"
from
  "authenticated";

revoke
select
  on table "public"."datasets__local_csv"
from
  "authenticated";

revoke trigger on table "public"."datasets__local_csv"
from
  "authenticated";

revoke
truncate on table "public"."datasets__local_csv"
from
  "authenticated";

revoke
update on table "public"."datasets__local_csv"
from
  "authenticated";

revoke delete on table "public"."datasets__local_csv"
from
  "service_role";

revoke insert on table "public"."datasets__local_csv"
from
  "service_role";

revoke references on table "public"."datasets__local_csv"
from
  "service_role";

revoke
select
  on table "public"."datasets__local_csv"
from
  "service_role";

revoke trigger on table "public"."datasets__local_csv"
from
  "service_role";

revoke
truncate on table "public"."datasets__local_csv"
from
  "service_role";

revoke
update on table "public"."datasets__local_csv"
from
  "service_role";

revoke delete on table "public"."entity_field_values"
from
  "anon";

revoke insert on table "public"."entity_field_values"
from
  "anon";

revoke references on table "public"."entity_field_values"
from
  "anon";

revoke
select
  on table "public"."entity_field_values"
from
  "anon";

revoke trigger on table "public"."entity_field_values"
from
  "anon";

revoke
truncate on table "public"."entity_field_values"
from
  "anon";

revoke
update on table "public"."entity_field_values"
from
  "anon";

revoke delete on table "public"."entity_field_values"
from
  "authenticated";

revoke insert on table "public"."entity_field_values"
from
  "authenticated";

revoke references on table "public"."entity_field_values"
from
  "authenticated";

revoke
select
  on table "public"."entity_field_values"
from
  "authenticated";

revoke trigger on table "public"."entity_field_values"
from
  "authenticated";

revoke
truncate on table "public"."entity_field_values"
from
  "authenticated";

revoke
update on table "public"."entity_field_values"
from
  "authenticated";

revoke delete on table "public"."entity_field_values"
from
  "service_role";

revoke insert on table "public"."entity_field_values"
from
  "service_role";

revoke references on table "public"."entity_field_values"
from
  "service_role";

revoke
select
  on table "public"."entity_field_values"
from
  "service_role";

revoke trigger on table "public"."entity_field_values"
from
  "service_role";

revoke
truncate on table "public"."entity_field_values"
from
  "service_role";

revoke
update on table "public"."entity_field_values"
from
  "service_role";

alter table "public"."datasets__local_csv"
drop constraint "datasets__local_csv_dataset_id_fkey";

alter table "public"."datasets__local_csv"
drop constraint "datasets__local_csv_dataset_id_key";

alter table "public"."datasets__local_csv"
drop constraint "datasets__local_csv_workspace_id_fkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_dataset_id_fkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_entity_config_id_fkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_entity_field_config_id_fkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_entity_id_fkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_workspace_id_fkey";

drop function if exists "public"."rpc_datasets__add_local_csv_dataset" (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns dataset_column_input[],
  p_delimiter text,
  p_size_in_bytes integer
);

-- dropping this function here just so we can safely drop datasets__source_type
drop function if exists "public"."rpc_datasets__add_dataset" (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type datasets__source_type,
  p_columns dataset_column_input[]
);

alter table "public"."datasets__local_csv"
drop constraint "datasets__local_csv_pkey";

alter table "public"."entity_field_values"
drop constraint "entity_field_values_pkey";

drop index if exists "public"."datasets__local_csv_dataset_id_key";

drop index if exists "public"."datasets__local_csv_pkey";

drop index if exists "public"."entity_field_values_pkey";

drop table "public"."datasets__local_csv";

drop table "public"."entity_field_values";

alter type "public"."datasets__source_type"
rename to "datasets__source_type__old_version_to_be_dropped";

create type "public"."util__nullable_text" as (
  "value" text
);

create type "public"."datasets__source_type" as enum(
  'csv_file',
  'google_sheets'
);

create table "public"."datasets__csv_file" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "size_in_bytes" integer not null,
  "rows_to_skip" integer not null default 0,
  "quote_char" text not null default '"'::text,
  "escape_char" text not null default '"'::text,
  "delimiter" text not null,
  "newline_delimiter" text not null default '
'::text,
  "comment_char" text,
  "has_header" boolean not null default true,
  "date_format" text,
  "timestamp_format" text
);

alter table "public"."datasets__csv_file" enable row level security;

alter table "public"."datasets"
alter column source_type type "public"."datasets__source_type" using source_type::text::"public"."datasets__source_type";

drop type "public"."datasets__source_type__old_version_to_be_dropped";

create unique index datasets__csv_file_dataset_id_key on public.datasets__csv_file using btree (
  dataset_id
);

create unique index datasets__csv_file_pkey on public.datasets__csv_file using btree (id);

create unique index entities__entity_config_external_id_unique on public.entities using btree (
  entity_config_id,
  external_id
);

alter table "public"."datasets__csv_file"
add constraint "datasets__csv_file_pkey" primary key using index "datasets__csv_file_pkey";

alter table "public"."datasets__csv_file"
add constraint "datasets__csv_file_dataset_id_fkey" foreign key (
  dataset_id
) references datasets (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__csv_file" validate constraint "datasets__csv_file_dataset_id_fkey";

alter table "public"."datasets__csv_file"
add constraint "datasets__csv_file_dataset_id_key" unique using index "datasets__csv_file_dataset_id_key";

alter table "public"."datasets__csv_file"
add constraint "datasets__csv_file_workspace_id_fkey" foreign key (
  workspace_id
) references workspaces (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__csv_file" validate constraint "datasets__csv_file_workspace_id_fkey";

alter table "public"."entities"
add constraint "entities__entity_config_external_id_unique" unique using index "entities__entity_config_external_id_unique";

set
  check_function_bodies = off;

create type "public"."datasets__csv_file__date_format" as (
  "date_format" text,
  "timestamp_format" text
);

-- Add the rpc_datasets__add_dataset function back again
create or replace function public.rpc_datasets__add_dataset (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type datasets__source_type,
  p_columns dataset_column_input[]
) returns datasets language plpgsql as $function$
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
$function$;

create or replace function public.rpc_datasets__add_csv_file_dataset (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns dataset_column_input[],
  p_size_in_bytes integer,
  p_rows_to_skip integer,
  p_quote_char text,
  p_escape_char text,
  p_delimiter text,
  p_newline_delimiter text,
  p_comment_char util__nullable_text,
  p_has_header boolean,
  p_date_format datasets__csv_file__date_format
) returns datasets language plpgsql as $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
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
    p_quote_char,
    p_escape_char,
    p_delimiter,
    p_newline_delimiter,
    p_comment_char.value,
    p_has_header,
    p_date_format.date_format,
    p_date_format.timestamp_format
  );

  return v_dataset;
end;
$function$;

grant delete on table "public"."datasets__csv_file" to "anon";

grant insert on table "public"."datasets__csv_file" to "anon";

grant references on table "public"."datasets__csv_file" to "anon";

grant
select
  on table "public"."datasets__csv_file" to "anon";

grant trigger on table "public"."datasets__csv_file" to "anon";

grant
truncate on table "public"."datasets__csv_file" to "anon";

grant
update on table "public"."datasets__csv_file" to "anon";

grant delete on table "public"."datasets__csv_file" to "authenticated";

grant insert on table "public"."datasets__csv_file" to "authenticated";

grant references on table "public"."datasets__csv_file" to "authenticated";

grant
select
  on table "public"."datasets__csv_file" to "authenticated";

grant trigger on table "public"."datasets__csv_file" to "authenticated";

grant
truncate on table "public"."datasets__csv_file" to "authenticated";

grant
update on table "public"."datasets__csv_file" to "authenticated";

grant delete on table "public"."datasets__csv_file" to "service_role";

grant insert on table "public"."datasets__csv_file" to "service_role";

grant references on table "public"."datasets__csv_file" to "service_role";

grant
select
  on table "public"."datasets__csv_file" to "service_role";

grant trigger on table "public"."datasets__csv_file" to "service_role";

grant
truncate on table "public"."datasets__csv_file" to "service_role";

grant
update on table "public"."datasets__csv_file" to "service_role";

create policy "
  User can DELETE datasets__csv_file in their workspace
" on "public"."datasets__csv_file" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "
  User can INSERT datasets__csv_file in their workspace
" on "public"."datasets__csv_file" as permissive for insert to authenticated
with
  check (
    (
      workspace_id = any (
        array(
          select
            util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "
  User can SELECT datasets__csv_file in their workspace
" on "public"."datasets__csv_file" as permissive for
select
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "
  User can UPDATE datasets__csv_file in their workspace
" on "public"."datasets__csv_file" as permissive
for update
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            util__get_auth_user_workspaces () as util__get_auth_user_workspaces
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
            util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create trigger tr_datasets__csv_file__set_updated_at before
update on public.datasets__csv_file for each row
execute function util__set_updated_at ();
