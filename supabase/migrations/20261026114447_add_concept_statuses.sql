  create table "public"."concept_statuses" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "concept_id" uuid not null,
    "name" text not null,
    "description" text,
    "color" text not null,
    "position" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."concept_statuses" enable row level security;

alter table "public"."concepts" add column "default_status_id" uuid;

CREATE UNIQUE INDEX concept_statuses__concept_id_lower_name_unique ON public.concept_statuses USING btree (concept_id, lower(name));

CREATE UNIQUE INDEX concept_statuses__id_concept_id_unique ON public.concept_statuses USING btree (id, concept_id);

CREATE UNIQUE INDEX concept_statuses_pkey ON public.concept_statuses USING btree (id);

CREATE INDEX idx_concept_statuses__concept_id_position ON public.concept_statuses USING btree (concept_id, "position");

alter table "public"."concept_statuses" add constraint "concept_statuses_pkey" PRIMARY KEY using index "concept_statuses_pkey";

alter table "public"."concept_statuses" add constraint "concept_statuses__color_hex" CHECK ((color ~ '^#[0-9a-f]{6}$'::text)) not valid;

alter table "public"."concept_statuses" validate constraint "concept_statuses__color_hex";

alter table "public"."concept_statuses" add constraint "concept_statuses__id_concept_id_unique" UNIQUE using index "concept_statuses__id_concept_id_unique";

alter table "public"."concept_statuses" add constraint "concept_statuses__name_trimmed_not_blank" CHECK (((name = btrim(name)) AND (name <> ''::text))) not valid;

alter table "public"."concept_statuses" validate constraint "concept_statuses__name_trimmed_not_blank";

alter table "public"."concept_statuses" add constraint "concept_statuses_concept_id_fkey" FOREIGN KEY (concept_id) REFERENCES public.concepts(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."concept_statuses" validate constraint "concept_statuses_concept_id_fkey";

alter table "public"."concept_statuses" add constraint "concept_statuses_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."concept_statuses" validate constraint "concept_statuses_workspace_id_fkey";

alter table "public"."concepts" add constraint "concepts__default_status_fkey" FOREIGN KEY (default_status_id, id) REFERENCES public.concept_statuses(id, concept_id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."concepts" validate constraint "concepts__default_status_fkey";

grant delete on table "public"."concept_statuses" to "authenticated";

grant insert on table "public"."concept_statuses" to "authenticated";

grant select on table "public"."concept_statuses" to "authenticated";

grant update on table "public"."concept_statuses" to "authenticated";

grant delete on table "public"."concept_statuses" to "service_role";

grant insert on table "public"."concept_statuses" to "service_role";

grant select on table "public"."concept_statuses" to "service_role";

grant update on table "public"."concept_statuses" to "service_role";


  create policy "Case Types editors can DELETE concept_statuses"
  on "public"."concept_statuses"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "Case Types editors can INSERT concept_statuses"
  on "public"."concept_statuses"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level) AND (workspace_id = ( SELECT c.workspace_id
   FROM public.concepts c
  WHERE (c.id = concept_statuses.concept_id)))));



  create policy "Case Types editors can UPDATE concept_statuses"
  on "public"."concept_statuses"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level))
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level) AND (workspace_id = ( SELECT c.workspace_id
   FROM public.concepts c
  WHERE (c.id = concept_statuses.concept_id)))));



  create policy "User can SELECT concept_statuses in their workspace"
  on "public"."concept_statuses"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));


CREATE TRIGGER tr_concept_statuses__set_updated_at BEFORE UPDATE ON public.concept_statuses FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


