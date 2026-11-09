/**
 * Searches every gadget type in a workspace for the `@` menu. Runs as the
 * caller, so RLS filters each branch and a restricted gadget the caller
 * cannot read never appears. A caller outside the workspace gets nothing,
 * even gadgets RLS would let them read, such as a public dashboard. Tiles are
 * the DataViz blocks inside each visible dashboard's config, labeled by their
 * query prompt. With a blank query, returns the most recently updated
 * gadgets.
 *
 * Each type contributes at most five rows, so one type with many matches
 * cannot crowd the others out of the menu. The query matches a label that
 * contains it literally, or by trigram word similarity.
 *
 * `has_limited_audience` is true when not everyone in the workspace can open
 * the gadget: a restricted or draft dashboard, a restricted dataset or map,
 * or a tile on such a dashboard. The `@` menu warns the author about those.
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
        -- Null when the caller is not a member, which empties every branch.
        case
          when p_workspace_id = any (array(select public.util__get_auth_user_workspaces ()))
            then p_workspace_id
        end as workspace_id,
        lower(nullif(btrim(p_query), '')) as q,
        least(greatest(coalesce(p_limit, 20), 1), 100) as row_limit
    ),
    visible_dashboards as materialized (
      select
        d.id,
        d.name,
        d.config,
        d.updated_at,
        d.is_restricted or d.visibility = 'draft' as has_limited_audience
      from public.dashboards d
      where d.workspace_id = (select workspace_id from params)
    ),
    candidates as (
      select 'dashboard'::public.gadget_type as gadget_type, d.id as gadget_id, null::text as sub_id,
        d.name as label, null::text as sub_label, d.has_limited_audience, d.updated_at
      from visible_dashboards d
      union all
      select 'dashboard_tile', d.id, tiles.block_id, tiles.prompt, d.name, d.has_limited_audience, d.updated_at
      from visible_dashboards d
      -- `strict`, because lax `.**` yields every block inside an array twice.
      -- Saved configs are snake-cased, so the prompt is under `nl_query`.
      -- `nlQuery` covers a config written before that.
      cross join lateral (
        select
          node -> 'props' ->> 'id' as block_id,
          coalesce(
            node -> 'props' -> 'nl_query' ->> 'prompt',
            node -> 'props' -> 'nlQuery' ->> 'prompt'
          ) as prompt
        from jsonb_path_query(d.config, 'strict $.** ? (@.type == "DataViz")') as node
      ) as tiles
      where coalesce(btrim(tiles.prompt), '') <> ''
        and nullif(tiles.block_id, '') is not null
      union all
      select 'dataset', ds.id, null, ds.name, null, ds.is_restricted, ds.updated_at
      from public.datasets ds
      where ds.workspace_id = (select workspace_id from params)
      union all
      select 'map', m.id, null, m.name, null, m.is_restricted, m.updated_at
      from public.maps m
      where m.workspace_id = (select workspace_id from params)
      union all
      select 'concept', c.id, null, c.name, null, false, c.updated_at
      from public.concepts c
      where c.workspace_id = (select workspace_id from params)
      union all
      select 'individual', i.id, null, i.name, c.name, false, i.updated_at
      from public.individuals i
      join public.concepts c on c.id = i.concept_id
      where i.workspace_id = (select workspace_id from params)
    ),
    matches as (
      select
        candidate.*,
        case
          when params.q is null then 0::real
          else (
            -- `strpos` and `left` match the query literally, so `%`, `_`,
            -- and `\` in it are not pattern characters.
            case when left(lower(candidate.label), length(params.q)) = params.q then 1 else 0 end
            + extensions.word_similarity(params.q, candidate.label)
          )::real
        end as rank
      from candidates as candidate
      cross join params
      where params.q is null
        or strpos(lower(candidate.label), params.q) > 0
        or params.q operator(extensions.<%) candidate.label
    ),
    ranked as (
      select
        match.*,
        row_number() over (
          partition by match.gadget_type
          order by match.rank desc, match.updated_at desc, match.label, match.gadget_id, match.sub_id
        ) as type_position
      from matches as match
    )
  select
    ranked.gadget_type,
    ranked.gadget_id,
    ranked.sub_id,
    ranked.label,
    ranked.sub_label,
    ranked.has_limited_audience,
    ranked.updated_at,
    ranked.rank
  from ranked
  where ranked.type_position <= 5
  order by ranked.rank desc, ranked.updated_at desc, ranked.label, ranked.gadget_id, ranked.sub_id
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
