drop policy "User can delete their own entity_configs" on "public"."entity_configs";

drop policy "User can insert entity_configs" on "public"."entity_configs";

drop policy "User can see their own entity_configs" on "public"."entity_configs";

drop policy "User can update their own entity_configs" on "public"."entity_configs";

drop policy "User can delete entity_field_configs" on "public"."entity_field_configs";

drop policy "User can insert entity_field_configs" on "public"."entity_field_configs";

drop policy "User can update entity_field_configs" on "public"."entity_field_configs";

alter table "public"."entity_field_configs" drop constraint "value_extractor_schema_check";

create table "public"."value_extractor_config__adjacent_field" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "value_picker_rule" text not null,
    "allow_manual_edit" boolean not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null
);


alter table "public"."value_extractor_config__adjacent_field" enable row level security;

create table "public"."value_extractor_config__aggregation" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "aggregation_type" text not null,
    "dataset_id" uuid not null,
    "dataset_field_id" uuid not null,
    "filter" jsonb
);


alter table "public"."value_extractor_config__aggregation" enable row level security;

create table "public"."value_extractor_config__manual_entry" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "entity_field_config_id" uuid not null,
    "allow_manual_edit" boolean not null
);


alter table "public"."value_extractor_config__manual_entry" enable row level security;

alter table "public"."entity_field_configs" drop column "value_extractor";

alter table "public"."entity_field_configs" add column "extractor_type" text not null;

CREATE UNIQUE INDEX value_extractor_config__adjacent_field_pkey ON public.value_extractor_config__adjacent_field USING btree (id);

CREATE UNIQUE INDEX value_extractor_config__aggregation_pkey ON public.value_extractor_config__aggregation USING btree (id);

CREATE UNIQUE INDEX value_extractor_config__manual_entry_pkey ON public.value_extractor_config__manual_entry USING btree (id);

alter table "public"."value_extractor_config__adjacent_field" add constraint "value_extractor_config__adjacent_field_pkey" PRIMARY KEY using index "value_extractor_config__adjacent_field_pkey";

alter table "public"."value_extractor_config__aggregation" add constraint "value_extractor_config__aggregation_pkey" PRIMARY KEY using index "value_extractor_config__aggregation_pkey";

alter table "public"."value_extractor_config__manual_entry" add constraint "value_extractor_config__manual_entry_pkey" PRIMARY KEY using index "value_extractor_config__manual_entry_pkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_extractor_type_check" CHECK ((extractor_type = ANY (ARRAY['adjacent_field'::text, 'manual_entry'::text, 'aggregation'::text]))) not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_extractor_type_check";

alter table "public"."value_extractor_config__adjacent_field" add constraint "value_extractor_config__adjacent_fi_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor_config__adjacent_field" validate constraint "value_extractor_config__adjacent_fi_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__adjacent_field" add constraint "value_extractor_config__adjacent_field_value_picker_rule_check" CHECK ((value_picker_rule = ANY (ARRAY['most_frequent'::text, 'first'::text]))) not valid;

alter table "public"."value_extractor_config__adjacent_field" validate constraint "value_extractor_config__adjacent_field_value_picker_rule_check";

alter table "public"."value_extractor_config__aggregation" add constraint "value_extractor_config__aggregation_aggregation_type_check" CHECK ((aggregation_type = ANY (ARRAY['sum'::text, 'max'::text, 'count'::text]))) not valid;

alter table "public"."value_extractor_config__aggregation" validate constraint "value_extractor_config__aggregation_aggregation_type_check";

alter table "public"."value_extractor_config__aggregation" add constraint "value_extractor_config__aggregation_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor_config__aggregation" validate constraint "value_extractor_config__aggregation_entity_field_config_id_fkey";

alter table "public"."value_extractor_config__manual_entry" add constraint "value_extractor_config__manual_entr_entity_field_config_id_fkey" FOREIGN KEY (entity_field_config_id) REFERENCES entity_field_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."value_extractor_config__manual_entry" validate constraint "value_extractor_config__manual_entr_entity_field_config_id_fkey";

grant delete on table "public"."value_extractor_config__adjacent_field" to "anon";

grant insert on table "public"."value_extractor_config__adjacent_field" to "anon";

grant references on table "public"."value_extractor_config__adjacent_field" to "anon";

grant select on table "public"."value_extractor_config__adjacent_field" to "anon";

grant trigger on table "public"."value_extractor_config__adjacent_field" to "anon";

grant truncate on table "public"."value_extractor_config__adjacent_field" to "anon";

grant update on table "public"."value_extractor_config__adjacent_field" to "anon";

grant delete on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant insert on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant references on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant select on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant trigger on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant truncate on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant update on table "public"."value_extractor_config__adjacent_field" to "authenticated";

grant delete on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant insert on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant references on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant select on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant trigger on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant truncate on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant update on table "public"."value_extractor_config__adjacent_field" to "service_role";

grant delete on table "public"."value_extractor_config__aggregation" to "anon";

grant insert on table "public"."value_extractor_config__aggregation" to "anon";

grant references on table "public"."value_extractor_config__aggregation" to "anon";

grant select on table "public"."value_extractor_config__aggregation" to "anon";

grant trigger on table "public"."value_extractor_config__aggregation" to "anon";

grant truncate on table "public"."value_extractor_config__aggregation" to "anon";

grant update on table "public"."value_extractor_config__aggregation" to "anon";

grant delete on table "public"."value_extractor_config__aggregation" to "authenticated";

grant insert on table "public"."value_extractor_config__aggregation" to "authenticated";

grant references on table "public"."value_extractor_config__aggregation" to "authenticated";

grant select on table "public"."value_extractor_config__aggregation" to "authenticated";

grant trigger on table "public"."value_extractor_config__aggregation" to "authenticated";

grant truncate on table "public"."value_extractor_config__aggregation" to "authenticated";

grant update on table "public"."value_extractor_config__aggregation" to "authenticated";

grant delete on table "public"."value_extractor_config__aggregation" to "service_role";

grant insert on table "public"."value_extractor_config__aggregation" to "service_role";

grant references on table "public"."value_extractor_config__aggregation" to "service_role";

grant select on table "public"."value_extractor_config__aggregation" to "service_role";

grant trigger on table "public"."value_extractor_config__aggregation" to "service_role";

grant truncate on table "public"."value_extractor_config__aggregation" to "service_role";

grant update on table "public"."value_extractor_config__aggregation" to "service_role";

grant delete on table "public"."value_extractor_config__manual_entry" to "anon";

grant insert on table "public"."value_extractor_config__manual_entry" to "anon";

grant references on table "public"."value_extractor_config__manual_entry" to "anon";

grant select on table "public"."value_extractor_config__manual_entry" to "anon";

grant trigger on table "public"."value_extractor_config__manual_entry" to "anon";

grant truncate on table "public"."value_extractor_config__manual_entry" to "anon";

grant update on table "public"."value_extractor_config__manual_entry" to "anon";

grant delete on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant insert on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant references on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant select on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant trigger on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant truncate on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant update on table "public"."value_extractor_config__manual_entry" to "authenticated";

grant delete on table "public"."value_extractor_config__manual_entry" to "service_role";

grant insert on table "public"."value_extractor_config__manual_entry" to "service_role";

grant references on table "public"."value_extractor_config__manual_entry" to "service_role";

grant select on table "public"."value_extractor_config__manual_entry" to "service_role";

grant trigger on table "public"."value_extractor_config__manual_entry" to "service_role";

grant truncate on table "public"."value_extractor_config__manual_entry" to "service_role";

grant update on table "public"."value_extractor_config__manual_entry" to "service_role";

create policy "User can DELETE entity_configs"
on "public"."entity_configs"
as permissive
for delete
to authenticated
using ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can INSERT entity_configs"
on "public"."entity_configs"
as permissive
for insert
to authenticated
with check ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can SELECT entity_configs"
on "public"."entity_configs"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can UPDATE entity_configs"
on "public"."entity_configs"
as permissive
for update
to authenticated
with check ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can DELETE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can INSERT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can UPDATE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for update
to authenticated
with check ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can DELETE value_extractor_config__adjacent_field"
on "public"."value_extractor_config__adjacent_field"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor_config__adjacent_field"
on "public"."value_extractor_config__adjacent_field"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor_config__adjacent_field"
on "public"."value_extractor_config__adjacent_field"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor_config__adjacent_field"
on "public"."value_extractor_config__adjacent_field"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractor_config__aggregation"
on "public"."value_extractor_config__aggregation"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor_config__aggregation"
on "public"."value_extractor_config__aggregation"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor_config__aggregation"
on "public"."value_extractor_config__aggregation"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor_config__aggregation"
on "public"."value_extractor_config__aggregation"
as permissive
for update
to authenticated
with check (true);


create policy "User can DELETE value_extractor_config__manual_entry"
on "public"."value_extractor_config__manual_entry"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT value_extractor_config__manual_entry"
on "public"."value_extractor_config__manual_entry"
as permissive
for insert
to authenticated
with check (true);


create policy "User can SELECT value_extractor_config__manual_entry"
on "public"."value_extractor_config__manual_entry"
as permissive
for select
to authenticated
using (true);


create policy "User can UPDATE value_extractor_config__manual_entry"
on "public"."value_extractor_config__manual_entry"
as permissive
for update
to authenticated
with check (true);


CREATE TRIGGER tr_value_extractor_config__adjacent_field_set_updated_at BEFORE UPDATE ON public.value_extractor_config__adjacent_field FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractor_config__aggregation_set_updated_at BEFORE UPDATE ON public.value_extractor_config__aggregation FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_value_extractor_config__manual_entry_set_updated_at BEFORE UPDATE ON public.value_extractor_config__manual_entry FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();


