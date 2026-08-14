alter function public.util__seed_builtin_role_groups_for_workspace (uuid)
set
  search_path = '';

revoke
execute on function public.util__seed_builtin_role_groups_for_workspace (uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.util__seed_builtin_role_groups_for_workspace (uuid) to service_role;
