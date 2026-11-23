\set ON_ERROR_STOP on

/**
 * `rpc_gadgets__search` finds every gadget type in a workspace by name, finds
 * dashboard tiles by their query prompt, flags gadgets not everyone can open,
 * and hides what the caller cannot read because it runs as the caller.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e4000001-0000-4000-8000-000000000001'::uuid, 'gadget_search_owner@test.dev', 'authenticated', 'authenticated'),
  ('e4000002-0000-4000-8000-000000000002'::uuid, 'gadget_search_member@test.dev', 'authenticated', 'authenticated'),
  ('e4000003-0000-4000-8000-000000000003'::uuid, 'gadget_search_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e4100001-0000-4000-8000-000000000001'::uuid, 'e4000001-0000-4000-8000-000000000001'::uuid, 'gadget search ws', 'gadget-search-ws'),
  ('e4100002-0000-4000-8000-000000000002'::uuid, 'e4000003-0000-4000-8000-000000000003'::uuid, 'gadget search other', 'gadget-search-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e4200001-0000-4000-8000-000000000001'::uuid, 'e4100001-0000-4000-8000-000000000001'::uuid, 'e4000001-0000-4000-8000-000000000001'::uuid),
  ('e4200002-0000-4000-8000-000000000002'::uuid, 'e4100001-0000-4000-8000-000000000001'::uuid, 'e4000002-0000-4000-8000-000000000002'::uuid),
  ('e4200003-0000-4000-8000-000000000003'::uuid, 'e4100002-0000-4000-8000-000000000002'::uuid, 'e4000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('e4300001-0000-4000-8000-000000000001'::uuid, 'e4000001-0000-4000-8000-000000000001'::uuid, 'e4100001-0000-4000-8000-000000000001'::uuid, 'e4200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('e4300002-0000-4000-8000-000000000002'::uuid, 'e4000002-0000-4000-8000-000000000002'::uuid, 'e4100001-0000-4000-8000-000000000001'::uuid, 'e4200002-0000-4000-8000-000000000002'::uuid, 'Member', 'Member'),
  ('e4300003-0000-4000-8000-000000000003'::uuid, 'e4000003-0000-4000-8000-000000000003'::uuid, 'e4100002-0000-4000-8000-000000000002'::uuid, 'e4200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The owner administers both workspaces' content; the member reads.
update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id in ('e4100001-0000-4000-8000-000000000001'::uuid, 'e4100002-0000-4000-8000-000000000002'::uuid) and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e4000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Admin'
  end;

-- Each gadget gets its own `updated_at` so the blank-query order is known:
-- individual, concept, map, dataset, then the dashboards.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, description, visibility, config, is_restricted, snapshot_revision, updated_at
)
values
  (
    'e4500001-0000-4000-8000-000000000001'::uuid,
    'e4100001-0000-4000-8000-000000000001'::uuid,
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e4300001-0000-4000-8000-000000000001'::uuid,
    'Measles by borough',
    '',
    'workspace',
    '{
      "root": { "props": {} },
      "content": [
        {
          "type": "Grid",
          "props": {
            "id": "Grid-1",
            "r1c1": [
              {
                "type": "DataViz",
                "props": {
                  "id": "DataViz-tile1",
                  "nl_query": { "prompt": "Cases per week by borough", "raw_sql": "", "generations": [] },
                  "viz_type": "bar"
                }
              }
            ],
            "r1c2": [
              {
                "type": "DataViz",
                "props": {
                  "id": "DataViz-blank",
                  "nl_query": { "prompt": "   ", "raw_sql": "", "generations": [] },
                  "viz_type": "bar"
                }
              },
              {
                "type": "DataViz",
                "props": {
                  "id": "",
                  "nl_query": { "prompt": "Empty id tile", "raw_sql": "", "generations": [] },
                  "viz_type": "bar"
                }
              },
              {
                "type": "DataViz",
                "props": {
                  "id": "DataViz-legacy",
                  "nlQuery": { "prompt": "Vaccine uptake from an older save", "rawSql": "", "generations": [] },
                  "vizType": "bar"
                }
              }
            ]
          }
        }
      ]
    }'::jsonb,
    false,
    'e45000a1-0000-4000-8000-000000000001'::uuid,
    now() - interval '5 minutes'
  ),
  (
    -- Published to the workspace so only the restriction hides it from the
    -- member, not the draft gate.
    'e4500002-0000-4000-8000-000000000002'::uuid,
    'e4100001-0000-4000-8000-000000000001'::uuid,
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e4300001-0000-4000-8000-000000000001'::uuid,
    'Board briefing',
    '',
    'workspace',
    '{"content":[{"type":"DataViz","props":{"id":"DataViz-briefing","nl_query":{"prompt":"Briefing summary chart","raw_sql":"","generations":[]},"viz_type":"bar"}}]}'::jsonb,
    true,
    'e45000a2-0000-4000-8000-000000000002'::uuid,
    now() - interval '6 minutes'
  ),
  (
    -- Unrestricted but still a draft, so only its owner and editors can open it.
    'e4500003-0000-4000-8000-000000000003'::uuid,
    'e4100001-0000-4000-8000-000000000001'::uuid,
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e4300001-0000-4000-8000-000000000001'::uuid,
    'Draft surveillance',
    '',
    'draft',
    '{"content":[{"type":"DataViz","props":{"id":"DataViz-draft","nl_query":{"prompt":"Draft outbreak trend","raw_sql":"","generations":[]},"viz_type":"line"}}]}'::jsonb,
    false,
    null,
    now() - interval '7 minutes'
  ),
  (
    -- Public, which RLS lets any signed-in user read.
    'e4500004-0000-4000-8000-000000000004'::uuid,
    'e4100001-0000-4000-8000-000000000001'::uuid,
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e4300001-0000-4000-8000-000000000001'::uuid,
    'Open exposure summary',
    '',
    'public',
    '{}'::jsonb,
    false,
    'e45000a4-0000-4000-8000-000000000004'::uuid,
    now() - interval '8 minutes'
  ),
  (
    -- Matches "okafor" only in the middle of its name, so it ranks below the
    -- cases whose names start with it.
    'e4500005-0000-4000-8000-000000000005'::uuid,
    'e4100001-0000-4000-8000-000000000001'::uuid,
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e4300001-0000-4000-8000-000000000001'::uuid,
    'Household outbreak: Okafor',
    '',
    'workspace',
    '{}'::jsonb,
    false,
    'e45000a5-0000-4000-8000-000000000005'::uuid,
    now() - interval '9 minutes'
  )
on conflict (id) do nothing;

insert into public.datasets (
  id, owner_id, owner_profile_id, workspace_id, name, description, source_type, is_restricted, updated_at
)
values (
  'e4600001-0000-4000-8000-000000000001'::uuid,
  'e4000001-0000-4000-8000-000000000001'::uuid,
  'e4300001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'Borough boundaries',
  '',
  'csv_file'::public.datasets__source_type,
  true,
  now() - interval '4 minutes'
),
(
  -- Unrestricted, so the member can read it.
  'e4600002-0000-4000-8000-000000000002'::uuid,
  'e4000001-0000-4000-8000-000000000001'::uuid,
  'e4300001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'Vaccination clinics',
  '',
  'csv_file'::public.datasets__source_type,
  false,
  now() - interval '10 minutes'
)
on conflict (id) do nothing;

insert into public.maps (id, workspace_id, owner_id, owner_profile_id, name, config, updated_at)
values (
  'e4700001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'e4000001-0000-4000-8000-000000000001'::uuid,
  'e4300001-0000-4000-8000-000000000001'::uuid,
  'Exposure sites',
  '{}'::jsonb,
  now() - interval '3 minutes'
)
on conflict (id) do nothing;

-- A case type and its default status reference each other; the
-- foreign key is deferred, so both rows go in before the commit.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id, updated_at)
values (
  'e4800001-0000-4000-8000-000000000001'::uuid,
  'e4000001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'Measles case',
  true,
  'e48f0001-0000-4000-8000-000000000001'::uuid,
  now() - interval '2 minutes'
)
on conflict (id) do nothing;

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values (
  'e48f0001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'e4800001-0000-4000-8000-000000000001'::uuid,
  'Open',
  '#40c057',
  0
)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id, updated_at)
values (
  'e4900001-0000-4000-8000-000000000001'::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'Amara Okafor',
  'e4800001-0000-4000-8000-000000000001'::uuid,
  'ext-amara',
  now() - interval '1 minute'
)
on conflict (id) do nothing;

-- Seven more cases whose names start with "Okafor", older than every other
-- gadget so the blank-query order above is unchanged.
insert into public.individuals (id, workspace_id, name, concept_id, external_id, updated_at)
select
  ('e490000' || n || '-0000-4000-8000-00000000000' || n)::uuid,
  'e4100001-0000-4000-8000-000000000001'::uuid,
  'Okafor household member ' || n,
  'e4800001-0000-4000-8000-000000000001'::uuid,
  'ext-okafor-' || n,
  now() - interval '1 hour' - n * interval '1 minute'
from generate_series(2, 8) as n
on conflict (id) do nothing;

select plan (17);

-- 1. A name search spans gadget types.
select lives_ok (
  $t$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_found text;
  begin
    select string_agg(s.gadget_type::text || ':' || s.label, ',' order by s.gadget_type::text)
    into v_found
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'measles', 20) s;

    if v_found is distinct from 'concept:Measles case,dashboard:Measles by borough' then
      raise exception 'searching "measles" returned %', v_found;
    end if;
  end $chk$;
  $t$,
  'a name search returns the matching dashboard and concept'
);

-- 2. A tile is found by its query prompt and labeled with its dashboard.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_count int;
    v_tile text;
  begin
    select count(*)::int, max(s.gadget_id::text || '|' || s.sub_id || '|' || s.sub_label)
    into v_count, v_tile
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'cases per week', 20) s
    where s.gadget_type = 'dashboard_tile';

    if v_count <> 1 then
      raise exception 'expected one tile row, got %', v_count;
    end if;
    if v_tile is distinct from 'e4500001-0000-4000-8000-000000000001|DataViz-tile1|Measles by borough' then
      raise exception 'the tile row is %', v_tile;
    end if;
  end $chk$;
  $t$,
  'a tile is found by its prompt with its dashboard id, block id, and dashboard name'
);

-- 3. A case carries its case type as the sub label.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if not exists (
      select 1
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'amara', 20) s
      where s.gadget_type = 'individual'
        and s.gadget_id = 'e4900001-0000-4000-8000-000000000001'::uuid
        and s.sub_label = 'Measles case'
    ) then
      raise exception 'searching "amara" did not return the case with its case type';
    end if;
  end $chk$;
  $t$,
  'a case is returned with its case type as the sub label'
);

-- 4. A member cannot find a restricted dashboard that is not shared with them.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if exists (
      select 1
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'board', 20) s
      where s.gadget_id = 'e4500002-0000-4000-8000-000000000002'::uuid
    ) then
      raise exception 'a member found a restricted dashboard they cannot read';
    end if;
  end $chk$;
  $t$,
  'a member does not see a restricted dashboard without a share'
);

-- 5. The owner finds it, flagged as having a limited audience.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if not exists (
      select 1
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'board', 20) s
      where s.gadget_type = 'dashboard'
        and s.gadget_id = 'e4500002-0000-4000-8000-000000000002'::uuid
        and s.label = 'Board briefing'
        and s.has_limited_audience
    ) then
      raise exception 'the owner did not find the restricted dashboard flagged as limited';
    end if;
  end $chk$;
  $t$,
  'the owner sees a restricted dashboard flagged as having a limited audience'
);

-- 6. A restricted dataset is flagged; a tile on an open dashboard is not.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if (
      select s.has_limited_audience
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 100) s
      where s.gadget_type = 'dataset' and s.gadget_id = 'e4600001-0000-4000-8000-000000000001'::uuid
    ) is distinct from true then
      raise exception 'the restricted dataset is not flagged as limited';
    end if;
    if (
      select s.has_limited_audience
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 100) s
      where s.gadget_type = 'dashboard_tile' and s.sub_id = 'DataViz-tile1'
    ) is distinct from false then
      raise exception 'the tile on an open dashboard is flagged as limited';
    end if;
  end $chk$;
  $t$,
  'a restricted dataset is flagged and a tile on an open dashboard is not'
);

-- 7. An outsider finds nothing in a workspace they do not belong to.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if not exists (select 1 from public.dashboards where id = 'e4500004-0000-4000-8000-000000000004'::uuid) then
      raise exception 'the outsider cannot read the public dashboard, so this case proves nothing';
    end if;
    if (select count(*)::int from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 20)) <> 0 then
      raise exception 'an outsider found gadgets in another workspace';
    end if;
  end $chk$;
  $t$,
  'an outsider finds no gadgets in another workspace, not even a public dashboard'
);

-- 8. A blank query returns the most recently updated gadgets, up to the limit.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_found text;
  begin
    select string_agg(s.gadget_type::text, ',' order by s.ordinality)
    into v_found
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 3) with ordinality s;

    if v_found is distinct from 'individual,concept,map' then
      raise exception 'a blank query with limit 3 returned %', v_found;
    end if;
  end $chk$;
  $t$,
  'a blank query returns the three most recently updated gadgets, newest first'
);

-- 9. A draft dashboard and its tiles are flagged even when unrestricted.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_flags text;
  begin
    select string_agg(s.gadget_type::text || ':' || s.has_limited_audience::text, ',' order by s.gadget_type::text)
    into v_flags
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'draft', 20) s
    where s.gadget_id = 'e4500003-0000-4000-8000-000000000003'::uuid;

    if v_flags is distinct from 'dashboard:true,dashboard_tile:true' then
      raise exception 'the draft dashboard and its tile returned %', v_flags;
    end if;
  end $chk$;
  $t$,
  'a draft dashboard and its tile are flagged as having a limited audience'
);

-- 10. A tile on a restricted dashboard inherits the flag.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if (
      select s.has_limited_audience
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'briefing summary', 20) s
      where s.gadget_type = 'dashboard_tile' and s.sub_id = 'DataViz-briefing'
    ) is distinct from true then
      raise exception 'the tile on a restricted dashboard is not flagged as limited';
    end if;
  end $chk$;
  $t$,
  'a tile on a restricted dashboard is flagged as having a limited audience'
);

-- 11. Tiles with a blank prompt or a blank block id are skipped.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if exists (
      select 1
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 100) s
      where s.gadget_type = 'dashboard_tile' and s.sub_id = 'DataViz-blank'
    ) then
      raise exception 'a tile with a blank prompt was returned';
    end if;
    if exists (
      select 1
      from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'empty id tile', 20) s
      where s.gadget_type = 'dashboard_tile'
    ) then
      raise exception 'a tile with a blank block id was returned';
    end if;
  end $chk$;
  $t$,
  'tiles with a blank prompt or a blank block id are skipped'
);

-- 12. No type crowds out the others: at most five rows per type.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_individuals int;
    v_has_dashboard boolean;
  begin
    select
      count(*) filter (where s.gadget_type = 'individual')::int,
      coalesce(bool_or(s.gadget_type = 'dashboard' and s.gadget_id = 'e4500005-0000-4000-8000-000000000005'::uuid), false)
    into v_individuals, v_has_dashboard
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'okafor', 6) s;

    if v_individuals > 5 then
      raise exception 'searching "okafor" returned % cases', v_individuals;
    end if;
    if not v_has_dashboard then
      raise exception 'the matching dashboard was crowded out by cases';
    end if;
  end $chk$;
  $t$,
  'at most five cases come back and a matching dashboard still appears'
);

-- 13. LIKE wildcards in the query are matched literally.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_count int;
  begin
    select count(*)::int into v_count
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '_', 100);

    if v_count <> 0 then
      raise exception 'searching "_" matched % gadgets whose names have no underscore', v_count;
    end if;
  end $chk$;
  $t$,
  'an underscore in the query does not match every gadget'
);

-- 14. A member with the viewer role group finds every gadget type.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  declare
    v_types text;
  begin
    select string_agg(distinct s.gadget_type::text, ',' order by s.gadget_type::text)
    into v_types
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, '', 100) s;

    if v_types is distinct from 'concept,dashboard,dashboard_tile,dataset,individual,map' then
      raise exception 'the viewer found only %', v_types;
    end if;
  end $chk$;
  $t$,
  'a viewer finds dashboards, tiles, datasets, maps, case types, and cases'
);

-- 15. A tile saved before configs were snake-cased is still found by its prompt.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e4000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_tile text;
  begin
    select max(s.sub_id || '|' || s.label)
    into v_tile
    from public.rpc_gadgets__search ('e4100001-0000-4000-8000-000000000001'::uuid, 'vaccine uptake', 20) s
    where s.gadget_type = 'dashboard_tile';

    if v_tile is distinct from 'DataViz-legacy|Vaccine uptake from an older save' then
      raise exception 'the camelCased tile row is %', v_tile;
    end if;
  end $chk$;
  $t$,
  'a tile whose config predates snake-casing is found by its prompt'
);

reset role;

-- 16. Signed-in users can call it.
select ok (
  has_function_privilege('authenticated', 'public.rpc_gadgets__search(uuid, text, integer)', 'EXECUTE'),
  'authenticated can execute rpc_gadgets__search'
);

-- 17. Anonymous users cannot.
select ok (
  not has_function_privilege('anon', 'public.rpc_gadgets__search(uuid, text, integer)', 'EXECUTE'),
  'anon cannot execute rpc_gadgets__search'
);

select * from finish ();

rollback;
