-- Hand-written, not generated: `supabase db diff` cannot detect a rename. It
-- sees "catalog_entries__open_data" disappear and "catalog_listings__open_data"
-- appear, and proposes dropping both tables and recreating them empty, which
-- would destroy every existing catalog row and dataset-column row. This
-- migration instead renames every affected object in place, so existing data,
-- existing privileges (renaming a relation does not touch its ACL), and
-- existing row ids all survive untouched.

-- Enum types
alter type "public"."catalog_entries__open_data__access_kind" rename to "catalog_listings__open_data__access_kind";

alter type "public"."catalog_entries__open_data__api_service" rename to "catalog_listings__open_data__api_service";

-- Tables
alter table "public"."catalog_entries__open_data" rename to "catalog_listings__open_data";

alter table "public"."catalog_entries__dataset_column" rename to "catalog_listings__dataset_column";

-- Columns
alter table "public"."catalog_listings__dataset_column" rename column "catalog_entry_id" to "catalog_listing_id";

alter table "public"."datasets__open_data" rename column "catalog_entry_id" to "catalog_listing_id";

-- Constraints on catalog_listings__open_data (renaming a constraint also
-- renames its backing index, where one exists)
alter table "public"."catalog_listings__open_data" rename constraint "catalog_entries__open_data_pkey" to "catalog_listings__open_data_pkey";

alter table "public"."catalog_listings__open_data" rename constraint "catalog_entries__open_data__pipeline_access_complete" to "catalog_listings__open_data__pipeline_access_complete";

alter table "public"."catalog_listings__open_data" rename constraint "catalog_entries__open_data__api_access_complete" to "catalog_listings__open_data__api_access_complete";

alter table "public"."catalog_listings__open_data" rename constraint "catalog_entries__open_data__cache_complete" to "catalog_listings__open_data__cache_complete";

alter table "public"."catalog_listings__open_data" rename constraint "catalog_entries__open_data__api_base_url_is_https" to "catalog_listings__open_data__api_base_url_is_https";

-- Constraints on catalog_listings__dataset_column
alter table "public"."catalog_listings__dataset_column" rename constraint "catalog_entries__dataset_column_pkey" to "catalog_listings__dataset_column_pkey";

alter table "public"."catalog_listings__dataset_column" rename constraint "catalog_entries__dataset_column_catalog_entry_id_fkey" to "catalog_listings__dataset_column_catalog_listing_id_fkey";

-- FK constraint on datasets__open_data
alter table "public"."datasets__open_data" rename constraint "datasets__open_data_catalog_entry_id_fkey" to "datasets__open_data_catalog_listing_id_fkey";

-- Unique index (not backing a named constraint). Dropped and recreated
-- rather than `alter index ... rename to ...`: SQLite has no `ALTER INDEX`
-- at all, and the desktop SQLite migration generator only transpiles
-- statement forms it recognizes. An index holds no data of its own, so a
-- drop-and-recreate here is lossless, unlike the table rename above.
drop index "public"."catalog_entries__open_data__api_resource_unique";

create unique index "catalog_listings__open_data__api_resource_unique" on "public"."catalog_listings__open_data" (
  "api_service",
  "api_base_url",
  "external_dataset_id",
  "api_resource_id"
);

-- Triggers (also fixes `tr_open_data_catalog_entries__...`'s inconsistent
-- naming to match every sibling table's `tr_<table>__set_updated_at` form)
alter trigger "tr_catalog_entries__dataset_column__set_updated_at" on "public"."catalog_listings__dataset_column" rename to "tr_catalog_listings__dataset_column__set_updated_at";

alter trigger "tr_open_data_catalog_entries__set_updated_at" on "public"."catalog_listings__open_data" rename to "tr_catalog_listings__open_data__set_updated_at";

-- Policies
alter policy "User can select catalog dataset columns" on "public"."catalog_listings__dataset_column" rename to "User can select catalog listing columns";

alter policy "User can select open data catalog entries" on "public"."catalog_listings__open_data" rename to "User can select open data catalog listings";
