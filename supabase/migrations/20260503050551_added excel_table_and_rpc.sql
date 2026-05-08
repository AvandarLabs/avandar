create table "public"."datasets__xls_file" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "is_in_cloud_storage" boolean not null default false,
  "size_in_bytes" integer not null,
  "rows_to_skip" integer not null default 0,
  "sheet_name" text,
  "has_header" boolean not null default true,
  "date_format" text,
  "timestamp_format" text
);

alter table "public"."datasets__xls_file" enable row level security;

create unique index datasets__xls_file_dataset_id_key on public.datasets__xls_file using btree (
  dataset_id
);

create unique index datasets__xls_file_pkey on public.datasets__xls_file using btree (id);

alter table "public"."datasets__xls_file"
add constraint "datasets__xls_file_pkey" primary key using index "datasets__xls_file_pkey";

alter table "public"."datasets__xls_file"
add constraint "datasets__xls_file_dataset_id_fkey" foreign key (
  dataset_id
) references public.datasets (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__xls_file" validate constraint "datasets__xls_file_dataset_id_fkey";

alter table "public"."datasets__xls_file"
add constraint "datasets__xls_file_dataset_id_key" unique using index "datasets__xls_file_dataset_id_key";

alter table "public"."datasets__xls_file"
add constraint "datasets__xls_file_workspace_id_fkey" foreign key (
  workspace_id
) references public.workspaces (id) on update cascade on delete cascade not valid;

alter table "public"."datasets__xls_file" validate constraint "datasets__xls_file_workspace_id_fkey";

set
  check_function_bodies = off;

create or replace function public.rpc_datasets__add_xls_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes integer,
  p_rows_to_skip integer,
  p_sheet_name public.util__nullable_text,
  p_has_header boolean,
  p_date_format public.datasets__csv_file__date_format
) returns public.datasets language plpgsql as $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'xls_file',
    p_columns
  );

  insert into public.datasets__xls_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    rows_to_skip,
    sheet_name,
    has_header,
    date_format,
    timestamp_format
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_rows_to_skip,
    p_sheet_name.value,
    p_has_header,
    p_date_format.date_format,
    p_date_format.timestamp_format
  );

  return v_dataset;
end;
$function$;

grant delete on table "public"."datasets__xls_file" to "anon";

grant insert on table "public"."datasets__xls_file" to "anon";

grant references on table "public"."datasets__xls_file" to "anon";

grant
select
  on table "public"."datasets__xls_file" to "anon";

grant trigger on table "public"."datasets__xls_file" to "anon";

grant
truncate on table "public"."datasets__xls_file" to "anon";

grant
update on table "public"."datasets__xls_file" to "anon";

grant delete on table "public"."datasets__xls_file" to "authenticated";

grant insert on table "public"."datasets__xls_file" to "authenticated";

grant references on table "public"."datasets__xls_file" to "authenticated";

grant
select
  on table "public"."datasets__xls_file" to "authenticated";

grant trigger on table "public"."datasets__xls_file" to "authenticated";

grant
truncate on table "public"."datasets__xls_file" to "authenticated";

grant
update on table "public"."datasets__xls_file" to "authenticated";

grant delete on table "public"."datasets__xls_file" to "service_role";

grant insert on table "public"."datasets__xls_file" to "service_role";

grant references on table "public"."datasets__xls_file" to "service_role";

grant
select
  on table "public"."datasets__xls_file" to "service_role";

grant trigger on table "public"."datasets__xls_file" to "service_role";

grant
truncate on table "public"."datasets__xls_file" to "service_role";

grant
update on table "public"."datasets__xls_file" to "service_role";

create policy "User can delete datasets__xls_file in their workspace" on "public"."datasets__xls_file" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
);

create policy "User can insert datasets__xls_file in their workspace" on "public"."datasets__xls_file" as permissive for insert to authenticated
with
  check (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces ()
        )
      )
    )
  );

create policy "User can select datasets__xls_file in their workspace" on "public"."datasets__xls_file" as permissive for
select
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces ()
        )
      )
    )
  );

create policy "User can update datasets__xls_file in their workspace" on "public"."datasets__xls_file" as permissive
for update
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces ()
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
            public.util__get_auth_user_workspaces ()
        )
      )
    )
  );

create trigger tr_datasets__xls_file__set_updated_at before
update on public.datasets__xls_file for each row
execute function public.util__set_updated_at ();
