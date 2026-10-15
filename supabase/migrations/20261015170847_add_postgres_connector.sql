create type "public"."datasets__postgres_table_relation_kind" as enum ('table', 'view');

create type "public"."db_connections__connection_type" as enum ('postgres');

create type "public"."db_connections__postgres_ssl_mode" as enum ('disable', 'require');

alter type "public"."datasets__source_type" rename to "datasets__source_type__old_version_to_be_dropped";

create type "public"."datasets__source_type" as enum ('csv_file', 'google_sheets', 'virtual', 'open_data', 'xlsx_file', 'pdf_file', 'postgres_table');


  create table "public"."datasets__postgres_table" (
    "id" uuid not null default gen_random_uuid(),
    "dataset_id" uuid not null,
    "workspace_id" uuid not null,
    "connection_id" uuid not null,
    "schema_name" text not null,
    "table_name" text not null,
    "relation_kind" public.datasets__postgres_table_relation_kind not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."datasets__postgres_table" enable row level security;


  create table "public"."db_connections" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "connection_type" public.db_connections__connection_type not null,
    "name" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."db_connections" enable row level security;


  create table "public"."db_connections__postgres" (
    "connection_id" uuid not null,
    "workspace_id" uuid not null,
    "host" text not null,
    "port" integer not null,
    "database_name" text not null,
    "username" text not null,
    "ssl_mode" public.db_connections__postgres_ssl_mode not null default 'require'::public.db_connections__postgres_ssl_mode,
    "vault_secret_id" uuid not null,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."db_connections__postgres" enable row level security;

alter table "public"."datasets" alter column source_type type "public"."datasets__source_type" using source_type::text::"public"."datasets__source_type";

-- `migra`'s enum-rename dance leaves `rpc_datasets__add_dataset`'s signature
-- bound to the old, about-to-be-dropped enum type (a Postgres function's
-- parameter types are bound by OID, not re-resolved by name). `create or
-- replace function` cannot rebind it: Postgres matches "or replace" by
-- argument type, and the old-type-bound signature and the new-type-bound
-- signature are different signatures, so a plain `create or replace` would
-- create a second, overloaded function and leave the original still
-- depending on the old type. Drop the old-type-bound overload explicitly
-- first, then create the one true version against the new type. Source of
-- truth: `supabase/schemas/60.rpc_datasets__add_dataset.sql` - keep this
-- block in sync if that function's body ever changes.
drop function if exists public.rpc_datasets__add_dataset (
  uuid,
  uuid,
  text,
  text,
  public.datasets__source_type__old_version_to_be_dropped,
  public.dataset_column_input[]
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
$$ language plpgsql security definer
set
  search_path = public;

drop type "public"."datasets__source_type__old_version_to_be_dropped";

CREATE UNIQUE INDEX datasets__postgres_table_dataset_id_key ON public.datasets__postgres_table USING btree (dataset_id);

CREATE UNIQUE INDEX datasets__postgres_table_pkey ON public.datasets__postgres_table USING btree (id);

CREATE UNIQUE INDEX db_connections__postgres_pkey ON public.db_connections__postgres USING btree (connection_id);

CREATE UNIQUE INDEX db_connections_pkey ON public.db_connections USING btree (id);

CREATE INDEX idx_db_connections__workspace ON public.db_connections USING btree (workspace_id);

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_pkey" PRIMARY KEY using index "datasets__postgres_table_pkey";

alter table "public"."db_connections" add constraint "db_connections_pkey" PRIMARY KEY using index "db_connections_pkey";

alter table "public"."db_connections__postgres" add constraint "db_connections__postgres_pkey" PRIMARY KEY using index "db_connections__postgres_pkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.db_connections(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table_connection_id_fkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table_dataset_id_fkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_dataset_id_key" UNIQUE using index "datasets__postgres_table_dataset_id_key";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table_workspace_id_fkey";

alter table "public"."db_connections" add constraint "db_connections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."db_connections" validate constraint "db_connections_created_by_fkey";

alter table "public"."db_connections" add constraint "db_connections_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."db_connections" validate constraint "db_connections_workspace_id_fkey";

alter table "public"."db_connections__postgres" add constraint "db_connections__postgres_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.db_connections(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."db_connections__postgres" validate constraint "db_connections__postgres_connection_id_fkey";

alter table "public"."db_connections__postgres" add constraint "db_connections__postgres_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."db_connections__postgres" validate constraint "db_connections__postgres_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_postgres_table_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_connection_id uuid, p_schema_name text, p_table_name text, p_relation_kind public.datasets__postgres_table_relation_kind)
 RETURNS public.datasets
 LANGUAGE plpgsql
AS $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'postgres_table',
    p_columns
  );

  insert into public.datasets__postgres_table (
    dataset_id,
    workspace_id,
    connection_id,
    schema_name,
    table_name,
    relation_kind
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_connection_id,
    p_schema_name,
    p_table_name,
    p_relation_kind
  );

  return v_dataset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_db_connections__get_decrypted_secret(p_vault_secret_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_vault_secret_id;

  return v_secret;
end;
$function$
;

grant delete on table "public"."datasets__postgres_table" to "authenticated";

grant insert on table "public"."datasets__postgres_table" to "authenticated";

grant select on table "public"."datasets__postgres_table" to "authenticated";

grant update on table "public"."datasets__postgres_table" to "authenticated";

grant delete on table "public"."datasets__postgres_table" to "service_role";

grant insert on table "public"."datasets__postgres_table" to "service_role";

grant select on table "public"."datasets__postgres_table" to "service_role";

grant update on table "public"."datasets__postgres_table" to "service_role";

grant delete on table "public"."db_connections" to "authenticated";

grant insert on table "public"."db_connections" to "authenticated";

grant select on table "public"."db_connections" to "authenticated";

grant update on table "public"."db_connections" to "authenticated";

grant delete on table "public"."db_connections" to "service_role";

grant insert on table "public"."db_connections" to "service_role";

grant select on table "public"."db_connections" to "service_role";

grant update on table "public"."db_connections" to "service_role";

grant delete on table "public"."db_connections__postgres" to "authenticated";

grant insert on table "public"."db_connections__postgres" to "authenticated";

grant select on table "public"."db_connections__postgres" to "authenticated";

grant update on table "public"."db_connections__postgres" to "authenticated";

grant delete on table "public"."db_connections__postgres" to "service_role";

grant insert on table "public"."db_connections__postgres" to "service_role";

grant select on table "public"."db_connections__postgres" to "service_role";

grant update on table "public"."db_connections__postgres" to "service_role";


  create policy "User can delete datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'admin'::public.role_level));



  create policy "User can insert datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete db_connections in their workspace"
  on "public"."db_connections"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'admin'::public.role_level));



  create policy "User can insert db_connections in their workspace"
  on "public"."db_connections"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can select db_connections in their workspace"
  on "public"."db_connections"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "User can update db_connections in their workspace"
  on "public"."db_connections"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can delete db_connections__postgres in their workspace"
  on "public"."db_connections__postgres"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'admin'::public.role_level));



  create policy "User can insert db_connections__postgres in their workspace"
  on "public"."db_connections__postgres"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can select db_connections__postgres in their workspace"
  on "public"."db_connections__postgres"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "User can update db_connections__postgres in their workspace"
  on "public"."db_connections__postgres"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));


CREATE TRIGGER tr_datasets__postgres_table__set_updated_at BEFORE UPDATE ON public.datasets__postgres_table FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr_db_connections__set_updated_at BEFORE UPDATE ON public.db_connections FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr_db_connections__postgres__set_updated_at BEFORE UPDATE ON public.db_connections__postgres FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type datasets__source_type, p_columns dataset_column_input[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type datasets__source_type, p_columns dataset_column_input[]) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_postgres_table_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_connection_id uuid, p_schema_name text, p_table_name text, p_relation_kind datasets__postgres_table_relation_kind) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_postgres_table_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_connection_id uuid, p_schema_name text, p_table_name text, p_relation_kind datasets__postgres_table_relation_kind) to "authenticated";
revoke all privileges on function public.rpc_db_connections__get_decrypted_secret(p_vault_secret_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_db_connections__get_decrypted_secret(p_vault_secret_id uuid) to "service_role";
