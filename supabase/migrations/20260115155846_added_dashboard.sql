
  create table "public"."dashboards" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "owner_id" uuid not null default auth.uid(),
    "owner_profile_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "is_public" boolean not null default false,
    "slug" text,
    "config" jsonb not null
      );


alter table "public"."dashboards" enable row level security;

CREATE UNIQUE INDEX dashboards__workspace_id_slug ON public.dashboards USING btree (workspace_id, slug);

CREATE UNIQUE INDEX dashboards_pkey ON public.dashboards USING btree (id);

CREATE INDEX idx_dashboards__slug ON public.dashboards USING btree (slug);

alter table "public"."dashboards" add constraint "dashboards_pkey" PRIMARY KEY using index "dashboards_pkey";

alter table "public"."dashboards" add constraint "dashboards__workspace_id_slug" UNIQUE using index "dashboards__workspace_id_slug";

alter table "public"."dashboards" add constraint "dashboards_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."dashboards" validate constraint "dashboards_owner_id_fkey";

alter table "public"."dashboards" add constraint "dashboards_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."dashboards" validate constraint "dashboards_owner_profile_id_fkey";

alter table "public"."dashboards" add constraint "dashboards_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dashboards" validate constraint "dashboards_workspace_id_fkey";

grant delete on table "public"."dashboards" to "anon";

grant insert on table "public"."dashboards" to "anon";

grant references on table "public"."dashboards" to "anon";

grant select on table "public"."dashboards" to "anon";

grant trigger on table "public"."dashboards" to "anon";

grant truncate on table "public"."dashboards" to "anon";

grant update on table "public"."dashboards" to "anon";

grant delete on table "public"."dashboards" to "authenticated";

grant insert on table "public"."dashboards" to "authenticated";

grant references on table "public"."dashboards" to "authenticated";

grant select on table "public"."dashboards" to "authenticated";

grant trigger on table "public"."dashboards" to "authenticated";

grant truncate on table "public"."dashboards" to "authenticated";

grant update on table "public"."dashboards" to "authenticated";

grant delete on table "public"."dashboards" to "service_role";

grant insert on table "public"."dashboards" to "service_role";

grant references on table "public"."dashboards" to "service_role";

grant select on table "public"."dashboards" to "service_role";

grant trigger on table "public"."dashboards" to "service_role";

grant truncate on table "public"."dashboards" to "service_role";

grant update on table "public"."dashboards" to "service_role";


  create policy "
  User can DELETE dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for delete
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can INSERT dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for insert
  to authenticated
with check ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "
  User can SELECT dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "User can UPDATE dashboards in their workspace"
  on "public"."dashboards"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))
with check ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));


CREATE TRIGGER tr_dashboards__set_updated_at BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


