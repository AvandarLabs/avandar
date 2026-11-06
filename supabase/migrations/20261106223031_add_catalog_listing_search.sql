create extension if not exists "pg_trgm" with schema "extensions";

alter table "public"."data_catalog_listings" add column "search_vector" tsvector generated always as (((setweight(to_tsvector('english'::regconfig, COALESCE(display_name, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, ((((COALESCE(external_organization_name, ''::text) || ' '::text) || COALESCE(external_service_name, ''::text)) || ' '::text) || COALESCE(pipeline_name, ''::text))), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, ((COALESCE(description, ''::text) || ' '::text) || COALESCE(notes, ''::text))), 'C'::"char"))) stored;

CREATE INDEX data_catalog_listings__display_name_trgm ON public.data_catalog_listings USING gin (display_name extensions.gin_trgm_ops);

CREATE INDEX data_catalog_listings__search_vector ON public.data_catalog_listings USING gin (search_vector);

set check_function_bodies = off;

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


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer) to "authenticated";
