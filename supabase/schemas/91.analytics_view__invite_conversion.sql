-- One row per invite sent, with its acceptance if there was one.
--
-- The join key is `inviteId`, an id that is meaningless outside
-- `workspace_invites`. This is why the invite events never carry a hashed
-- email: a bare hash of an address is dictionary-reversible and still counts as
-- personal data, while this id reveals nothing on its own.
--
-- `invited_email_domain` is the column that answers whether adoption is
-- spreading inside one company or scattering across many.
--
-- A LEFT JOIN, not an inner one: an invite that was never accepted is the whole
-- point of a conversion view.
create or replace view analytics.invite_conversion as
with
  sent as (
    select
      e.payload ->> 'inviteId' as invite_id,
      e.workspace_id,
      e.user_id as invited_by,
      e.created_at as sent_at,
      e.payload ->> 'invitedEmailDomain' as invited_email_domain,
      (
        e.payload ->> 'inviteeAlreadyRegistered'
      )::boolean as invitee_already_registered,
      (
        e.payload ->> 'memberCountBefore'
      )::int as member_count_before
    from
      public.usage_analytics_events e
    where
      e.event_name = 'workspace.invite_sent'
  ),
  accepted as (
    select
      e.payload ->> 'inviteId' as invite_id,
      e.created_at as accepted_at,
      (
        e.payload ->> 'secondsFromInviteToAccept'
      )::numeric as seconds_to_accept,
      (
        e.payload ->> 'memberCountAfter'
      )::int as member_count_after
    from
      public.usage_analytics_events e
    where
      e.event_name = 'workspace.invite_accepted'
  )
select
  s.invite_id,
  s.workspace_id,
  s.invited_by,
  s.invited_email_domain,
  s.invitee_already_registered,
  s.member_count_before,
  s.sent_at,
  a.accepted_at,
  a.accepted_at is not null as was_accepted,
  a.seconds_to_accept,
  a.member_count_after
from
  sent s
  left join accepted a on a.invite_id = s.invite_id
order by
  s.sent_at desc;

grant
select
  on analytics.invite_conversion to service_role;
