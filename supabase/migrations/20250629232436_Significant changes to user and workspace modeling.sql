create type "public"."entity_field_configs__base_data_type" as enum ('string', 'number', 'date');

create type "public"."entity_field_configs__class" as enum ('dimension', 'metric');

create type "public"."entity_field_configs__value_extractor_type" as enum ('dataset_column_value', 'manual_entry', 'aggregation');

create type "public"."value_extractors__aggregation_type" as enum ('sum', 'max', 'count');

create type "public"."value_extractors__value_picker_rule_type" as enum ('most_frequent', 'first');

drop trigger if exists "tr_value_extractor__aggregation_set_updated_at" on "public"."value_extractor__aggregation";

drop trigger if exists "tr_value_extractor__dataset_column_value_set_updated_at" on "public"."value_extractor__dataset_column_value";

drop trigger if exists "tr_value_extractor__manual_entry_set_updated_at" on "public"."value_extractor__manual_entry";

drop trigger if exists "tr_entity_field_configs__validate_title_id_fields" on "public"."entity_field_configs";

drop policy "User can see entity_field_configs" on "public"."entity_field_configs";

drop policy "User can DELETE value_extractor__aggregation" on "public"."value_extractor__aggregation";

drop policy "User can INSERT value_extractor__aggregation" on "public"."value_extractor__aggregation";

drop policy "User can SELECT value_extractor__aggregation" on "public"."value_extractor__aggregation";

drop policy "User can UPDATE value_extractor__aggregation" on "public"."value_extractor__aggregation";

drop policy "User can DELETE value_extractor__dataset_column_value" on "public"."value_extractor__dataset_column_value";

drop policy "User can INSERT value_extractor__dataset_column_value" on "public"."value_extractor__dataset_column_value";

drop policy "User can SELECT value_extractor__dataset_column_value" on "public"."value_extractor__dataset_column_value";

drop policy "User can UPDATE value_extractor__dataset_column_value" on "public"."value_extractor__dataset_column_value";

drop policy "User can DELETE value_extractor__manual_entry" on "public"."value_extractor__manual_entry";

drop policy "User can INSERT value_extractor__manual_entry" on "public"."value_extractor__manual_entry";

drop policy "User can SELECT value_extractor__manual_entry" on "public"."value_extractor__manual_entry";

drop policy "User can UPDATE value_extractor__manual_entry" on "public"."value_extractor__manual_entry";

drop policy "Admin can UPDATE workspace memberships" on "public"."workspace_memberships";

drop policy "User can DELETE their memberships; Admin can DELETE other membe" on "public"."workspace_memberships";

drop policy "User can INSERT themselves as workspace members; Admin can INSE" on "public"."workspace_memberships";

drop policy "User can DELETE workspaces they admin" on "public"."workspaces";

drop policy "User can INSERT workspaces" on "public"."workspaces";

drop policy "User can UPDATE workspaces they admin" on "public"."workspaces";

revoke delete on table "public"."value_extractor__aggregation" from "anon";

revoke insert on table "public"."value_extractor__aggregation" from "anon";

revoke references on table "public"."value_extractor__aggregation" from "anon";

revoke select on table "public"."value_extractor__aggregation" from "anon";

revoke trigger on table "public"."value_extractor__aggregation" from "anon";

revoke truncate on table "public"."value_extractor__aggregation" from "anon";

revoke update on table "public"."value_extractor__aggregation" from "anon";

revoke delete on table "public"."value_extractor__aggregation" from "authenticated";

revoke insert on table "public"."value_extractor__aggregation" from "authenticated";

revoke references on table "public"."value_extractor__aggregation" from "authenticated";

revoke select on table "public"."value_extractor__aggregation" from "authenticated";

revoke trigger on table "public"."value_extractor__aggregation" from "authenticated";

revoke truncate on table "public"."value_extractor__aggregation" from "authenticated";

revoke update on table "public"."value_extractor__aggregation" from "authenticated";

revoke delete on table "public"."value_extractor__aggregation" from "service_role";

revoke insert on table "public"."value_extractor__aggregation" from "service_role";

revoke references on table "public"."value_extractor__aggregation" from "service_role";

revoke select on table "public"."value_extractor__aggregation" from "service_role";

revoke trigger on table "public"."value_extractor__aggregation" from "service_role";

revoke truncate on table "public"."value_extractor__aggregation" from "service_role";

revoke update on table "public"."value_extractor__aggregation" from "service_role";

revoke delete on table "public"."value_extractor__dataset_column_value" from "anon";

revoke insert on table "public"."value_extractor__dataset_column_value" from "anon";

revoke references on table "public"."value_extractor__dataset_column_value" from "anon";

revoke select on table "public"."value_extractor__dataset_column_value" from "anon";

revoke trigger on table "public"."value_extractor__dataset_column_value" from "anon";

revoke truncate on table "public"."value_extractor__dataset_column_value" from "anon";

revoke update on table "public"."value_extractor__dataset_column_value" from "anon";

revoke delete on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke insert on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke references on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke select on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke trigger on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke truncate on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke update on table "public"."value_extractor__dataset_column_value" from "authenticated";

revoke delete on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke insert on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke references on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke select on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke trigger on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke truncate on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke update on table "public"."value_extractor__dataset_column_value" from "service_role";

revoke delete on table "public"."value_extractor__manual_entry" from "anon";

revoke insert on table "public"."value_extractor__manual_entry" from "anon";

revoke references on table "public"."value_extractor__manual_entry" from "anon";

revoke select on table "public"."value_extractor__manual_entry" from "anon";

revoke trigger on table "public"."value_extractor__manual_entry" from "anon";

revoke truncate on table "public"."value_extractor__manual_entry" from "anon";

revoke update on table "public"."value_extractor__manual_entry" from "anon";

revoke delete on table "public"."value_extractor__manual_entry" from "authenticated";

revoke insert on table "public"."value_extractor__manual_entry" from "authenticated";

revoke references on table "public"."value_extractor__manual_entry" from "authenticated";

revoke select on table "public"."value_extractor__manual_entry" from "authenticated";

revoke trigger on table "public"."value_extractor__manual_entry" from "authenticated";

revoke truncate on table "public"."value_extractor__manual_entry" from "authenticated";

revoke update on table "public"."value_extractor__manual_entry" from "authenticated";

revoke delete on table "public"."value_extractor__manual_entry" from "service_role";

revoke insert on table "public"."value_extractor__manual_entry" from "service_role";

revoke references on table "public"."value_extractor__manual_entry" from "service_role";

revoke select on table "public"."value_extractor__manual_entry" from "service_role";

revoke trigger on table "public"."value_extractor__manual_entry" from "service_role";

revoke truncate on table "public"."value_extractor__manual_entry" from "service_role";

revoke update on table "public"."value_extractor__manual_entry" from "service_role";

alter table "public"."value_extractor__aggregation" drop constraint "value_extractor__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractor__aggregation" drop constraint "value_extractor__aggregation_workspace_id_fkey";

alter table "public"."value_extractor__dataset_column_value" drop constraint "value_extractor__dataset_column_val_entity_field_config_id_fkey";

alter table "public"."value_extractor__dataset_column_value" drop constraint "value_extractor__dataset_column_value_workspace_id_fkey";

alter table "public"."value_extractor__manual_entry" drop constraint "value_extractor__manual_entry_entity_field_config_id_fkey";

alter table "public"."value_extractor__manual_entry" drop constraint "value_extractor__manual_entry_workspace_id_fkey";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" drop constraint "metrics_dont_allow_manual_edit";

alter table "public"."value_extractor__aggregation" drop constraint "value_extractor__aggregation_pkey";

alter table "public"."value_extractor__dataset_column_value" drop constraint "value_extractor__dataset_column_value_pkey";

alter table "public"."value_extractor__manual_entry" drop constraint "value_extractor__manual_entry_pkey";

drop index if exists "public"."idx_value_extractor__aggregation__entity_field_config_id_worksp";

drop index if exists "public"."idx_value_extractor__dataset_column_value__entity_field_config_";

drop index if exists "public"."idx_value_extractor__manual_entry__entity_field_config_id_works";

drop index if exists "public"."idx_workspace_memberships__user_id";

drop index if exists "public"."value_extractor__aggregation_pkey";

drop index if exists "public"."value_extractor__dataset_column_value_pkey";

drop index if exists "public"."value_extractor__manual_entry_pkey";

drop table "public"."value_extractor__aggregation";

drop table "public"."value_extractor__dataset_column_value";

drop table "public"."value_extractor__manual_entry";

create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "workspace_id" uuid not null,
    "membership_id" uuid not null,
    "full_name" text not null,
    "display_name" text not null
);


alter table "public"."user_profiles" enable row level security;

create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "user_id" uuid not null,
    "membership_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
);


alter table "public"."user_roles" enable row level security;

create table "public"."value_extractors__aggregation" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "aggregation_type" value_extractors__aggregation_type not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null,
    "filter" jsonb
);


alter table "public"."value_extractors__aggregation" enable row level security;

create table "public"."value_extractors__dataset_column_value" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "value_picker_rule_type" value_extractors__value_picker_rule_type not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null
);


alter table "public"."value_extractors__dataset_column_value" enable row level security;

create table "public"."value_extractors__manual_entry" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null
);


alter table "public"."value_extractors__manual_entry" enable row level security;

alter table "public"."entity_field_configs" alter column "base_data_type" set data type entity_field_configs__base_data_type using "base_data_type"::text::entity_field_configs__base_data_type;

alter table "public"."entity_field_configs" alter column "class" set data type entity_field_configs__class using "class"::text::entity_field_configs__class;

alter table "public"."entity_field_configs" alter column "value_extractor_type" set data type entity_field_configs__value_extractor_type using "value_extractor_type"::text::entity_field_configs__value_extractor_type;

alter table "public"."workspace_memberships" drop column "role";

alter table "public"."workspace_memberships" drop column "updated_at";

drop type "public"."entity_field_config__base_data_type";

drop type "public"."entity_field_config__class";

drop type "public"."entity_field_config__value_extractor_type";

drop type "public"."value_extractor__aggregation_type";

drop type "public"."value_extractor__value_picker_rule_type";

CREATE INDEX idx_user_profiles__user_id_workspace_id ON public.user_profiles USING btree (user_id, workspace_id);

CREATE INDEX idx_user_roles__user_id_workspace_id ON public.user_roles USING btree (user_id, workspace_id);

CREATE INDEX idx_value_extractors__aggregation__entity_field_config_id_works ON public.value_extractors__aggregation USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__dataset_column_value__entity_field_config ON public.value_extractors__dataset_column_value USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__manual_entry__entity_field_config_id_work ON public.value_extractors__manual_entry USING btree (entity_field_config_id, workspace_id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX value_extractors__aggregation_pkey ON public.value_extractors__aggregation USING btree (id);

CREATE UNIQUE INDEX value_extractors__dataset_column_value_pkey ON public.value_extractors__dataset_column_value USING btree (id);

CREATE UNIQUE INDEX value_extractors__manual_entry_pkey ON public.value_extractors__manual_entry USING btree (id);

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."value_extractors__aggregation" add constraint "value_extractors__aggregation_pkey" PRIMARY KEY using index "value_extractors__aggregation_pkey";

alter table "public"."value_extractors__dataset_column_value" add constraint "value_extractors__dataset_column_value_pkey" PRIMARY KEY using index "value_extractors__dataset_column_value_pkey";

alter table "public"."value_extractors__manual_entry" add constraint "value_extractors__manual_entry_pkey" PRIMARY KEY using index "value_extractors__manual_entry_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_membership_id_fkey" FOREIGN KEY (membership_id) REFERENCES workspace_memberships(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_membership_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_workspace_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_membership_id_fkey" FOREIGN KEY (membership_id) REFERENCES workspace_memberships(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_membership_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_workspace_id_fkey";

alter table "public"."value_extractors__aggregation" add constraint "value_extractors__aggregation_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__aggregation" validate constraint "value_extractors__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractors__aggregation" add constraint "value_extractors__aggregation_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__aggregation" validate constraint "value_extractors__aggregation_workspace_id_fkey";

alter table "public"."value_extractors__dataset_column_value" add constraint "value_extractors__dataset_column_va_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__dataset_column_value" validate constraint "value_extractors__dataset_column_va_entity_field_config_id_fkey";

alter table "public"."value_extractors__dataset_column_value" add constraint "value_extractors__dataset_column_value_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__dataset_column_value" validate constraint "value_extractors__dataset_column_value_workspace_id_fkey";

alter table "public"."value_extractors__manual_entry" add constraint "value_extractors__manual_entry_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__manual_entry" validate constraint "value_extractors__manual_entry_entity_field_config_id_fkey";

alter table "public"."value_extractors__manual_entry" add constraint "value_extractors__manual_entry_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractors__manual_entry" validate constraint "value_extractors__manual_entry_workspace_id_fkey";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_ids" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND is_id_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_titles" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND is_title_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" add constraint "metrics_dont_allow_manual_edit" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND allow_manual_edit))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_dont_allow_manual_edit";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.user_profiles__prevent_id_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.user_id <> old.user_id or
     new.workspace_id <> old.workspace_id or
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
  if new.user_id <> old.user_id or
     new.workspace_id <> old.workspace_id or
     new.membership_id <> old.membership_id then
    raise exception 'user_id, workspace_id, and membership_id cannot be changed';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_owner(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from public.workspaces
    where workspaces.id = $1
      and workspaces.owner_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__user_is_workspace_member(user_id uuid, workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from public.workspace_memberships
    where workspace_memberships.workspace_id = $2
      and workspace_memberships.user_id = $1
  );
end;
$function$
;

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant delete on table "public"."value_extractors__aggregation" to "anon";

grant insert on table "public"."value_extractors__aggregation" to "anon";

grant references on table "public"."value_extractors__aggregation" to "anon";

grant select on table "public"."value_extractors__aggregation" to "anon";

grant trigger on table "public"."value_extractors__aggregation" to "anon";

grant truncate on table "public"."value_extractors__aggregation" to "anon";

grant update on table "public"."value_extractors__aggregation" to "anon";

grant delete on table "public"."value_extractors__aggregation" to "authenticated";

grant insert on table "public"."value_extractors__aggregation" to "authenticated";

grant references on table "public"."value_extractors__aggregation" to "authenticated";

grant select on table "public"."value_extractors__aggregation" to "authenticated";

grant trigger on table "public"."value_extractors__aggregation" to "authenticated";

grant truncate on table "public"."value_extractors__aggregation" to "authenticated";

grant update on table "public"."value_extractors__aggregation" to "authenticated";

grant delete on table "public"."value_extractors__aggregation" to "service_role";

grant insert on table "public"."value_extractors__aggregation" to "service_role";

grant references on table "public"."value_extractors__aggregation" to "service_role";

grant select on table "public"."value_extractors__aggregation" to "service_role";

grant trigger on table "public"."value_extractors__aggregation" to "service_role";

grant truncate on table "public"."value_extractors__aggregation" to "service_role";

grant update on table "public"."value_extractors__aggregation" to "service_role";

grant delete on table "public"."value_extractors__dataset_column_value" to "anon";

grant insert on table "public"."value_extractors__dataset_column_value" to "anon";

grant references on table "public"."value_extractors__dataset_column_value" to "anon";

grant select on table "public"."value_extractors__dataset_column_value" to "anon";

grant trigger on table "public"."value_extractors__dataset_column_value" to "anon";

grant truncate on table "public"."value_extractors__dataset_column_value" to "anon";

grant update on table "public"."value_extractors__dataset_column_value" to "anon";

grant delete on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant insert on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant references on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant select on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant trigger on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant truncate on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant update on table "public"."value_extractors__dataset_column_value" to "authenticated";

grant delete on table "public"."value_extractors__dataset_column_value" to "service_role";

grant insert on table "public"."value_extractors__dataset_column_value" to "service_role";

grant references on table "public"."value_extractors__dataset_column_value" to "service_role";

grant select on table "public"."value_extractors__dataset_column_value" to "service_role";

grant trigger on table "public"."value_extractors__dataset_column_value" to "service_role";

grant truncate on table "public"."value_extractors__dataset_column_value" to "service_role";

grant update on table "public"."value_extractors__dataset_column_value" to "service_role";

grant delete on table "public"."value_extractors__manual_entry" to "anon";

grant insert on table "public"."value_extractors__manual_entry" to "anon";

grant references on table "public"."value_extractors__manual_entry" to "anon";

grant select on table "public"."value_extractors__manual_entry" to "anon";

grant trigger on table "public"."value_extractors__manual_entry" to "anon";

grant truncate on table "public"."value_extractors__manual_entry" to "anon";

grant update on table "public"."value_extractors__manual_entry" to "anon";

grant delete on table "public"."value_extractors__manual_entry" to "authenticated";

grant insert on table "public"."value_extractors__manual_entry" to "authenticated";

grant references on table "public"."value_extractors__manual_entry" to "authenticated";

grant select on table "public"."value_extractors__manual_entry" to "authenticated";

grant trigger on table "public"."value_extractors__manual_entry" to "authenticated";

grant truncate on table "public"."value_extractors__manual_entry" to "authenticated";

grant update on table "public"."value_extractors__manual_entry" to "authenticated";

grant delete on table "public"."value_extractors__manual_entry" to "service_role";

grant insert on table "public"."value_extractors__manual_entry" to "service_role";

grant references on table "public"."value_extractors__manual_entry" to "service_role";

grant select on table "public"."value_extractors__manual_entry" to "service_role";

grant trigger on table "public"."value_extractors__manual_entry" to "service_role";

grant truncate on table "public"."value_extractors__manual_entry" to "service_role";

grant update on table "public"."value_extractors__manual_entry" to "service_role";

create policy "User/not all can see entity_field_configs"
on "public"."entity_field_configs"
as permissive
for select
to authenticated
using (true);


create policy "Owner can INSERT their own user_profiles; Admin can INSERT othe"
on "public"."user_profiles"
as permissive
for insert
to authenticated
with check ((((auth.uid() = user_id) AND util__auth_user_is_workspace_owner(workspace_id)) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can DELETE their own user_profiles; Admin can DELETE other"
on "public"."user_profiles"
as permissive
for delete
to authenticated
using (((auth.uid() = user_id) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can SELECT their own profiles or profiles of other workspa"
on "public"."user_profiles"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_member(workspace_id)));


create policy "User can UPDATE their own user_profiles; Admin can UPDATE other"
on "public"."user_profiles"
as permissive
for update
to authenticated
using (((auth.uid() = user_id) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "Admin can UPDATE other user_roles"
on "public"."user_roles"
as permissive
for update
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "Owner can INSERT their own user_roles; Admin can INSERT other u"
on "public"."user_roles"
as permissive
for insert
to authenticated
with check ((((auth.uid() = user_id) AND util__auth_user_is_workspace_owner(workspace_id)) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can DELETE their own user_roles; Admin can DELETE other us"
on "public"."user_roles"
as permissive
for delete
to authenticated
using (((auth.uid() = user_id) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can SELECT their own user_roles or roles of other workspac"
on "public"."user_roles"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_member(workspace_id)));


create policy "User can DELETE value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for update
to authenticated
with check (true);


create policy "Owner can INSERT themselves as workspace members; Admin can INS"
on "public"."workspace_memberships"
as permissive
for insert
to authenticated
with check ((((user_id = auth.uid()) AND util__auth_user_is_workspace_owner(workspace_id)) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can DELETE their own memberships; Admin can DELETE other m"
on "public"."workspace_memberships"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "Owners can DELETE their workspaces"
on "public"."workspaces"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_owner(id));


create policy "User can INSERT workspaces that they own"
on "public"."workspaces"
as permissive
for insert
to authenticated
with check ((auth.uid() = owner_id));


create policy "User can UPDATE workspaces they admin"
on "public"."workspaces"
as permissive
for update
to authenticated
using (util__auth_user_is_workspace_admin(id))
with check ((util__auth_user_is_workspace_admin(id) AND util__user_is_workspace_member(owner_id, id)));


CREATE TRIGGER tr_user_profiles__prevent_id_changes BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION user_profiles__prevent_id_changes();

CREATE TRIGGER tr_user_profiles__set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_user_roles__prevent_id_changes BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION user_roles__prevent_id_changes();

CREATE TRIGGER tr_user_roles__set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__aggregation_set_updated_at BEFORE UPDATE ON public.value_extractors__aggregation FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__dataset_column_value_set_updated_at BEFORE UPDATE ON public.value_extractors__dataset_column_value FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__manual_entry_set_updated_at BEFORE UPDATE ON public.value_extractors__manual_entry FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_configs__validate_title_id_fields BEFORE INSERT OR UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION entity_field_configs__validate_title_id_fields();


