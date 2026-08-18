create type "public"."datasets__pdf_output_mode" as enum ('natural', 'observations');

create type "public"."datasets__pdf_region_shape" as enum ('grid_table', 'labelled_graphic', 'repeating_blocks', 'prose_measures');

revoke references on table "public"."datasets__pdf_file" from "anon";

revoke trigger on table "public"."datasets__pdf_file" from "anon";

revoke truncate on table "public"."datasets__pdf_file" from "anon";

revoke references on table "public"."datasets__pdf_file" from "authenticated";

revoke trigger on table "public"."datasets__pdf_file" from "authenticated";

revoke truncate on table "public"."datasets__pdf_file" from "authenticated";

revoke references on table "public"."datasets__pdf_file" from "service_role";

revoke trigger on table "public"."datasets__pdf_file" from "service_role";

revoke truncate on table "public"."datasets__pdf_file" from "service_role";

drop function if exists "public"."rpc_datasets__add_pdf_file_dataset"(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_has_original_file boolean, p_regions jsonb, p_detection_mode public.datasets__pdf_detection_mode, p_grid_x jsonb, p_grid_y jsonb, p_page_range_start integer, p_page_range_end integer, p_header_rows integer, p_fill_merged_cells boolean, p_fingerprint jsonb);

alter table "public"."datasets__pdf_file" drop column "detection_mode";

alter table "public"."datasets__pdf_file" drop column "fill_merged_cells";

alter table "public"."datasets__pdf_file" drop column "grid_x";

alter table "public"."datasets__pdf_file" drop column "grid_y";

alter table "public"."datasets__pdf_file" drop column "header_rows";

alter table "public"."datasets__pdf_file" add column "llm_model" text;

alter table "public"."datasets__pdf_file" add column "output_mode" public.datasets__pdf_output_mode not null default 'natural'::public.datasets__pdf_output_mode;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_pdf_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_has_original_file boolean, p_regions jsonb, p_page_range_start integer, p_page_range_end integer, p_fingerprint jsonb, p_output_mode public.datasets__pdf_output_mode DEFAULT 'natural'::public.datasets__pdf_output_mode, p_llm_model text DEFAULT NULL::text)
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
    output_mode,
    llm_model,
    page_range_start,
    page_range_end,
    fingerprint
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_has_original_file,
    p_regions,
    p_output_mode,
    p_llm_model,
    p_page_range_start,
    p_page_range_end,
    p_fingerprint
  );

  return v_dataset;
end;
$function$
;

