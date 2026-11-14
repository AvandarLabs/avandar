/**
 * Re-pins one dictionary's pinned convert bindings on one dataset to their
 * code lists' current pairs and order and the dictionary's current
 * version, and re-types their columns. A binding whose code list was
 * deleted keeps the pairs it has, since there is nothing to re-pin it to.
 * Live and reference bindings already follow the dictionary. Returns how
 * many bindings it re-pinned, and raises `nothing_to_reapply` when that is
 * none.
 *
 * SECURITY DEFINER because bindings are select-only for signed-in users.
 * It checks dataset editor and Data Sources viewer, as the apply does.
 *
 * @param p_dataset_id The dataset converted in place.
 * @param p_dictionary_id The dictionary to re-apply.
 * @returns How many bindings were re-pinned.
 */
create or replace function public.rpc_dataset_columns__reapply_dictionary (p_dataset_id uuid, p_dictionary_id uuid) returns integer language plpgsql security definer
set
  search_path = '' as $$
declare
  v_num_repinned integer;
begin
  perform public.dataset_columns__dictionary_bindings__authorize (p_dataset_id);

  update public.dataset_columns__dictionary_bindings b
  set
    pinned_pairs = cl.pairs,
    pinned_is_ordered = cl.is_ordered,
    applied_dictionary_version = d.version
  from public.data_dictionaries__code_lists cl
  join public.data_dictionaries d on d.id = cl.dictionary_id
  where
    b.dataset_id = p_dataset_id and
    b.dictionary_id = p_dictionary_id and
    b.mode = 'convert' and
    b.pinned_pairs is not null and
    cl.id = b.code_list_id;

  get diagnostics v_num_repinned = row_count;

  if v_num_repinned = 0 then
    raise exception 'Nothing on this dataset is pinned to this dictionary'
      using errcode = 'P0002', hint = 'nothing_to_reapply';
  end if;

  perform public.dataset_columns__dictionary_bindings__set_types (p_dataset_id);

  return v_num_repinned;
end;
$$;

revoke
execute on function public.rpc_dataset_columns__reapply_dictionary (uuid, uuid)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks dataset edit rights itself.
grant
execute on function public.rpc_dataset_columns__reapply_dictionary (uuid, uuid) to authenticated;
