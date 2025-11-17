create type "public"."subscriptions__feature_plan_type" as enum ('free', 'basic', 'premium');

create type "public"."subscriptions__status" as enum ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');

create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "subscription_owner_id" uuid not null,
    "polar_subscription_id" uuid not null,
    "polar_product_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "feature_plan_type" subscriptions__feature_plan_type not null,
    "subscription_status" subscriptions__status not null
);


alter table "public"."subscriptions" enable row level security;

alter table "public"."user_profiles" add column "polar_product_id" uuid;

alter table "public"."user_profiles" add column "subscription_id" uuid;

CREATE INDEX idx_subscriptions__subscription_owner_id_workspace_id ON public.subscriptions USING btree (subscription_owner_id, workspace_id);

CREATE INDEX idx_subscriptions__workspace_id ON public.subscriptions USING btree (workspace_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_workspace_id_key ON public.subscriptions USING btree (workspace_id);

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_subscription_owner_id_fkey" FOREIGN KEY (subscription_owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_subscription_owner_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_workspace_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_workspace_id_key" UNIQUE using index "subscriptions_workspace_id_key";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

create policy "
  User can SELECT their own subscriptions;
  User can SELECT s"
on "public"."subscriptions"
as permissive
for select
to authenticated
using (((subscription_owner_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



