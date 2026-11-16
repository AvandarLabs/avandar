/**
 * Whether the crosswalk stacks a dataset the caller cannot view, on a
 * layout that is not skipped. When it does, the caller cannot update the
 * combined dataset (`rpc_crosswalks__save_combined_dataset` refuses with
 * `crosswalk_has_unreadable_datasets`), so the browser asks first.
 *
 * SECURITY DEFINER because the memberships are read for every layout,
 * including datasets the caller cannot see. It answers only a boolean, and
 * only to a Data Sources editor of the crosswalk's workspace: a missing
 * crosswalk and a forbidden one raise the same error, as in the other
 * crosswalk RPCs. It takes no lock.
 *
 * @param p_crosswalk_id The crosswalk to ask about.
 * @returns True when a stacked dataset is hidden from the caller.
 */
create or replace function public.rpc_crosswalks__has_unreadable_datasets (p_crosswalk_id uuid) returns boolean language plpgsql stable security definer
set
  search_path = '' as $$
begin
  perform public.crosswalks__require_editor (p_crosswalk_id);

  return public.crosswalks__has_unreadable_members (p_crosswalk_id);
end;
$$;

revoke
execute on function public.rpc_crosswalks__has_unreadable_datasets (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Data Sources editor itself.
grant
execute on function public.rpc_crosswalks__has_unreadable_datasets (uuid) to authenticated;
