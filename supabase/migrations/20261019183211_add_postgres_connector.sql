create type "public"."connections__connection_type" as enum ('postgres');

create type "public"."connections__postgres_ssl_mode" as enum ('disable', 'require');

create type "public"."datasets__postgres_table_relation_kind" as enum ('table', 'view');

drop policy "User can insert dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can insert datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

  create table "public"."connections" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "connection_type" public.connections__connection_type not null,
    "name" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."connections" enable row level security;


  create table "public"."connections__postgres" (
    "connection_id" uuid not null,
    "workspace_id" uuid not null,
    "host" text not null,
    "port" integer not null,
    "database_name" text not null,
    "username" text not null,
    "ssl_mode" public.connections__postgres_ssl_mode not null default 'require'::public.connections__postgres_ssl_mode,
    "vault_secret_id" uuid not null,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."connections__postgres" enable row level security;


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

CREATE UNIQUE INDEX connections__id_workspace_id_key ON public.connections USING btree (id, workspace_id);

CREATE UNIQUE INDEX connections__postgres_pkey ON public.connections__postgres USING btree (connection_id);

CREATE UNIQUE INDEX connections__postgres_vault_secret_id_key ON public.connections__postgres USING btree (vault_secret_id);

CREATE UNIQUE INDEX connections_pkey ON public.connections USING btree (id);

CREATE UNIQUE INDEX datasets__id_workspace_id_key ON public.datasets USING btree (id, workspace_id);

CREATE UNIQUE INDEX datasets__postgres_table_dataset_id_key ON public.datasets__postgres_table USING btree (dataset_id);

CREATE UNIQUE INDEX datasets__postgres_table_pkey ON public.datasets__postgres_table USING btree (id);

CREATE INDEX idx_connections__workspace ON public.connections USING btree (workspace_id);

alter table "public"."connections" add constraint "connections_pkey" PRIMARY KEY using index "connections_pkey";

alter table "public"."connections__postgres" add constraint "connections__postgres_pkey" PRIMARY KEY using index "connections__postgres_pkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_pkey" PRIMARY KEY using index "datasets__postgres_table_pkey";

alter table "public"."connections" add constraint "connections__id_workspace_id_key" UNIQUE using index "connections__id_workspace_id_key";

alter table "public"."connections" add constraint "connections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."connections" validate constraint "connections_created_by_fkey";

alter table "public"."connections" add constraint "connections_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."connections" validate constraint "connections_workspace_id_fkey";

alter table "public"."connections__postgres" add constraint "connections__postgres_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."connections__postgres" validate constraint "connections__postgres_connection_id_fkey";

alter table "public"."connections__postgres" add constraint "connections__postgres_vault_secret_id_key" UNIQUE using index "connections__postgres_vault_secret_id_key";

alter table "public"."connections__postgres" add constraint "connections__postgres_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."connections__postgres" validate constraint "connections__postgres_workspace_id_fkey";

alter table "public"."datasets" add constraint "datasets__id_workspace_id_key" UNIQUE using index "datasets__id_workspace_id_key";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table__connection_in_workspace_fkey" FOREIGN KEY (connection_id, workspace_id) REFERENCES public.connections(id, workspace_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table__connection_in_workspace_fkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table__dataset_in_workspace_fkey" FOREIGN KEY (dataset_id, workspace_id) REFERENCES public.datasets(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table__dataset_in_workspace_fkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_dataset_id_key" UNIQUE using index "datasets__postgres_table_dataset_id_key";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.connections__postgres__delete_vault_secret()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__prevent_postgres_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    (
      new.original_name is distinct from old.original_name or
      new.dataset_id is distinct from old.dataset_id or
      new.workspace_id is distinct from old.workspace_id
    ) and
    (
      public.datasets__is_postgres_table (old.dataset_id) or
      public.datasets__is_postgres_table (new.dataset_id)
    )
  then
    raise exception 'a Postgres dataset column cannot be renamed at its source'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__auth_user_may_add_column(p_dataset_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select
        d.source_type <> 'postgres_table' or
        public.util__auth_user_meets_min_app_role (
          d.workspace_id,
          'data_sources',
          'editor'
        )
      from public.datasets d
      where d.id = p_dataset_id
    ),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__google_sheets__prevent_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    new.dataset_id is distinct from old.dataset_id or
    new.google_account_id is distinct from old.google_account_id or
    new.google_document_id is distinct from old.google_document_id or
    new.sheet_name is distinct from old.sheet_name
  then
    raise exception 'a Google Sheets dataset cannot be repointed at another sheet'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__is_postgres_table(p_dataset_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.datasets
    where id = p_dataset_id and source_type = 'postgres_table'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__postgres_table__prevent_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    new.dataset_id is distinct from old.dataset_id or
    new.connection_id is distinct from old.connection_id or
    new.schema_name is distinct from old.schema_name or
    new.table_name is distinct from old.table_name
  then
    raise exception 'a Postgres dataset cannot be repointed at another table'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__prevent_source_type_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.source_type is distinct from old.source_type then
    raise exception 'dataset source_type cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_connections__create_vault_secret(p_secret text, p_name text, p_description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  v_secret_id uuid;
begin
  v_secret_id := vault.create_secret(p_secret, p_name, p_description);
  return v_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  if exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id <> p_workspace_id
  ) then
    raise exception 'Secret % belongs to a connection in a different workspace', p_secret_id;
  end if;

  delete from vault.secrets where id = p_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  v_secret text;
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_vault_secret_id
      and workspace_id = p_workspace_id
  ) then
    return null;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_vault_secret_id;

  return v_secret;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id = p_workspace_id
  ) then
    raise exception 'Secret % does not belong to a connection in this workspace', p_secret_id;
  end if;

  perform vault.update_secret(p_secret_id, p_new_secret);
end;
$function$
;

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

grant select on table "public"."connections" to "authenticated";

grant delete on table "public"."connections" to "service_role";

grant insert on table "public"."connections" to "service_role";

grant select on table "public"."connections" to "service_role";

grant update on table "public"."connections" to "service_role";

grant select on table "public"."connections__postgres" to "authenticated";

grant delete on table "public"."connections__postgres" to "service_role";

grant insert on table "public"."connections__postgres" to "service_role";

grant select on table "public"."connections__postgres" to "service_role";

grant update on table "public"."connections__postgres" to "service_role";

grant delete on table "public"."datasets__postgres_table" to "authenticated";

grant insert on table "public"."datasets__postgres_table" to "authenticated";

grant select on table "public"."datasets__postgres_table" to "authenticated";

grant delete on table "public"."datasets__postgres_table" to "service_role";

grant insert on table "public"."datasets__postgres_table" to "service_role";

grant select on table "public"."datasets__postgres_table" to "service_role";

grant update on table "public"."datasets__postgres_table" to "service_role";


  create policy "User can select connections in their workspace"
  on "public"."connections"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can select connections__postgres in their workspace"
  on "public"."connections__postgres"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



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
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)));



  create policy "User can select datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can insert dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND public.datasets__auth_user_may_add_column(dataset_id)));



  create policy "User can insert datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND (EXISTS ( SELECT 1
   FROM public.tokens__google
  WHERE ((tokens__google.google_account_id = datasets__google_sheets.google_account_id) AND (tokens__google.user_id = ( SELECT auth.uid() AS uid)))))));


CREATE TRIGGER tr_connections__set_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__connections__postgres__delete_vault_secret AFTER DELETE ON public.connections__postgres FOR EACH ROW EXECUTE FUNCTION public.connections__postgres__delete_vault_secret();

CREATE TRIGGER tr_connections__postgres__set_updated_at BEFORE UPDATE ON public.connections__postgres FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__dataset_columns__prevent_postgres_source_change BEFORE UPDATE OF original_name, dataset_id, workspace_id ON public.dataset_columns FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__prevent_postgres_source_change();

CREATE TRIGGER tr__datasets__prevent_source_type_change BEFORE UPDATE OF source_type ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.datasets__prevent_source_type_change();

CREATE TRIGGER tr__datasets__google_sheets__prevent_source_change BEFORE UPDATE OF dataset_id, google_account_id, google_document_id, sheet_name ON public.datasets__google_sheets FOR EACH ROW EXECUTE FUNCTION public.datasets__google_sheets__prevent_source_change();

CREATE TRIGGER tr__datasets__postgres_table__prevent_source_change BEFORE UPDATE OF dataset_id, connection_id, schema_name, table_name ON public.datasets__postgres_table FOR EACH ROW EXECUTE FUNCTION public.datasets__postgres_table__prevent_source_change();

CREATE TRIGGER tr_datasets__postgres_table__set_updated_at BEFORE UPDATE ON public.datasets__postgres_table FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.connections__postgres__delete_vault_secret() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__prevent_postgres_source_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__auth_user_may_add_column(p_dataset_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.datasets__auth_user_may_add_column(p_dataset_id uuid) to "authenticated";
revoke all privileges on function public.datasets__google_sheets__prevent_source_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__is_postgres_table(p_dataset_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.datasets__is_postgres_table(p_dataset_id uuid) to "authenticated";
grant EXECUTE on function public.datasets__is_postgres_table(p_dataset_id uuid) to "service_role";
revoke all privileges on function public.datasets__postgres_table__prevent_source_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__prevent_source_type_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_connections__create_vault_secret(p_secret text, p_name text, p_description text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__create_vault_secret(p_secret text, p_name text, p_description text) to "service_role";
revoke all privileges on function public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid) to "service_role";
revoke all privileges on function public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid) to "service_role";
revoke all privileges on function public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid) to "service_role";
revoke all privileges on function public.rpc_datasets__add_postgres_table_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_connection_id uuid, p_schema_name text, p_table_name text, p_relation_kind datasets__postgres_table_relation_kind) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_postgres_table_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_connection_id uuid, p_schema_name text, p_table_name text, p_relation_kind datasets__postgres_table_relation_kind) to "authenticated";
