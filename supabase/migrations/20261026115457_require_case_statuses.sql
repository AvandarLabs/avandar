alter table "public"."concepts" alter column "default_status_id" set not null;

alter table "public"."individuals" drop column "status";

alter table "public"."individuals" alter column "status_id" set not null;

alter table "public"."concept_attributes" add constraint "concept_attributes__name_not_reserved" CHECK ((lower(btrim(name)) <> 'status'::text)) not valid;

alter table "public"."concept_attributes" validate constraint "concept_attributes__name_not_reserved";

