\set ON_ERROR_STOP on

/**
 * `comments__sync_gadget_refs` mirrors the gadgets a comment references into
 * `comment_gadget_refs`, and members can read but not write that table.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e3000001-0000-4000-8000-000000000001'::uuid, 'gadget_refs_author@test.dev', 'authenticated', 'authenticated'),
  ('e3000002-0000-4000-8000-000000000002'::uuid, 'gadget_refs_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'gadget refs ws', 'gadget-refs-ws'),
  ('e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid, 'gadget refs other', 'gadget-refs-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e3200001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid),
  ('e3200002-0000-4000-8000-000000000002'::uuid, 'e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('e3300001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'gadget concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e3400001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'Case', 'e3300001-0000-4000-8000-000000000001'::uuid, 'ext-1')
on conflict (id) do nothing;

select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e3500001-0000-4000-8000-000000000001'::uuid,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'e3000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[
    {"type":"paragraph","content":[
      {"type":"text","text":"See "},
      {"type":"gadgetLink","attrs":{"gadgetType":"dashboard","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"not_a_type","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"map","gadgetId":"not-a-uuid","subId":null}}
    ]},
    {"type":"gadgetEmbed","attrs":{"gadgetType":"dashboard_tile","gadgetId":"e3600001-0000-4000-8000-000000000001","subId":"DataViz-abc"}}
  ]}'::jsonb,
  'See [dashboard]'
);

select plan (13);

-- 1. One row per valid gadget node, invalid ones skipped.
select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  2,
  'valid gadget nodes are mirrored and invalid ones skipped'
);

-- 2. The embed keeps its sub id and display.
select is (
  (
    select gadget_type::text || ':' || sub_id || ':' || display
    from public.comment_gadget_refs
    where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid and display = 'embed'
  ),
  'dashboard_tile:DataViz-abc:embed',
  'an embed records its type, tile id, and display'
);

-- 3. Editing replaces the rows.
update public.comments
set
  body = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"gadgetLink","attrs":{"gadgetType":"individual","gadgetId":"e3400001-0000-4000-8000-000000000001","subId":null}}]}]}'::jsonb,
  body_text = '[case]'
where id = 'e3500001-0000-4000-8000-000000000001'::uuid;

select is (
  (select string_agg(gadget_type::text, ',') from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  'individual',
  'editing a comment replaces its gadget rows'
);

-- 4. Soft delete clears them.
update public.comments set deleted_at = now() where id = 'e3500001-0000-4000-8000-000000000001'::uuid;
select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500001-0000-4000-8000-000000000001'::uuid),
  0,
  'a deleted comment references no gadgets'
);

-- A fresh comment, seeded as the owner, for the cases below.
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e3500002-0000-4000-8000-000000000002'::uuid,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'e3000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"gadgetLink","attrs":{"gadgetType":"concept","gadgetId":"e3300001-0000-4000-8000-000000000001","subId":null}}]}]}'::jsonb,
  '[case type]'
);

-- 5. An update that leaves the body unchanged keeps the same ref rows.
create temp table refs_before_unchanged_update as
select id from public.comment_gadget_refs where comment_id = 'e3500002-0000-4000-8000-000000000002'::uuid;

update public.comments
set body_text = '[case type] again'
where id = 'e3500002-0000-4000-8000-000000000002'::uuid;

select results_eq (
  $$ select id from public.comment_gadget_refs where comment_id = 'e3500002-0000-4000-8000-000000000002'::uuid order by id $$,
  $$ select id from refs_before_unchanged_update order by id $$,
  'an update that leaves the body unchanged keeps the gadget rows'
);

-- 6. Identical duplicate nodes are stored once, and the insert succeeds.
select lives_ok (
  $t$
  insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e3500003-0000-4000-8000-000000000003'::uuid,
    'e3100001-0000-4000-8000-000000000001'::uuid,
    'e3400001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc","content":[{"type":"paragraph","content":[
      {"type":"gadgetLink","attrs":{"gadgetType":"map","gadgetId":"e3600002-0000-4000-8000-000000000002","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"map","gadgetId":"e3600002-0000-4000-8000-000000000002","subId":null}}
    ]}]}'::jsonb,
    '[map] [map]'
  )
  $t$,
  'a comment with identical duplicate gadget nodes is saved'
);

select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500003-0000-4000-8000-000000000003'::uuid),
  1,
  'identical duplicate gadget nodes produce one row'
);

-- 7. A tile without a sub id, and a non-tile gadget with one, are skipped.
select lives_ok (
  $t$
  insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e3500004-0000-4000-8000-000000000004'::uuid,
    'e3100001-0000-4000-8000-000000000001'::uuid,
    'e3400001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc","content":[{"type":"paragraph","content":[
      {"type":"gadgetLink","attrs":{"gadgetType":"dashboard_tile","gadgetId":"e3600003-0000-4000-8000-000000000003","subId":null}},
      {"type":"gadgetLink","attrs":{"gadgetType":"dashboard","gadgetId":"e3600003-0000-4000-8000-000000000003","subId":"DataViz-abc"}}
    ]}]}'::jsonb,
    '[tile] [dashboard]'
  )
  $t$,
  'a comment with a tile missing its sub id and a dashboard with one is saved'
);

select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500004-0000-4000-8000-000000000004'::uuid),
  0,
  'a tile without a sub id and a non-tile gadget with one produce no rows'
);

-- 7b. A tile whose sub id is an empty string is skipped: `nullif` reads it as
-- no sub id, so it hits the same guard as a missing one.
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e3500005-0000-4000-8000-000000000005'::uuid,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'e3000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"paragraph","content":[
    {"type":"gadgetLink","attrs":{"gadgetType":"dashboard_tile","gadgetId":"e3600003-0000-4000-8000-000000000003","subId":""}}
  ]}]}'::jsonb,
  '[tile]'
);

select is (
  (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500005-0000-4000-8000-000000000005'::uuid),
  0,
  'a tile with an empty sub id produces no row'
);

-- 8. A member reads refs in their workspace.
select lives_ok (
  $t$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comment_gadget_refs where comment_id = 'e3500002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'a member cannot read gadget refs in their workspace';
    end if;
  end $chk$;
  $t$,
  'a member reads gadget refs in their workspace'
);

-- 9. An outsider reads none.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comment_gadget_refs) <> 0 then
      raise exception 'an outsider can read another workspace''s gadget refs';
    end if;
  end $chk$;
  $t$,
  'an outsider reads no gadget refs'
);

-- 10. The client cannot write the table.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.comment_gadget_refs (comment_id, workspace_id, gadget_type, gadget_id, display)
  values ('e3500002-0000-4000-8000-000000000002'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'map', 'e3600001-0000-4000-8000-000000000001'::uuid, 'link');
  $t$,
  '42501',
  null,
  'authenticated cannot insert gadget refs'
);

select * from finish ();

rollback;
