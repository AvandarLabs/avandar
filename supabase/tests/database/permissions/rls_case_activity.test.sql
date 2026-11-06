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

-- The author's own reaction, which another member must not change or remove.
insert into public.comment_reactions (id, comment_id, user_id, workspace_id, kind)
values ('e2600001-0000-4000-8000-000000000001'::uuid, 'e2500001-0000-4000-8000-000000000001'::uuid, 'e2000001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');

select plan (24);

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

-- 14. A member's update of someone else's reaction changes nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.comment_reactions set kind = 'funny' where id = 'e2600001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select kind::text from public.comment_reactions where id = 'e2600001-0000-4000-8000-000000000001'::uuid) <> 'like' then
      raise exception 'a member changed someone else''s reaction';
    end if;
  end $chk$;
  $t$,
  'a member cannot change someone else''s reaction'
);

-- 15. A member's delete of someone else's reaction removes nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.comment_reactions where id = 'e2600001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if not exists (select 1 from public.comment_reactions where id = 'e2600001-0000-4000-8000-000000000001'::uuid) then
      raise exception 'a member removed someone else''s reaction';
    end if;
  end $chk$;
  $t$,
  'a member cannot remove someone else''s reaction'
);

-- 16. A member's soft delete of someone else's comment changes nothing.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.comments set deleted_at = now() where id = 'e2500001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select deleted_at from public.comments where id = 'e2500001-0000-4000-8000-000000000001'::uuid) is not null then
      raise exception 'a member deleted someone else''s comment';
    end if;
  end $chk$;
  $t$,
  'only the author can delete a comment'
);

-- 17. The author posts as themselves through the default author and the
-- triggers log it and extract the mention.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.comments (id, workspace_id, individual_id, body, body_text)
  values (
    'e2500003-0000-4000-8000-000000000003'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2400001-0000-4000-8000-000000000001'::uuid,
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"userMention","attrs":{"id":"e2000002-0000-4000-8000-000000000002"}}]}]}'::jsonb,
    '@member'
  );
  reset role;
  do $chk$
  begin
    if (select author_user_id from public.comments where id = 'e2500003-0000-4000-8000-000000000003'::uuid) <> 'e2000001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the author was not defaulted to the caller';
    end if;
    if (
      select count(*)::int from public.activity_events
      where comment_id = 'e2500003-0000-4000-8000-000000000003'::uuid
        and kind = 'comment_created'
        and actor_user_id = 'e2000001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'posting did not log one comment_created event';
    end if;
    if (
      select count(*)::int from public.comment_mentions
      where comment_id = 'e2500003-0000-4000-8000-000000000003'::uuid
        and mentioned_user_id = 'e2000002-0000-4000-8000-000000000002'::uuid
    ) <> 1 then
      raise exception 'posting did not extract the mention';
    end if;
  end $chk$;
  $t$,
  'the author posts a comment and the triggers log it and extract its mention'
);

-- 18. The author cannot move their comment to another workspace.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments
  set workspace_id = 'e2100002-0000-4000-8000-000000000002'::uuid
  where id = 'e2500003-0000-4000-8000-000000000003'::uuid;
  $t$,
  '42501',
  null,
  'the author cannot move a comment to another workspace'
);

-- 19. An outsider cannot post into another workspace.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.comments (workspace_id, individual_id, author_user_id, body, body_text)
  values ('e2100001-0000-4000-8000-000000000001'::uuid, 'e2400001-0000-4000-8000-000000000001'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, '{"type":"doc"}'::jsonb, 'intruder');
  $t$,
  '42501',
  null,
  'an outsider cannot insert a comment into another workspace'
);

-- 20. An outsider reads no reactions or mentions from another workspace.
select lives_ok (
  $t$
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.comment_reactions) = 0
      or (select count(*)::int from public.comment_mentions) = 0
    then
      raise exception 'the fixture has no reactions or mentions to hide';
    end if;
  end $chk$;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.comment_reactions) + (select count(*)::int from public.comment_mentions) <> 0 then
      raise exception 'an outsider can read another workspace''s reactions or mentions';
    end if;
  end $chk$;
  reset role;
  $t$,
  'an outsider reads no reactions or mentions'
);

-- 21. An outsider cannot react to another workspace's comment.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'like');
  $t$,
  '42501',
  null,
  'an outsider cannot react to a comment in another workspace'
);

-- 22. Claiming their own workspace on the reaction does not help.
select throws_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.comment_reactions (comment_id, user_id, workspace_id, kind)
  values ('e2500001-0000-4000-8000-000000000001'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'like');
  $t$,
  '42501',
  null,
  'an outsider cannot react by claiming their own workspace'
);

-- A comment in the outsider's workspace, for the next test. Inserted as the
-- table owner after test 2, which expects the outsider to see no comments.
reset role;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('e2300002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'rls other concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values ('e2400002-0000-4000-8000-000000000002'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'Other case', 'e2300002-0000-4000-8000-000000000002'::uuid, 'ext-9')
on conflict (id) do nothing;

insert into public.comments (id, workspace_id, individual_id, author_user_id, body, body_text)
values ('e2500004-0000-4000-8000-000000000004'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'e2400002-0000-4000-8000-000000000002'::uuid, 'e2000003-0000-4000-8000-000000000003'::uuid, '{"type":"doc"}'::jsonb, 'elsewhere');

-- 23. A member cannot move their reaction onto another workspace's comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    update public.comment_reactions
    set comment_id = 'e2500004-0000-4000-8000-000000000004'::uuid
    where comment_id = 'e2500001-0000-4000-8000-000000000001'::uuid
      and user_id = 'e2000002-0000-4000-8000-000000000002'::uuid;
  exception
    when insufficient_privilege then
      -- Rejected by the policy's WITH CHECK, which is a pass.
      null;
  end $chk$;
  reset role;
  do $chk$
  begin
    if exists (
      select 1 from public.comment_reactions
      where comment_id = 'e2500004-0000-4000-8000-000000000004'::uuid
    ) or not exists (
      select 1 from public.comment_reactions
      where comment_id = 'e2500001-0000-4000-8000-000000000001'::uuid
        and user_id = 'e2000002-0000-4000-8000-000000000002'::uuid
    ) then
      raise exception 'a member moved their reaction to another workspace''s comment';
    end if;
  end $chk$;
  $t$,
  'a member cannot move a reaction to a comment in another workspace'
);

-- 24. The author soft-deletes their own comment.
select lives_ok (
  $t$
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"e2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.comments set deleted_at = now() where id = 'e2500003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (select body from public.comments where id = 'e2500003-0000-4000-8000-000000000003'::uuid) is not null then
      raise exception 'deleting did not clear the body';
    end if;
    if (
      select count(*)::int from public.comment_revisions
      where comment_id = 'e2500003-0000-4000-8000-000000000003'::uuid and reason = 'delete'
    ) <> 1 then
      raise exception 'deleting did not keep a delete revision';
    end if;
    if (
      select count(*)::int from public.activity_events
      where comment_id = 'e2500003-0000-4000-8000-000000000003'::uuid and kind = 'comment_deleted'
    ) <> 1 then
      raise exception 'deleting did not log comment_deleted';
    end if;
  end $chk$;
  $t$,
  'the author soft-deletes their own comment'
);

select * from finish ();

rollback;
