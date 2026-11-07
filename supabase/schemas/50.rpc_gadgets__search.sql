/**
 * Searches every gadget type in a workspace for the `@` menu. Runs as the
 * caller, so RLS filters each branch and a restricted gadget the caller
 * cannot read never appears. Tiles are the DataViz blocks inside each
 * visible dashboard's config, labeled by their query prompt. With a blank
 * query, returns the most recently updated gadgets.
 *
 * `has_limited_audience` is true when not everyone in the workspace can open
 * the gadget (a restricted dashboard, dataset, or map, or a tile on a
 * restricted dashboard). The `@` menu warns the author about those.
 */
create or replace function public.rpc_gadgets__search (
  p_workspace_id uuid,
  p_query text,
  p_limit integer default 20
) returns table (
  gadget_type public.gadget_type,
  gadget_id uuid,
  sub_id text,
  label text,
  sub_label text,
  has_limited_audience boolean,
  updated_at timestamptz,
  rank real
) language sql stable security invoker
set
  search_path = ''
set
  pg_trgm.word_similarity_threshold = 0.3 as $$
  with
    params as (
      select
        nullif(btrim(p_query), '') as q,
        least(greatest(coalesce(p_limit, 20), 1), 100) as row_limit
    ),
    candidates as (
      select 'dashboard'::public.gadget_type as gadget_type, d.id as gadget_id, null::text as sub_id,
        d.name as label, null::text as sub_label, d.is_restricted as has_limited_audience, d.updated_at
      from public.dashboards d
      where d.workspace_id = p_workspace_id
      union all
      select 'dashboard_tile', d.id, tile ->> 'id', tile -> 'nlQuery' ->> 'prompt', d.name, d.is_restricted, d.updated_at
      from public.dashboards d
      -- `strict`, because lax `.**` yields every block inside an array twice.
      cross join lateral (
        select node -> 'props' as tile
        from jsonb_path_query(d.config, 'strict $.** ? (@.type == "DataViz")') as node
      ) as tiles
      where d.workspace_id = p_workspace_id
        and coalesce(btrim(tile -> 'nlQuery' ->> 'prompt'), '') <> ''
        and tile ->> 'id' is not null
      union all
      select 'dataset', ds.id, null, ds.name, null, ds.is_restricted, ds.updated_at
      from public.datasets ds
      where ds.workspace_id = p_workspace_id
      union all
      select 'map', m.id, null, m.name, null, m.is_restricted, m.updated_at
      from public.maps m
      where m.workspace_id = p_workspace_id
      union all
      select 'concept', c.id, null, c.name, null, false, c.updated_at
      from public.concepts c
      where c.workspace_id = p_workspace_id
      union all
      select 'individual', i.id, null, i.name, c.name, false, i.updated_at
      from public.individuals i
      join public.concepts c on c.id = i.concept_id
      where i.workspace_id = p_workspace_id
    )
  select
    candidate.gadget_type,
    candidate.gadget_id,
    candidate.sub_id,
    candidate.label,
    candidate.sub_label,
    candidate.has_limited_audience,
    candidate.updated_at,
    case
      when params.q is null then 0::real
      else (
        case when candidate.label ilike params.q || '%' then 1 else 0 end
        + extensions.word_similarity(params.q, candidate.label)
      )::real
    end as rank
  from candidates as candidate
  cross join params
  where params.q is null
    or candidate.label ilike '%' || params.q || '%'
    or params.q operator(extensions.<%) candidate.label
  order by rank desc, candidate.updated_at desc, candidate.label, candidate.gadget_id
  limit (select row_limit from params);
$$;

revoke
execute on function public.rpc_gadgets__search (uuid, text, integer)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_gadgets__search (uuid, text, integer) to authenticated;
