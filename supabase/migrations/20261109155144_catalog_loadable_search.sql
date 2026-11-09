-- Load pg_trgm into this session before a function below sets
-- `pg_trgm.word_similarity_threshold`. Until the library is loaded the
-- parameter is an unknown placeholder, and only a superuser may attach one to
-- a function, which the hosted `postgres` role is not. Calling any pg_trgm
-- function loads it and registers the parameter as user-settable.
do $$
begin
  perform extensions.word_similarity('', '');
end
$$;

CREATE INDEX data_catalog_listings__display_name_trgm_loadable ON public.data_catalog_listings USING gin (display_name extensions.gin_trgm_ops) WHERE (is_workspace_loadable AND (NOT is_invalid));

CREATE INDEX data_catalog_listings__search_vector_loadable ON public.data_catalog_listings USING gin (search_vector) WHERE (is_workspace_loadable AND (NOT is_invalid));

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__facets_for_one_search(p_query text, p_is_loadable_only boolean, p_count_cap integer)
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    matches as materialized (
      select
        *
      from
        public.data_catalog_listings__search_matches (
          p_query,
          '{}',
          '{}',
          'any',
          coalesce(p_is_loadable_only, false),
          '{}',
          '{}',
          '{}',
          null,
          p_count_cap + 1,
          0
        )
    ),
    is_over_cap as (
      select
        count(*) > p_count_cap as value
      from
        matches
    ),
    exact as (
      select
        *
      from
        matches
      where
        not (
          select
            is_over_cap.value
          from
            is_over_cap
        )
    ),
    catalog_option as (
      select
        facet_count.facet,
        facet_count.value,
        sum(facet_count.listing_count)::bigint as rank_count
      from
        public.data_catalog_facet_counts facet_count
      where
        facet_count.is_loadable_only = coalesce(p_is_loadable_only, false) and
        facet_count.value is not null and
        facet_count.facet in (
          'source',
          'format',
          'organization2',
          'organization2_label',
          'domain',
          'tag'
        )
      group by
        facet_count.facet,
        facet_count.value
    ),
    facet_option as (
      select
        'source' as facet,
        exact.organization1_name as value,
        count(*)::bigint as listing_count,
        count(*)::bigint as rank_count,
        null::integer as value_limit
      from
        exact
      where
        exact.organization1_name is not null
      group by
        exact.organization1_name
      union all
      select
        'format',
        exact.file_format,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
      where
        exact.file_format is not null
      group by
        exact.file_format
      union all
      select
        'organization2',
        exact.organization2_name,
        count(*)::bigint,
        count(*)::bigint,
        50
      from
        exact
      where
        exact.organization2_name is not null
      group by
        exact.organization2_name
      union all
      select
        'organization2_label',
        drive.organization2_label,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
        join public.data_catalog_drives drive on drive.id = exact.drive_id
      where
        exact.organization2_name is not null and
        drive.organization2_label is not null
      group by
        drive.organization2_label
      union all
      select
        'domain',
        listing_domain.value,
        count(*)::bigint,
        count(*)::bigint,
        null::integer
      from
        exact
        cross join lateral (
          select distinct
            unnest(exact.domains)
        ) as listing_domain (value)
      where
        listing_domain.value is not null
      group by
        listing_domain.value
      union all
      select
        'tag',
        listing_tag.value,
        count(*)::bigint,
        count(*)::bigint,
        50
      from
        exact
        cross join lateral (
          select distinct
            unnest(exact.tags)
        ) as listing_tag (value)
      where
        listing_tag.value is not null
      group by
        listing_tag.value
      union all
      select
        catalog_option.facet,
        catalog_option.value,
        null::bigint,
        catalog_option.rank_count,
        case
          when catalog_option.facet in ('organization2', 'tag') then 50
        end
      from
        catalog_option
      where
        (
          select
            is_over_cap.value
          from
            is_over_cap
        )
    ),
    ranked_option as (
      select
        facet_option.facet,
        facet_option.value,
        facet_option.listing_count,
        facet_option.rank_count,
        row_number() over (
          partition by
            facet_option.facet
          order by
            facet_option.rank_count desc,
            facet_option.value
        ) as value_rank,
        facet_option.value_limit
      from
        facet_option
    ),
    ordered_row as (
    select
      ranked_option.facet,
      ranked_option.value,
      ranked_option.listing_count,
      case ranked_option.facet
        when 'source' then 1
        when 'format' then 2
        when 'organization2' then 3
        when 'organization2_label' then 4
        when 'domain' then 5
        when 'tag' then 6
      end as facet_order,
      ranked_option.value_rank
    from
      ranked_option
    where
      ranked_option.value_limit is null or
      ranked_option.value_rank <= ranked_option.value_limit
    union all
    select
      'updated_within',
      update_window.name,
      case
        when not (
          select
            is_over_cap.value
          from
            is_over_cap
        ) then coalesce(window_count.listing_count, 0)
      end,
      7,
      update_window.window_order
    from
      unnest(
        array['any', 'past_month', 'past_year', 'over_a_year']
      ) with ordinality as update_window (name, window_order)
      left join (
        select
          update_window.name,
          count(*)::bigint as listing_count
        from
          exact
          cross join unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
        where
          public.data_catalog_listings__is_updated_within (exact.last_updated_at, update_window.name)
        group by
          update_window.name
      ) as window_count on window_count.name = update_window.name
  )
select
  ordered_row.facet,
  ordered_row.value,
  ordered_row.listing_count
from
  ordered_row
order by
  ordered_row.facet_order,
  ordered_row.value_rank;
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_count_cap integer DEFAULT 5000)
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 5000), 1), 5000);
  v_updated_within text := coalesce(p_updated_within, 'any');
  v_is_loadable_only boolean := coalesce(p_is_loadable_only, false);
  v_sources text[] := coalesce(p_sources, '{}');
  v_formats text[] := coalesce(p_formats, '{}');
  v_organization2_names text[] := coalesce(p_organization2_names, '{}');
  v_domains text[] := coalesce(p_domains, '{}');
  v_tags text[] := coalesce(p_tags, '{}');
  v_is_unsearched boolean := nullif(btrim(p_query), '') is null;
  v_has_sources boolean := cardinality(coalesce(p_sources, '{}')) > 0;
  v_has_formats boolean := cardinality(coalesce(p_formats, '{}')) > 0;
  v_has_organization2 boolean := cardinality(coalesce(p_organization2_names, '{}')) > 0;
  v_has_domains boolean := cardinality(coalesce(p_domains, '{}')) > 0;
  v_has_tags boolean := cardinality(coalesce(p_tags, '{}')) > 0;
  v_has_window boolean := coalesce(p_updated_within, 'any') <> 'any';
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  -- One read of the matches, shared by every facet. This is the search
  -- with no publisher, topic, keyword, format, or freshness chosen: each
  -- facet is counting that same set. A chosen filter still takes the
  -- per-facet path below, because that facet has to ignore its own filter.
  if not v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_window or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      *
    from
      public.data_catalog_listings__facets_for_one_search (
        p_query,
        v_is_loadable_only,
        v_count_cap
      );
  else
  return query
  select
    'source',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'source',
      v_is_unsearched and not (
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_domains or
        v_has_tags
      ),
      '{}',
      v_sources,
      null,
      null,
      v_count_cap,
      p_query,
      '{}',
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      v_tags
    ) as option;

  return query
  select
    'format',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'format',
      v_is_unsearched and not (
        v_has_sources or
        v_has_window or
        v_has_organization2 or
        v_has_domains or
        v_has_tags
      ),
      '{}',
      v_formats,
      null,
      null,
      v_count_cap,
      p_query,
      v_sources,
      '{}',
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      v_tags
    ) as option;

  return query
  select
    level2_facet.name,
    option.value,
    option.listing_count
  from
    unnest(array['organization2', 'organization2_label']) as level2_facet (name)
    cross join lateral public.data_catalog_listings__facet_value_rows (
      level2_facet.name,
      v_is_unsearched and not (
        v_has_formats or
        v_has_window or
        v_has_domains or
        v_has_tags
      ),
      v_sources,
      case
        when level2_facet.name = 'organization2' then v_organization2_names
        else '{}'
      end,
      case
        when level2_facet.name = 'organization2' and not v_has_sources then 50
      end,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      '{}',
      v_domains,
      v_tags
    ) as option;

  return query
  select
    'domain',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'domain',
      v_is_unsearched and not (
        v_has_sources or
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_tags
      ),
      '{}',
      v_domains,
      null,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      '{}',
      v_tags
    ) as option;

  return query
  select
    'tag',
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'tag',
      v_is_unsearched and not (
        v_has_sources or
        v_has_formats or
        v_has_window or
        v_has_organization2 or
        v_has_domains
      ),
      '{}',
      v_tags,
      50,
      null,
      v_count_cap,
      p_query,
      v_sources,
      v_formats,
      v_updated_within,
      v_is_loadable_only,
      v_organization2_names,
      v_domains,
      '{}'
    ) as option;

  if v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      'updated_within',
      update_window.name,
      coalesce(facet_count.listing_count, 0)
    from
      unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      left join public.data_catalog_facet_counts facet_count on facet_count.facet = 'updated_within' and
      facet_count.value = update_window.name and
      facet_count.is_loadable_only = v_is_loadable_only;
  else
    return query
    with
      counted as materialized (
        select
          *
        from
          public.data_catalog_listings__count_facet (
            'updated_within',
            p_query,
            v_sources,
            v_formats,
            'any',
            v_is_loadable_only,
            v_organization2_names,
            v_domains,
            v_tags,
            v_count_cap
          )
      ),
      is_counted as (
        select
          coalesce(bool_or(counted.is_counted), true) as value
        from
          counted
      )
    select
      'updated_within',
      update_window.name,
      case
        when (
          select
            is_counted.value
          from
            is_counted
        ) then coalesce(counted.listing_count, 0)
      end
    from
      unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      left join counted on counted.value = update_window.name;
  end if;

  end if;

  if v_is_unsearched and not (
    v_has_sources or
    v_has_formats or
    v_has_window or
    v_has_organization2 or
    v_has_domains or
    v_has_tags
  ) then
    return query
    select
      'unloadable',
      null,
      coalesce(
        (
          select
            facet_count.listing_count
          from
            public.data_catalog_facet_counts facet_count
          where
            facet_count.facet = 'unloadable'
        ),
        0
      );
  else
    return query
    select
      'unloadable',
      null,
      case
        when coalesce(bool_or(counted.is_counted), true) then coalesce(sum(counted.listing_count), 0)::bigint
      end
    from
      public.data_catalog_listings__count_facet (
        'unloadable',
        p_query,
        v_sources,
        v_formats,
        v_updated_within,
        false,
        v_organization2_names,
        v_domains,
        v_tags,
        v_count_cap
      ) as counted;
  end if;

  return query
  select
    'catalog',
    null,
    coalesce(
      (
        select
          facet_count.listing_count
        from
          public.data_catalog_facet_counts facet_count
        where
          facet_count.facet = 'catalog'
      ),
      (
        select
          count(*)
        from
          public.data_catalog_listings
      )
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text DEFAULT NULL::text, p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, domains text[], tags text[], drive_id uuid, score real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET "pg_trgm.word_similarity_threshold" TO '0.5'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_query text := nullif(btrim(p_query), '');
  v_sources text[] := coalesce(p_sources, '{}');
  v_formats text[] := coalesce(p_formats, '{}');
  v_updated_within text := coalesce(p_updated_within, 'any');
  v_is_loadable_only boolean := coalesce(p_is_loadable_only, false);
  v_organization2_names text[] := coalesce(p_organization2_names, '{}');
  v_domains text[] := coalesce(p_domains, '{}');
  v_tags text[] := coalesce(p_tags, '{}');
  v_updated_window tstzrange;
  v_ts_query tsquery;
  -- A full page of whole-word matches. Past this, name similarity is skipped.
  v_name_similarity_limit constant integer := 50;
  v_skip_name_similarity boolean := false;
begin
  if v_updated_within not in ('any', 'past_month', 'past_year', 'over_a_year') then
    raise exception 'Unknown catalog update window: %', p_updated_within
    using
      errcode = '22023';
  end if;

  if p_sort_by is not null and p_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  v_updated_window := public.data_catalog_listings__updated_window (v_updated_within);

  if v_query is not null then
    v_ts_query := websearch_to_tsquery('english'::regconfig, v_query);
  end if;

  if v_ts_query is not null and numnode(v_ts_query) > 0 then
    select
      count(*) >= v_name_similarity_limit
    into
      v_skip_name_similarity
    from
      (
        select
          1
        from
          public.data_catalog_listings listing
        where
          listing.search_vector @@ v_ts_query and
          (
            cardinality(v_sources) = 0 or
            listing.organization1_name = any (v_sources)
          ) and
          (
            cardinality(v_formats) = 0 or
            case
              when listing.api_resource_format is not null then upper(listing.api_resource_format)
              when listing.parquet_file_name is not null then 'PARQUET'
            end = any (v_formats)
          ) and
          (
            v_updated_within = 'any' or
            (
              coalesce(listing.date_of_last_update, listing.date_of_last_sync) >= coalesce(lower(v_updated_window), '-infinity'::timestamptz) and
              coalesce(listing.date_of_last_update, listing.date_of_last_sync) < coalesce(upper(v_updated_window), 'infinity'::timestamptz)
            )
          ) and
          (
            not v_is_loadable_only or
            (
              listing.is_workspace_loadable and
              not listing.is_invalid
            )
          ) and
          (
            cardinality(v_organization2_names) = 0 or
            listing.organization2_name = any (v_organization2_names)
          ) and
          (
            cardinality(v_domains) = 0 or
            listing.domains && v_domains
          ) and
          (
            cardinality(v_tags) = 0 or
            listing.tags && v_tags
          )
        limit
          v_name_similarity_limit
      ) as name_similarity_probe;
  end if;

  return query
  select
    listing.id,
    listing.display_name,
    listing.organization1_name,
    listing.organization2_name,
    listing.organization3_name,
    listing.organization4_name,
    listing.pipeline_name,
    listing.is_workspace_loadable,
    listing.is_invalid,
    listing_fact.file_format,
    listing_fact.last_updated_at,
    listing.domains,
    listing.tags,
    listing.drive_id,
    listing_fact.score
  from
    public.data_catalog_listings listing
    cross join lateral (
      select
        -- These two expressions are the ones the listings' format and
        -- last-update indexes are built on. Change them together.
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        case
          when v_query is null then 0::real
          else ts_rank(listing.search_vector, v_ts_query) + extensions.word_similarity(v_query, listing.display_name)
        end as score
    ) as listing_fact
  where
    (
      v_query is null or
      listing.search_vector @@ v_ts_query or
      (
        not v_skip_name_similarity and
        v_query operator(extensions.<%) listing.display_name
      )
    ) and
    (
      cardinality(v_sources) = 0 or
      listing.organization1_name = any (v_sources)
    ) and
    (
      cardinality(v_formats) = 0 or
      listing_fact.file_format = any (v_formats)
    ) and
    (
      v_updated_within = 'any' or
      (
        listing_fact.last_updated_at >= coalesce(lower(v_updated_window), '-infinity'::timestamptz) and
        listing_fact.last_updated_at < coalesce(upper(v_updated_window), 'infinity'::timestamptz)
      )
    ) and
    (
      not v_is_loadable_only or
      (
        listing.is_workspace_loadable and
        not listing.is_invalid
      )
    ) and
    (
      cardinality(v_organization2_names) = 0 or
      listing.organization2_name = any (v_organization2_names)
    ) and
    (
      cardinality(v_domains) = 0 or
      listing.domains && v_domains
    ) and
    (
      cardinality(v_tags) = 0 or
      listing.tags && v_tags
    )
  order by
    case
      when p_sort_by = 'relevance' then listing_fact.score
    end desc nulls last,
    case
      when p_sort_by = 'updated' then (
        case
          when v_query is null then listing_fact.last_updated_at
          -- A search finds its few matches through its own indexes. Adding
          -- zero hides the last-update index from this sort, or Postgres
          -- may walk that index looking for matches instead.
          else listing_fact.last_updated_at + interval '0 seconds'
        end
      )
    end desc nulls last,
    case
      when p_sort_by is not null then listing.display_name
    end,
    case
      when p_sort_by is not null then listing.id
    end
  limit
    p_limit
  offset
    coalesce(p_offset, 0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_sort_by text DEFAULT NULL::text, p_count_cap integer DEFAULT 5000)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, total_count bigint, is_total_capped boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 5000), 1), 5000);
  v_sort_by text := coalesce(
    p_sort_by,
    case
      when nullif(btrim(p_query), '') is null then 'name'
      else 'relevance'
    end
  );
  v_is_unnarrowed boolean := nullif(btrim(p_query), '') is null and
  cardinality(coalesce(p_sources, '{}')) = 0 and
  cardinality(coalesce(p_formats, '{}')) = 0 and
  coalesce(p_updated_within, 'any') = 'any' and
  cardinality(coalesce(p_organization2_names, '{}')) = 0 and
  cardinality(coalesce(p_domains, '{}')) = 0 and
  cardinality(coalesce(p_tags, '{}')) = 0;
  v_total_count bigint;
  v_is_total_capped boolean := false;
begin
  if v_sort_by not in ('relevance', 'updated', 'name') then
    raise exception 'Unknown catalog sort: %', p_sort_by
    using
      errcode = '22023';
  end if;

  if v_is_unnarrowed then
    select
      facet_count.listing_count
    into
      v_total_count
    from
      public.data_catalog_facet_counts facet_count
    where
      facet_count.facet = 'updated_within' and
      facet_count.value = 'any' and
      facet_count.is_loadable_only = coalesce(p_is_loadable_only, false);
  end if;

  if v_total_count is null then
    select
      count(*)
    into
      v_total_count
    from
      public.data_catalog_listings__search_matches (
        p_query,
        p_sources,
        p_formats,
        p_updated_within,
        p_is_loadable_only,
        p_organization2_names,
        p_domains,
        p_tags,
        null,
        v_count_cap + 1
      );

    v_is_total_capped := v_total_count > v_count_cap;
    v_total_count := least(v_total_count, v_count_cap);
  end if;

  return query
  select
    match.id,
    match.display_name,
    match.organization1_name,
    match.organization2_name,
    match.organization3_name,
    match.organization4_name,
    match.pipeline_name,
    match.is_workspace_loadable,
    match.is_invalid,
    match.file_format,
    match.last_updated_at,
    v_total_count,
    v_is_total_capped
  from
    public.data_catalog_listings__search_matches (
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      p_tags,
      v_sort_by,
      v_limit,
      v_offset
    )
  with
    ordinality as match
  order by
    match.ordinality;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search_tag_options(p_tag_search text, p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[])
 RETURNS TABLE(value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    option.value,
    option.listing_count
  from
    public.data_catalog_listings__facet_value_rows (
      'tag',
      nullif(btrim(p_query), '') is null and
      cardinality(coalesce(p_sources, '{}')) = 0 and
      cardinality(coalesce(p_formats, '{}')) = 0 and
      coalesce(p_updated_within, 'any') = 'any' and
      cardinality(coalesce(p_organization2_names, '{}')) = 0 and
      cardinality(coalesce(p_domains, '{}')) = 0,
      '{}',
      '{}',
      50,
      p_tag_search,
      5000,
      p_query,
      p_sources,
      p_formats,
      p_updated_within,
      p_is_loadable_only,
      p_organization2_names,
      p_domains,
      '{}'
    ) as option
  where
    btrim(coalesce(p_tag_search, '')) <> ''
  limit
    50;
$function$
;



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.data_catalog_listings__facets_for_one_search(p_query text, p_is_loadable_only boolean, p_count_cap integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__facets_for_one_search(p_query text, p_is_loadable_only boolean, p_count_cap integer) to "authenticated";
