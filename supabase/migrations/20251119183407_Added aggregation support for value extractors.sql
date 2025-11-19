create type "public"."subscriptions__feature_plan_type" as enum ('free', 'basic', 'premium');

create type "public"."subscriptions__status" as enum ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');

create type "public"."subscriptions__update_status" as enum ('pending', 'completed');

drop trigger if exists "tr_value_extractors__aggregation_set_updated_at" on "public"."value_extractors__aggregation";

drop policy "
  User can DELETE value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can INSERT value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can SELECT value_extractors__aggregation
" on "public"."value_extractors__aggregation";

drop policy "
  User can UPDATE value_extractors__aggregation
" on "public"."value_extractors__aggregation";

revoke delete on table "public"."value_extractors__aggregation" from "anon";

revoke insert on table "public"."value_extractors__aggregation" from "anon";

revoke references on table "public"."value_extractors__aggregation" from "anon";

revoke select on table "public"."value_extractors__aggregation" from "anon";

revoke trigger on table "public"."value_extractors__aggregation" from "anon";

revoke truncate on table "public"."value_extractors__aggregation" from "anon";

revoke update on table "public"."value_extractors__aggregation" from "anon";

revoke delete on table "public"."value_extractors__aggregation" from "authenticated";

revoke insert on table "public"."value_extractors__aggregation" from "authenticated";

revoke references on table "public"."value_extractors__aggregation" from "authenticated";

revoke select on table "public"."value_extractors__aggregation" from "authenticated";

revoke trigger on table "public"."value_extractors__aggregation" from "authenticated";

revoke truncate on table "public"."value_extractors__aggregation" from "authenticated";

revoke update on table "public"."value_extractors__aggregation" from "authenticated";

revoke delete on table "public"."value_extractors__aggregation" from "service_role";

revoke insert on table "public"."value_extractors__aggregation" from "service_role";

revoke references on table "public"."value_extractors__aggregation" from "service_role";

revoke select on table "public"."value_extractors__aggregation" from "service_role";

revoke trigger on table "public"."value_extractors__aggregation" from "service_role";

revoke truncate on table "public"."value_extractors__aggregation" from "service_role";

revoke update on table "public"."value_extractors__aggregation" from "service_role";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" drop constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" drop constraint "metrics_dont_allow_manual_edit";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_entity_field_config_id_key";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_workspace_id_fkey";

alter table "public"."value_extractors__aggregation" drop constraint "value_extractors__aggregation_pkey";

drop index if exists "public"."idx_value_extractors__aggregation__entity_field_config_id_works";

drop index if exists "public"."value_extractors__aggregation_entity_field_config_id_key";

drop index if exists "public"."value_extractors__aggregation_pkey";

drop table "public"."value_extractors__aggregation";

alter type "public"."entity_field_configs__value_extractor_type" rename to "entity_field_configs__value_extractor_type__old_version_to_be_dropped";

create type "public"."entity_field_configs__value_extractor_type" as enum ('dataset_column_value', 'manual_entry');

alter type "public"."value_extractors__value_picker_rule_type" rename to "value_extractors__value_picker_rule_type__old_version_to_be_dropped";

create type "public"."value_extractors__value_picker_rule_type" as enum ('most_frequent', 'first', 'sum', 'avg', 'count', 'max', 'min');

create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "subscription_owner_id" uuid not null,
    "polar_customer_id" uuid not null,
    "polar_customer_email" text not null,
    "polar_subscription_id" uuid not null,
    "polar_product_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "feature_plan_type" subscriptions__feature_plan_type not null,
    "subscription_status" subscriptions__status not null,
    "max_seats_allowed" integer not null
);


alter table "public"."subscriptions" enable row level security;

alter table "public"."entity_field_configs" alter column value_extractor_type type "public"."entity_field_configs__value_extractor_type" using value_extractor_type::text::"public"."entity_field_configs__value_extractor_type";

alter table "public"."value_extractors__dataset_column_value" alter column value_picker_rule_type type "public"."value_extractors__value_picker_rule_type" using value_picker_rule_type::text::"public"."value_extractors__value_picker_rule_type";

drop type "public"."entity_field_configs__value_extractor_type__old_version_to_be_dropped";

drop type "public"."value_extractors__value_picker_rule_type__old_version_to_be_dropped";

alter table "public"."entity_field_configs" drop column "base_data_type";

alter table "public"."entity_field_configs" drop column "class";

alter table "public"."entity_field_configs" add column "data_type" datasets__ava_data_type not null;

alter table "public"."entity_field_configs" alter column "allow_manual_edit" drop default;

alter table "public"."entity_field_configs" alter column "is_array" set not null;

alter table "public"."entity_field_configs" alter column "is_id_field" drop default;

alter table "public"."entity_field_configs" alter column "is_title_field" drop default;

alter table "public"."user_profiles" add column "polar_product_id" uuid;

alter table "public"."user_profiles" add column "subscription_id" uuid;

alter table "public"."value_extractors__dataset_column_value" drop column "dataset_field_id";

alter table "public"."value_extractors__dataset_column_value" add column "dataset_column_id" uuid not null;

drop type "public"."entity_field_configs__base_data_type";

drop type "public"."entity_field_configs__class";

drop type "public"."value_extractors__aggregation_type";

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



