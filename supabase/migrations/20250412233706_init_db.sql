create table "public"."entity_configs" (
    "id" uuid not null,
    "owner_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."entity_configs" enable row level security;

create table "public"."entity_field_configs" (
    "id" uuid not null,
    "entity_config_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "class" text not null,
    "base_type" text not null,
    "value_extractor" jsonb not null,
    "is_title_field" boolean not null default false,
    "is_id_field" boolean not null default false,
    "is_array" boolean,
    "allow_manual_edit" boolean
);


alter table "public"."entity_field_configs" enable row level security;

CREATE UNIQUE INDEX entity_configs_pkey ON public.entity_configs USING btree (id);

CREATE UNIQUE INDEX entity_field_configs_pkey ON public.entity_field_configs USING btree (id);

alter table "public"."entity_configs" add constraint "entity_configs_pkey" PRIMARY KEY using index "entity_configs_pkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_pkey" PRIMARY KEY using index "entity_field_configs_pkey";

alter table "public"."entity_configs" add constraint "entity_configs_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."entity_configs" validate constraint "entity_configs_owner_id_fkey";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_class_check" CHECK ((class = ANY (ARRAY['dimension'::text, 'metric'::text]))) not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_class_check";

alter table "public"."entity_field_configs" add constraint "entity_field_configs_entity_config_id_fkey" FOREIGN KEY (entity_config_id) REFERENCES entity_configs(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."entity_field_configs" validate constraint "entity_field_configs_entity_config_id_fkey";

alter table "public"."entity_field_configs" add constraint "id_field_is_dimension" CHECK ((is_id_field AND (class = 'dimension'::text))) not valid;

alter table "public"."entity_field_configs" validate constraint "id_field_is_dimension";

alter table "public"."entity_field_configs" add constraint "title_field_is_dimension" CHECK ((is_title_field AND (class = 'dimension'::text))) not valid;

alter table "public"."entity_field_configs" validate constraint "title_field_is_dimension";

alter table "public"."entity_field_configs" add constraint "value_extractor_schema_check" CHECK (
CASE class
    WHEN 'dimension'::text THEN (((jsonb_typeof(value_extractor) = 'object'::text) AND (((value_extractor ->> 'extractorType'::text) = 'adjacentField'::text) AND ((value_extractor ->> 'valuePickerRule'::text) = ANY (ARRAY['mostFrequent'::text, 'first'::text])) AND (((value_extractor ->> 'allowManualEdit'::text))::boolean IS NOT NULL) AND ((value_extractor ->> 'dataset'::text) IS NOT NULL) AND ((value_extractor ->> 'field'::text) IS NOT NULL))) OR (((value_extractor ->> 'extractorType'::text) = 'manualEntry'::text) AND (((value_extractor ->> 'allowManualEdit'::text))::boolean = true)))
    WHEN 'metric'::text THEN ((jsonb_typeof(value_extractor) = 'object'::text) AND ((value_extractor ->> 'extractorType'::text) = 'aggregation'::text) AND ((value_extractor ->> 'aggregation'::text) = ANY (ARRAY['sum'::text, 'max'::text, 'count'::text])) AND ((value_extractor ->> 'dataset'::text) IS NOT NULL) AND ((value_extractor ->> 'field'::text) IS NOT NULL) AND ((value_extractor ->> 'filter'::text) IS NOT NULL))
    ELSE NULL::boolean
END) not valid;

alter table "public"."entity_field_configs" validate constraint "value_extractor_schema_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.entity_field_configs__validate_title_id_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    -- Count title fields for this entity_config
    if (
        select count(*) from public.entity_field_configs
        where entity_config_id = new.entity_config_id and is_title_field
    ) != 1 then
        raise exception 'There must be exactly one title field per entity config';
    end if;

    -- Count id fields for this entity_config
    if (
        select count(*) from public.entity_field_configs
        where entity_config_id = new.entity_config_id and is_id_field
    ) != 1 then
        raise exception 'There must be exactly one id field per entity config';
    end if;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = (now() at time zone 'UTC');
    return new;
end;
$function$
;

grant delete on table "public"."entity_configs" to "anon";

grant insert on table "public"."entity_configs" to "anon";

grant references on table "public"."entity_configs" to "anon";

grant select on table "public"."entity_configs" to "anon";

grant trigger on table "public"."entity_configs" to "anon";

grant truncate on table "public"."entity_configs" to "anon";

grant update on table "public"."entity_configs" to "anon";

grant delete on table "public"."entity_configs" to "authenticated";

grant insert on table "public"."entity_configs" to "authenticated";

grant references on table "public"."entity_configs" to "authenticated";

grant select on table "public"."entity_configs" to "authenticated";

grant trigger on table "public"."entity_configs" to "authenticated";

grant truncate on table "public"."entity_configs" to "authenticated";

grant update on table "public"."entity_configs" to "authenticated";

grant delete on table "public"."entity_configs" to "service_role";

grant insert on table "public"."entity_configs" to "service_role";

grant references on table "public"."entity_configs" to "service_role";

grant select on table "public"."entity_configs" to "service_role";

grant trigger on table "public"."entity_configs" to "service_role";

grant truncate on table "public"."entity_configs" to "service_role";

grant update on table "public"."entity_configs" to "service_role";

grant delete on table "public"."entity_field_configs" to "anon";

grant insert on table "public"."entity_field_configs" to "anon";

grant references on table "public"."entity_field_configs" to "anon";

grant select on table "public"."entity_field_configs" to "anon";

grant trigger on table "public"."entity_field_configs" to "anon";

grant truncate on table "public"."entity_field_configs" to "anon";

grant update on table "public"."entity_field_configs" to "anon";

grant delete on table "public"."entity_field_configs" to "authenticated";

grant insert on table "public"."entity_field_configs" to "authenticated";

grant references on table "public"."entity_field_configs" to "authenticated";

grant select on table "public"."entity_field_configs" to "authenticated";

grant trigger on table "public"."entity_field_configs" to "authenticated";

grant truncate on table "public"."entity_field_configs" to "authenticated";

grant update on table "public"."entity_field_configs" to "authenticated";

grant delete on table "public"."entity_field_configs" to "service_role";

grant insert on table "public"."entity_field_configs" to "service_role";

grant references on table "public"."entity_field_configs" to "service_role";

grant select on table "public"."entity_field_configs" to "service_role";

grant trigger on table "public"."entity_field_configs" to "service_role";

grant truncate on table "public"."entity_field_configs" to "service_role";

grant update on table "public"."entity_field_configs" to "service_role";

create policy "User can delete their own entity_configs"
on "public"."entity_configs"
as permissive
for delete
to authenticated
using ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can insert entity_configs"
on "public"."entity_configs"
as permissive
for insert
to authenticated
with check ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can see their own entity_configs"
on "public"."entity_configs"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can update their own entity_configs"
on "public"."entity_configs"
as permissive
for update
to authenticated
with check ((( SELECT auth.uid() AS uid) = owner_id));


create policy "User can delete entity_field_configs"
on "public"."entity_field_configs"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can insert entity_field_configs"
on "public"."entity_field_configs"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can see entity_field_configs"
on "public"."entity_field_configs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


create policy "User can update entity_field_configs"
on "public"."entity_field_configs"
as permissive
for update
to authenticated
with check ((EXISTS ( SELECT 1
   FROM entity_configs
  WHERE ((entity_configs.id = entity_field_configs.entity_config_id) AND (entity_configs.owner_id = ( SELECT auth.uid() AS uid))))));


CREATE TRIGGER tr_entity_config__set_updated_at BEFORE UPDATE ON public.entity_configs FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_config__set_updated_at BEFORE UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION util__set_updated_at();

CREATE TRIGGER tr_entity_field_configs__validate_title_id_fields AFTER INSERT OR UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION entity_field_configs__validate_title_id_fields();


