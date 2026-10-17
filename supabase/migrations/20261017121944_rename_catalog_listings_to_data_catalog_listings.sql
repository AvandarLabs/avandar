-- Hand-written, not generated: `supabase db diff` cannot detect a rename. It
-- sees "catalog_listings__open_data" disappear and "data_catalog_listings"
-- appear, and proposes dropping both tables (and the dataset-column satellite)
-- and recreating them empty, which would destroy every existing catalog row
-- and dataset-column row. This migration instead renames every affected
-- object in place, so existing data, existing privileges (renaming a relation
-- does not touch its ACL), and existing row ids all survive untouched.
--
-- No FK statement is needed for `datasets__open_data_catalog_listing_id_fkey`:
-- Postgres tracks a foreign key's target by the referenced table's OID, not
-- by name, so renaming `catalog_listings__open_data` updates what that
-- constraint resolves to without touching the constraint itself. The same is
-- true of both tables' select policies: neither policy's own text names the
-- old table, so a table rename alone leaves them correct.

-- Enum types
alter type "public"."catalog_listings__open_data__access_kind" rename to "data_catalog_listings__access_kind";

alter type "public"."catalog_listings__open_data__api_service" rename to "data_catalog_listings__api_service";

-- Tables
alter table "public"."catalog_listings__open_data" rename to "data_catalog_listings";

alter table "public"."catalog_listings__dataset_column" rename to "data_catalog_listings__relation_columns";

-- Constraints on data_catalog_listings (renaming a constraint also renames
-- its backing index, where one exists)
alter table "public"."data_catalog_listings" rename constraint "catalog_listings__open_data_pkey" to "data_catalog_listings_pkey";

alter table "public"."data_catalog_listings" rename constraint "catalog_listings__open_data__pipeline_access_complete" to "data_catalog_listings__pipeline_access_complete";

alter table "public"."data_catalog_listings" rename constraint "catalog_listings__open_data__api_access_complete" to "data_catalog_listings__api_access_complete";

alter table "public"."data_catalog_listings" rename constraint "catalog_listings__open_data__cache_complete" to "data_catalog_listings__cache_complete";

alter table "public"."data_catalog_listings" rename constraint "catalog_listings__open_data__api_base_url_is_https" to "data_catalog_listings__api_base_url_is_https";

-- Constraints on data_catalog_listings__relation_columns
alter table "public"."data_catalog_listings__relation_columns" rename constraint "catalog_listings__dataset_column_pkey" to "data_catalog_listings__relation_columns_pkey";

alter table "public"."data_catalog_listings__relation_columns" rename constraint "catalog_listings__dataset_column_catalog_listing_id_fkey" to "data_catalog_listings__relation_columns_catalog_listing_id_fkey";

-- Unique index (not backing a named constraint). Dropped and recreated rather
-- than `alter index ... rename to ...`: SQLite has no `ALTER INDEX` at all,
-- and the desktop SQLite migration generator only transpiles statement forms
-- it recognizes. An index holds no data of its own, so a drop-and-recreate
-- here is lossless, unlike the table rename above.
drop index "public"."catalog_listings__open_data__api_resource_unique";

create unique index "data_catalog_listings__api_resource_unique" on "public"."data_catalog_listings" (
  "api_service",
  "api_base_url",
  "external_dataset_id",
  "api_resource_id"
);

-- Triggers
alter trigger "tr_catalog_listings__dataset_column__set_updated_at" on "public"."data_catalog_listings__relation_columns" rename to "tr_data_catalog_listings__relation_columns__set_updated_at";

alter trigger "tr_catalog_listings__open_data__set_updated_at" on "public"."data_catalog_listings" rename to "tr_data_catalog_listings__set_updated_at";
