drop trigger if exists "tr_value_extractor_config__adjacent_field_set_updated_at" on "public"."value_extractor_config__adjacent_field";

drop policy "User can DELETE value_extractor_config__adjacent_field" on "public"."value_extractor_config__adjacent_field";

drop policy "User can INSERT value_extractor_config__adjacent_field" on "public"."value_extractor_config__adjacent_field";

drop policy "User can SELECT value_extractor_config__adjacent_field" on "public"."value_extractor_config__adjacent_field";

drop policy "User can UPDATE value_extractor_config__adjacent_field" on "public"."value_extractor_config__adjacent_field";

revoke delete on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke insert on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke references on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke select on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke trigger on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke truncate on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke update on table "public"."value_extractor_config__adjacent_field" from "anon";

revoke delete on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke insert on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke references on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke select on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke trigger on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke truncate on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke update on table "public"."value_extractor_config__adjacent_field" from "authenticated";

revoke delete on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke insert on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke references on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke select on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke trigger on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke truncate on table "public"."value_extractor_config__adjacent_field" from "service_role";

revoke update on table "public"."value_extractor_config__adjacent_field" from "service_role";

alter table "public"."value_extractor_config__adjacent_field" drop constraint "value_extractor_config__adjacent_fi_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__adjacent_field" drop constraint "value_extractor_config__adjacent_field_pkey";

drop index if exists "public"."value_extractor_config__adjacent_field_pkey";

drop table "public"."value_extractor_config__adjacent_field";

alter type "public"."entity_field_config__value_extractor_type" rename to "entity_field_config__value_extractor_type__old_version_to_be_dropped";

create type "public"."entity_field_config__value_extractor_type" as enum ('dataset_column_value', 'manual_entry', 'aggregation');

create table "public"."value_extractor_config__dataset_column_value" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "value_picker_rule_type" value_extractor_config__value_picker_rule_type not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null
);


alter table "public"."value_extractor_config__dataset_column_value" enable row level security;

alter table "public"."entity_field_configs" alter column value_extractor_type type "public"."entity_field_config__value_extractor_type" using value_extractor_type::text::"public"."entity_field_config__value_extractor_type";

drop type "public"."entity_field_config__value_extractor_type__old_version_to_be_dropped";

CREATE UNIQUE INDEX value_extractor_config__dataset_column_value_pkey ON public.value_extractor_config__dataset_column_value USING btree (id);

alter table "public"."value_extractor_config__dataset_column_value" add constraint "value_extractor_config__dataset_column_value_pkey" PRIMARY KEY using index "value_extractor_config__dataset_column_value_pkey";

alter table "public"."value_extractor_config__dataset_column_value" add constraint "value_extractor_config__dataset_col_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor_config__dataset_column_value" validate constraint "value_extractor_config__dataset_col_entity_field_config_id_fkey";

grant delete on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant insert on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant references on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant select on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant trigger on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant truncate on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant update on table "public"."value_extractor_config__dataset_column_value" to "anon";

grant delete on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant insert on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant references on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant select on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant trigger on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant truncate on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant update on table "public"."value_extractor_config__dataset_column_value" to "authenticated";

grant delete on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant insert on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant references on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant select on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant trigger on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant truncate on table "public"."value_extractor_config__dataset_column_value" to "service_role";

grant update on table "public"."value_extractor_config__dataset_column_value" to "service_role";

create policy "User can DELETE value_extractor_config__dataset_column_value"
on "public"."value_extractor_config__dataset_column_value"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor_config__dataset_column_value"
on "public"."value_extractor_config__dataset_column_value"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor_config__dataset_column_value"
on "public"."value_extractor_config__dataset_column_value"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor_config__dataset_column_value"
on "public"."value_extractor_config__dataset_column_value"
as permissive
for update
to authenticated
with check (true);


CREATE TRIGGER tr_value_extractor_config__dataset_column_value_set_updated_at BEFORE UPDATE ON public.value_extractor_config__dataset_column_value FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


