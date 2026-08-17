set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_pdf_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_has_original_file boolean, p_regions jsonb, p_detection_mode public.datasets__pdf_detection_mode, p_grid_x jsonb, p_grid_y jsonb, p_page_range_start integer, p_page_range_end integer, p_header_rows integer, p_fill_merged_cells boolean, p_fingerprint jsonb)
 RETURNS public.datasets
 LANGUAGE plpgsql
AS $function$
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
$function$
;
