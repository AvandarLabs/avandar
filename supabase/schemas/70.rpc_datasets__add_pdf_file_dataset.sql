/**
 * Add a PDF file dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__pdf_file.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_is_in_cloud_storage: Whether the raw file is stored in cloud storage
 * @param p_size_in_bytes: The size of the source PDF in bytes
 * @param p_has_original_file: Whether the original PDF was retained
 * @param p_regions: Page fragments the extracted table occupies
 * @param p_detection_mode: Which signal produced this table
 * @param p_grid_x: Snapped column boundary coordinates
 * @param p_grid_y: Snapped row boundary coordinates
 * @param p_page_range_start: First page detection was limited to, inclusive and zero-based
 * @param p_page_range_end: Last page detection was limited to, inclusive and zero-based
 * @param p_header_rows: Number of leading rows treated as header
 * @param p_fill_merged_cells: Whether a value spanning several rows is repeated into each of them
 * @param p_fingerprint: Snapshot of what was extracted at import time
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_pdf_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes bigint,
  p_has_original_file boolean,
  p_regions jsonb,
  p_detection_mode public.datasets__pdf_detection_mode,
  p_grid_x jsonb,
  p_grid_y jsonb,
  p_page_range_start integer,
  p_page_range_end integer,
  p_header_rows integer,
  p_fill_merged_cells boolean,
  p_fingerprint jsonb
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'pdf_file',
    p_columns
  );

  insert into public.datasets__pdf_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    has_original_file,
    regions,
    detection_mode,
    grid_x,
    grid_y,
    page_range_start,
    page_range_end,
    header_rows,
    fill_merged_cells,
    fingerprint
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_has_original_file,
    p_regions,
    p_detection_mode,
    p_grid_x,
    p_grid_y,
    p_page_range_start,
    p_page_range_end,
    p_header_rows,
    p_fill_merged_cells,
    p_fingerprint
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
