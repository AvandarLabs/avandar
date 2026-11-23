/**
 * Checks whether a slug can be used for a new workspace.
 *
 * Security definer because RLS only shows a caller the workspaces they
 * belong to, and a slug must be unique across all of them. This function
 * returns a single boolean: never return workspace rows or columns.
 *
 * The format rules match the create workspace form: 3 to 20 characters,
 * using only letters, numbers, and hyphens.
 *
 * @param p_workspace_slug The slug to check. Null or malformed input returns
 *   false instead of raising.
 * @returns True if the slug is well formed and no workspace uses it.
 */
create or replace function public.rpc_workspaces__is_slug_available (p_workspace_slug text) returns boolean language sql stable security definer
set
  search_path = '' as $$
  select coalesce(
    p_workspace_slug ~ '^[a-zA-Z0-9-]{3,20}$' and
    not exists (
      select 1
      from public.workspaces w
      where w.slug = p_workspace_slug
    ),
    false
  );
$$;

-- `authenticated` only: the create workspace form is behind sign-in.
revoke
execute on function public.rpc_workspaces__is_slug_available (text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__is_slug_available (text) to authenticated;
