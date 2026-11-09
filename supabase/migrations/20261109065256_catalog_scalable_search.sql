drop function if exists "public"."data_catalog_listings__search_facet_rows"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]);

drop function if exists "public"."data_catalog_listings__search_matches"(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]);

drop function if exists "public"."rpc_data_catalog_listings__search"(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text);

  create table "public"."data_catalog_facet_counts" (
    "id" bigint generated always as identity not null,
    "is_loadable_only" boolean not null,
    "facet" text not null,
    "parent_value" text,
    "value" text,
    "listing_count" bigint not null,
    "refreshed_at" timestamp with time zone not null default now()
      );


alter table "public"."data_catalog_facet_counts" enable row level security;

CREATE INDEX data_catalog_facet_counts__facet_lookup ON public.data_catalog_facet_counts USING btree (facet, is_loadable_only, listing_count DESC);

CREATE UNIQUE INDEX data_catalog_facet_counts_pkey ON public.data_catalog_facet_counts USING btree (id);

CREATE INDEX data_catalog_listings__display_name ON public.data_catalog_listings USING btree (display_name, id);

CREATE INDEX data_catalog_listings__file_format ON public.data_catalog_listings USING btree ((
CASE
    WHEN (api_resource_format IS NOT NULL) THEN upper(api_resource_format)
    WHEN (parquet_file_name IS NOT NULL) THEN 'PARQUET'::text
    ELSE NULL::text
END));

CREATE INDEX data_catalog_listings__last_updated_at ON public.data_catalog_listings USING btree (COALESCE(date_of_last_update, date_of_last_sync) DESC NULLS LAST, display_name, id);

CREATE INDEX data_catalog_listings__organization2_name ON public.data_catalog_listings USING btree (organization2_name);

alter table "public"."data_catalog_facet_counts" add constraint "data_catalog_facet_counts_pkey" PRIMARY KEY using index "data_catalog_facet_counts_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_catalog_facet_counts__refresh()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  lock table public.data_catalog_facet_counts in exclusive mode;

  -- `where true`: the Data API loads `safeupdate`, which refuses a delete
  -- with no `where` clause.
  delete from public.data_catalog_facet_counts
  where
    true;

  insert into
    public.data_catalog_facet_counts (is_loadable_only, facet, parent_value, value, listing_count)
  with
    listing as (
      select
        listing.organization1_name,
        listing.organization2_name,
        case
          when listing.organization2_name is not null then drive.organization2_label
        end as organization2_label,
        case
          when listing.api_resource_format is not null then upper(listing.api_resource_format)
          when listing.parquet_file_name is not null then 'PARQUET'
        end as file_format,
        coalesce(listing.date_of_last_update, listing.date_of_last_sync) as last_updated_at,
        listing.is_workspace_loadable and
        not listing.is_invalid as is_loadable,
        listing.domains,
        listing.tags
      from
        public.data_catalog_listings listing
        left join public.data_catalog_drives drive on drive.id = listing.drive_id
    ),
    listing_group as (
      select
        grouping(listing.organization1_name) = 0 as is_by_source,
        grouping(listing.file_format) = 0 as is_by_format,
        grouping(listing.organization2_name) = 0 as is_by_organization2,
        grouping(listing.organization2_label) = 0 as is_by_organization2_label,
        grouping(listing.domains) = 0 as is_by_domains,
        grouping(listing.tags) = 0 as is_by_tags,
        listing.organization1_name,
        listing.file_format,
        listing.organization2_name,
        listing.organization2_label,
        listing.domains,
        listing.tags,
        count(*) as num_listings,
        count(*) filter (
          where
            listing.is_loadable
        ) as num_loadable,
        count(*) filter (
          where
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'past_month')
        ) as num_past_month,
        count(*) filter (
          where
            listing.is_loadable and
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'past_month')
        ) as num_loadable_past_month,
        count(*) filter (
          where
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'past_year')
        ) as num_past_year,
        count(*) filter (
          where
            listing.is_loadable and
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'past_year')
        ) as num_loadable_past_year,
        count(*) filter (
          where
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'over_a_year')
        ) as num_over_a_year,
        count(*) filter (
          where
            listing.is_loadable and
            public.data_catalog_listings__is_updated_within (listing.last_updated_at, 'over_a_year')
        ) as num_loadable_over_a_year
      from
        listing
      group by
        grouping sets (
          (listing.organization1_name),
          (listing.file_format),
          (listing.organization1_name, listing.organization2_name),
          (listing.organization1_name, listing.organization2_label),
          (listing.domains),
          (listing.tags),
          ()
        )
    ),
    value_count as (
      select
        case
          when listing_group.is_by_organization2 then 'organization2'
          when listing_group.is_by_organization2_label then 'organization2_label'
          when listing_group.is_by_source then 'source'
          when listing_group.is_by_format then 'format'
        end as facet,
        case
          when listing_group.is_by_organization2 or listing_group.is_by_organization2_label then listing_group.organization1_name
        end as parent_value,
        case
          when listing_group.is_by_organization2 then listing_group.organization2_name
          when listing_group.is_by_organization2_label then listing_group.organization2_label
          when listing_group.is_by_source then listing_group.organization1_name
          when listing_group.is_by_format then listing_group.file_format
        end as value,
        listing_group.num_listings,
        listing_group.num_loadable
      from
        listing_group
      where
        listing_group.is_by_source or
        listing_group.is_by_format or
        listing_group.is_by_organization2 or
        listing_group.is_by_organization2_label
      union all
      select
        'domain',
        null,
        listing_domain.value,
        sum(listing_group.num_listings),
        sum(listing_group.num_loadable)
      from
        listing_group
        cross join lateral (
          select distinct
            unnest(listing_group.domains)
        ) as listing_domain (value)
      where
        listing_group.is_by_domains
      group by
        listing_domain.value
      union all
      select
        'tag',
        null,
        listing_tag.value,
        sum(listing_group.num_listings),
        sum(listing_group.num_loadable)
      from
        listing_group
        cross join lateral (
          select distinct
            unnest(listing_group.tags)
        ) as listing_tag (value)
      where
        listing_group.is_by_tags
      group by
        listing_tag.value
    ),
    total_group as (
      select
        *
      from
        listing_group
      where
        not (
          listing_group.is_by_source or
          listing_group.is_by_format or
          listing_group.is_by_organization2 or
          listing_group.is_by_organization2_label or
          listing_group.is_by_domains or
          listing_group.is_by_tags
        )
    )
  select
    variant.is_loadable_only,
    value_count.facet,
    value_count.parent_value,
    value_count.value,
    variant.listing_count
  from
    value_count
    cross join lateral (
      values
        (false, value_count.num_listings),
        (true, value_count.num_loadable)
    ) as variant (is_loadable_only, listing_count)
  where
    value_count.value is not null and
    variant.listing_count > 0
  union all
  select
    variant.is_loadable_only,
    'updated_within',
    null,
    variant.window_name,
    variant.listing_count
  from
    total_group
    cross join lateral (
      values
        (false, 'any', total_group.num_listings),
        (true, 'any', total_group.num_loadable),
        (false, 'past_month', total_group.num_past_month),
        (true, 'past_month', total_group.num_loadable_past_month),
        (false, 'past_year', total_group.num_past_year),
        (true, 'past_year', total_group.num_loadable_past_year),
        (false, 'over_a_year', total_group.num_over_a_year),
        (true, 'over_a_year', total_group.num_loadable_over_a_year)
    ) as variant (is_loadable_only, window_name, listing_count)
  union all
  select
    false,
    'unloadable',
    null,
    null,
    total_group.num_listings - total_group.num_loadable
  from
    total_group
  union all
  select
    false,
    'catalog',
    null,
    null,
    total_group.num_listings
  from
    total_group;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__count_facet(p_facet text, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_count_cap integer)
 RETURNS TABLE(value text, listing_count bigint, is_counted boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    match as materialized (
      select
        *
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
          p_count_cap + 1
        )
    ),
    match_size as (
      select
        count(*) <= p_count_cap as is_counted
      from
        match
    ),
    facet_value as (
      select
        match.organization1_name as value
      from
        match
      where
        p_facet = 'source'
      union all
      select
        match.file_format
      from
        match
      where
        p_facet = 'format' and
        match.file_format is not null
      union all
      select
        match.organization2_name
      from
        match
      where
        p_facet = 'organization2' and
        match.organization2_name is not null
      union all
      select
        drive.organization2_label
      from
        match
        join public.data_catalog_drives drive on drive.id = match.drive_id
      where
        p_facet = 'organization2_label' and
        match.organization2_name is not null and
        drive.organization2_label is not null
      union all
      select
        listing_domain.value
      from
        match
        cross join lateral (
          select distinct
            unnest(match.domains)
        ) as listing_domain (value)
      where
        p_facet = 'domain'
      union all
      select
        listing_tag.value
      from
        match
        cross join lateral (
          select distinct
            unnest(match.tags)
        ) as listing_tag (value)
      where
        p_facet = 'tag'
      union all
      select
        update_window.name
      from
        match
        cross join unnest(array['any', 'past_month', 'past_year', 'over_a_year']) as update_window (name)
      where
        p_facet = 'updated_within' and
        public.data_catalog_listings__is_updated_within (match.last_updated_at, update_window.name)
      union all
      select
        null
      from
        match
      where
        p_facet = 'unloadable' and
        (
          not match.is_workspace_loadable or
          match.is_invalid
        )
    )
  select
    facet_value.value,
    count(*),
    true
  from
    facet_value
  where
    (
      select
        match_size.is_counted
      from
        match_size
    )
  group by
    facet_value.value
  union all
  select
    null,
    null,
    false
  where
    not (
      select
        match_size.is_counted
      from
        match_size
    );
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__facet_value_rows(p_facet text, p_is_catalog_wide boolean, p_parent_values text[], p_chosen_values text[], p_value_limit integer, p_value_search text, p_count_cap integer, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[])
 RETURNS TABLE(value text, listing_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
    typed_fragment as (
      select
        lower(fragment.value) as value
      from
        regexp_split_to_table(btrim(coalesce(p_value_search, '')), '\s+') as fragment (value)
      where
        fragment.value <> ''
    ),
    counted as (
      select
        *
      from
        public.data_catalog_listings__count_facet (
          p_facet,
          p_query,
          p_sources,
          p_formats,
          p_updated_within,
          p_is_loadable_only,
          p_organization2_names,
          p_domains,
          p_tags,
          p_count_cap
        )
      where
        not p_is_catalog_wide
    ),
    is_counted as (
      select
        p_is_catalog_wide or
        exists (
          select
            1
          from
            counted
          where
            counted.is_counted
        ) as value
    ),
    catalog_count as (
      select
        facet_count.value,
        sum(facet_count.listing_count)::bigint as listing_count
      from
        public.data_catalog_facet_counts facet_count
      where
        facet_count.facet = p_facet and
        facet_count.is_loadable_only = coalesce(p_is_loadable_only, false) and
        (
          cardinality(coalesce(p_parent_values, '{}')) = 0 or
          facet_count.parent_value = any (p_parent_values)
        )
      group by
        facet_count.value
    ),
    option_row as (
      select
        counted.value,
        counted.listing_count,
        counted.listing_count as rank_count
      from
        counted
      where
        counted.is_counted
      union all
      select
        catalog_count.value,
        case
          when p_is_catalog_wide then catalog_count.listing_count
        end,
        catalog_count.listing_count
      from
        catalog_count
      where
        p_is_catalog_wide or
        not (
          select
            is_counted.value
          from
            is_counted
        )
    ),
    searched_option as (
      select
        *
      from
        option_row
      where
        option_row.value is not null and
        not exists (
          select
            1
          from
            typed_fragment
          where
            strpos(lower(option_row.value), typed_fragment.value) = 0
        )
    ),
    top_option as (
      select
        *
      from
        searched_option
      order by
        searched_option.rank_count desc,
        searched_option.value
      limit
        p_value_limit
    ),
    chosen_option as (
      select
        searched_option.*
      from
        searched_option
      where
        searched_option.value = any (coalesce(p_chosen_values, '{}'))
      union all
      select
        chosen.value,
        case
          when (
            select
              is_counted.value
            from
              is_counted
          ) then 0::bigint
        end,
        0::bigint
      from
        unnest(coalesce(p_chosen_values, '{}')) as chosen (value)
    ),
    final_option as (
      select
        *
      from
        top_option
      union all
      select
        *
      from
        chosen_option
    )
  select
    final_option.value,
    max(final_option.listing_count)
  from
    final_option
  group by
    final_option.value
  order by
    max(final_option.listing_count) desc nulls last,
    max(final_option.rank_count) desc,
    final_option.value;
$function$
;

CREATE OR REPLACE FUNCTION public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_count_cap integer DEFAULT 10000)
 RETURNS TABLE(facet text, value text, listing_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 10000), 1), 10000);
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
      v_query operator(extensions.<%) listing.display_name
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

CREATE OR REPLACE FUNCTION public.data_catalog_listings__updated_window(p_updated_within text)
 RETURNS tstzrange
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    case p_updated_within
      when 'any' then tstzrange(null, null)
      when 'past_month' then tstzrange(now() - interval '31 days', null, '[)')
      when 'past_year' then tstzrange(now() - interval '365 days', null, '[)')
      when 'over_a_year' then tstzrange(null, now() - interval '365 days', '[)')
    end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_catalog_listings__search(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_sources text[] DEFAULT '{}'::text[], p_formats text[] DEFAULT '{}'::text[], p_updated_within text DEFAULT 'any'::text, p_is_loadable_only boolean DEFAULT false, p_organization2_names text[] DEFAULT '{}'::text[], p_domains text[] DEFAULT '{}'::text[], p_tags text[] DEFAULT '{}'::text[], p_sort_by text DEFAULT NULL::text, p_count_cap integer DEFAULT 10000)
 RETURNS TABLE(id uuid, display_name text, organization1_name text, organization2_name text, organization3_name text, organization4_name text, pipeline_name text, is_workspace_loadable boolean, is_invalid boolean, file_format text, last_updated_at timestamp with time zone, total_count bigint, is_total_capped boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_count_cap integer := least(greatest(coalesce(p_count_cap, 10000), 1), 10000);
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

CREATE OR REPLACE FUNCTION public.data_catalog_listings__is_updated_within(p_last_updated_at timestamp with time zone, p_updated_within text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    case p_updated_within
      when 'any' then true
      else coalesce(
        p_last_updated_at <@ public.data_catalog_listings__updated_window (p_updated_within),
        false
      )
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
      10000,
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

CREATE OR REPLACE FUNCTION public.rpc_pipeline_executions__finish(p_execution_id uuid, p_outcome jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_pipeline_name text;
  v_status public.pipeline_executions__status;
  v_outcome public.pipeline_executions;
  v_scope_count integer;
  v_unknown_keys text[];
begin
  if jsonb_typeof(p_outcome) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__finish needs a JSON object';
  end if;
  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_outcome) key
  where key <> all (array[
    'status', 'error', 'finished_at', 'setup_ms', 'listings_deleted',
    'listings_kept_in_use', 'listings_detached', 'checkpoints_deleted',
    'workspace_datasets_deleted'
  ]);
  if v_unknown_keys is not null then
    raise exception 'rpc_pipeline_executions__finish got unknown keys: %', v_unknown_keys;
  end if;

  select execution.pipeline_name, execution.status, execution.scope_count
  into v_pipeline_name, v_status, v_scope_count
  from public.pipeline_executions execution
  where execution.id = p_execution_id
  for update;

  -- `PE002` and `PE001` are in class `PE`, which neither the SQL standard
  -- nor Postgres defines, and which PostgREST returns as the error's `code`
  -- without treating it as an HTTP status (it does that only for `PT`). A
  -- caller can tell these states apart from `P0001` argument errors.
  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id
      using errcode = 'PE002';
  end if;
  -- A finished execution's totals are final: a late or repeated call must
  -- not change them.
  if v_status <> 'running' then
    raise exception 'Pipeline execution % already finished', p_execution_id
      using errcode = 'PE001';
  end if;

  if v_scope_count > 0 and p_outcome ?| array[
    'listings_deleted', 'listings_kept_in_use', 'listings_detached',
    'checkpoints_deleted'
  ] then
    raise exception 'Pipeline execution % has scope rows, so its deletion totals come from them', p_execution_id;
  end if;

  v_outcome := jsonb_populate_record(null::public.pipeline_executions, p_outcome);
  if v_outcome.status is null or v_outcome.status = 'running' then
    raise exception 'rpc_pipeline_executions__finish needs a final status';
  end if;

  update public.pipeline_executions execution
  set
    status = v_outcome.status,
    error = v_outcome.error,
    finished_at = coalesce(v_outcome.finished_at, now()),
    setup_ms = execution.setup_ms + coalesce(v_outcome.setup_ms, 0),
    listings_deleted = coalesce(v_outcome.listings_deleted, execution.listings_deleted),
    listings_kept_in_use = coalesce(v_outcome.listings_kept_in_use, execution.listings_kept_in_use),
    listings_detached = coalesce(v_outcome.listings_detached, execution.listings_detached),
    checkpoints_deleted = coalesce(v_outcome.checkpoints_deleted, execution.checkpoints_deleted),
    workspace_datasets_deleted = coalesce(
      v_outcome.workspace_datasets_deleted,
      execution.workspace_datasets_deleted
    ),
    catalog_listings = catalog.listings,
    catalog_prebuilt_listings = catalog.prebuilt_listings,
    catalog_api_listings = catalog.api_listings,
    catalog_verified_listings = catalog.verified_listings,
    catalog_unverified_listings = catalog.unverified_listings,
    catalog_columns = catalog_columns.columns
  from
    (
      select
        count(*)::integer as listings,
        (count(*) filter (where listing.access_kind = 'pipeline_parquet'))::integer as prebuilt_listings,
        (count(*) filter (where listing.access_kind = 'api_resource'))::integer as api_listings,
        (count(*) filter (where listing.date_column_type_last_verified is not null))::integer as verified_listings,
        (count(*) filter (where listing.date_column_type_last_verified is null))::integer as unverified_listings
      from public.data_catalog_listings listing
      where listing.pipeline_name = v_pipeline_name
    ) catalog,
    (
      select count(*)::integer as columns
      from public.data_catalog_listings__relation_columns relation_column
      join public.data_catalog_listings listing
        on listing.id = relation_column.catalog_listing_id
      where listing.pipeline_name = v_pipeline_name
    ) catalog_columns
  where execution.id = p_execution_id;

  -- The run may have added, changed, or removed listings, so the catalog's
  -- unfiltered facet counts are recounted.
  perform public.data_catalog_facet_counts__refresh();
end;
$function$
;

grant select on table "public"."data_catalog_facet_counts" to "authenticated";

grant delete on table "public"."data_catalog_facet_counts" to "service_role";

grant insert on table "public"."data_catalog_facet_counts" to "service_role";

grant select on table "public"."data_catalog_facet_counts" to "service_role";

grant update on table "public"."data_catalog_facet_counts" to "service_role";


  create policy "User can select open data catalog facet counts"
  on "public"."data_catalog_facet_counts"
  as permissive
  for select
  to authenticated
using (true);




-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.data_catalog_facet_counts__refresh() from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_facet_counts__refresh() to "service_role";
revoke all privileges on function public.data_catalog_listings__count_facet(p_facet text, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_count_cap integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__count_facet(p_facet text, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_count_cap integer) to "authenticated";
revoke all privileges on function public.data_catalog_listings__facet_value_rows(p_facet text, p_is_catalog_wide boolean, p_parent_values text[], p_chosen_values text[], p_value_limit integer, p_value_search text, p_count_cap integer, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__facet_value_rows(p_facet text, p_is_catalog_wide boolean, p_parent_values text[], p_chosen_values text[], p_value_limit integer, p_value_search text, p_count_cap integer, p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[]) to "authenticated";
revoke all privileges on function public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_count_cap integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_facet_rows(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_count_cap integer) to "authenticated";
revoke all privileges on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text, p_limit integer, p_offset integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__search_matches(p_query text, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text, p_limit integer, p_offset integer) to "authenticated";
revoke all privileges on function public.data_catalog_listings__updated_window(p_updated_within text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.data_catalog_listings__updated_window(p_updated_within text) to "authenticated";
revoke all privileges on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text, p_count_cap integer) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_catalog_listings__search(p_query text, p_limit integer, p_offset integer, p_sources text[], p_formats text[], p_updated_within text, p_is_loadable_only boolean, p_organization2_names text[], p_domains text[], p_tags text[], p_sort_by text, p_count_cap integer) to "authenticated";
