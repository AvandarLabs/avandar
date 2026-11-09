  create table "public"."plugin_installations" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "plugin_id" text not null,
    "installed_version" text not null,
    "is_enabled" boolean not null default true,
    "granted_permissions" text[] not null default '{}'::text[],
    "installed_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."plugin_installations" enable row level security;

CREATE UNIQUE INDEX plugin_installations__workspace_plugin_unique ON public.plugin_installations USING btree (workspace_id, plugin_id);

CREATE UNIQUE INDEX plugin_installations_pkey ON public.plugin_installations USING btree (id);

alter table "public"."plugin_installations" add constraint "plugin_installations_pkey" PRIMARY KEY using index "plugin_installations_pkey";

alter table "public"."plugin_installations" add constraint "plugin_installations__plugin_id_format" CHECK ((plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'::text)) not valid;

alter table "public"."plugin_installations" validate constraint "plugin_installations__plugin_id_format";

alter table "public"."plugin_installations" add constraint "plugin_installations__workspace_plugin_unique" UNIQUE using index "plugin_installations__workspace_plugin_unique";

alter table "public"."plugin_installations" add constraint "plugin_installations_installed_by_fkey" FOREIGN KEY (installed_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."plugin_installations" validate constraint "plugin_installations_installed_by_fkey";

alter table "public"."plugin_installations" add constraint "plugin_installations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_installations" validate constraint "plugin_installations_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.plugin_installations__prevent_identity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'plugin installation workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  if new.plugin_id is distinct from old.plugin_id then
    raise exception 'plugin installation plugin_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

grant delete on table "public"."plugin_installations" to "authenticated";

grant insert on table "public"."plugin_installations" to "authenticated";

grant select on table "public"."plugin_installations" to "authenticated";

grant update on table "public"."plugin_installations" to "authenticated";

grant delete on table "public"."plugin_installations" to "service_role";

grant insert on table "public"."plugin_installations" to "service_role";

grant select on table "public"."plugin_installations" to "service_role";

grant update on table "public"."plugin_installations" to "service_role";


  create policy "Members can SELECT plugin installations"
  on "public"."plugin_installations"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can DELETE plugin installations"
  on "public"."plugin_installations"
  as permissive
  for delete
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id));



  create policy "Settings admins can INSERT plugin installations"
  on "public"."plugin_installations"
  as permissive
  for insert
  to authenticated
with check ((public.util__can_manage_workspace_settings(workspace_id) AND (NOT (installed_by IS DISTINCT FROM ( SELECT auth.uid() AS uid)))));



  create policy "Settings admins can UPDATE plugin installations"
  on "public"."plugin_installations"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id))
with check (public.util__can_manage_workspace_settings(workspace_id));


CREATE TRIGGER tr__plugin_installations__prevent_identity_change BEFORE UPDATE OF workspace_id, plugin_id ON public.plugin_installations FOR EACH ROW EXECUTE FUNCTION public.plugin_installations__prevent_identity_change();

CREATE TRIGGER tr__plugin_installations__set_updated_at BEFORE UPDATE ON public.plugin_installations FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.plugin_installations__prevent_identity_change() from public, anon, authenticated, service_role;
