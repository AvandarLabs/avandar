\set ON_ERROR_STOP on

/**
 * `rpc_activity_events__get_case_page` pages a case's feed on the full
 * `(occurred_at, recorded_at, id)` keyset, so events that share a timestamp
 * are never skipped or repeated across pages, and RLS still applies because
 * the function runs as the caller.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e3000001-0000-4000-8000-000000000001'::uuid, 'page_member@test.dev', 'authenticated', 'authenticated'),
  ('e3000002-0000-4000-8000-000000000002'::uuid, 'page_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'page ws', 'page-ws'),
  ('e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid, 'page other ws', 'page-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e3200001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid),
  ('e3200002-0000-4000-8000-000000000002'::uuid, 'e3100002-0000-4000-8000-000000000002'::uuid, 'e3000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

-- A case type and its default status reference each other; the
-- foreign key is deferred, so both rows go in before the commit.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('e3300001-0000-4000-8000-000000000001'::uuid, 'e3000001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'page concept', true, 'e33f0001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('e33f0001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'e3300001-0000-4000-8000-000000000001'::uuid, 'Open', '#40c057', 0)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values
  ('e3400001-0000-4000-8000-000000000001'::uuid, 'e3100001-0000-4000-8000-000000000001'::uuid, 'Paged case', 'e3300001-0000-4000-8000-000000000001'::uuid, 'page-ext-1')
on conflict (id) do nothing;

-- Five events that share both timestamps, so only `id` orders them. A cursor
-- on `occurred_at` alone would skip every event after the first page.
insert into public.activity_events (id, workspace_id, individual_id, kind, occurred_at, recorded_at)
select
  event_id,
  'e3100001-0000-4000-8000-000000000001'::uuid,
  'e3400001-0000-4000-8000-000000000001'::uuid,
  'comment_created',
  '2026-11-06T10:00:00+00'::timestamptz,
  '2026-11-06T10:00:00+00'::timestamptz
from
  unnest(
    array[
      'e3500001-0000-4000-8000-000000000001',
      'e3500002-0000-4000-8000-000000000002',
      'e3500003-0000-4000-8000-000000000003',
      'e3500004-0000-4000-8000-000000000004',
      'e3500005-0000-4000-8000-000000000005'
    ]::uuid[]
  ) as event_id;

-- Each page row, tagged with its page and position within the page.
create temp table paged_events (
  page_number int not null,
  page_position bigint not null,
  id uuid not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null
);

grant all on table paged_events to authenticated;

select plan (8);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e3000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into paged_events
select 1, page.ordinality, page.id, page.occurred_at, page.recorded_at
from public.rpc_activity_events__get_case_page (
  'e3400001-0000-4000-8000-000000000001'::uuid,
  array['comment_created']::public.activity_events__kind[],
  2
) with ordinality as page;

insert into paged_events
select 2, page.ordinality, page.id, page.occurred_at, page.recorded_at
from
  (select * from paged_events where page_number = 1 order by page_position desc limit 1) cursor_row
  cross join lateral public.rpc_activity_events__get_case_page (
    'e3400001-0000-4000-8000-000000000001'::uuid,
    array['comment_created']::public.activity_events__kind[],
    2,
    cursor_row.occurred_at,
    cursor_row.recorded_at,
    cursor_row.id
  ) with ordinality as page;

insert into paged_events
select 3, page.ordinality, page.id, page.occurred_at, page.recorded_at
from
  (select * from paged_events where page_number = 2 order by page_position desc limit 1) cursor_row
  cross join lateral public.rpc_activity_events__get_case_page (
    'e3400001-0000-4000-8000-000000000001'::uuid,
    array['comment_created']::public.activity_events__kind[],
    2,
    cursor_row.occurred_at,
    cursor_row.recorded_at,
    cursor_row.id
  ) with ordinality as page;

-- 1. Pages hold two, two, then one event.
select results_eq (
  'select count(*)::int from paged_events group by page_number order by page_number',
  array[2, 2, 1],
  'pages hold two, two, then one event'
);

-- 2. The page after the last event is empty.
select is_empty (
  $$
    select page.id
    from
      (select * from paged_events where page_number = 3 order by page_position desc limit 1) cursor_row
      cross join lateral public.rpc_activity_events__get_case_page (
        'e3400001-0000-4000-8000-000000000001'::uuid,
        array['comment_created']::public.activity_events__kind[],
        2,
        cursor_row.occurred_at,
        cursor_row.recorded_at,
        cursor_row.id
      ) page
  $$,
  'the page after the last event is empty'
);

-- 3. Every event appears exactly once across the pages.
select results_eq (
  'select id from paged_events group by id having count(*) = 1 order by id',
  $$
    select id from public.activity_events
    where individual_id = 'e3400001-0000-4000-8000-000000000001'::uuid
    order by id
  $$,
  'every event appears exactly once across the pages'
);

-- 4. Reading the pages in order gives the full keyset order.
select results_eq (
  'select id from paged_events order by page_number, page_position',
  $$
    select id from public.activity_events
    where individual_id = 'e3400001-0000-4000-8000-000000000001'::uuid
    order by occurred_at desc, recorded_at desc, id desc
  $$,
  'pages follow occurred_at, recorded_at, id descending'
);

-- 5. Kinds outside `p_kinds` are filtered out.
select is_empty (
  $$
    select id from public.rpc_activity_events__get_case_page (
      'e3400001-0000-4000-8000-000000000001'::uuid,
      array['comment_deleted']::public.activity_events__kind[],
      10
    )
  $$,
  'events of other kinds are not returned'
);

-- 6. A member of the case's workspace reads every event.
select is (
  (
    select count(*)::int from public.rpc_activity_events__get_case_page (
      'e3400001-0000-4000-8000-000000000001'::uuid,
      array['comment_created']::public.activity_events__kind[],
      10
    )
  ),
  5,
  'a workspace member reads every event'
);

select set_config('request.jwt.claims', '{"sub":"e3000002-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- 7. An outsider gets nothing: the function runs as the caller, so RLS applies.
select is (
  (
    select count(*)::int from public.rpc_activity_events__get_case_page (
      'e3400001-0000-4000-8000-000000000001'::uuid,
      array['comment_created']::public.activity_events__kind[],
      10
    )
  ),
  0,
  'an outsider in another workspace reads no events'
);

reset role;

-- 8. `anon` cannot execute the function.
select ok (
  not has_function_privilege (
    'anon',
    'public.rpc_activity_events__get_case_page(uuid, public.activity_events__kind[], integer, timestamptz, timestamptz, uuid)',
    'execute'
  ),
  'anon cannot execute the function'
);

select * from finish();

rollback;
