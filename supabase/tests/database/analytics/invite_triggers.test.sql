-- Covers `workspace.invite_sent` and `workspace.invite_accepted`.
--
-- `inviteId` is the join key between the two, which is what lets the invite
-- funnel be built without hashing email addresses. A bare hash of an address is
-- dictionary-reversible and still counts as personal data; an invite id is
-- meaningless outside `workspace_invites`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, instance_id, email, aud, role, created_at)
values (
  'b3000001-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'iv_owner@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
),
(
  'b3000002-0000-4000-8000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'iv_existing@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '20 days'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'iv workspace',
  'iv-invite-triggers-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b3002001-0000-4000-8000-000000000001'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid
);

select plan(6);

select has_index(
  'auth',
  'users',
  'users_instance_id_email_idx',
  'case-insensitive invitee registration lookup is indexed'
);

-- An invite to someone who already has an account.
insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status, created_at
)
values (
  'b3003001-0000-4000-8000-000000000001'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'IV_Existing@Acme.DEV',
  'member',
  'pending',
  now() - interval '2 days'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'inviteId', 'b3003001-0000-4000-8000-000000000001',
    'invitedEmailDomain', 'acme.dev',
    'inviteeAlreadyRegistered', true,
    'memberCountBefore', 1
  ),
  'the invite payload carries the invite id and domain, never the address'
);

select is(
  (
    select user_id
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'the event is attributed to the inviter, not the invitee'
);

-- An invite to an address with no account yet.
insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status, created_at
)
values (
  'b3003002-0000-4000-8000-000000000002'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'stranger@newco.dev',
  'member',
  'pending',
  now() - interval '2 days'
);

select is(
  (
    select payload ->> 'inviteeAlreadyRegistered'
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003002-0000-4000-8000-000000000002'
  ),
  'false',
  'an invite to an address with no account is not marked as already registered'
);

update public.workspace_invites
set invite_status = 'accepted',
  user_id = 'b3000002-0000-4000-8000-000000000002'::uuid
where id = 'b3003001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.invite_accepted'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'inviteId', 'b3003001-0000-4000-8000-000000000001',
    'secondsFromInviteToAccept', 172800,
    'memberCountAfter', 2
  ),
  'acceptance records the same invite id, the wait, and the seat count including the new member'
);

-- The accept route inserts the membership after updating the invite.
insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b3002002-0000-4000-8000-000000000002'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000002-0000-4000-8000-000000000002'::uuid
);

-- A second update on an already-accepted invite, such as an `updated_at` bump,
-- must not record a second acceptance.
update public.workspace_invites
set role = 'admin'
where id = 'b3003001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name = 'workspace.invite_accepted'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'updating an already-accepted invite does not record a second acceptance'
);

select * from finish();

rollback;
