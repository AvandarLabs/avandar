-- Covers `workspace.created` and `member.removed`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt_owner@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour'
);

insert into auth.users (id, email, aud, role, created_at)
values (
  'b2000002-0000-4000-8000-000000000002'::uuid,
  'wt_member@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour'
);

select plan(7);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt first workspace',
  'wt-first-workspace'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'isFirstWorkspaceForUser', true,
    'secondsSinceUserRegistered', 3600
  ),
  'the first workspace is flagged and measured from the owner registration time'
);

select is(
  (
    select user_id
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'the event is attributed to the workspace owner'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'activation',
  'workspace.created is categorised as activation'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001002-0000-4000-8000-000000000002'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt second workspace',
  'wt-second-workspace'
);

select is(
  (
    select payload ->> 'isFirstWorkspaceForUser'
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001002-0000-4000-8000-000000000002'::uuid
  ),
  'false',
  'the second workspace for the same owner is not flagged as their first'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b2002001-0000-4000-8000-000000000001'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid
),
(
  'b2002002-0000-4000-8000-000000000002'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000002-0000-4000-8000-000000000002'::uuid
);

delete from public.workspace_memberships
where id = 'b2002002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'member.removed'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object('memberCountAfter', 1),
  'removing a member records the seat count that remains'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'member.removed'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'expansion',
  'member.removed is categorised as expansion, the seat-movement bucket'
);

-- Deleting the workspace cascades to its memberships, so the emitter fires for
-- a workspace that is being deleted in the same statement. The analytics insert
-- fails its foreign key and `util__log_analytics_event` swallows it. The point
-- of the assertion is that the workspace delete itself still succeeds.
select lives_ok(
  $$ delete from public.workspaces
     where id = 'b2001001-0000-4000-8000-000000000001'::uuid $$,
  'deleting a workspace succeeds even though the cascading member.removed insert cannot land'
);

select * from finish();

rollback;
