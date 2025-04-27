create type "public"."value_extractor__aggregation_type" as enum ('sum', 'max', 'count');

create type "public"."value_extractor__value_picker_rule_type" as enum ('most_frequent', 'first');

drop trigger if exists "tr_value_extractor_config__aggregation_set_updated_at" on "public"."value_extractor_config__aggregation";

drop trigger if exists "tr_value_extractor_config__dataset_column_value_set_updated_at" on "public"."value_extractor_config__dataset_column_value";

drop trigger if exists "tr_value_extractor_config__manual_entry_set_updated_at" on "public"."value_extractor_config__manual_entry";

drop policy "User can DELETE value_extractor_config__aggregation" on "public"."value_extractor_config__aggregation";

drop policy "User can INSERT value_extractor_config__aggregation" on "public"."value_extractor_config__aggregation";

drop policy "User can SELECT value_extractor_config__aggregation" on "public"."value_extractor_config__aggregation";

drop policy "User can UPDATE value_extractor_config__aggregation" on "public"."value_extractor_config__aggregation";

drop policy "User can DELETE value_extractor_config__dataset_column_value" on "public"."value_extractor_config__dataset_column_value";

drop policy "User can INSERT value_extractor_config__dataset_column_value" on "public"."value_extractor_config__dataset_column_value";

drop policy "User can SELECT value_extractor_config__dataset_column_value" on "public"."value_extractor_config__dataset_column_value";

drop policy "User can UPDATE value_extractor_config__dataset_column_value" on "public"."value_extractor_config__dataset_column_value";

drop policy "User can DELETE value_extractor_config__manual_entry" on "public"."value_extractor_config__manual_entry";

drop policy "User can INSERT value_extractor_config__manual_entry" on "public"."value_extractor_config__manual_entry";

drop policy "User can SELECT value_extractor_config__manual_entry" on "public"."value_extractor_config__manual_entry";

drop policy "User can UPDATE value_extractor_config__manual_entry" on "public"."value_extractor_config__manual_entry";

revoke delete on table "public"."value_extractor_config__aggregation" from "anon";

revoke insert on table "public"."value_extractor_config__aggregation" from "anon";

revoke references on table "public"."value_extractor_config__aggregation" from "anon";

revoke select on table "public"."value_extractor_config__aggregation" from "anon";

revoke trigger on table "public"."value_extractor_config__aggregation" from "anon";

revoke truncate on table "public"."value_extractor_config__aggregation" from "anon";

revoke update on table "public"."value_extractor_config__aggregation" from "anon";

revoke delete on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke insert on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke references on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke select on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke trigger on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke truncate on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke update on table "public"."value_extractor_config__aggregation" from "authenticated";

revoke delete on table "public"."value_extractor_config__aggregation" from "service_role";

revoke insert on table "public"."value_extractor_config__aggregation" from "service_role";

revoke references on table "public"."value_extractor_config__aggregation" from "service_role";

revoke select on table "public"."value_extractor_config__aggregation" from "service_role";

revoke trigger on table "public"."value_extractor_config__aggregation" from "service_role";

revoke truncate on table "public"."value_extractor_config__aggregation" from "service_role";

revoke update on table "public"."value_extractor_config__aggregation" from "service_role";

revoke delete on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke insert on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke references on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke select on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke trigger on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke truncate on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke update on table "public"."value_extractor_config__dataset_column_value" from "anon";

revoke delete on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke insert on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke references on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke select on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke trigger on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke truncate on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke update on table "public"."value_extractor_config__dataset_column_value" from "authenticated";

revoke delete on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke insert on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke references on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke select on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke trigger on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke truncate on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke update on table "public"."value_extractor_config__dataset_column_value" from "service_role";

revoke delete on table "public"."value_extractor_config__manual_entry" from "anon";

revoke insert on table "public"."value_extractor_config__manual_entry" from "anon";

revoke references on table "public"."value_extractor_config__manual_entry" from "anon";

revoke select on table "public"."value_extractor_config__manual_entry" from "anon";

revoke trigger on table "public"."value_extractor_config__manual_entry" from "anon";

revoke truncate on table "public"."value_extractor_config__manual_entry" from "anon";

revoke update on table "public"."value_extractor_config__manual_entry" from "anon";

revoke delete on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke insert on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke references on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke select on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke trigger on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke truncate on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke update on table "public"."value_extractor_config__manual_entry" from "authenticated";

revoke delete on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke insert on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke references on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke select on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke trigger on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke truncate on table "public"."value_extractor_config__manual_entry" from "service_role";

revoke update on table "public"."value_extractor_config__manual_entry" from "service_role";

alter table "public"."value_extractor_config__aggregation" drop constraint "value_extractor_config__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__dataset_column_value" drop constraint "value_extractor_config__dataset_col_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__manual_entry" drop constraint "value_extractor_config__manual_entr_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__aggregation" drop constraint "value_extractor_config__aggregation_pkey";

alter table "public"."value_extractor_config__dataset_column_value" drop constraint "value_extractor_config__dataset_column_value_pkey";

alter table "public"."value_extractor_config__manual_entry" drop constraint "value_extractor_config__manual_entry_pkey";

drop index if exists "public"."value_extractor_config__aggregation_pkey";

drop index if exists "public"."value_extractor_config__dataset_column_value_pkey";

drop index if exists "public"."value_extractor_config__manual_entry_pkey";

drop table "public"."value_extractor_config__aggregation";

drop table "public"."value_extractor_config__dataset_column_value";

drop table "public"."value_extractor_config__manual_entry";

create table "public"."value_extractor__aggregation" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "aggregation_type" value_extractor__aggregation_type not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null,
    "filter" jsonb
);


alter table "public"."value_extractor__aggregation" enable row level security;

create table "public"."value_extractor__dataset_column_value" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "value_picker_rule_type" value_extractor__value_picker_rule_type not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null
);


alter table "public"."value_extractor__dataset_column_value" enable row level security;

create table "public"."value_extractor__manual_entry" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null
);


alter table "public"."value_extractor__manual_entry" enable row level security;

drop type "public"."value_extractor_config__aggregation_type";

drop type "public"."value_extractor_config__value_picker_rule_type";

CREATE UNIQUE INDEX value_extractor__aggregation_pkey ON public.value_extractor__aggregation USING btree (id);

CREATE UNIQUE INDEX value_extractor__dataset_column_value_pkey ON public.value_extractor__dataset_column_value USING btree (id);

CREATE UNIQUE INDEX value_extractor__manual_entry_pkey ON public.value_extractor__manual_entry USING btree (id);

alter table "public"."value_extractor__aggregation" add constraint "value_extractor__aggregation_pkey" PRIMARY KEY using index "value_extractor__aggregation_pkey";

alter table "public"."value_extractor__dataset_column_value" add constraint "value_extractor__dataset_column_value_pkey" PRIMARY KEY using index "value_extractor__dataset_column_value_pkey";

alter table "public"."value_extractor__manual_entry" add constraint "value_extractor__manual_entry_pkey" PRIMARY KEY using index "value_extractor__manual_entry_pkey";

alter table "public"."value_extractor__aggregation" add constraint "value_extractor__aggregation_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__aggregation" validate constraint "value_extractor__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractor__dataset_column_value" add constraint "value_extractor__dataset_column_val_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__dataset_column_value" validate constraint "value_extractor__dataset_column_val_entity_field_config_id_fkey";

alter table "public"."value_extractor__manual_entry" add constraint "value_extractor__manual_entry_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor__manual_entry" validate constraint "value_extractor__manual_entry_entity_field_config_id_fkey";

grant delete on table "public"."value_extractor__aggregation" to "anon";

grant insert on table "public"."value_extractor__aggregation" to "anon";

grant references on table "public"."value_extractor__aggregation" to "anon";

grant select on table "public"."value_extractor__aggregation" to "anon";

grant trigger on table "public"."value_extractor__aggregation" to "anon";

grant truncate on table "public"."value_extractor__aggregation" to "anon";

grant update on table "public"."value_extractor__aggregation" to "anon";

grant delete on table "public"."value_extractor__aggregation" to "authenticated";

grant insert on table "public"."value_extractor__aggregation" to "authenticated";

grant references on table "public"."value_extractor__aggregation" to "authenticated";

grant select on table "public"."value_extractor__aggregation" to "authenticated";

grant trigger on table "public"."value_extractor__aggregation" to "authenticated";

grant truncate on table "public"."value_extractor__aggregation" to "authenticated";

grant update on table "public"."value_extractor__aggregation" to "authenticated";

grant delete on table "public"."value_extractor__aggregation" to "service_role";

grant insert on table "public"."value_extractor__aggregation" to "service_role";

grant references on table "public"."value_extractor__aggregation" to "service_role";

grant select on table "public"."value_extractor__aggregation" to "service_role";

grant trigger on table "public"."value_extractor__aggregation" to "service_role";

grant truncate on table "public"."value_extractor__aggregation" to "service_role";

grant update on table "public"."value_extractor__aggregation" to "service_role";

grant delete on table "public"."value_extractor__dataset_column_value" to "anon";

grant insert on table "public"."value_extractor__dataset_column_value" to "anon";

grant references on table "public"."value_extractor__dataset_column_value" to "anon";

grant select on table "public"."value_extractor__dataset_column_value" to "anon";

grant trigger on table "public"."value_extractor__dataset_column_value" to "anon";

grant truncate on table "public"."value_extractor__dataset_column_value" to "anon";

grant update on table "public"."value_extractor__dataset_column_value" to "anon";

grant delete on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant insert on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant references on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant select on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant trigger on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant truncate on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant update on table "public"."value_extractor__dataset_column_value" to "authenticated";

grant delete on table "public"."value_extractor__dataset_column_value" to "service_role";

grant insert on table "public"."value_extractor__dataset_column_value" to "service_role";

grant references on table "public"."value_extractor__dataset_column_value" to "service_role";

grant select on table "public"."value_extractor__dataset_column_value" to "service_role";

grant trigger on table "public"."value_extractor__dataset_column_value" to "service_role";

grant truncate on table "public"."value_extractor__dataset_column_value" to "service_role";

grant update on table "public"."value_extractor__dataset_column_value" to "service_role";

grant delete on table "public"."value_extractor__manual_entry" to "anon";

grant insert on table "public"."value_extractor__manual_entry" to "anon";

grant references on table "public"."value_extractor__manual_entry" to "anon";

grant select on table "public"."value_extractor__manual_entry" to "anon";

grant trigger on table "public"."value_extractor__manual_entry" to "anon";

grant truncate on table "public"."value_extractor__manual_entry" to "anon";

grant update on table "public"."value_extractor__manual_entry" to "anon";

grant delete on table "public"."value_extractor__manual_entry" to "authenticated";

grant insert on table "public"."value_extractor__manual_entry" to "authenticated";

grant references on table "public"."value_extractor__manual_entry" to "authenticated";

grant select on table "public"."value_extractor__manual_entry" to "authenticated";

grant trigger on table "public"."value_extractor__manual_entry" to "authenticated";

grant truncate on table "public"."value_extractor__manual_entry" to "authenticated";

grant update on table "public"."value_extractor__manual_entry" to "authenticated";

grant delete on table "public"."value_extractor__manual_entry" to "service_role";

grant insert on table "public"."value_extractor__manual_entry" to "service_role";

grant references on table "public"."value_extractor__manual_entry" to "service_role";

grant select on table "public"."value_extractor__manual_entry" to "service_role";

grant trigger on table "public"."value_extractor__manual_entry" to "service_role";

grant truncate on table "public"."value_extractor__manual_entry" to "service_role";

grant update on table "public"."value_extractor__manual_entry" to "service_role";

create policy "User can DELETE value_extractor__aggregation"
on "public"."value_extractor__aggregation"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor__aggregation"
on "public"."value_extractor__aggregation"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor__aggregation"
on "public"."value_extractor__aggregation"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor__aggregation"
on "public"."value_extractor__aggregation"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractor__dataset_column_value"
on "public"."value_extractor__dataset_column_value"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor__dataset_column_value"
on "public"."value_extractor__dataset_column_value"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor__dataset_column_value"
on "public"."value_extractor__dataset_column_value"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor__dataset_column_value"
on "public"."value_extractor__dataset_column_value"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractor__manual_entry"
on "public"."value_extractor__manual_entry"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor__manual_entry"
on "public"."value_extractor__manual_entry"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor__manual_entry"
on "public"."value_extractor__manual_entry"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor__manual_entry"
on "public"."value_extractor__manual_entry"
as permissive
for update
to authenticated
with check (true);


CREATE TRIGGER tr_value_extractor__aggregation_set_updated_at BEFORE UPDATE ON public.value_extractor__aggregation FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractor__dataset_column_value_set_updated_at BEFORE UPDATE ON public.value_extractor__dataset_column_value FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractor__manual_entry_set_updated_at BEFORE UPDATE ON public.value_extractor__manual_entry FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


