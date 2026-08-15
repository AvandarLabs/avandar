-- Hand-added because `supabase db diff` does not reliably preserve explicit
-- PUBLIC privilege changes. These helpers are security-definer functions in
-- the exposed public schema, so their execute privileges must be explicit.
revoke
execute on function public.maps__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.util__auth_user_has_resource_share (
  public.resource_type,
  uuid,
  uuid,
  public.app_type
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.util__auth_user_may_select_map_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.util__auth_user_may_select_resource_base (
  public.resource_type,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
) to authenticated;

revoke
execute on function public.util__auth_user_may_select_map (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.util__auth_user_may_select_map (uuid) to authenticated;
