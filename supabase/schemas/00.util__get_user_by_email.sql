-- Auth function to get a user id by email
-- @returns uuid
create or replace function public.util__get_user_id_by_email (
  p_email text
) returns uuid as $$
declare
  v_result uuid;
begin
  select u.id into v_result
    from auth.users as u
    where lower(u.email) = lower(p_email)
    limit 1;
  return v_result;
end;
$$ language plpgsql security definer
set
  search_path = auth,
  pg_temp;

-- do not allow public calls to `auth.get_user_id_by_email`
revoke all on function public.util__get_user_id_by_email (text)
from
  public;

revoke all on function public.util__get_user_id_by_email (text)
from
  anon;

revoke all on function public.util__get_user_id_by_email (text)
from
  authenticated;

-- Only allow calls from the service role
grant
execute on function public.util__get_user_id_by_email (text) to service_role;
