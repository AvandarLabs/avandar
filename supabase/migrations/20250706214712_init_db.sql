create type "public"."entity_field_configs__base_data_type" as enum ('string', 'number', 'date');

create type "public"."entity_field_configs__class" as enum ('dimension', 'metric');

create type "public"."entity_field_configs__value_extractor_type" as enum ('dataset_column_value', 'manual_entry', 'aggregation');

create type "public"."value_extractors__aggregation_type" as enum ('sum', 'max', 'count');

create type "public"."value_extractors__value_picker_rule_type" as enum ('most_frequent', 'first');

create table "public"."entity_configs" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null default auth.uid(),
    "workspace_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "allow_manual_creation" boolean not null
);


alter table "public"."entity_configs" enable row level security;

create table "public"."entity_field_configs" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "entity_config_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "class" entity_field_configs__class not null,
    "base_data_type" entity_field_configs__base_data_type not null,
    "value_extractor_type" entity_field_configs__value_extractor_type not null,
    "is_title_field" boolean not null default false,
    "is_id_field" boolean not null default false,
    "is_array" boolean,
    "allow_manual_edit" boolean not null default false
);


alter table "public"."entity_field_configs" enable row level security;

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

create table "public"."workspace_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "workspace_id" uuid not null,
    "user_id" uuid not null
);


alter table "public"."workspace_memberships" enable row level security;

create table "public"."workspaces" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null default auth.uid(),
    "name" text not null,
    "slug" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."workspaces" enable row level security;

CREATE UNIQUE INDEX entity_configs_pkey ON public.entity_configs USING btree (id);

CREATE UNIQUE INDEX entity_field_configs_pkey ON public.entity_field_configs USING btree (id);

CREATE INDEX idx_entity_configs__workspace_id ON public.entity_configs USING btree (workspace_id);

CREATE INDEX idx_entity_field_configs__entity_config_id_workspace_id ON public.entity_field_configs USING btree (entity_config_id, workspace_id);

CREATE INDEX idx_user_profiles__user_id_workspace_id ON public.user_profiles USING btree (user_id, workspace_id);

CREATE INDEX idx_user_roles__user_id_workspace_id ON public.user_roles USING btree (user_id, workspace_id);

CREATE INDEX idx_value_extractors__aggregation__entity_field_config_id_works ON public.value_extractors__aggregation USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__dataset_column_value__entity_field_config ON public.value_extractors__dataset_column_value USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractors__manual_entry__entity_field_config_id_work ON public.value_extractors__manual_entry USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_workspace_memberships__user_id_workspace_id ON public.workspace_memberships USING btree (user_id, workspace_id);

CREATE INDEX idx_workspace_memberships__workspace_id ON public.workspace_memberships USING btree (workspace_id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX value_extractors__aggregation_pkey ON public.value_extractors__aggregation USING btree (id);

CREATE UNIQUE INDEX value_extractors__dataset_column_value_pkey ON public.value_extractors__dataset_column_value USING btree (id);

CREATE UNIQUE INDEX value_extractors__manual_entry_pkey ON public.value_extractors__manual_entry USING btree (id);

CREATE UNIQUE INDEX workspace_memberships_pkey ON public.workspace_memberships USING btree (id);

CREATE UNIQUE INDEX workspace_memberships_workspace_user_unique ON public.workspace_memberships USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

CREATE UNIQUE INDEX workspaces_slug_key ON public.workspaces USING btree (slug);

alter table "public"."entity_configs" add constraint "entity_configs_pkey" PRIMARY KEY using index "entity_configs_pkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_pkey" PRIMARY KEY using index "entity_field_configs_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."value_extractors__aggregation" add constraint "value_extractors__aggregation_pkey" PRIMARY KEY using index "value_extractors__aggregation_pkey";

alter table "public"."value_extractors__dataset_column_value" add constraint "value_extractors__dataset_column_value_pkey" PRIMARY KEY using index "value_extractors__dataset_column_value_pkey";

alter table "public"."value_extractors__manual_entry" add constraint "value_extractors__manual_entry_pkey" PRIMARY KEY using index "value_extractors__manual_entry_pkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_pkey" PRIMARY KEY using index "workspace_memberships_pkey";

alter table "public"."workspaces" add constraint "workspaces_pkey" PRIMARY KEY using index "workspaces_pkey";

alter table "public"."entity_configs" add constraint "entity_configs_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."entity_configs" validate constraint "entity_configs_owner_id_fkey";

alter table "public"."entity_configs" add constraint "entity_configs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_configs" validate constraint "entity_configs_workspace_id_fkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_entity_config_id_fkey" FOREIGN KEY (entity_config_id) REFERENCES entity_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_entity_config_id_fkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_workspace_id_fkey";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_ids" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND is_id_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_titles" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND is_title_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" add constraint "metrics_dont_allow_manual_edit" CHECK ((NOT ((class = 'metric'::entity_field_configs__class) AND allow_manual_edit))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_dont_allow_manual_edit";

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

alter table "public"."workspace_memberships" add constraint "workspace_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_memberships" validate constraint "workspace_memberships_user_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_memberships" validate constraint "workspace_memberships_workspace_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_workspace_user_unique" UNIQUE using index "workspace_memberships_workspace_user_unique";

alter table "public"."workspaces" add constraint "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."workspaces" validate constraint "workspaces_owner_id_fkey";

alter table "public"."workspaces" add constraint "workspaces_slug_key" UNIQUE using index "workspaces_slug_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.entity_field_configs__validate_title_id_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Count title fields for this entity_config
  if (
    select count(*) from public.entity_field_configs
    where entity_config_id = new.entity_config_id and is_title_field
  ) != 1 then
    raise exception 'There must be exactly one title field per entity config';
  end if;

  -- Count id fields for this entity_config
  if (
    select count(*) from public.entity_field_configs
    where entity_config_id = new.entity_config_id and is_id_field
  ) != 1 then
    raise exception 'There must be exactly one id field per entity config';
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
    -- Check the requesting user is an admin of the workspace or the owner.
    -- We also check for ownership, because if the workspace was just
    -- created then a `user_roles` row does not exist yet, because we still
    -- haven't finished created the user owner's role.
    if (
      not public.util__auth_user_is_workspace_owner(p_workspace_id) and
      not public.util__auth_user_is_workspace_admin(p_workspace_id)
    ) then
      raise 'The requesting user is not an admin of this workspace';
    end if;

    -- Create the workspace membership
    insert into public.workspace_memberships (workspace_id, user_id)
      values (p_workspace_id, p_user_id)
      returning id into v_membership_id;

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
    insert into public.user_roles (workspace_id, user_id, membership_id, role)
      values (p_workspace_id, p_user_id, v_membership_id, p_user_role);

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
    insert into public.workspaces (owner_id, name, slug)
      values (v_owner_id, p_workspace_name, p_workspace_slug)
      returning * into v_workspace;

    -- Call the rpc function to create the workspace membership and user profile
    perform public.rpc_workspaces__add_user(
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

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_admin(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
      where workspace_memberships.workspace_id = $1
        and workspace_memberships.user_id = auth.uid()
        and workspace_memberships.role = 'admin'
    );
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_member(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
      where workspace_memberships.workspace_id = $1
        and workspace_memberships.user_id = auth.uid()
    );
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

grant delete on table "public"."entity_configs" to "anon";

grant insert on table "public"."entity_configs" to "anon";

grant references on table "public"."entity_configs" to "anon";

grant select on table "public"."entity_configs" to "anon";

grant trigger on table "public"."entity_configs" to "anon";

grant truncate on table "public"."entity_configs" to "anon";

grant update on table "public"."entity_configs" to "anon";

grant delete on table "public"."entity_configs" to "authenticated";

grant insert on table "public"."entity_configs" to "authenticated";

grant references on table "public"."entity_configs" to "authenticated";

grant select on table "public"."entity_configs" to "authenticated";

grant trigger on table "public"."entity_configs" to "authenticated";

grant truncate on table "public"."entity_configs" to "authenticated";

grant update on table "public"."entity_configs" to "authenticated";

grant delete on table "public"."entity_configs" to "service_role";

grant insert on table "public"."entity_configs" to "service_role";

grant references on table "public"."entity_configs" to "service_role";

grant select on table "public"."entity_configs" to "service_role";

grant trigger on table "public"."entity_configs" to "service_role";

grant truncate on table "public"."entity_configs" to "service_role";

grant update on table "public"."entity_configs" to "service_role";

grant delete on table "public"."entity_field_configs" to "anon";

grant insert on table "public"."entity_field_configs" to "anon";

grant references on table "public"."entity_field_configs" to "anon";

grant select on table "public"."entity_field_configs" to "anon";

grant trigger on table "public"."entity_field_configs" to "anon";

grant truncate on table "public"."entity_field_configs" to "anon";

grant update on table "public"."entity_field_configs" to "anon";

grant delete on table "public"."entity_field_configs" to "authenticated";

grant insert on table "public"."entity_field_configs" to "authenticated";

grant references on table "public"."entity_field_configs" to "authenticated";

grant select on table "public"."entity_field_configs" to "authenticated";

grant trigger on table "public"."entity_field_configs" to "authenticated";

grant truncate on table "public"."entity_field_configs" to "authenticated";

grant update on table "public"."entity_field_configs" to "authenticated";

grant delete on table "public"."entity_field_configs" to "service_role";

grant insert on table "public"."entity_field_configs" to "service_role";

grant references on table "public"."entity_field_configs" to "service_role";

grant select on table "public"."entity_field_configs" to "service_role";

grant trigger on table "public"."entity_field_configs" to "service_role";

grant truncate on table "public"."entity_field_configs" to "service_role";

grant update on table "public"."entity_field_configs" to "service_role";

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

grant delete on table "public"."workspace_memberships" to "anon";

grant insert on table "public"."workspace_memberships" to "anon";

grant references on table "public"."workspace_memberships" to "anon";

grant select on table "public"."workspace_memberships" to "anon";

grant trigger on table "public"."workspace_memberships" to "anon";

grant truncate on table "public"."workspace_memberships" to "anon";

grant update on table "public"."workspace_memberships" to "anon";

grant delete on table "public"."workspace_memberships" to "authenticated";

grant insert on table "public"."workspace_memberships" to "authenticated";

grant references on table "public"."workspace_memberships" to "authenticated";

grant select on table "public"."workspace_memberships" to "authenticated";

grant trigger on table "public"."workspace_memberships" to "authenticated";

grant truncate on table "public"."workspace_memberships" to "authenticated";

grant update on table "public"."workspace_memberships" to "authenticated";

grant delete on table "public"."workspace_memberships" to "service_role";

grant insert on table "public"."workspace_memberships" to "service_role";

grant references on table "public"."workspace_memberships" to "service_role";

grant select on table "public"."workspace_memberships" to "service_role";

grant trigger on table "public"."workspace_memberships" to "service_role";

grant truncate on table "public"."workspace_memberships" to "service_role";

grant update on table "public"."workspace_memberships" to "service_role";

grant delete on table "public"."workspaces" to "anon";

grant insert on table "public"."workspaces" to "anon";

grant references on table "public"."workspaces" to "anon";

grant select on table "public"."workspaces" to "anon";

grant trigger on table "public"."workspaces" to "anon";

grant truncate on table "public"."workspaces" to "anon";

grant update on table "public"."workspaces" to "anon";

grant delete on table "public"."workspaces" to "authenticated";

grant insert on table "public"."workspaces" to "authenticated";

grant references on table "public"."workspaces" to "authenticated";

grant select on table "public"."workspaces" to "authenticated";

grant trigger on table "public"."workspaces" to "authenticated";

grant truncate on table "public"."workspaces" to "authenticated";

grant update on table "public"."workspaces" to "authenticated";

grant delete on table "public"."workspaces" to "service_role";

grant insert on table "public"."workspaces" to "service_role";

grant references on table "public"."workspaces" to "service_role";

grant select on table "public"."workspaces" to "service_role";

grant trigger on table "public"."workspaces" to "service_role";

grant truncate on table "public"."workspaces" to "service_role";

grant update on table "public"."workspaces" to "service_role";

create policy "User can DELETE entity_configs"
on "public"."entity_configs"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT entity_configs"
on "public"."entity_configs"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT entity_configs"
on "public"."entity_configs"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE entity_configs"
on "public"."entity_configs"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


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
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


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


create policy "User can SELECT their own memberships or memberships of other u"
on "public"."workspace_memberships"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_member(workspace_id)));


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


create policy "User can SELECT workspaces they own or belong to"
on "public"."workspaces"
as permissive
for select
to authenticated
using (((auth.uid() = owner_id) OR util__auth_user_is_workspace_member(id)));


create policy "User can UPDATE workspaces they admin"
on "public"."workspaces"
as permissive
for update
to authenticated
using (util__auth_user_is_workspace_admin(id))
with check ((util__auth_user_is_workspace_admin(id) AND util__user_is_workspace_member(owner_id, id)));


CREATE TRIGGER tr_entity_config__set_updated_at BEFORE UPDATE ON public.entity_configs FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_config__set_updated_at BEFORE UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_configs__validate_title_id_fields AFTER INSERT OR UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION entity_field_configs__validate_title_id_fields();

CREATE TRIGGER tr_user_profiles__prevent_id_changes BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION user_profiles__prevent_id_changes();

CREATE TRIGGER tr_user_profiles__set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_user_roles__prevent_id_changes BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION user_roles__prevent_id_changes();

CREATE TRIGGER tr_user_roles__set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__aggregation_set_updated_at BEFORE UPDATE ON public.value_extractors__aggregation FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__dataset_column_value_set_updated_at BEFORE UPDATE ON public.value_extractors__dataset_column_value FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractors__manual_entry_set_updated_at BEFORE UPDATE ON public.value_extractors__manual_entry FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_workspace_memberships__set_updated_at BEFORE UPDATE ON public.workspace_memberships FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_workspaces__set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


