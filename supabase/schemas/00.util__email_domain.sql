-- Extracts the domain from an email address for analytics payloads.
--
-- Analytics payloads are barred from carrying raw email addresses. The domain
-- alone answers the questions we actually ask (does adoption spread inside one
-- company, which providers do signups come from) and is not personal data on
-- its own, so every acquisition and invite event records this instead of the
-- address.
--
-- Returns null rather than raising for a null or malformed address:
-- `auth.users.email` is nullable for phone-based accounts, and a trigger that
-- raises on the signup path breaks signup.
--
-- @param p_email: an email address, or null
-- @returns: the lower-cased domain, or null when there is not one
create or replace function public.util__email_domain (
  p_email text
) returns text as $$
  with normalized_email as (
    select lower(trim(p_email)) as value
  )
  select case
    when value ~ '^[^@]+@[^@]+$' then split_part(value, '@', 2)
    else null
  end
  from normalized_email;
$$ language sql immutable
set
  search_path = '';
