create type "public"."plugin_data_slot_bindings__source_type" as enum ('concept', 'dataset');

  create table "public"."plugin_content_imports" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "plugin_id" text not null,
    "content_id" text not null,
    "dataset_id" uuid not null,
    "imported_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."plugin_content_imports" enable row level security;


  create table "public"."plugin_data_slot_bindings" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "installation_id" uuid not null,
    "slot_id" text not null,
    "source_type" public.plugin_data_slot_bindings__source_type not null,
    "concept_id" uuid,
    "dataset_id" uuid,
    "attribute_map" jsonb not null default '{}'::jsonb,
    "bound_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."plugin_data_slot_bindings" enable row level security;

CREATE UNIQUE INDEX plugin_content_imports__workspace_plugin_content_unique ON public.plugin_content_imports USING btree (workspace_id, plugin_id, content_id);

CREATE UNIQUE INDEX plugin_content_imports_pkey ON public.plugin_content_imports USING btree (id);

CREATE UNIQUE INDEX plugin_data_slot_bindings__installation_slot_unique ON public.plugin_data_slot_bindings USING btree (installation_id, slot_id);

CREATE UNIQUE INDEX plugin_data_slot_bindings_pkey ON public.plugin_data_slot_bindings USING btree (id);

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports_pkey" PRIMARY KEY using index "plugin_content_imports_pkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_pkey" PRIMARY KEY using index "plugin_data_slot_bindings_pkey";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports__content_id_format" CHECK ((content_id ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$'::text)) not valid;

alter table "public"."plugin_content_imports" validate constraint "plugin_content_imports__content_id_format";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports__dataset_in_workspace_fkey" FOREIGN KEY (dataset_id, workspace_id) REFERENCES public.datasets(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_content_imports" validate constraint "plugin_content_imports__dataset_in_workspace_fkey";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports__plugin_id_format" CHECK ((plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'::text)) not valid;

alter table "public"."plugin_content_imports" validate constraint "plugin_content_imports__plugin_id_format";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports__workspace_plugin_content_unique" UNIQUE using index "plugin_content_imports__workspace_plugin_content_unique";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports_imported_by_fkey" FOREIGN KEY (imported_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."plugin_content_imports" validate constraint "plugin_content_imports_imported_by_fkey";

alter table "public"."plugin_content_imports" add constraint "plugin_content_imports_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_content_imports" validate constraint "plugin_content_imports_workspace_id_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__attribute_map_object" CHECK ((jsonb_typeof(attribute_map) = 'object'::text)) not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__attribute_map_object";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__installation_slot_unique" UNIQUE using index "plugin_data_slot_bindings__installation_slot_unique";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__slot_id_format" CHECK ((slot_id ~ '^[a-zA-Z][a-zA-Z0-9]*$'::text)) not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__slot_id_format";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__source_matches_type" CHECK ((((source_type = 'concept'::public.plugin_data_slot_bindings__source_type) AND (dataset_id IS NULL)) OR ((source_type = 'dataset'::public.plugin_data_slot_bindings__source_type) AND (concept_id IS NULL)))) not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__source_matches_type";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_bound_by_fkey" FOREIGN KEY (bound_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings_bound_by_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_concept_id_fkey" FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings_concept_id_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings_dataset_id_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_installation_id_fkey" FOREIGN KEY (installation_id) REFERENCES public.plugin_installations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings_installation_id_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.plugin_data_slot_bindings__check_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.plugin_installations installation
    where
      installation.id = new.installation_id
      and installation.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding must be in its plugin install''s workspace'
      using
        errcode = '23514',
        hint = 'installation_not_in_workspace',
        detail = format('installation_id %s', new.installation_id);
  end if;

  if new.concept_id is not null and not exists (
    select 1
    from public.concepts concept
    where
      concept.id = new.concept_id
      and concept.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a case type of its own workspace'
      using
        errcode = '23514',
        hint = 'concept_not_in_workspace',
        detail = format('concept_id %s', new.concept_id);
  end if;

  if new.dataset_id is not null and not exists (
    select 1
    from public.datasets dataset
    where
      dataset.id = new.dataset_id
      and dataset.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a dataset of its own workspace'
      using
        errcode = '23514',
        hint = 'dataset_not_in_workspace',
        detail = format('dataset_id %s', new.dataset_id);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.plugin_data_slot_bindings__stamp_bound_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if auth.uid () is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.bound_by := auth.uid ();
  elsif
    new.source_type is distinct from old.source_type or
    new.concept_id is distinct from old.concept_id or
    new.dataset_id is distinct from old.dataset_id or
    new.attribute_map is distinct from old.attribute_map
  then
    new.bound_by := auth.uid ();
  else
    new.bound_by := old.bound_by;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_plugin_data_slot_bindings__save(p_installation_id uuid, p_slot_id text, p_source_type public.plugin_data_slot_bindings__source_type, p_concept_id uuid DEFAULT NULL::uuid, p_dataset_id uuid DEFAULT NULL::uuid, p_attribute_map jsonb DEFAULT '{}'::jsonb)
 RETURNS public.plugin_data_slot_bindings
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_binding public.plugin_data_slot_bindings;
begin
  select installation.workspace_id
  into v_workspace_id
  from public.plugin_installations installation
  where installation.id = p_installation_id;

  if v_workspace_id is null then
    raise exception 'The plugin install does not exist or cannot be read'
      using
        errcode = '42501',
        hint = 'plugin_installation_not_found',
        detail = format('installation_id %s', p_installation_id);
  end if;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  ) values (
    v_workspace_id,
    p_installation_id,
    p_slot_id,
    p_source_type,
    p_concept_id,
    p_dataset_id,
    coalesce(p_attribute_map, '{}'::jsonb)
  )
  on conflict (installation_id, slot_id) do update
  set
    source_type = excluded.source_type,
    concept_id = excluded.concept_id,
    dataset_id = excluded.dataset_id,
    attribute_map = excluded.attribute_map,
    bound_by = excluded.bound_by
  returning * into v_binding;

  return v_binding;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_plugin_installations__install(p_workspace_id uuid, p_plugin_id text, p_installed_version text, p_granted_permissions text[], p_bindings jsonb)
 RETURNS public.plugin_installations
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_installation public.plugin_installations;
begin
  insert into public.plugin_installations (
    workspace_id,
    plugin_id,
    installed_version,
    granted_permissions
  ) values (
    p_workspace_id,
    p_plugin_id,
    p_installed_version,
    coalesce(p_granted_permissions, '{}')
  )
  returning * into v_installation;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  )
  select
    v_installation.workspace_id,
    v_installation.id,
    binding.slot_id,
    binding.source_type,
    binding.concept_id,
    binding.dataset_id,
    coalesce(binding.attribute_map, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_bindings, '[]'::jsonb)) as binding (
    slot_id text,
    source_type public.plugin_data_slot_bindings__source_type,
    concept_id uuid,
    dataset_id uuid,
    attribute_map jsonb
  );

  return v_installation;
end;
$function$
;

grant delete on table "public"."plugin_content_imports" to "authenticated";

grant insert on table "public"."plugin_content_imports" to "authenticated";

grant select on table "public"."plugin_content_imports" to "authenticated";

grant delete on table "public"."plugin_content_imports" to "service_role";

grant insert on table "public"."plugin_content_imports" to "service_role";

grant select on table "public"."plugin_content_imports" to "service_role";

grant update on table "public"."plugin_content_imports" to "service_role";

grant delete on table "public"."plugin_data_slot_bindings" to "authenticated";

grant insert on table "public"."plugin_data_slot_bindings" to "authenticated";

grant select on table "public"."plugin_data_slot_bindings" to "authenticated";

grant update on table "public"."plugin_data_slot_bindings" to "authenticated";

grant delete on table "public"."plugin_data_slot_bindings" to "service_role";

grant insert on table "public"."plugin_data_slot_bindings" to "service_role";

grant select on table "public"."plugin_data_slot_bindings" to "service_role";

grant update on table "public"."plugin_data_slot_bindings" to "service_role";


  create policy "Members can SELECT plugin content imports"
  on "public"."plugin_content_imports"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can DELETE plugin content imports"
  on "public"."plugin_content_imports"
  as permissive
  for delete
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id));



  create policy "Settings admins can INSERT plugin content imports"
  on "public"."plugin_content_imports"
  as permissive
  for insert
  to authenticated
with check ((public.util__can_manage_workspace_settings(workspace_id) AND (NOT (imported_by IS DISTINCT FROM ( SELECT auth.uid() AS uid)))));



  create policy "Members can SELECT plugin data slot bindings"
  on "public"."plugin_data_slot_bindings"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can DELETE plugin data slot bindings"
  on "public"."plugin_data_slot_bindings"
  as permissive
  for delete
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id));



  create policy "Settings admins can INSERT plugin data slot bindings"
  on "public"."plugin_data_slot_bindings"
  as permissive
  for insert
  to authenticated
with check ((public.util__can_manage_workspace_settings(workspace_id) AND (NOT (bound_by IS DISTINCT FROM ( SELECT auth.uid() AS uid)))));



  create policy "Settings admins can UPDATE plugin data slot bindings"
  on "public"."plugin_data_slot_bindings"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id))
with check (public.util__can_manage_workspace_settings(workspace_id));


CREATE TRIGGER tr__plugin_data_slot_bindings__check_workspace BEFORE INSERT OR UPDATE OF workspace_id, installation_id, concept_id, dataset_id ON public.plugin_data_slot_bindings FOR EACH ROW EXECUTE FUNCTION public.plugin_data_slot_bindings__check_workspace();

CREATE TRIGGER tr__plugin_data_slot_bindings__set_updated_at BEFORE UPDATE ON public.plugin_data_slot_bindings FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__plugin_data_slot_bindings__stamp_bound_by BEFORE INSERT OR UPDATE ON public.plugin_data_slot_bindings FOR EACH ROW EXECUTE FUNCTION public.plugin_data_slot_bindings__stamp_bound_by();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.plugin_data_slot_bindings__check_workspace() from public, anon, authenticated, service_role;
revoke all privileges on function public.plugin_data_slot_bindings__stamp_bound_by() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_plugin_data_slot_bindings__save(p_installation_id uuid, p_slot_id text, p_source_type plugin_data_slot_bindings__source_type, p_concept_id uuid, p_dataset_id uuid, p_attribute_map jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_plugin_data_slot_bindings__save(p_installation_id uuid, p_slot_id text, p_source_type plugin_data_slot_bindings__source_type, p_concept_id uuid, p_dataset_id uuid, p_attribute_map jsonb) to "authenticated";
revoke all privileges on function public.rpc_plugin_installations__install(p_workspace_id uuid, p_plugin_id text, p_installed_version text, p_granted_permissions text[], p_bindings jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_plugin_installations__install(p_workspace_id uuid, p_plugin_id text, p_installed_version text, p_granted_permissions text[], p_bindings jsonb) to "authenticated";
