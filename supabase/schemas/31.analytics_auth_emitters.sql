-- Trigger functions that emit account-level `usage_analytics_events` rows from
-- `auth.users`.
--
-- The functions live in `public`, and their trigger attachments on
-- `auth.users` are kept in the same declarative file so schema diffs preserve
-- the complete emitter lifecycle.
--
-- These events cannot be emitted from the client. `signUp` returns no session
-- when email confirmation is enabled, and the INSERT policy on
-- `usage_analytics_events` requires `user_id = auth.uid()`, so registration is
-- unrecordable from the browser. A trigger on `last_sign_in_at` also captures
-- desktop sign-ins for free, where a client hook would have to be duplicated in
-- the Electrobun platform auth provider.
--
-- Both bodies are wrapped in `exception when others then return null`, on top
-- of the `exception` block already inside `util__log_analytics_event`. The
-- helper only protects against a failing insert; it does not protect against a
-- failure while building the payload. A trigger on `auth.users` that raises
-- turns every signup into "Database error saving new user", so nothing in
-- these bodies is allowed to escape.
-- Records `user.registered` when a row appears in `auth.users`.
--
-- `hadPendingInvite` is resolved here rather than passed in, because it
-- separates viral signup from organic signup at the cost of one indexed lookup
-- and because `workspace_invites` is not readable by the signing-up user at
-- this point. The comparison is case-insensitive: invites are sent to whatever
-- the inviter typed, and the address the user registers with may differ in
-- case.
--
-- @returns: trigger
create or replace function public.auth_users__log_registered_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'user.registered',
    null,
    new.id,
    null,
    jsonb_build_object(
      'emailDomain', public.util__email_domain(new.email),
      'provider', new.raw_app_meta_data ->> 'provider',
      'hadPendingInvite', exists (
        select 1
        from public.workspace_invites i
        where lower(i.email) = lower(new.email) and
          i.invite_status = 'pending'
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
execute on function public.auth_users__log_registered_analytics_event ()
from
  public,
  anon,
  authenticated;

drop trigger if exists tr__auth_users__log_registered_analytics_event on auth.users;

create trigger tr__auth_users__log_registered_analytics_event
after insert on auth.users for each row
execute function public.auth_users__log_registered_analytics_event ();

-- Records `user.email_confirmed` and `user.signed_in`.
--
-- The two share one trigger because both are decided by comparing OLD and NEW
-- on the same row: `email_confirmed_at` going from null to non-null, and
-- `last_sign_in_at` changing. Splitting them would double the per-update cost
-- to record the same information.
--
-- `daysSinceLastSignIn` is null on the first sign-in rather than zero, because
-- zero would be indistinguishable from a user signing in twice in one day and
-- would flatten the retention view.
--
-- @returns: trigger
create or replace function public.auth_users__log_updated_analytics_events () returns trigger as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.util__log_analytics_event(
      'user.email_confirmed',
      null,
      new.id,
      null,
      jsonb_build_object(
        'emailDomain', public.util__email_domain(new.email),
        'secondsToConfirm', floor(
          extract(
            epoch
            from
              (new.email_confirmed_at - new.created_at)
          )
        )
      )
    );
  end if;

  if new.last_sign_in_at is distinct from old.last_sign_in_at and
    new.last_sign_in_at is not null then
    perform public.util__log_analytics_event(
      'user.signed_in',
      null,
      new.id,
      null,
      jsonb_build_object(
        'isFirstSignIn',
        old.last_sign_in_at is null,
        'daysSinceLastSignIn',
        case
          when old.last_sign_in_at is null then null
          else floor(
            extract(
              epoch
              from
                (new.last_sign_in_at - old.last_sign_in_at)
            ) / 86400
          )
        end
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.auth_users__log_updated_analytics_events ()
from
  public,
  anon,
  authenticated;

drop trigger if exists tr__auth_users__log_updated_analytics_events on auth.users;

create trigger tr__auth_users__log_updated_analytics_events
after
update on auth.users for each row
execute function public.auth_users__log_updated_analytics_events ();
