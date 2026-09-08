/**
 * Extracts the domain from an email address for analytics payloads.
 *
 * Analytics payloads are barred from carrying raw email addresses, so every
 * acquisition and invite event records the domain instead. It is not personal
 * data on its own and still answers the questions we ask of it: whether
 * adoption spreads inside one company, and which providers signups come from.
 *
 * Do not raise on a bad address. `auth.users.email` is nullable for
 * phone-based accounts, and a trigger that raises on the signup path breaks
 * signup.
 *
 * @param p_email An email address, or null.
 * @returns The lower-cased domain, or null when there is not one.
 */
create or replace function public.util__email_domain (p_email text) returns text as $$
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

-- Reached only from inside SECURITY DEFINER bodies, which run as this
-- function's owner, so no Data API role needs EXECUTE.
revoke
execute on function public.util__email_domain (text)
from
  public,
  anon,
  authenticated,
  service_role;
