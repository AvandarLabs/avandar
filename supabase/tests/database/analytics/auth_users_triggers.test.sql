-- Covers `user.registered`, `user.email_confirmed`, and `user.signed_in`.
--
-- These are triggers rather than client code for a reason the tests exercise
-- directly: they insert into and update `auth.users` with no client involved,
-- which is exactly what GoTrue does. Registration in particular cannot be
-- captured from the browser at all when email confirmation is enabled, because
-- `signUp` returns no session and the INSERT policy requires
-- `user_id = auth.uid()`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- The inviter, and a workspace and a pending invite, so the second signup can
-- prove `hadPendingInvite` separates viral from organic signup.
insert into auth.users (id, email, aud, role, created_at, raw_app_meta_data)
values (
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'inviter@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days',
  '{"provider": "email"}'::jsonb
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'au workspace',
  'au-auth-triggers-ws'
);

insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status
)
values (
  'b1002001-0000-4000-8000-000000000001'::uuid,
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'Invitee@NewCo.DEV',
  'member',
  'pending'
);

select plan(11);

select has_index(
  'public',
  'workspace_invites',
  'idx_workspace_invites__pending_email',
  'pending invite lookup by normalized email is indexed'
);

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'inserting a row into auth.users records exactly one user.registered event'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'emailDomain', 'acme.dev',
    'provider', 'email',
    'hadPendingInvite', false
  ),
  'the payload carries the domain and provider and no email address'
);

select is(
  (
    select workspace_id
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  null,
  'registration is an account-level fact and has no workspace'
);

select is(
  (
    select client::text
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  'db',
  'the row is stamped as database-emitted'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  'acquisition',
  'user.registered is categorised as acquisition'
);

-- The invited address, matched case-insensitively against the pending invite.
insert into auth.users (id, email, aud, role, created_at, raw_app_meta_data)
values (
  'b1000002-0000-4000-8000-000000000002'::uuid,
  'invitee@newco.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour',
  '{"provider": "google"}'::jsonb
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object(
    'emailDomain', 'newco.dev',
    'provider', 'google',
    'hadPendingInvite', true
  ),
  'a signup matching a pending invite is marked viral, matched case-insensitively'
);

update auth.users
set email_confirmed_at = created_at + interval '90 seconds'
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.email_confirmed'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object('emailDomain', 'newco.dev', 'secondsToConfirm', 90),
  'confirming an email records the domain and how long confirmation took'
);

update auth.users
set last_sign_in_at = now() - interval '10 days'
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.signed_in'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object('isFirstSignIn', true, 'daysSinceLastSignIn', null),
  'the first sign-in is flagged and has no previous sign-in to measure from'
);

update auth.users
set last_sign_in_at = now()
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.signed_in'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
      and payload ->> 'isFirstSignIn' = 'false'
  ),
  jsonb_build_object('isFirstSignIn', false, 'daysSinceLastSignIn', 10),
  'a later sign-in records the whole-day gap since the previous one'
);

-- `auth.users.email` is nullable for phone-based accounts. A trigger that
-- raises here turns every signup into "Database error saving new user", so the
-- null path is a correctness requirement, not an edge case.
select lives_ok(
  $$ insert into auth.users (id, email, aud, role, created_at)
     values (
       'b1000003-0000-4000-8000-000000000003'::uuid,
       null,
       'authenticated',
       'authenticated',
       now()
     ) $$,
  'a signup with no email address still succeeds'
);

select * from finish();

rollback;
