drop extension if exists "pg_net";

create type "public"."datasets__column_data_type" as enum ('text', 'number', 'date');

create type "public"."datasets__source_type" as enum ('local_csv', 'google_sheets');

drop policy "User can DELETE entity_configs" on "public"."entity_configs";

drop policy "User can INSERT entity_configs" on "public"."entity_configs";

drop policy "User can DELETE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can INSERT entity_field_configs" on "public"."entity_field_configs";

drop policy "User can SELECT entity_field_configs" on "public"."entity_field_configs";

drop policy "User can UPDATE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can DELETE their own google tokens" on "public"."tokens__google";

drop policy "User can INSERT their own google tokens" on "public"."tokens__google";

drop policy "User can SELECT their own google tokens" on "public"."tokens__google";

drop policy "User can UPDATE their own google tokens" on "public"."tokens__google";

drop policy "Owner can INSERT their own user_profiles; Admin can INSERT othe" on "public"."user_profiles";

drop policy "User can DELETE their own user_profiles; Admin can DELETE other" on "public"."user_profiles";

drop policy "User can SELECT their own profiles or profiles of other workspa" on "public"."user_profiles";

drop policy "User can UPDATE their own user_profiles; Admin can UPDATE other" on "public"."user_profiles";

drop policy "Admin can UPDATE other user_roles" on "public"."user_roles";

drop policy "Owner can INSERT their own user_roles; Admin can INSERT other u" on "public"."user_roles";

drop policy "User can DELETE their own user_roles; Admin can DELETE other us" on "public"."user_roles";

drop policy "User can SELECT their own user_roles or roles of other workspac" on "public"."user_roles";

drop policy "User can DELETE value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can INSERT value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can SELECT value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can UPDATE value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can DELETE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can INSERT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can SELECT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can UPDATE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can DELETE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can INSERT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can SELECT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can UPDATE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "Owner can INSERT themselves as workspace members; Admin can INS" on "public"."workspace_memberships";

drop policy "User can DELETE their own memberships; Admin can DELETE other m" on "public"."workspace_memberships";

drop policy "User can SELECT their own memberships or memberships of other u" on "public"."workspace_memberships";

drop policy "Owners can DELETE their workspaces" on "public"."workspaces";

drop policy "User can INSERT workspaces that they own" on "public"."workspaces";

drop policy "User can SELECT workspaces they own or belong to" on "public"."workspaces";

drop policy "User can UPDATE workspaces they admin" on "public"."workspaces";

drop policy "User can SELECT entity_configs" on "public"."entity_configs";

drop policy "User can UPDATE entity_configs" on "public"."entity_configs";

alter table "public"."tokens__google" drop constraint "tokens__google__user_google_account_unique";

alter table "public"."user_roles" drop constraint "user_roles_user_id_fkey";

drop function if exists "public"."util__auth_user_is_workspace_admin"(workspace_id uuid);

drop function if exists "public"."util__auth_user_is_workspace_member"(workspace_id uuid);

drop function if exists "public"."util__auth_user_is_workspace_owner"(workspace_id uuid);

drop function if exists "public"."util__user_is_workspace_member"(user_id uuid, workspace_id uuid);

drop index if exists "public"."idx_user_roles__user_id_workspace_id";

drop index if exists "public"."idx_value_extractors__dataset_column_value__entity_field_config";

drop index if exists "public"."idx_value_extractors__manual_entry__entity_field_config_id_work";

drop index if exists "public"."tokens__google__user_google_account_unique";


  create table "public"."dataset_columns" (
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


  create table "public"."datasets" (
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


  create table "public"."datasets__google_sheets" (
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


  create table "public"."datasets__local_csv" (
    "id" uuid not null default gen_random_uuid(),
    "dataset_id" uuid not null,
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "delimiter" text not null,
    "size_in_bytes" integer not null
      );


alter table "public"."datasets__local_csv" enable row level security;


  create table "public"."dexie_dbs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "db_id" uuid not null,
    "version" integer not null,
    "user_agent" text not null,
    "created_at" timestamp with time zone not null default now(),
    "last_seen_at" timestamp with time zone not null default now()
      );


alter table "public"."dexie_dbs" enable row level security;


  create table "public"."entities" (
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


  create table "public"."entity_field_values" (
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

alter table "public"."user_roles" drop column "user_id";

alter table "public"."user_roles" add column "user_profile_id" uuid not null;

CREATE UNIQUE INDEX dataset_columns_pkey ON public.dataset_columns USING btree (id);

CREATE UNIQUE INDEX datasets__google_sheets_dataset_id_key ON public.datasets__google_sheets USING btree (dataset_id);

CREATE UNIQUE INDEX datasets__google_sheets_pkey ON public.datasets__google_sheets USING btree (id);

CREATE UNIQUE INDEX datasets__local_csv_dataset_id_key ON public.datasets__local_csv USING btree (dataset_id);

CREATE UNIQUE INDEX datasets__local_csv_pkey ON public.datasets__local_csv USING btree (id);

CREATE UNIQUE INDEX datasets_pkey ON public.datasets USING btree (id);

CREATE UNIQUE INDEX dexie_dbs_pkey ON public.dexie_dbs USING btree (id);

CREATE UNIQUE INDEX dexie_dbs_unique_user_db_id ON public.dexie_dbs USING btree (db_id, user_id);

CREATE UNIQUE INDEX entities_pkey ON public.entities USING btree (id);

CREATE UNIQUE INDEX entity_field_values_pkey ON public.entity_field_values USING btree (id);

CREATE INDEX idx_dataset_column_value_extractors__efc_id_workspace_id ON public.value_extractors__dataset_column_value USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_manual_entry_value_extractors__efc_id_workspace_id ON public.value_extractors__manual_entry USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_user_roles__user_profile_id ON public.user_roles USING btree (user_profile_id);

CREATE INDEX idx_user_roles__workspace_id ON public.user_roles USING btree (workspace_id);

CREATE INDEX idx_workspaces__owner_id ON public.workspaces USING btree (owner_id);

CREATE UNIQUE INDEX tokens__google_google_account_id_key ON public.tokens__google USING btree (google_account_id);

CREATE UNIQUE INDEX tokens__google_user_id_google_account_id_key ON public.tokens__google USING btree (user_id, google_account_id);

CREATE UNIQUE INDEX user_profiles_membership_id_key ON public.user_profiles USING btree (membership_id);

CREATE UNIQUE INDEX user_roles_membership_id_key ON public.user_roles USING btree (membership_id);

CREATE UNIQUE INDEX value_extractors__aggregation_entity_field_config_id_key ON public.value_extractors__aggregation USING btree (entity_field_config_id);

CREATE UNIQUE INDEX value_extractors__dataset_column_val_entity_field_config_id_key ON public.value_extractors__dataset_column_value USING btree (entity_field_config_id);

CREATE UNIQUE INDEX value_extractors__manual_entry_entity_field_config_id_key ON public.value_extractors__manual_entry USING btree (entity_field_config_id);

alter table "public"."dataset_columns" add constraint "dataset_columns_pkey" PRIMARY KEY using index "dataset_columns_pkey";

alter table "public"."datasets" add constraint "datasets_pkey" PRIMARY KEY using index "datasets_pkey";

alter table "public"."datasets__google_sheets" add constraint "datasets__google_sheets_pkey" PRIMARY KEY using index "datasets__google_sheets_pkey";

alter table "public"."datasets__local_csv" add constraint "datasets__local_csv_pkey" PRIMARY KEY using index "datasets__local_csv_pkey";

alter table "public"."dexie_dbs" add constraint "dexie_dbs_pkey" PRIMARY KEY using index "dexie_dbs_pkey";

alter table "public"."entities" add constraint "entities_pkey" PRIMARY KEY using index "entities_pkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_pkey" PRIMARY KEY using index "entity_field_values_pkey";

alter table "public"."dataset_columns" add constraint "dataset_columns_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dataset_columns" validate constraint "dataset_columns_dataset_id_fkey";

alter table "public"."dataset_columns" add constraint "dataset_columns_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dataset_columns" validate constraint "dataset_columns_workspace_id_fkey";

alter table "public"."datasets" add constraint "datasets_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."datasets" validate constraint "datasets_owner_id_fkey";

alter table "public"."datasets" add constraint "datasets_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES user_profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."datasets" validate constraint "datasets_owner_profile_id_fkey";

alter table "public"."datasets" add constraint "datasets_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets" validate constraint "datasets_workspace_id_fkey";

alter table "public"."datasets__google_sheets" add constraint "datasets__google_sheets_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__google_sheets" validate constraint "datasets__google_sheets_dataset_id_fkey";

alter table "public"."datasets__google_sheets" add constraint "datasets__google_sheets_dataset_id_key" UNIQUE using index "datasets__google_sheets_dataset_id_key";

alter table "public"."datasets__google_sheets" add constraint "datasets__google_sheets_google_account_id_fkey" FOREIGN KEY (google_account_id) REFERENCES tokens__google(google_account_id) ON UPDATE CASCADE not valid;

alter table "public"."datasets__google_sheets" validate constraint "datasets__google_sheets_google_account_id_fkey";

alter table "public"."datasets__google_sheets" add constraint "datasets__google_sheets_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__google_sheets" validate constraint "datasets__google_sheets_workspace_id_fkey";

alter table "public"."datasets__local_csv" add constraint "datasets__local_csv_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__local_csv" validate constraint "datasets__local_csv_dataset_id_fkey";

alter table "public"."datasets__local_csv" add constraint "datasets__local_csv_dataset_id_key" UNIQUE using index "datasets__local_csv_dataset_id_key";

alter table "public"."datasets__local_csv" add constraint "datasets__local_csv_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__local_csv" validate constraint "datasets__local_csv_workspace_id_fkey";

alter table "public"."dexie_dbs" add constraint "dexie_dbs_unique_user_db_id" UNIQUE using index "dexie_dbs_unique_user_db_id";

alter table "public"."dexie_dbs" add constraint "dexie_dbs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."dexie_dbs" validate constraint "dexie_dbs_user_id_fkey";

alter table "public"."entities" add constraint "entities_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."entities" validate constraint "entities_assigned_to_fkey";

alter table "public"."entities" add constraint "entities_entity_config_id_fkey" FOREIGN KEY (entity_config_id) REFERENCES entity_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entities" validate constraint "entities_entity_config_id_fkey";

alter table "public"."entities" add constraint "entities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entities" validate constraint "entities_workspace_id_fkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_values" validate constraint "entity_field_values_dataset_id_fkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_entity_config_id_fkey" FOREIGN KEY (entity_config_id) REFERENCES entity_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_values" validate constraint "entity_field_values_entity_config_id_fkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_values" validate constraint "entity_field_values_entity_field_config_id_fkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES entities(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_values" validate constraint "entity_field_values_entity_id_fkey";

alter table "public"."entity_field_values" add constraint "entity_field_values_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_values" validate constraint "entity_field_values_workspace_id_fkey";

alter table "public"."tokens__google" add constraint "tokens__google_google_account_id_key" UNIQUE using index "tokens__google_google_account_id_key";

alter table "public"."tokens__google" add constraint "tokens__google_user_id_google_account_id_key" UNIQUE using index "tokens__google_user_id_google_account_id_key";

alter table "public"."user_profiles" add constraint "user_profiles_membership_id_key" UNIQUE using index "user_profiles_membership_id_key";

alter table "public"."user_roles" add constraint "user_roles_membership_id_key" UNIQUE using index "user_roles_membership_id_key";

alter table "public"."user_roles" add constraint "user_roles_user_profile_id_fkey" FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_profile_id_fkey";

alter table "public"."value_extractors__aggregation" add constraint "value_extractors__aggregation_entity_field_config_id_key" UNIQUE using index "value_extractors__aggregation_entity_field_config_id_key";

alter table "public"."value_extractors__dataset_column_value" add constraint "value_extractors__dataset_column_val_entity_field_config_id_key" UNIQUE using index "value_extractors__dataset_column_val_entity_field_config_id_key";

alter table "public"."value_extractors__manual_entry" add constraint "value_extractors__manual_entry_entity_field_config_id_key" UNIQUE using index "value_extractors__manual_entry_entity_field_config_id_key";

set check_function_bodies = off;

create type "public"."dataset_column_input" as ("name" text, "description" text, "data_type" datasets__column_data_type, "column_idx" integer);

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

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_google_sheets_dataset(p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer DEFAULT 0)
 RETURNS datasets
 LANGUAGE plpgsql
AS $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'google_sheets',
    p_columns
  );

  insert into public.datasets__google_sheets (
    dataset_id,
    workspace_id,
    google_account_id,
    google_document_id,
    rows_to_skip
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_google_account_id,
    p_google_document_id,
    p_rows_to_skip
  );

  return v_dataset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_local_csv_dataset(p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_delimiter text, p_size_in_bytes integer)
 RETURNS datasets
 LANGUAGE plpgsql
AS $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'local_csv',
    p_columns
  );

  insert into public.datasets__local_csv (
    dataset_id,
    workspace_id,
    delimiter,
    size_in_bytes
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_delimiter,
    p_size_in_bytes
  );

  return v_dataset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_owned_workspaces()
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspaces.id
    from public.workspaces
    where public.workspaces.owner_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces()
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspace_memberships.workspace_id
    from public.workspace_memberships
    where public.workspace_memberships.user_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces_by_role(role text)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return array(
    select public.user_roles.workspace_id
    from public.user_roles
    where
      public.user_roles.user_id = auth.uid()
      and public.user_roles.role = $1
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_workspace_members(workspace_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspace_memberships.user_id
    from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.entity_field_configs__validate_title_and_id_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Count title fields for this entity_config
  if (
    select count(*)
    from public.entity_field_configs
    where
      public.entity_field_configs.entity_config_id = new.entity_config_id and
    	public.entity_field_configs.is_title_field
  ) != 1 then
    raise exception 'There must be exactly one title field per entity config';
  end if;

  -- For fields that extract from datasets, ensure each source dataset
  -- is associated with exactly one ID field.
  if exists(
    select 1
    from public.entity_field_configs field_config
    join public.value_extractors__dataset_column_value dataset_col_extractor
      on field_config.id = dataset_col_extractor.entity_field_config_id
    where field_config.entity_config_id = new.entity_config_id
    group by dataset_col_extractor.dataset_id
    having
      count(
        case when field_config.is_id_field then 1 end
      ) != 1
  ) then
    raise exception 'Each dataset must have exactly one ID field.';
  end if;
  return new;
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

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS workspaces
 LANGUAGE plpgsql
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
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

  -- Call the rpc function to create the workspace membership and user profile
  perform
    public.rpc_workspaces__add_user(
      v_workspace.id,
      v_owner_id,
      p_full_name,
      p_display_name,
      'admin'
    );
  return v_workspace;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_profiles__prevent_id_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id <> old.user_id or new.workspace_id <> old.workspace_id or
    new.membership_id <> old.membership_id then
    raise exception 'user_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_roles__prevent_id_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id <> old.user_id or new.workspace_id <> old.workspace_id or
    new.membership_id <> old.membership_id then
    raise exception 'user_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = (now() at time zone 'UTC');
  return new;
end;
$function$
;

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


  create policy "
  User can INSERT dataset_columns in their workspace
"
  on "public"."dataset_columns"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT dataset_columns in their workspace
"
  on "public"."dataset_columns"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE dataset_columns in their workspace
"
  on "public"."dataset_columns"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can DELETE dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE datasets in their workspace
"
  on "public"."datasets"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT datasets in their workspace
"
  on "public"."datasets"
  as permissive
  for insert
  to authenticated
with check (((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))) AND (owner_id = ( SELECT auth.uid() AS uid))));



  create policy "
  User can SELECT datasets in their workspace
"
  on "public"."datasets"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can UPDATE datasets in their workspace"
  on "public"."datasets"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))
with check (((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))) AND (owner_id = ANY (ARRAY( SELECT util__get_workspace_members(datasets.workspace_id) AS util__get_workspace_members)))));



  create policy "
  User can DELETE datasets__google_sheets in their workspace
"
  on "public"."datasets__google_sheets"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT datasets__google_sheets in their workspace
"
  on "public"."datasets__google_sheets"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT datasets__google_sheets in their workspace
"
  on "public"."datasets__google_sheets"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE datasets__google_sheets in their workspace
"
  on "public"."datasets__google_sheets"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE datasets__local_csv in their workspace
"
  on "public"."datasets__local_csv"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT datasets__local_csv in their workspace
"
  on "public"."datasets__local_csv"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT datasets__local_csv in their workspace
"
  on "public"."datasets__local_csv"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE datasets__local_csv in their workspace
"
  on "public"."datasets__local_csv"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE dexie_dbs they own
"
  on "public"."dexie_dbs"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can INSERT dexie_dbs they own
"
  on "public"."dexie_dbs"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can SELECT dexie_dbs they own
"
  on "public"."dexie_dbs"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can UPDATE dexie_dbs they own
"
  on "public"."dexie_dbs"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "User can DELETE entities in their workspace"
  on "public"."entities"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can INSERT entities in their workspace"
  on "public"."entities"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can SELECT entities in their workspace"
  on "public"."entities"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can UPDATE entities in their workspace"
  on "public"."entities"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE entity_configs
"
  on "public"."entity_configs"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT entity_configs
"
  on "public"."entity_configs"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE entity_field_configs
"
  on "public"."entity_field_configs"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT entity_field_configs
"
  on "public"."entity_field_configs"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT entity_field_configs
"
  on "public"."entity_field_configs"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE entity_field_configs
"
  on "public"."entity_field_configs"
  as permissive
  for update
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE entity field values in their workspace
"
  on "public"."entity_field_values"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT entity field values in their workspace
"
  on "public"."entity_field_values"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT entity field values in their workspace
"
  on "public"."entity_field_values"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE entity field values in their workspace
"
  on "public"."entity_field_values"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE their own google tokens
"
  on "public"."tokens__google"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can INSERT their own google tokens
"
  on "public"."tokens__google"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can SELECT their own google tokens
"
  on "public"."tokens__google"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can UPDATE their own google tokens
"
  on "public"."tokens__google"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  Owner can INSERT their own user profile in their own workspa"
  on "public"."user_profiles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_owned_workspaces() AS util__get_auth_user_owned_workspaces)))) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can DELETE their own user_profiles;
  Admin can DELETE "
  on "public"."user_profiles"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can SELECT their own profiles;
  User can SELECT profil"
  on "public"."user_profiles"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "
  User can UPDATE their own user_profiles;
  Admin can UPDATE "
  on "public"."user_profiles"
  as permissive
  for update
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  Owner can INSERT their own user_roles in their own workspace"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check (((EXISTS ( SELECT 1
   FROM workspace_memberships wm
  WHERE ((wm.id = user_roles.membership_id) AND (wm.user_id = auth.uid())))) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can DELETE their own user_roles;
  Admin can DELETE oth"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (((EXISTS ( SELECT 1
   FROM workspace_memberships wm
  WHERE ((wm.id = user_roles.membership_id) AND (wm.user_id = auth.uid())))) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can SELECT their own user_roles;
  User can SELECT role"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM workspace_memberships wm
  WHERE ((wm.id = user_roles.membership_id) AND (wm.user_id = auth.uid())))) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "Admin can UPDATE user_roles"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role))));



  create policy "
  User can DELETE value_extractors__aggregation
"
  on "public"."value_extractors__aggregation"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT value_extractors__aggregation
"
  on "public"."value_extractors__aggregation"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT value_extractors__aggregation
"
  on "public"."value_extractors__aggregation"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE value_extractors__aggregation
"
  on "public"."value_extractors__aggregation"
  as permissive
  for update
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE value_extractors__dataset_column_value
"
  on "public"."value_extractors__dataset_column_value"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT value_extractors__dataset_column_value
"
  on "public"."value_extractors__dataset_column_value"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT value_extractors__dataset_column_value
"
  on "public"."value_extractors__dataset_column_value"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE value_extractors__dataset_column_value
"
  on "public"."value_extractors__dataset_column_value"
  as permissive
  for update
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can DELETE value_extractors__manual_entry
"
  on "public"."value_extractors__manual_entry"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT value_extractors__manual_entry
"
  on "public"."value_extractors__manual_entry"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT value_extractors__manual_entry
"
  on "public"."value_extractors__manual_entry"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can UPDATE value_extractors__manual_entry
"
  on "public"."value_extractors__manual_entry"
  as permissive
  for update
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  Owner can INSERT themselves as workspace members of their ow"
  on "public"."workspace_memberships"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_owned_workspaces() AS util__get_auth_user_owned_workspaces)))) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can DELETE their own memberships;
  Admin can DELETE an"
  on "public"."workspace_memberships"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role)))));



  create policy "
  User can SELECT their own memberships;
  User can SELECT mem"
  on "public"."workspace_memberships"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "
  User can DELETE workspaces they are an owner of
"
  on "public"."workspaces"
  as permissive
  for delete
  to authenticated
using ((owner_id = ANY (ARRAY( SELECT util__get_auth_user_owned_workspaces() AS util__get_auth_user_owned_workspaces))));



  create policy "
  User can INSERT workspaces that they own
"
  on "public"."workspaces"
  as permissive
  for insert
  to authenticated
with check ((owner_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can SELECT workspaces they own or belong to
"
  on "public"."workspaces"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR (id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "
  User can UPDATE workspaces they admin
"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using ((id = ANY (ARRAY( SELECT util__get_auth_user_workspaces_by_role('admin'::text) AS util__get_auth_user_workspaces_by_role))))
with check ((owner_id = ANY (ARRAY( SELECT util__get_workspace_members(workspaces.id) AS util__get_workspace_members))));



  create policy "User can SELECT entity_configs"
  on "public"."entity_configs"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can UPDATE entity_configs"
  on "public"."entity_configs"
  as permissive
  for update
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));


CREATE TRIGGER tr_dataset_columns__set_updated_at BEFORE UPDATE ON public.dataset_columns FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_datasets__set_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_datasets__google_sheets__set_updated_at BEFORE UPDATE ON public.datasets__google_sheets FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_datasets__local_csv__set_updated_at BEFORE UPDATE ON public.datasets__local_csv FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entities__set_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_values__set_updated_at BEFORE UPDATE ON public.entity_field_values FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


