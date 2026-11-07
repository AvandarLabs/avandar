/**
 * Joins a text array with single spaces, for a generated column that needs
 * an array's words as one text. `array_to_string` is `stable`, which a
 * generated column cannot call. Joining a `text[]` depends on nothing but
 * its input, so this wrapper is honestly `immutable`.
 *
 * @param p_values The array, or null.
 * @returns The elements joined with single spaces, or an empty string for a
 *   null array.
 */
create or replace function public.util__text_array_to_text (p_values text[]) returns text as $$
  select coalesce(array_to_string(p_values, ' '), '');
$$ language sql immutable
set
  search_path = '';

-- Evaluated whenever a catalog listing row is written, as whichever role
-- writes it: the pipelines as `service_role`, and the app's catalog RPCs
-- (marking a listing invalid, recording verified column types) as
-- `authenticated`. Revoking it from either would fail their writes.
revoke
execute on function public.util__text_array_to_text (text[])
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__text_array_to_text (text[]) to authenticated,
service_role;
