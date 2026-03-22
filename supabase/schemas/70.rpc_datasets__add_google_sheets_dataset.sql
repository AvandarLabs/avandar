/**
 * Add a Google Sheet dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__google_sheets.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_google_account_id: The google account id
 * @param p_google_document_id: The google document id (i.e. the ID within
 * Google's system. This is the ID you see in the URL when viewing a google
 * sheet)
 * @param p_rows_to_skip: The number of rows to skip
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_google_sheets_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_google_account_id text,
  p_google_document_id text,
  p_rows_to_skip integer default 0
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'google_sheets',
    p_columns
  );

  insert into public.datasets__google_sheets (
    dataset_id,
    workspace_id,
    google_account_id,
    google_document_id,
    rows_to_skip
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_google_account_id,
    p_google_document_id,
    p_rows_to_skip
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
