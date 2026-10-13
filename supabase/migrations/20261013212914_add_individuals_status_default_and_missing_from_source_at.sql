alter table "public"."individuals" add column "missing_from_source_at" timestamp with time zone;

alter table "public"."individuals" alter column "status" set default 'active'::text;

