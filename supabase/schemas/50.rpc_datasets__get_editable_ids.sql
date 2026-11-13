/**
 * The ids of a workspace's datasets that the caller may edit: their
 * effective role on each, from an app role or a share, is editor or above.
 * Lets a picker offer only the datasets an edit-only action will accept,
 * in one read rather than one role lookup per dataset.
 *
 * Runs as the caller, so the `datasets` RLS policy hides every dataset the
 * caller cannot read before the role check runs.
 *
 * @param p_workspace_id The workspace whose datasets are checked.
 */
create or replace function public.rpc_datasets__get_editable_ids (p_workspace_id uuid) returns setof uuid as $$
  select dataset.id
  from public.datasets dataset
  where
    dataset.workspace_id = p_workspace_id and
    public.util__auth_user_can_update_resource (
      'dataset'::public.resource_type,
      dataset.id
    );
$$ language sql stable security invoker
set
  search_path = '';

-- `authenticated` only: the browser calls this through the Data API.
revoke
execute on function public.rpc_datasets__get_editable_ids (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_datasets__get_editable_ids (uuid) to authenticated;
