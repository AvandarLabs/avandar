alter table "public"."workspace_memberships" drop constraint "workspace_memberships_workspace_user_unique";

drop index if exists "public"."workspace_memberships_workspace_user_unique";

create table "public"."tokens__google" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "expiry_date" timestamp with time zone not null,
    "google_account_id" text not null,
    "google_email" text not null,
    "access_token" text not null,
    "refresh_token" text not null,
    "scope" text not null
);


alter table "public"."tokens__google" enable row level security;

CREATE UNIQUE INDEX tokens__google__user_google_account_unique ON public.tokens__google USING btree (user_id, google_account_id);

CREATE UNIQUE INDEX tokens__google_pkey ON public.tokens__google USING btree (id);

CREATE UNIQUE INDEX workspace_memberships__workspace_user_unique ON public.workspace_memberships USING btree (workspace_id, user_id);

alter table "public"."tokens__google" add constraint "tokens__google_pkey" PRIMARY KEY using index "tokens__google_pkey";

alter table "public"."tokens__google" add constraint "tokens__google__user_google_account_unique" UNIQUE using index "tokens__google__user_google_account_unique";

alter table "public"."tokens__google" add constraint "tokens__google_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."tokens__google" validate constraint "tokens__google_user_id_fkey";

alter table "public"."workspace_memberships" add constraint "workspace_memberships__workspace_user_unique" UNIQUE using index "workspace_memberships__workspace_user_unique";

grant delete on table "public"."tokens__google" to "anon";

grant insert on table "public"."tokens__google" to "anon";

grant references on table "public"."tokens__google" to "anon";

grant select on table "public"."tokens__google" to "anon";

grant trigger on table "public"."tokens__google" to "anon";

grant truncate on table "public"."tokens__google" to "anon";

grant update on table "public"."tokens__google" to "anon";

grant delete on table "public"."tokens__google" to "authenticated";

grant insert on table "public"."tokens__google" to "authenticated";

grant references on table "public"."tokens__google" to "authenticated";

grant select on table "public"."tokens__google" to "authenticated";

grant trigger on table "public"."tokens__google" to "authenticated";

grant truncate on table "public"."tokens__google" to "authenticated";

grant update on table "public"."tokens__google" to "authenticated";

grant delete on table "public"."tokens__google" to "service_role";

grant insert on table "public"."tokens__google" to "service_role";

grant references on table "public"."tokens__google" to "service_role";

grant select on table "public"."tokens__google" to "service_role";

grant trigger on table "public"."tokens__google" to "service_role";

grant truncate on table "public"."tokens__google" to "service_role";

grant update on table "public"."tokens__google" to "service_role";

create policy "User can SELECT their own tokens__google"
on "public"."tokens__google"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));



