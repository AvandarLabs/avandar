alter table "public"."entity_configs" alter column "id" set default gen_random_uuid();

alter table "public"."entity_configs" alter column "owner_id" set default auth.uid();

alter table "public"."entity_field_configs" alter column "id" set default gen_random_uuid();


