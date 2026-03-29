drop policy "User can select catalog_entries__open_data" on "public"."catalog_entries__open_data";

alter table "public"."catalog_entries__open_data" drop constraint "unique_dataset_pipeline";

drop index if exists "public"."unique_dataset_pipeline";


  create table "public"."catalog_entries__dataset_column" (
    "id" uuid not null default gen_random_uuid(),
    "catalog_entry_id" uuid not null,
    "column_name" text not null,
    "display_order" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "original_data_type" text not null,
    "cast_data_type" public.datasets__duckdb_data_type not null
      );


alter table "public"."catalog_entries__dataset_column" enable row level security;

alter table "public"."catalog_entries__open_data" drop column "dataset_name";

alter table "public"."catalog_entries__open_data" add column "display_name" text not null;

alter table "public"."catalog_entries__open_data" add column "parquet_file_name" text not null;

CREATE UNIQUE INDEX catalog_entries__dataset_column_pkey ON public.catalog_entries__dataset_column USING btree (id);

CREATE UNIQUE INDEX unique_parquet_file_pipeline ON public.catalog_entries__open_data USING btree (parquet_file_name, pipeline_name);

alter table "public"."catalog_entries__dataset_column" add constraint "catalog_entries__dataset_column_pkey" PRIMARY KEY using index "catalog_entries__dataset_column_pkey";

alter table "public"."catalog_entries__dataset_column" add constraint "catalog_entries__dataset_column_catalog_entry_id_fkey" FOREIGN KEY (catalog_entry_id) REFERENCES public.catalog_entries__open_data(id) ON DELETE CASCADE not valid;

alter table "public"."catalog_entries__dataset_column" validate constraint "catalog_entries__dataset_column_catalog_entry_id_fkey";

alter table "public"."catalog_entries__open_data" add constraint "unique_parquet_file_pipeline" UNIQUE using index "unique_parquet_file_pipeline";

grant delete on table "public"."catalog_entries__dataset_column" to "anon";

grant insert on table "public"."catalog_entries__dataset_column" to "anon";

grant references on table "public"."catalog_entries__dataset_column" to "anon";

grant select on table "public"."catalog_entries__dataset_column" to "anon";

grant trigger on table "public"."catalog_entries__dataset_column" to "anon";

grant truncate on table "public"."catalog_entries__dataset_column" to "anon";

grant update on table "public"."catalog_entries__dataset_column" to "anon";

grant delete on table "public"."catalog_entries__dataset_column" to "authenticated";

grant insert on table "public"."catalog_entries__dataset_column" to "authenticated";

grant references on table "public"."catalog_entries__dataset_column" to "authenticated";

grant select on table "public"."catalog_entries__dataset_column" to "authenticated";

grant trigger on table "public"."catalog_entries__dataset_column" to "authenticated";

grant truncate on table "public"."catalog_entries__dataset_column" to "authenticated";

grant update on table "public"."catalog_entries__dataset_column" to "authenticated";

grant delete on table "public"."catalog_entries__dataset_column" to "service_role";

grant insert on table "public"."catalog_entries__dataset_column" to "service_role";

grant references on table "public"."catalog_entries__dataset_column" to "service_role";

grant select on table "public"."catalog_entries__dataset_column" to "service_role";

grant trigger on table "public"."catalog_entries__dataset_column" to "service_role";

grant truncate on table "public"."catalog_entries__dataset_column" to "service_role";

grant update on table "public"."catalog_entries__dataset_column" to "service_role";


  create policy "User can select catalog dataset columns"
  on "public"."catalog_entries__dataset_column"
  as permissive
  for select
  to public
using (true);



  create policy "User can select open data catalog entries"
  on "public"."catalog_entries__open_data"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER tr_catalog_entries__dataset_column__set_updated_at BEFORE UPDATE ON public.catalog_entries__dataset_column FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


