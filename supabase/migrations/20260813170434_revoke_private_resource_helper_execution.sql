-- Function grants require a manual migration because the declarative diff
-- tool does not reliably capture them.
revoke execute on function public.util__has_non_owner_share (
  public.resource_type,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;

revoke execute on function public.util__is_resource_private_to_owner (
  public.resource_type,
  uuid
) from public, anon, authenticated;
