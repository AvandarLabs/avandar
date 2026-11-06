\set ON_ERROR_STOP on

/**
 * Triggers and constraints on `comments`: every change writes a revision and
 * an activity event, mentions are extracted from the stored document, and
 * Sync's upsert leaves comments intact.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e1000001-0000-4000-8000-000000000001'::uuid, 'activity_author@test.dev', 'authenticated', 'authenticated'),
  ('e1000002-0000-4000-8000-000000000002'::uuid, 'activity_member@test.dev', 'authenticated', 'authenticated'),
  ('e1000003-0000-4000-8000-000000000003'::uuid, 'activity_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e1100001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid, 'activity ws', 'activity-ws'),
  ('e1100002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid, 'activity other ws', 'activity-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e1200001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid),
  ('e1200002-0000-4000-8000-000000000002'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'e1000002-0000-4000-8000-000000000002'::uuid),
  ('e1200003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values
  ('e1300001-0000-4000-8000-000000000001'::uuid, 'e1000001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'activity concept', true),
  ('e1300002-0000-4000-8000-000000000002'::uuid, 'e1000003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'other concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values
  ('e1400001-0000-4000-8000-000000000001'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'Case one', 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-1'),
  ('e1400002-0000-4000-8000-000000000002'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'Case two', 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-2'),
  ('e1400003-0000-4000-8000-000000000003'::uuid, 'e1100002-0000-4000-8000-000000000002'::uuid, 'Other case', 'e1300002-0000-4000-8000-000000000002'::uuid, 'ext-9')
on conflict (id) do nothing;

-- The actor every trigger records.
select set_config('request.jwt.claims', '{"sub":"e1000001-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e1500001-0000-4000-8000-000000000001'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"first"}]}]}'::jsonb,
  'first'
);

select plan (22);

-- 1. Insert writes one comment_created event.
select is (
  (
    select jsonb_build_object('kind', e.kind, 'actor', e.actor_user_id, 'case', e.individual_id, 'payload', e.payload)
    from public.activity_events e
    where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'kind', 'comment_created',
    'actor', 'e1000001-0000-4000-8000-000000000001',
    'case', 'e1400001-0000-4000-8000-000000000001',
    'payload', '{}'::jsonb
  ),
  'inserting a comment logs comment_created with the actor and the case'
);

update public.comments
set
  body = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"second"}]}]}'::jsonb,
  body_text = 'second'
where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

-- 2. Editing keeps the old body as an edit revision.
select is (
  (
    select r.body_text || ':' || r.reason::text
    from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid
  ),
  'first:edit',
  'editing stores the previous body as an edit revision'
);

-- 3. Editing sets edited_at.
select isnt (
  (select edited_at from public.comments where id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  null,
  'editing sets edited_at'
);

-- 4. Editing logs comment_edited pointing at the revision.
select is (
  (
    select (e.payload ->> 'revision_id')::uuid
    from public.activity_events e
    where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and e.kind = 'comment_edited'
  ),
  (
    select r.id from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and r.reason = 'edit'
  ),
  'comment_edited carries the revision id'
);

-- 5. An update that changes neither the body nor deleted_at logs nothing.
update public.comments set body_schema_version = 1 where id = 'e1500001-0000-4000-8000-000000000001'::uuid;
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  2,
  'a no-op update writes no activity event'
);

-- 6 and 7. Mentions: duplicates collapse, non-members are ignored, nested nodes are found.
update public.comments
set
  body = '{"type":"doc","content":[
    {"type":"paragraph","content":[{"type":"userMention","attrs":{"id":"e1000002-0000-4000-8000-000000000002"}}]},
    {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[
      {"type":"userMention","attrs":{"id":"e1000002-0000-4000-8000-000000000002"}},
      {"type":"userMention","attrs":{"id":"e1000003-0000-4000-8000-000000000003"}},
      {"type":"userMention","attrs":{"id":"not-a-uuid"}}
    ]}]}]}
  ]}'::jsonb,
  body_text = '@member @member @outsider'
where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

select is (
  (select count(*)::int from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  1,
  'mentions are de-duplicated and limited to workspace members'
);
select is (
  (select m.mentioned_user_id from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  'e1000002-0000-4000-8000-000000000002'::uuid,
  'the member mentioned in a nested list is extracted'
);

-- 8 to 11. Soft delete.
update public.comments set deleted_at = now() where id = 'e1500001-0000-4000-8000-000000000001'::uuid;

select is (
  (
    select r.body_text from public.comment_revisions r
    where r.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and r.reason = 'delete'
  ),
  '@member @member @outsider',
  'deleting stores the last body as a delete revision'
);
select is (
  (select coalesce(body::text, 'null') || '|' || coalesce(body_text, 'null') from public.comments where id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  'null|null',
  'deleting clears the body and its text'
);
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid and e.kind = 'comment_deleted'),
  1,
  'deleting logs comment_deleted'
);
select is (
  (select count(*)::int from public.comment_mentions m where m.comment_id = 'e1500001-0000-4000-8000-000000000001'::uuid),
  0,
  'a deleted comment has no mentions'
);

-- 12. A deleted comment cannot be restored.
select throws_ok (
  $$ update public.comments set deleted_at = null where id = 'e1500001-0000-4000-8000-000000000001'::uuid $$,
  '22023',
  null,
  'a deleted comment cannot be restored'
);

-- 13. A comment cannot point at a case from another workspace.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    'e1400003-0000-4000-8000-000000000003'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc"}'::jsonb,
    ''
  )
  $$,
  '23514',
  'The case belongs to a different workspace',
  'a comment cannot be attached to a case in another workspace'
);

-- 14. Text over 10,000 characters is rejected.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    'e1400001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc"}'::jsonb,
    repeat('x', 10001)
  )
  $$,
  '23514',
  'new row for relation "comments" violates check constraint "comments__body_text_length"',
  'body_text is capped at 10,000 characters'
);

-- 15. Sync's upsert (diffStagedIndividualsHelpers.ts) leaves comments on the case.
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e1500002-0000-4000-8000-000000000002'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400002-0000-4000-8000-000000000002'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc"}'::jsonb,
  ''
);
insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
values ('e1100001-0000-4000-8000-000000000001'::uuid, 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-2', 'Case two renamed', null)
on conflict (external_id, concept_id) do update
set name = excluded.name, missing_from_source_at = excluded.missing_from_source_at;
select is (
  (select individual_id from public.comments where id = 'e1500002-0000-4000-8000-000000000002'::uuid),
  'e1400002-0000-4000-8000-000000000002'::uuid,
  'a Sync upsert of the case keeps its comments'
);

-- 16. Deleting the case removes its comments and their events.
delete from public.individuals where id = 'e1400002-0000-4000-8000-000000000002'::uuid;
select is (
  (select count(*)::int from public.activity_events e where e.comment_id = 'e1500002-0000-4000-8000-000000000002'::uuid),
  0,
  'deleting the case cascades to its comments and activity'
);

-- 17. A mention inside a blockquote is extracted.
insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values (
  'e1500003-0000-4000-8000-000000000003'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc","content":[{"type":"blockquote","content":[{"type":"paragraph","content":[
    {"type":"userMention","attrs":{"id":"e1000002-0000-4000-8000-000000000002"}}
  ]}]}]}'::jsonb,
  '@member'
);
select is (
  (
    select array_agg(m.mentioned_user_id)
    from public.comment_mentions m
    where m.comment_id = 'e1500003-0000-4000-8000-000000000003'::uuid
  ),
  array['e1000002-0000-4000-8000-000000000002'::uuid],
  'a member mentioned inside a blockquote is extracted'
);

-- 18. A comment cannot move to another case, even in its own workspace.
insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e1400004-0000-4000-8000-000000000004'::uuid, 'e1100001-0000-4000-8000-000000000001'::uuid, 'Case four', 'e1300001-0000-4000-8000-000000000001'::uuid, 'ext-4')
on conflict (id) do nothing;
select throws_ok (
  $$
  update public.comments
  set individual_id = 'e1400004-0000-4000-8000-000000000004'::uuid
  where id = 'e1500003-0000-4000-8000-000000000003'::uuid
  $$,
  '22023',
  null,
  'a comment cannot be moved to another case'
);

-- 19. A comment must have a subject.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    null,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc"}'::jsonb,
    ''
  )
  $$,
  '23514',
  'new row for relation "comments" violates check constraint "comments__exactly_one_subject"',
  'a comment without a case is rejected'
);

-- 20. A document over 256 KB is rejected.
select throws_ok (
  $$
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values (
    'e1100001-0000-4000-8000-000000000001'::uuid,
    'e1400001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_object('type', 'doc', 'pad', repeat('x', 300000)),
    'short'
  )
  $$,
  '23514',
  'new row for relation "comments" violates check constraint "comments__body_size"',
  'body is capped at 256 KB'
);

-- 21. Changing only the plain text still counts as an edit.
update public.comments
set body_text = '@member quoted'
where id = 'e1500003-0000-4000-8000-000000000003'::uuid;
select is (
  (
    select jsonb_build_object(
      'revisions', (
        select count(*)::int from public.comment_revisions r
        where r.comment_id = 'e1500003-0000-4000-8000-000000000003'::uuid and r.reason = 'edit'
      ),
      'events', (
        select count(*)::int from public.activity_events e
        where e.comment_id = 'e1500003-0000-4000-8000-000000000003'::uuid and e.kind = 'comment_edited'
      ),
      'is_edited', (
        select c.edited_at is not null from public.comments c
        where c.id = 'e1500003-0000-4000-8000-000000000003'::uuid
      )
    )
  ),
  '{"revisions": 1, "events": 1, "is_edited": true}'::jsonb,
  'an update of only body_text writes an edit revision and a comment_edited event'
);

-- 22. The server owns the timestamps and deletion state of a new comment.
insert into public.comments (
  id, workspace_id, individual_id, author_user_id, body, body_text, created_at, updated_at, edited_at, deleted_at
)
values (
  'e1500004-0000-4000-8000-000000000004'::uuid,
  'e1100001-0000-4000-8000-000000000001'::uuid,
  'e1400001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  '{"type":"doc"}'::jsonb,
  'backdated',
  '2000-01-01T00:00:00Z',
  '2000-01-01T00:00:00Z',
  '2000-01-02T00:00:00Z',
  '2000-01-03T00:00:00Z'
);
select is (
  (
    select jsonb_build_object(
      'is_created_now', c.created_at = now(),
      'is_updated_now', c.updated_at = now(),
      'edited_at', c.edited_at,
      'deleted_at', c.deleted_at,
      'has_body', c.body is not null
    )
    from public.comments c
    where c.id = 'e1500004-0000-4000-8000-000000000004'::uuid
  ),
  '{"is_created_now": true, "is_updated_now": true, "edited_at": null, "deleted_at": null, "has_body": true}'::jsonb,
  'an insert cannot backdate a comment or create it edited or deleted'
);

select * from finish ();

rollback;
