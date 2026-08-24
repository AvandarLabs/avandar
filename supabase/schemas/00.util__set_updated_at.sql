-- Update `updated_at` column of a table
-- @returns: trigger
create or replace function public.util__set_updated_at () returns trigger as $$
begin
  new.updated_at = (now() at time zone 'UTC');
  return new;
end;
$$ language plpgsql;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.util__set_updated_at ()
from
  public,
  anon,
  authenticated,
  service_role;
