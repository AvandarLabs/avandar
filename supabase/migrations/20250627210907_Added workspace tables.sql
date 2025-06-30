drop policy "User can DELETE entity_configs" on "public"."entity_configs";

drop policy "User can INSERT entity_configs" on "public"."entity_configs";

drop policy "User can SELECT entity_configs" on "public"."entity_configs";

drop policy "User can UPDATE entity_configs" on "public"."entity_configs";

create table "public"."workspace_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."workspace_memberships" enable row level security;

create table "public"."workspaces" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."workspaces" enable row level security;

alter table "public"."entity_configs" add column "workspace_id" uuid not null;

alter table "public"."entity_field_configs" add column "workspace_id" uuid not null;

alter table "public"."value_extractor__aggregation" add column "workspace_id" uuid not null;

alter table "public"."value_extractor__dataset_column_value" add column "workspace_id" uuid not null;

alter table "public"."value_extractor__manual_entry" add column "workspace_id" uuid not null;

CREATE INDEX idx_entity_configs__workspace_id ON public.entity_configs USING btree (workspace_id);

CREATE INDEX idx_entity_field_configs__entity_config_id_workspace_id ON public.entity_field_configs USING btree (entity_config_id, workspace_id);

CREATE INDEX idx_value_extractor__aggregation__entity_field_config_id_worksp ON public.value_extractor__aggregation USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractor__dataset_column_value__entity_field_config_ ON public.value_extractor__dataset_column_value USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_value_extractor__manual_entry__entity_field_config_id_works ON public.value_extractor__manual_entry USING btree (entity_field_config_id, workspace_id);

CREATE INDEX idx_workspace_memberships__user_id ON public.workspace_memberships USING btree (user_id);

CREATE INDEX idx_workspace_memberships__user_id_workspace_id ON public.workspace_memberships USING btree (user_id, workspace_id);

CREATE INDEX idx_workspace_memberships__workspace_id ON public.workspace_memberships USING btree (workspace_id);

CREATE UNIQUE INDEX workspace_memberships_pkey ON public.workspace_memberships USING btree (id);

CREATE UNIQUE INDEX workspace_memberships_workspace_user_unique ON public.workspace_memberships USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

CREATE UNIQUE INDEX workspaces_slug_key ON public.workspaces USING btree (slug);

alter table "public"."workspace_memberships" add constraint "workspace_memberships_pkey" PRIMARY KEY using index "workspace_memberships_pkey";

alter table "public"."workspaces" add constraint "workspaces_pkey" PRIMARY KEY using index "workspaces_pkey";

alter table "public"."entity_configs" add constraint "entity_configs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_configs" validate constraint "entity_configs_workspace_id_fkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_workspace_id_fkey";

alter table "public"."value_extractor__aggregation" add constraint "value_extractor__aggregation_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__aggregation" validate constraint "value_extractor__aggregation_workspace_id_fkey";

alter table "public"."value_extractor__dataset_column_value" add constraint "value_extractor__dataset_column_value_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__dataset_column_value" validate constraint "value_extractor__dataset_column_value_workspace_id_fkey";

alter table "public"."value_extractor__manual_entry" add constraint "value_extractor__manual_entry_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__manual_entry" validate constraint "value_extractor__manual_entry_workspace_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_memberships" validate constraint "workspace_memberships_user_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_memberships" validate constraint "workspace_memberships_workspace_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships_workspace_user_unique" UNIQUE using index "workspace_memberships_workspace_user_unique";

alter table "public"."workspaces" add constraint "workspaces_slug_key" UNIQUE using index "workspaces_slug_key";

set check_function_bodies = off;

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

create policy "Admin can UPDATE workspace memberships"
on "public"."workspace_memberships"
as permissive
for update
to authenticated
using (util__auth_user_is_workspace_admin(workspace_id));


create policy "User can DELETE their memberships; Admin can DELETE other membe"
on "public"."workspace_memberships"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can INSERT themselves as workspace members; Admin can INSE"
on "public"."workspace_memberships"
as permissive
for insert
to authenticated
with check (((user_id = auth.uid()) OR util__auth_user_is_workspace_admin(workspace_id)));


create policy "User can SELECT their own memberships or memberships of other u"
on "public"."workspace_memberships"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR util__auth_user_is_workspace_member(workspace_id)));


create policy "User can DELETE workspaces they admin"
on "public"."workspaces"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_admin(id));


create policy "User can INSERT workspaces"
on "public"."workspaces"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT workspaces they belong to"
on "public"."workspaces"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(id));


create policy "User can UPDATE workspaces they admin"
on "public"."workspaces"
as permissive
for update
to authenticated
using (util__auth_user_is_workspace_admin(id));


create policy "User can DELETE entity_configs"
on "public"."entity_configs"
as permissive
for delete
to authenticated
using ((auth.uid() = owner_id));


create policy "User can INSERT entity_configs"
on "public"."entity_configs"
as permissive
for insert
to authenticated
with check ((auth.uid() = owner_id));


create policy "User can SELECT entity_configs"
on "public"."entity_configs"
as permissive
for select
to authenticated
using ((auth.uid() = owner_id));


create policy "User can UPDATE entity_configs"
on "public"."entity_configs"
as permissive
for update
to authenticated
with check ((auth.uid() = owner_id));


CREATE TRIGGER tr_workspace_memberships__set_updated_at BEFORE UPDATE ON public.workspace_memberships FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_workspaces__set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


