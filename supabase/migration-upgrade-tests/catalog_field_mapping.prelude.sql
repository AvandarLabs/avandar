-- The catalog the way production holds it before organization levels: the
-- listings table with `external_organization_name` and none of the new
-- columns, no drives table, and the search column, its index, and the
-- three-argument search RPC from `20261106223031_add_catalog_listing_search`,
-- all reading `external_organization_name`. Then a listing of each kind,
-- which the migration must keep. The identifiers are `pgtap-fixture`-prefixed.
begin;

-- What this migration builds, removed first: the search column that reads
-- the new columns, and the RPCs with their new signatures.
alter table public.data_catalog_listings drop column search_vector;

drop function public.rpc_data_catalog_listings__search (text, integer, integer, text[], text[], text[], text[]);

drop function public.rpc_data_catalog_listings__search_facets (text, text[], text[], text[], text[]);

alter table public.data_catalog_listings
  drop column drive_id,
  drop column organization2_name,
  drop column organization3_name,
  drop column organization4_name,
  drop column domains,
  drop column tags,
  drop column source_metadata;

drop table public.data_catalog_drives;

alter table public.data_catalog_listings
  rename column organization1_name to external_organization_name;

-- The search column, its index, and the search RPC exactly as
-- `20261106223031_add_catalog_listing_search` created them. The column reads
-- `external_organization_name`, so the migration must drop it before the
-- rename.
alter table "public"."data_catalog_listings" add column "search_vector" tsvector generated always as (((setweight(to_tsvector('english'::regconfig, COALESCE(display_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, ((((COALESCE(external_organization_name, ''::text) || ' '::text) || COALESCE(external_service_name, ''::text)) || ' '::text) || COALESCE(pipeline_name, ''::text))), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, ((COALESCE(description, ''::text) || ' '::text) || COALESCE(notes, ''::text))), 'C'::"char"))) stored;

CREATE INDEX data_catalog_listings__search_vector ON public.data_catalog_listings USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, display_name text, external_organization_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, total_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.5'
AS $function$
declare
  v_query text := nullif(btrim(p_query), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_ts_query tsquery;
begin
  if v_query is null then
    return query
    select
      listing.id,
      listing.display_name,
      listing.external_organization_name,
      listing.pipeline_name,
      listing.is_workspace_loadable,
      listing.is_invalid,
      count(*) over ()
    from public.data_catalog_listings listing
    order by listing.display_name, listing.id
    limit v_limit
    offset v_offset;
    return;
  end if;

  v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);

  return query
  select
    listing.id,
    listing.display_name,
    listing.external_organization_name,
    listing.pipeline_name,
    listing.is_workspace_loadable,
    listing.is_invalid,
    count(*) over ()
  from public.data_catalog_listings listing
  where
    listing.search_vector @@ v_ts_query or
    v_query operator(extensions.<%) listing.display_name
  order by
    ts_rank(listing.search_vector, v_ts_query) +
    extensions.word_similarity(v_query, listing.display_name) desc,
    listing.display_name,
    listing.id
  limit v_limit
  offset v_offset;
end;
$function$
;

revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer) to "authenticated";

insert into public.data_catalog_listings
  (display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values
  ('pgtap-fixture api', 'City of New York', 'api_resource', 'socrata',
   'https://pgtap-fixture.invalid', 'pgtap-fixture-rename',
   'pgtap-fixture-rename', 'CSV');

insert into public.data_catalog_listings
  (display_name, external_organization_name, parquet_file_name,
   pipeline_name, pipeline_run_id)
values
  ('pgtap-fixture parquet', 'World Bank', 'pgtap-fixture-rename.parquet',
   'pgtap-fixture-pipeline', 'run-1');
