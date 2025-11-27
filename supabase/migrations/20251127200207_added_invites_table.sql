create type "public"."workspace_invites__status" as enum ('pending', 'accepted');


  create table "public"."workspace_invites" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "invited_by" uuid not null,
    "user_id" uuid,
    "email" text,
    "invite_status" public.workspace_invites__status not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."workspace_invites" enable row level security;

CREATE UNIQUE INDEX workspace_invites_pkey ON public.workspace_invites USING btree (id);

alter table "public"."workspace_invites" add constraint "workspace_invites_pkey" PRIMARY KEY using index "workspace_invites_pkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_invited_by_fkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_user_id_fkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_workspace_id_fkey";

grant delete on table "public"."workspace_invites" to "anon";

grant insert on table "public"."workspace_invites" to "anon";

grant references on table "public"."workspace_invites" to "anon";

grant select on table "public"."workspace_invites" to "anon";

grant trigger on table "public"."workspace_invites" to "anon";

grant truncate on table "public"."workspace_invites" to "anon";

grant update on table "public"."workspace_invites" to "anon";

grant delete on table "public"."workspace_invites" to "authenticated";

grant insert on table "public"."workspace_invites" to "authenticated";

grant references on table "public"."workspace_invites" to "authenticated";

grant select on table "public"."workspace_invites" to "authenticated";

grant trigger on table "public"."workspace_invites" to "authenticated";

grant truncate on table "public"."workspace_invites" to "authenticated";

grant update on table "public"."workspace_invites" to "authenticated";

grant delete on table "public"."workspace_invites" to "service_role";

grant insert on table "public"."workspace_invites" to "service_role";

grant references on table "public"."workspace_invites" to "service_role";

grant select on table "public"."workspace_invites" to "service_role";

grant trigger on table "public"."workspace_invites" to "service_role";

grant truncate on table "public"."workspace_invites" to "service_role";

grant update on table "public"."workspace_invites" to "service_role";


  create policy "
  User can DELETE invites they sent in their workspace
"
  on "public"."workspace_invites"
  as permissive
  for delete
  to authenticated
using (((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))) AND (invited_by = ( SELECT auth.uid() AS uid))));



  create policy "
  User can INSERT invites they sent to their workspace
"
  on "public"."workspace_invites"
  as permissive
  for insert
  to authenticated
with check (((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))) AND (invited_by = ( SELECT auth.uid() AS uid))));



  create policy "
  User can SELECT invites they sent from their workspace
"
  on "public"."workspace_invites"
  as permissive
  for select
  to authenticated
using (((invited_by = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "
  User can UPDATE invites they sent in their workspace
"
  on "public"."workspace_invites"
  as permissive
  for update
  to authenticated
with check (((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))) AND (invited_by = ( SELECT auth.uid() AS uid))));


CREATE TRIGGER tr_workspace_invites__set_updated_at BEFORE UPDATE ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


