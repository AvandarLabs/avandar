-- Analytics emitters for the invite funnel.
--
-- These live here rather than in `05.workspace_invites.sql` because they call
-- `public.util__log_analytics_event`, which `30.usage_analytics_events.sql`
-- defines, and schema files are applied in lexicographic order.
--
-- Both payloads carry the invite row's own id plus the email domain, never the
-- address. `inviteId` is the join key between `invite_sent` and
-- `invite_accepted`, which avoids hashed emails entirely: a bare hash of an
-- address is dictionary-reversible and still counts as personal data, while an
-- invite id is meaningless outside `workspace_invites`.

-- Records `workspace.invite_sent`.
--
-- `inviteeAlreadyRegistered` is resolved by looking the address up in
-- `auth.users` rather than by reading `new.user_id`. The invite route sets
-- `user_id` when it can, but a seed script or a support fix may not, and the
-- whole point of instrumenting this in the database is that it does not depend
-- on one code path getting it right.
-- The inviter's Auth instance scopes the comparison and makes the existing
-- `(instance_id, lower(email))` Auth index usable.
--
-- @returns: trigger
create or replace function public.workspace_invites__log_sent_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'workspace.invite_sent',
    new.workspace_id,
    new.invited_by,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'invitedEmailDomain', public.util__email_domain(new.email),
      'inviteeAlreadyRegistered', exists (
        select 1
        from auth.users u
        where u.instance_id = (
          select inviter.instance_id
          from auth.users inviter
          where inviter.id = new.invited_by
        ) and
          lower(u.email) = lower(new.email)
      ),
      'memberCountBefore', (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.workspace_invites__log_sent_analytics_event ()
from
  public,
  anon,
  authenticated;

create trigger tr__workspace_invites__log_sent_analytics_event
after insert on public.workspace_invites for each row
execute function public.workspace_invites__log_sent_analytics_event ();

-- Records `workspace.invite_accepted` on the pending-to-accepted transition
-- only. Every other update, including the `updated_at` bump and a later role
-- change, is ignored, so acceptance is recorded exactly once per invite.
--
-- `memberCountAfter` counts every other member plus the accepting one, rather
-- than reading the membership table as it stands. The accept route updates the
-- invite row before it inserts the membership, so a plain count would be short
-- by one, and counting this way is also correct if the membership row already
-- exists.
--
-- @returns: trigger
create or replace function public.workspace_invites__log_accepted_analytics_event () returns trigger as $$
begin
  if old.invite_status = 'accepted' or new.invite_status <> 'accepted' then
    return null;
  end if;

  perform public.util__log_analytics_event(
    'workspace.invite_accepted',
    new.workspace_id,
    new.user_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'secondsFromInviteToAccept', floor(
        extract(
          epoch
          from
            (now() - new.created_at)
        )
      ),
      'memberCountAfter', (
        select count(*) + 1
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id and
          m.user_id is distinct from new.user_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.workspace_invites__log_accepted_analytics_event ()
from
  public,
  anon,
  authenticated;

create trigger tr__workspace_invites__log_accepted_analytics_event
after
update on public.workspace_invites for each row
execute function public.workspace_invites__log_accepted_analytics_event ();
