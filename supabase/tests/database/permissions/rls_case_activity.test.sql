\set ON_ERROR_STOP on

/**
 * RLS for the case activity tables: members read, only authors change their
 * comments, only reactors change their reactions, and nobody but triggers
 * writes the audit tables.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e2000001-0000-4000-8000-000000000001'::uuid, 'rls_activity_author@test.dev', 'authenticated', 'authenticated'),
  ('e2000002-0000-4000-8000-000000000002'::uuid, 'rls_activity_member@test.dev', 'authenticated', 'authenticated'),
  ('e2000003-0000-4000-8000-000000000003'::uuid, 'rls_activity_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'rls activity ws', 'rls-activity-ws'),
  ('e2100002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, 'rls activity other', 'rls-activity-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e2200001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid),
  ('e2200002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid),
  ('e2200003-0000-4000-8000-000000000003'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('e2300001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'rls concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e2400001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'Case', 'e2300001-0000-4000-8000-000000000001'::uuid, 'ext-1')
on conflict (id) do nothing;

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values
  ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'live'),
  ('e2500002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'to delete');

update public.comments set deleted_at = now() where id = 'e2500002-0000-4000-8000-000000000002'::uuid;

select plan (13);

-- 1. A member reads a teammate's comment and the case activity.
select lives_ok (
  $t$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member cannot read a teammate''s comment';
    end if;
    if (select count(*)::int from public.activity_events where individual_id = 'e2400001-0000-4000-8000-000000000001'::uuid) < 1 then
      raise exception 'a member cannot read the case activity';
    end if;
  end $chk$;
  $t$,
  'a member reads comments and activity on cases in their workspace'
);

-- 2. An outsider sees nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comments) + (select count(*)::int from public.activity_events where individual_id = 'e2400001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider can read another workspace''s activity';
    end if;
  end $chk$;
  $t$,
  'an outsider reads no comments or activity'
);

-- 3. A member cannot post as someone else.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, '{"type":"doc"}'::jsonb, 'spoof');
  $t$,
  '42501',
  null,
  'a member cannot insert a comment authored by someone else'
);

-- 4. A member's update of someone else's comment changes nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.comments set body_text = 'hijacked', body = '{"type":"doc"}'::jsonb where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 'live' then
      raise exception 'a member edited someone else''s comment';
    end if;
  end $chk$;
  $t$,
  'only the author can edit a comment'
);

-- 5. The author edits their own comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments set body_text = 'edited', body = '{"type":"doc","content":[]}'::jsonb where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) <> 'edited' then
      raise exception 'the author could not edit their comment';
    end if;
  end $chk$;
  $t$,
  'the author edits their own comment'
);

-- 6. Nobody hard-deletes a comment through the API.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  $t$,
  '42501',
  null,
  'authenticated has no DELETE on comments'
);

-- 7. The author cannot edit a deleted comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments set body_text = 'revived', body = '{"type":"doc"}'::jsonb where id = 'e2500002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select body_text from public.comments where id = 'e2500002-0000-4000-8000-000000000002'::uuid) is not null then
      raise exception 'a deleted comment was edited';
    end if;
  end $chk$;
  $t$,
  'a deleted comment cannot be edited'
);

-- 8. A member reacts for themselves.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'celebrate');
  $t$,
  'a member reacts to a comment'
);

-- 9. A member cannot react for someone else.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');
  $t$,
  '42501',
  null,
  'a member cannot react on behalf of someone else'
);

-- 10. Nobody reacts to a deleted comment.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500002-0000-4000-8000-000000000002'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');
  $t$,
  '42501',
  null,
  'reacting to a deleted comment is rejected'
);

-- 11. The client cannot write the activity log.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.activity_events (workspace_id, individual_id, kind)
  values ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'comment_created');
  $t$,
  '42501',
  null,
  'authenticated cannot insert activity events'
);

-- 12. The client cannot read revisions.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select count(*) from public.comment_revisions;
  $t$,
  '42501',
  null,
  'authenticated cannot read comment revisions'
);

-- 13. The client cannot write mentions.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.comment_mentions (comment_id, mentioned_user_id, workspace_id)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000002-0000-4000-8000-000000000002'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid);
  $t$,
  '42501',
  null,
  'authenticated cannot insert mentions'
);

select * from finish ();

rollback;
