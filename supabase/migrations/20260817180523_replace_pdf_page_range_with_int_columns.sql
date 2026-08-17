alter table "public"."datasets__pdf_file" drop column "page_range";

alter table "public"."datasets__pdf_file" add column "page_range_end" integer;

alter table "public"."datasets__pdf_file" add column "page_range_start" integer;
