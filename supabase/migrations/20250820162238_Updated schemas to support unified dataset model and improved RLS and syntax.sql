-- ================================
-- TYPES
-- ================================
create type "public"."datasets__column_data_type" as enum ('text', 'number', 'date');
create type "public"."datasets__source_type" as enum ('local_csv', 'google_sheets');

-- ================================
-- CLEANUP (idempotent)
-- ================================
drop policy if exists "User can DELETE entity_configs" on "public"."entity_configs";
drop policy if exists "User can INSERT entity_configs" on "public"."entity_configs";
drop policy if exists "User can SELECT entity_configs" on "public"."entity_configs";
drop policy if exists "User can UPDATE entity_configs" on "public"."entity_configs";

drop policy if exists "User can DELETE entity_field_configs" on "public"."entity_field_configs";
drop policy if exists "User can INSERT entity_field_configs" on "public"."entity_field_configs";
drop policy if exists "User can SELECT entity_field_configs" on "public"."entity_field_configs";
drop policy if exists "User can UPDATE entity_field_configs" on "public"."entity_field_configs";

drop policy if exists "User can DELETE their own google tokens" on "public"."tokens__google";
drop policy if exists "User can INSERT their own google tokens" on "public"."tokens__google";
drop policy if exists "User can SELECT their own google tokens" on "public"."tokens__google";
drop policy if exists "User can UPDATE their own google tokens" on "public"."tokens__google";

-- user_profiles legacy policy names (may or may not exist)
drop policy if exists "Owner can INSERT their own user_profiles; Admin can INSERT othe" on "public"."user_profiles";
drop policy if exists "User can DELETE their own user_profiles; Admin can DELETE other" on "public"."user_profiles";
drop policy if exists "User can SELECT their own profiles or profiles of other workspa" on "public"."user_profiles";
drop policy if exists "User can UPDATE their own user_profiles; Admin can UPDATE other" on "public"."user_profiles";

-- user_roles legacy policy names
drop policy if exists "Admin can UPDATE other user_roles" on "public"."user_roles";
drop policy if exists "Owner can INSERT their own user_roles; Admin can INSERT other u" on "public"."user_roles";
drop policy if exists "User can DELETE their own user_roles; Admin can DELETE other us" on "public"."user_roles";
drop policy if exists "User can SELECT their own user_roles or roles of other workspac" on "public"."user_roles";

drop policy if exists "User can DELETE value_extractors__aggregation" on "public"."value_extractors__aggregation";
drop policy if exists "User can INSERT value_extractors__aggregation" on "public"."value_extractors__aggregation";
drop policy if exists "User can SELECT value_extractors__aggregation" on "public"."value_extractors__aggregation";
drop policy if exists "User can UPDATE value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy if exists "User can DELETE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";
drop policy if exists "User can INSERT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";
drop policy if exists "User can SELECT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";
drop policy if exists "User can UPDATE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy if exists "User can DELETE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";
drop policy if exists "User can INSERT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";
drop policy if exists "User can SELECT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";
drop policy if exists "User can UPDATE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy if exists "Owner can INSERT themselves as workspace members; Admin can INS" on "public"."workspace_memberships";
drop policy if exists "User can DELETE their own memberships; Admin can DELETE other m" on "public"."workspace_memberships";
drop policy if exists "User can SELECT their own memberships or memberships of other u" on "public"."workspace_memberships";

drop policy if exists "Owners can DELETE their workspaces" on "public"."workspaces";
drop policy if exists "User can INSERT workspaces that they own" on "public"."workspaces";
drop policy if exists "User can SELECT workspaces they own or belong to" on "public"."workspaces";
drop policy if exists "User can UPDATE workspaces they admin" on "public"."workspaces";

alter table "public"."tokens__google" drop constraint if exists "tokens__google__user_google_account_unique";

-- old helper functions (we’ll recreate the ones we still need below)
drop function if exists "public"."util__auth_user_is_workspace_admin"(workspace_id uuid);
drop function if exists "public"."util__auth_user_is_workspace_member"(workspace_id uuid);
drop function if exists "public"."util__auth_user_is_workspace_owner"(workspace_id uuid);
drop function if exists "public"."util__user_is_workspace_member"(user_id uuid, workspace_id uuid);

drop index if exists "public"."idx_value_extractors__dataset_column_value__entity_field_config";
drop index if exists "public"."idx_value_extractors__manual_entry__entity_field_config_id_work";
drop index if exists "public"."tokens__google__user_google_account_unique";

-- ================================
-- TABLES (idempotent create)
-- ================================
create table if not exists "public"."dataset_columns" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "name" text not null,
  "data_type" datasets__column_data_type not null,
  "description" text,
  "column_idx" integer not null
);
alter table "public"."dataset_columns" enable row level security;

create table if not exists "public"."datasets" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "owner_id" uuid not null default auth.uid(),
  "owner_profile_id" uuid not null,
  "workspace_id" uuid not null,
  "date_of_last_sync" timestamp with time zone,
  "name" text not null,
  "source_type" datasets__source_type not null,
  "description" text
);
alter table "public"."datasets" enable row level security;

create table if not exists "public"."datasets__google_sheets" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "google_account_id" text not null,
  "google_document_id" text not null,
  "rows_to_skip" integer not null default 0
);
alter table "public"."datasets__google_sheets" enable row level security;

create table if not exists "public"."datasets__local_csv" (
  "id" uuid not null default gen_random_uuid(),
  "dataset_id" uuid not null,
  "workspace_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "delimiter" text not null,
  "size_in_bytes" integer not null
);
alter table "public"."datasets__local_csv" enable row level security;

create table if not exists "public"."dexie_dbs" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null default auth.uid(),
  "db_id" uuid not null,
  "version" integer not null,
  "user_agent" text not null,
  "created_at" timestamp with time zone not null default now(),
  "last_seen_at" timestamp with time zone not null default now()
);
alter table "public"."dexie_dbs" enable row level security;

create table if not exists "public"."entities" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "workspace_id" uuid not null,
  "name" text not null,
  "entity_config_id" uuid not null,
  "external_id" text not null,
  "assigned_to" uuid,
  "status" text not null
);
alter table "public"."entities" enable row level security;

create table if not exists "public"."entity_field_values" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "workspace_id" uuid not null,
  "entity_id" uuid not null,
  "entity_config_id" uuid not null,
  "entity_field_config_id" uuid not null,
  "value" text,
  "value_set" text not null,
  "dataset_id" uuid
);
alter table "public"."entity_field_values" enable row level security;

-- ================================
-- INDEXES (idempotent)
-- ================================
create unique index if not exists dataset_columns_pkey on public.dataset_columns using btree (id);
create unique index if not exists datasets__google_sheets_dataset_id_key on public.datasets__google_sheets using btree (dataset_id);
create unique index if not exists datasets__google_sheets_pkey on public.datasets__google_sheets using btree (id);
create unique index if not exists datasets__local_csv_dataset_id_key on public.datasets__local_csv using btree (dataset_id);
create unique index if not exists datasets__local_csv_pkey on public.datasets__local_csv using btree (id);
create unique index if not exists datasets_pkey on public.datasets using btree (id);
create unique index if not exists dexie_dbs_pkey on public.dexie_dbs using btree (id);
create unique index if not exists dexie_dbs_unique_user_db_id on public.dexie_dbs using btree (db_id, user_id);
create unique index if not exists entities_pkey on public.entities using btree (id);
create unique index if not exists entity_field_values_pkey on public.entity_field_values using btree (id);

create index if not exists idx_dataset_column_value_extractors__efc_id_workspace_id on public.value_extractors__dataset_column_value using btree (entity_field_config_id, workspace_id);
create index if not exists idx_manual_entry_value_extractors__efc_id_workspace_id on public.value_extractors__manual_entry using btree (entity_field_config_id, workspace_id);

create index if not exists idx_user_roles__workspace_id on public.user_roles using btree (workspace_id);
create index if not exists idx_workspaces__owner_id on public.workspaces using btree (owner_id);

create unique index if not exists tokens__google_google_account_id_key on public.tokens__google using btree (google_account_id);
create unique index if not exists tokens__google_user_id_google_account_id_key on public.tokens__google using btree (user_id, google_account_id);

create unique index if not exists user_profiles_membership_id_key on public.user_profiles using btree (membership_id);
create unique index if not exists user_roles_membership_id_key on public.user_roles using btree (membership_id);

create unique index if not exists value_extractors__aggregation_entity_field_config_id_key on public.value_extractors__aggregation using btree (entity_field_config_id);
create unique index if not exists value_extractors__dataset_column_val_entity_field_config_id_key on public.value_extractors__dataset_column_value using btree (entity_field_config_id);
create unique index if not exists value_extractors__manual_entry_entity_field_config_id_key on public.value_extractors__manual_entry using btree (entity_field_config_id);

-- ================================
-- PKs (idempotent via DO/EXCEPTION)
-- ================================
DO $$ BEGIN
  ALTER TABLE public.dataset_columns
    ADD CONSTRAINT dataset_columns_pkey
    PRIMARY KEY USING INDEX dataset_columns_pkey;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.datasets
    ADD CONSTRAINT datasets_pkey
    PRIMARY KEY USING INDEX datasets_pkey;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."datasets__google_sheets"
    ADD CONSTRAINT "datasets__google_sheets_pkey"
    PRIMARY KEY USING INDEX "datasets__google_sheets_pkey";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."datasets__local_csv"
    ADD CONSTRAINT "datasets__local_csv_pkey"
    PRIMARY KEY USING INDEX "datasets__local_csv_pkey";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dexie_dbs
    ADD CONSTRAINT dexie_dbs_pkey
    PRIMARY KEY USING INDEX dexie_dbs_pkey;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.entities
    ADD CONSTRAINT entities_pkey
    PRIMARY KEY USING INDEX entities_pkey;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_pkey
    PRIMARY KEY USING INDEX entity_field_values_pkey;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================
-- FKs (idempotent + VALIDATE)
-- ================================
DO $$ BEGIN
  ALTER TABLE public.dataset_columns
    ADD CONSTRAINT dataset_columns_dataset_id_fkey
    FOREIGN KEY (dataset_id) REFERENCES public.datasets(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.dataset_columns VALIDATE CONSTRAINT dataset_columns_dataset_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.dataset_columns
    ADD CONSTRAINT dataset_columns_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.dataset_columns VALIDATE CONSTRAINT dataset_columns_workspace_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.datasets
    ADD CONSTRAINT datasets_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id)
    ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.datasets VALIDATE CONSTRAINT datasets_owner_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.datasets
    ADD CONSTRAINT datasets_owner_profile_id_fkey
    FOREIGN KEY (owner_profile_id) REFERENCES public.user_profiles(id)
    ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.datasets VALIDATE CONSTRAINT datasets_owner_profile_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.datasets
    ADD CONSTRAINT datasets_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.datasets VALIDATE CONSTRAINT datasets_workspace_id_fkey;

DO $$ BEGIN
  ALTER TABLE public."datasets__google_sheets"
    ADD CONSTRAINT "datasets__google_sheets_dataset_id_fkey"
    FOREIGN KEY (dataset_id) REFERENCES public.datasets(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public."datasets__google_sheets" VALIDATE CONSTRAINT "datasets__google_sheets_dataset_id_fkey";

DO $$ BEGIN
  ALTER TABLE public."datasets__google_sheets"
    ADD CONSTRAINT "datasets__google_sheets_dataset_id_key"
    UNIQUE USING INDEX "datasets__google_sheets_dataset_id_key";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."datasets__google_sheets"
    ADD CONSTRAINT "datasets__google_sheets_google_account_id_fkey"
    FOREIGN KEY (google_account_id) REFERENCES public."tokens__google"(google_account_id)
    ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public."datasets__google_sheets" VALIDATE CONSTRAINT "datasets__google_sheets_google_account_id_fkey";

DO $$ BEGIN
  ALTER TABLE public."datasets__google_sheets"
    ADD CONSTRAINT "datasets__google_sheets_workspace_id_fkey"
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public."datasets__google_sheets" VALIDATE CONSTRAINT "datasets__google_sheets_workspace_id_fkey";

DO $$ BEGIN
  ALTER TABLE public."datasets__local_csv"
    ADD CONSTRAINT "datasets__local_csv_dataset_id_fkey"
    FOREIGN KEY (dataset_id) REFERENCES public.datasets(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public."datasets__local_csv" VALIDATE CONSTRAINT "datasets__local_csv_dataset_id_fkey";

DO $$ BEGIN
  ALTER TABLE public."datasets__local_csv"
    ADD CONSTRAINT "datasets__local_csv_dataset_id_key"
    UNIQUE USING INDEX "datasets__local_csv_dataset_id_key";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."datasets__local_csv"
    ADD CONSTRAINT "datasets__local_csv_workspace_id_fkey"
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public."datasets__local_csv" VALIDATE CONSTRAINT "datasets__local_csv_workspace_id_fkey";

DO $$ BEGIN
  ALTER TABLE public.dexie_dbs
    ADD CONSTRAINT dexie_dbs_unique_user_db_id
    UNIQUE USING INDEX dexie_dbs_unique_user_db_id;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dexie_dbs
    ADD CONSTRAINT dexie_dbs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.dexie_dbs VALIDATE CONSTRAINT dexie_dbs_user_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entities
    ADD CONSTRAINT entities_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
    ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entities VALIDATE CONSTRAINT entities_assigned_to_fkey;

DO $$ BEGIN
  ALTER TABLE public.entities
    ADD CONSTRAINT entities_entity_config_id_fkey
    FOREIGN KEY (entity_config_id) REFERENCES public.entity_configs(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entities VALIDATE CONSTRAINT entities_entity_config_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entities
    ADD CONSTRAINT entities_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entities VALIDATE CONSTRAINT entities_workspace_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_dataset_id_fkey
    FOREIGN KEY (dataset_id) REFERENCES public.datasets(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entity_field_values VALIDATE CONSTRAINT entity_field_values_dataset_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_entity_config_id_fkey
    FOREIGN KEY (entity_config_id) REFERENCES public.entity_configs(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entity_field_values VALIDATE CONSTRAINT entity_field_values_entity_config_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_entity_field_config_id_fkey
    FOREIGN KEY (entity_field_config_id) REFERENCES public.entity_field_configs(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entity_field_values VALIDATE CONSTRAINT entity_field_values_entity_field_config_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_entity_id_fkey
    FOREIGN KEY (entity_id) REFERENCES public.entities(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entity_field_values VALIDATE CONSTRAINT entity_field_values_entity_id_fkey;

DO $$ BEGIN
  ALTER TABLE public.entity_field_values
    ADD CONSTRAINT entity_field_values_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.entity_field_values VALIDATE CONSTRAINT entity_field_values_workspace_id_fkey;

DO $$ BEGIN
  ALTER TABLE public."tokens__google"
    ADD CONSTRAINT tokens__google_google_account_id_key
    UNIQUE USING INDEX tokens__google_google_account_id_key;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."tokens__google"
    ADD CONSTRAINT tokens__google_user_id_google_account_id_key
    UNIQUE USING INDEX tokens__google_user_id_google_account_id_key;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_membership_id_key
    UNIQUE USING INDEX user_profiles_membership_id_key;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_membership_id_key
    UNIQUE USING INDEX user_roles_membership_id_key;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."value_extractors__aggregation"
    ADD CONSTRAINT "value_extractors__aggregation_entity_field_config_id_key"
    UNIQUE USING INDEX "value_extractors__aggregation_entity_field_config_id_key";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."value_extractors__dataset_column_value"
    ADD CONSTRAINT "value_extractors__dataset_column_val_entity_field_config_id_key"
    UNIQUE USING INDEX "value_extractors__dataset_column_val_entity_field_config_id_key";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public."value_extractors__manual_entry"
    ADD CONSTRAINT "value_extractors__manual_entry_entity_field_config_id_key"
    UNIQUE USING INDEX "value_extractors__manual_entry_entity_field_config_id_key";
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================
-- FUNCTIONS (helpers + RPC)
-- ================================
set check_function_bodies = off;

create type "public"."dataset_column_input"
as ("name" text, "description" text, "data_type" datasets__column_data_type, "column_idx" integer);

create or replace function public.util__get_auth_user_owned_workspaces()
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select public.workspaces.id
    from public.workspaces
    where public.workspaces.owner_id = auth.uid()
  );
end; $$;

create or replace function public.util__get_auth_user_workspaces()
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select public.workspace_memberships.workspace_id
    from public.workspace_memberships
    where public.workspace_memberships.user_id = auth.uid()
  );
end; $$;

-- UPDATED: membership join (no user_roles.user_id)
create or replace function public.util__get_auth_user_workspaces_by_role(role text)
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select ur.workspace_id
    from public.user_roles ur
    join public.workspace_memberships wm on wm.id = ur.membership_id
    where wm.user_id = auth.uid()
      and ur.role = $1
  );
end; $$;

create or replace function public.util__get_workspace_members(workspace_id uuid)
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select public.workspace_memberships.user_id
    from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
  );
end; $$;

create or replace function public.rpc_datasets__add_dataset(
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type datasets__source_type,
  p_columns dataset_column_input[]
) returns datasets language plpgsql as $$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  if (p_workspace_id != any(public.util__get_auth_user_workspaces_by_role('admin'))) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  select public.user_profiles.id
    into v_owner_profile_id
  from public.user_profiles
  where public.user_profiles.user_id = v_owner_id
    and public.user_profiles.workspace_id = p_workspace_id;

  insert into public.datasets (
    owner_id, owner_profile_id, workspace_id, name, description, source_type
  ) values (
    v_owner_id, v_owner_profile_id, p_workspace_id, p_dataset_name, p_dataset_description, p_dataset_source_type
  ) returning * into v_dataset;

  foreach v_column in array p_columns loop
    if v_column.name is null then raise exception 'Column name is required'; end if;
    if v_column.data_type is null then raise exception 'Column data type is required'; end if;
    if v_column.column_idx is null then raise exception 'Column index is required'; end if;

    insert into public.dataset_columns (
      dataset_id, workspace_id, name, data_type, description, column_idx
    ) values (
      v_dataset.id, p_workspace_id, v_column.name, v_column.data_type, v_column.description, v_column.column_idx
    );
  end loop;

  return v_dataset;
end; $$;

create or replace function public.rpc_datasets__add_google_sheets_dataset(
  p_workspace_id uuid, p_dataset_name text, p_dataset_description text,
  p_columns dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer default 0
) returns datasets language plpgsql as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id, p_dataset_name, p_dataset_description, 'google_sheets', p_columns
  );

  insert into public.datasets__google_sheets (
    dataset_id, workspace_id, google_account_id, google_document_id, rows_to_skip
  ) values (
    v_dataset.id, p_workspace_id, p_google_account_id, p_google_document_id, p_rows_to_skip
  );

  return v_dataset;
end; $$;

create or replace function public.rpc_datasets__add_local_csv_dataset(
  p_workspace_id uuid, p_dataset_name text, p_dataset_description text,
  p_columns dataset_column_input[], p_delimiter text, p_size_in_bytes integer
) returns datasets language plpgsql as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id, p_dataset_name, p_dataset_description, 'local_csv', p_columns
  );

  insert into public.datasets__local_csv (
    dataset_id, workspace_id, delimiter, size_in_bytes
  ) values (
    v_dataset.id, p_workspace_id, p_delimiter, p_size_in_bytes
  );

  return v_dataset;
end; $$;

-- RPC: add user to workspace (uses user_profile_id)
create or replace function public.rpc_workspaces__add_user(
  p_workspace_id uuid, p_user_id uuid, p_full_name text, p_display_name text, p_user_role text
) returns uuid language plpgsql as $$
declare
  v_membership_id uuid;
  v_profile_id uuid;
begin
  if (
    p_workspace_id != any(public.util__get_auth_user_owned_workspaces())
    and p_workspace_id != any(public.util__get_auth_user_workspaces_by_role('admin'))
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  insert into public.workspace_memberships (workspace_id, user_id)
  values (p_workspace_id, p_user_id)
  returning id into v_membership_id;

  insert into public.user_profiles (workspace_id, user_id, membership_id, full_name, display_name)
  values (p_workspace_id, p_user_id, v_membership_id, p_full_name, p_display_name)
  returning id into v_profile_id;

  insert into public.user_roles (workspace_id, membership_id, user_profile_id, role)
  values (p_workspace_id, v_membership_id, v_profile_id, p_user_role);

  return v_membership_id;
end; $$;

create or replace function public.rpc_workspaces__create_with_owner(
  p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text
) returns workspaces language plpgsql as $$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
begin
  insert into public.workspaces (owner_id, name, slug)
  values (v_owner_id, p_workspace_name, p_workspace_slug)
  returning * into v_workspace;

  perform public.rpc_workspaces__add_user(
    v_workspace.id, v_owner_id, p_full_name, p_display_name, 'admin'
  );

  return v_workspace;
end; $$;

-- Utility triggers
create or replace function public.user_profiles__prevent_id_changes()
returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id
     or new.workspace_id <> old.workspace_id
     or new.membership_id <> old.membership_id then
    raise exception 'user_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end; $$;

-- UPDATED: check user_profile_id instead of user_id
create or replace function public.user_roles__prevent_id_changes()
returns trigger language plpgsql as $$
begin
  if new.user_profile_id <> old.user_profile_id
     or new.workspace_id <> old.workspace_id
     or new.membership_id <> old.membership_id then
    raise exception 'user_profile_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end; $$;

create or replace function public.util__set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = (now() at time zone 'UTC');
  return new;
end; $$;

-- ================================
-- GRANTS (kept idempotent)
-- ================================
grant delete on table "public"."dataset_columns" to "anon";
grant insert on table "public"."dataset_columns" to "anon";
grant references on table "public"."dataset_columns" to "anon";
grant select on table "public"."dataset_columns" to "anon";
grant trigger on table "public"."dataset_columns" to "anon";
grant truncate on table "public"."dataset_columns" to "anon";
grant update on table "public"."dataset_columns" to "anon";

grant delete on table "public"."dataset_columns" to "authenticated";
grant insert on table "public"."dataset_columns" to "authenticated";
grant references on table "public"."dataset_columns" to "authenticated";
grant select on table "public"."dataset_columns" to "authenticated";
grant trigger on table "public"."dataset_columns" to "authenticated";
grant truncate on table "public"."dataset_columns" to "authenticated";
grant update on table "public"."dataset_columns" to "authenticated";

grant delete on table "public"."dataset_columns" to "service_role";
grant insert on table "public"."dataset_columns" to "service_role";
grant references on table "public"."dataset_columns" to "service_role";
grant select on table "public"."dataset_columns" to "service_role";
grant trigger on table "public"."dataset_columns" to "service_role";
grant truncate on table "public"."dataset_columns" to "service_role";
grant update on table "public"."dataset_columns" to "service_role";

grant delete on table "public"."datasets" to "anon";
grant insert on table "public"."datasets" to "anon";
grant references on table "public"."datasets" to "anon";
grant select on table "public"."datasets" to "anon";
grant trigger on table "public"."datasets" to "anon";
grant truncate on table "public"."datasets" to "anon";
grant update on table "public"."datasets" to "anon";

grant delete on table "public"."datasets" to "authenticated";
grant insert on table "public"."datasets" to "authenticated";
grant references on table "public"."datasets" to "authenticated";
grant select on table "public"."datasets" to "authenticated";
grant trigger on table "public"."datasets" to "authenticated";
grant truncate on table "public"."datasets" to "authenticated";
grant update on table "public"."datasets" to "authenticated";

grant delete on table "public"."datasets" to "service_role";
grant insert on table "public"."datasets" to "service_role";
grant references on table "public"."datasets" to "service_role";
grant select on table "public"."datasets" to "service_role";
grant trigger on table "public"."datasets" to "service_role";
grant truncate on table "public"."datasets" to "service_role";
grant update on table "public"."datasets" to "service_role";

grant delete on table "public"."datasets__google_sheets" to "anon";
grant insert on table "public"."datasets__google_sheets" to "anon";
grant references on table "public"."datasets__google_sheets" to "anon";
grant select on table "public"."datasets__google_sheets" to "anon";
grant trigger on table "public"."datasets__google_sheets" to "anon";
grant truncate on table "public"."datasets__google_sheets" to "anon";
grant update on table "public"."datasets__google_sheets" to "anon";

grant delete on table "public"."datasets__google_sheets" to "authenticated";
grant insert on table "public"."datasets__google_sheets" to "authenticated";
grant references on table "public"."datasets__google_sheets" to "authenticated";
grant select on table "public"."datasets__google_sheets" to "authenticated";
grant trigger on table "public"."datasets__google_sheets" to "authenticated";
grant truncate on table "public"."datasets__google_sheets" to "authenticated";
grant update on table "public"."datasets__google_sheets" to "authenticated";

grant delete on table "public"."datasets__google_sheets" to "service_role";
grant insert on table "public"."datasets__google_sheets" to "service_role";
grant references on table "public"."datasets__google_sheets" to "service_role";
grant select on table "public"."datasets__google_sheets" to "service_role";
grant trigger on table "public"."datasets__google_sheets" to "service_role";
grant truncate on table "public"."datasets__google_sheets" to "service_role";
grant update on table "public"."datasets__google_sheets" to "service_role";

grant delete on table "public"."datasets__local_csv" to "anon";
grant insert on table "public"."datasets__local_csv" to "anon";
grant references on table "public"."datasets__local_csv" to "anon";
grant select on table "public"."datasets__local_csv" to "anon";
grant trigger on table "public"."datasets__local_csv" to "anon";
grant truncate on table "public"."datasets__local_csv" to "anon";
grant update on table "public"."datasets__local_csv" to "anon";

grant delete on table "public"."datasets__local_csv" to "authenticated";
grant insert on table "public"."datasets__local_csv" to "authenticated";
grant references on table "public"."datasets__local_csv" to "authenticated";
grant select on table "public"."datasets__local_csv" to "authenticated";
grant trigger on table "public"."datasets__local_csv" to "authenticated";
grant truncate on table "public"."datasets__local_csv" to "authenticated";
grant update on table "public"."datasets__local_csv" to "authenticated";

grant delete on table "public"."datasets__local_csv" to "service_role";
grant insert on table "public"."datasets__local_csv" to "service_role";
grant references on table "public"."datasets__local_csv" to "service_role";
grant select on table "public"."datasets__local_csv" to "service_role";
grant trigger on table "public"."datasets__local_csv" to "service_role";
grant truncate on table "public"."datasets__local_csv" to "service_role";
grant update on table "public"."datasets__local_csv" to "service_role";

grant delete on table "public"."dexie_dbs" to "anon";
grant insert on table "public"."dexie_dbs" to "anon";
grant references on table "public"."dexie_dbs" to "anon";
grant select on table "public"."dexie_dbs" to "anon";
grant trigger on table "public"."dexie_dbs" to "anon";
grant truncate on table "public"."dexie_dbs" to "anon";
grant update on table "public"."dexie_dbs" to "anon";

grant delete on table "public"."dexie_dbs" to "authenticated";
grant insert on table "public"."dexie_dbs" to "authenticated";
grant references on table "public"."dexie_dbs" to "authenticated";
grant select on table "public"."dexie_dbs" to "authenticated";
grant trigger on table "public"."dexie_dbs" to "authenticated";
grant truncate on table "public"."dexie_dbs" to "authenticated";
grant update on table "public"."dexie_dbs" to "authenticated";

grant delete on table "public"."dexie_dbs" to "service_role";
grant insert on table "public"."dexie_dbs" to "service_role";
grant references on table "public"."dexie_dbs" to "service_role";
grant select on table "public"."dexie_dbs" to "service_role";
grant trigger on table "public"."dexie_dbs" to "service_role";
grant truncate on table "public"."dexie_dbs" to "service_role";
grant update on table "public"."dexie_dbs" to "service_role";

grant delete on table "public"."entities" to "anon";
grant insert on table "public"."entities" to "anon";
grant references on table "public"."entities" to "anon";
grant select on table "public"."entities" to "anon";
grant trigger on table "public"."entities" to "anon";
grant truncate on table "public"."entities" to "anon";
grant update on table "public"."entities" to "anon";

grant delete on table "public"."entities" to "authenticated";
grant insert on table "public"."entities" to "authenticated";
grant references on table "public"."entities" to "authenticated";
grant select on table "public"."entities" to "authenticated";
grant trigger on table "public"."entities" to "authenticated";
grant truncate on table "public"."entities" to "authenticated";
grant update on table "public"."entities" to "authenticated";

grant delete on table "public"."entities" to "service_role";
grant insert on table "public"."entities" to "service_role";
grant references on table "public"."entities" to "service_role";
grant select on table "public"."entities" to "service_role";
grant trigger on table "public"."entities" to "service_role";
grant truncate on table "public"."entities" to "service_role";
grant update on table "public"."entities" to "service_role";

grant delete on table "public"."entity_field_values" to "anon";
grant insert on table "public"."entity_field_values" to "anon";
grant references on table "public"."entity_field_values" to "anon";
grant select on table "public"."entity_field_values" to "anon";
grant trigger on table "public"."entity_field_values" to "anon";
grant truncate on table "public"."entity_field_values" to "anon";
grant update on table "public"."entity_field_values" to "anon";

grant delete on table "public"."entity_field_values" to "authenticated";
grant insert on table "public"."entity_field_values" to "authenticated";
grant references on table "public"."entity_field_values" to "authenticated";
grant select on table "public"."entity_field_values" to "authenticated";
grant trigger on table "public"."entity_field_values" to "authenticated";
grant truncate on table "public"."entity_field_values" to "authenticated";
grant update on table "public"."entity_field_values" to "authenticated";

grant delete on table "public"."entity_field_values" to "service_role";
grant insert on table "public"."entity_field_values" to "service_role";
grant references on table "public"."entity_field_values" to "service_role";
grant select on table "public"."entity_field_values" to "service_role";
grant trigger on table "public"."entity_field_values" to "service_role";
grant truncate on table "public"."entity_field_values" to "service_role";
grant update on table "public"."entity_field_values" to "service_role";

-- ================================
-- POLICIES (fresh names, no user_roles.user_id)
-- ================================
-- dataset_columns
create policy "User can INSERT dataset_columns in their workspace"
on "public"."dataset_columns" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT dataset_columns in their workspace"
on "public"."dataset_columns" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE dataset_columns in their workspace"
on "public"."dataset_columns" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())))
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can DELETE dataset_columns in their workspace"
on "public"."dataset_columns" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

-- datasets
create policy "User can DELETE datasets in their workspace"
on "public"."datasets" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT datasets in their workspace"
on "public"."datasets" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())) and owner_id = auth.uid());

create policy "User can SELECT datasets in their workspace"
on "public"."datasets" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE datasets in their workspace"
on "public"."datasets" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())))
with check (
  workspace_id = any(array(select public.util__get_auth_user_workspaces())) and
  owner_id = any(array(select unnest(public.util__get_workspace_members(datasets.workspace_id))))
);

-- datasets__google_sheets
create policy "User can DELETE datasets__google_sheets in their workspace"
on "public"."datasets__google_sheets" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT datasets__google_sheets in their workspace"
on "public"."datasets__google_sheets" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT datasets__google_sheets in their workspace"
on "public"."datasets__google_sheets" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE datasets__google_sheets in their workspace"
on "public"."datasets__google_sheets" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())))
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

-- datasets__local_csv
create policy "User can DELETE datasets__local_csv in their workspace"
on "public"."datasets__local_csv" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT datasets__local_csv in their workspace"
on "public"."datasets__local_csv" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT datasets__local_csv in their workspace"
on "public"."datasets__local_csv" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE datasets__local_csv in their workspace"
on "public"."datasets__local_csv" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())))
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

-- dexie_dbs
create policy "User can DELETE dexie_dbs they own"
on "public"."dexie_dbs" as permissive for delete to authenticated
using (user_id = auth.uid());

create policy "User can INSERT dexie_dbs they own"
on "public"."dexie_dbs" as permissive for insert to authenticated
with check (user_id = auth.uid());

create policy "User can SELECT dexie_dbs they own"
on "public"."dexie_dbs" as permissive for select to authenticated
using (user_id = auth.uid());

create policy "User can UPDATE dexie_dbs they own"
on "public"."dexie_dbs" as permissive for update to authenticated
using (user_id = auth.uid());

-- entities
create policy "User can DELETE entities in their workspace"
on "public"."entities" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT entities in their workspace"
on "public"."entities" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT entities in their workspace"
on "public"."entities" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE entities in their workspace"
on "public"."entities" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

-- entity_configs + entity_field_configs + entity_field_values
create policy "User can SELECT entity_configs"
on "public"."entity_configs" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE entity_configs"
on "public"."entity_configs" as permissive for update to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can DELETE entity_configs"
on "public"."entity_configs" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT entity_configs"
on "public"."entity_configs" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT entity_field_configs"
on "public"."entity_field_configs" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE entity_field_configs"
on "public"."entity_field_configs" as permissive for update to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can DELETE entity_field_configs"
on "public"."entity_field_configs" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT entity_field_configs"
on "public"."entity_field_configs" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can SELECT entity field values in their workspace"
on "public"."entity_field_values" as permissive for select to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can UPDATE entity field values in their workspace"
on "public"."entity_field_values" as permissive for update to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can DELETE entity field values in their workspace"
on "public"."entity_field_values" as permissive for delete to authenticated
using (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

create policy "User can INSERT entity field values in their workspace"
on "public"."entity_field_values" as permissive for insert to authenticated
with check (workspace_id = any(array(select public.util__get_auth_user_workspaces())));

-- tokens__google
create policy "User can DELETE their own google tokens"
on "public"."tokens__google" as permissive for delete to authenticated
using (user_id = auth.uid());

create policy "User can INSERT their own google tokens"
on "public"."tokens__google" as permissive for insert to authenticated
with check (user_id = auth.uid());

create policy "User can SELECT their own google tokens"
on "public"."tokens__google" as permissive for select to authenticated
using (user_id = auth.uid());

create policy "User can UPDATE their own google tokens"
on "public"."tokens__google" as permissive for update to authenticated
using (user_id = auth.uid());

-- user_profiles
create policy "Owner can INSERT their own user profile in their own workspace"
on "public"."user_profiles" as permissive for insert to authenticated
with check ( (user_id = auth.uid() and workspace_id = any(array(select public.util__get_auth_user_owned_workspaces())))
             or workspace_id = any(array(select public.util__get_auth_user_workspaces_by_role('admin'))) );

create policy "User can DELETE their own user_profiles; Admin can DELETE others"
on "public"."user_profiles" as permissive for delete to authenticated
using ( user_id = auth.uid()
        or workspace_id = any(array(select public.util__get_auth_user_workspaces_by_role('admin'))) );

create policy "User can SELECT their own profiles; User can SELECT profiles in their workspaces"
on "public"."user_profiles" as permissive for select to authenticated
using ( user_id = auth.uid()
        or workspace_id = any(array(select public.util__get_auth_user_workspaces())) );

create policy "User can UPDATE their own user_profiles; Admin can UPDATE others"
on "public"."user_profiles" as permissive for update to authenticated
using ( user_id = auth.uid()
        or workspace_id = any(array(select public.util__get_auth_user_workspaces_by_role('admin'))) );

-- user_roles (NO references to user_roles.user_id)
create policy "User can SELECT roles for memberships they belong to"
on public.user_roles
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = auth.uid()
  )
  or public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces())
  )
);

create policy "Owner can INSERT own role; Admin can INSERT others"
on public.user_roles
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.id = public.user_roles.membership_id
        and wm.user_id = auth.uid()
        and wm.workspace_id = public.user_roles.workspace_id
    )
    and public.user_roles.workspace_id = any (
      array(select public.util__get_auth_user_owned_workspaces())
    )
  )
  or
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);

create policy "Admin can UPDATE user_roles in their workspace"
on public.user_roles
as permissive
for update
to authenticated
using (
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
)
with check (
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);

create policy "User can DELETE own role; Admin can DELETE others"
on public.user_roles
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = auth.uid()
  )
  or public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);

-- workspaces
create policy "User can SELECT workspaces they own or belong to"
on public.workspaces as permissive for select to authenticated
using ( owner_id = auth.uid()
        or id = any(array(select public.util__get_auth_user_workspaces())) );

create policy "User can INSERT workspaces that they own"
on public.workspaces as permissive for insert to authenticated
with check ( owner_id = auth.uid() );

create policy "User can UPDATE workspaces they admin"
on public.workspaces as permissive for update to authenticated
using ( id = any(array(select public.util__get_auth_user_workspaces_by_role('admin'))) )
with check ( owner_id = any(array(select unnest(public.util__get_workspace_members(workspaces.id)))) );

create policy "User can DELETE workspaces they are an owner of"
on public.workspaces as permissive for delete to authenticated
using ( owner_id = any(array(select public.util__get_auth_user_owned_workspaces())) );

-- ================================
-- TRIGGERS
-- ================================
create trigger tr_dataset_columns__set_updated_at
before update on public.dataset_columns
for each row execute function public.util__set_updated_at();

create trigger tr_datasets__set_updated_at
before update on public.datasets
for each row execute function public.util__set_updated_at();

create trigger tr_datasets__google_sheets__set_updated_at
before update on public.datasets__google_sheets
for each row execute function public.util__set_updated_at();

create trigger tr_datasets__local_csv__set_updated_at
before update on public.datasets__local_csv
for each row execute function public.util__set_updated_at();

create trigger tr_entities__set_updated_at
before update on public.entities
for each row execute function public.util__set_updated_at();

create trigger tr_entity_field_values__set_updated_at
before update on public.entity_field_values
for each row execute function public.util__set_updated_at();
