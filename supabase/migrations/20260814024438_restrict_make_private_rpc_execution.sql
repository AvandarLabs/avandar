revoke
execute on function public.rpc_resources__make_private (
  public.resource_type,
  uuid
)
from
  public,
  anon,
  service_role;

grant
execute on function public.rpc_resources__make_private (
  public.resource_type,
  uuid
) to authenticated;
