CREATE UNIQUE INDEX unique_dataset_pipeline ON public.catalog_entries__open_data USING btree (dataset_name, pipeline_name);

alter table "public"."catalog_entries__open_data" add constraint "unique_dataset_pipeline" UNIQUE using index "unique_dataset_pipeline";


