create type "public"."datasets__pdf_detection_mode" as enum ('tagged', 'lattice', 'stream', 'manual');

create type "public"."datasets__pdf_output_mode" as enum ('natural', 'observations');

create type "public"."datasets__pdf_region_shape" as enum ('grid_table', 'labelled_graphic', 'repeating_blocks', 'prose_measures');

  create table "public"."datasets__pdf_file" (
    "id" uuid not null default gen_random_uuid(),
    "dataset_id" uuid not null,
    "workspace_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_in_cloud_storage" boolean not null default false,
    "size_in_bytes" bigint not null,
    "has_original_file" boolean not null default false,
    "regions" jsonb not null,
    "output_mode" public.datasets__pdf_output_mode not null default 'natural'::public.datasets__pdf_output_mode,
    "llm_model" text,
    "page_range_start" integer,
    "page_range_end" integer,
    "fingerprint" jsonb not null
      );


alter table "public"."datasets__pdf_file" enable row level security;

CREATE UNIQUE INDEX datasets__pdf_file_dataset_id_key ON public.datasets__pdf_file USING btree (dataset_id);

CREATE UNIQUE INDEX datasets__pdf_file_pkey ON public.datasets__pdf_file USING btree (id);

alter table "public"."datasets__pdf_file" add constraint "datasets__pdf_file_pkey" PRIMARY KEY using index "datasets__pdf_file_pkey";

alter table "public"."datasets__pdf_file" add constraint "datasets__pdf_file_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__pdf_file" validate constraint "datasets__pdf_file_dataset_id_fkey";

alter table "public"."datasets__pdf_file" add constraint "datasets__pdf_file_dataset_id_key" UNIQUE using index "datasets__pdf_file_dataset_id_key";

alter table "public"."datasets__pdf_file" add constraint "datasets__pdf_file_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__pdf_file" validate constraint "datasets__pdf_file_workspace_id_fkey";

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

CREATE OR REPLACE FUNCTION public.util__storage_object_dataset_id(p_object_name text)
 RETURNS uuid
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_object_name ~
      '^[^/]+/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.parquet|\.original\.[A-Za-z0-9]{1,10})$'
    -- Safe: the regex above has already proven segment 3 begins with a uuid,
    -- and a uuid contains no dot, so field 1 of the dot-split is exactly it.
    then split_part(split_part(p_object_name, '/', 3), '.', 1)::uuid
    else null
  end;
$function$
;

grant delete on table "public"."datasets__pdf_file" to "authenticated";

grant insert on table "public"."datasets__pdf_file" to "authenticated";

grant select on table "public"."datasets__pdf_file" to "authenticated";

grant update on table "public"."datasets__pdf_file" to "authenticated";

grant delete on table "public"."datasets__pdf_file" to "service_role";

grant insert on table "public"."datasets__pdf_file" to "service_role";

grant select on table "public"."datasets__pdf_file" to "service_role";

grant update on table "public"."datasets__pdf_file" to "service_role";


  create policy "User can delete datasets__pdf_file in their workspace"
  on "public"."datasets__pdf_file"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'admin'::public.role_level));



  create policy "User can insert datasets__pdf_file in their workspace"
  on "public"."datasets__pdf_file"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__pdf_file in their workspace"
  on "public"."datasets__pdf_file"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__pdf_file in their workspace"
  on "public"."datasets__pdf_file"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));


CREATE TRIGGER tr_datasets__pdf_file__set_updated_at BEFORE UPDATE ON public.datasets__pdf_file FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_datasets__add_pdf_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_has_original_file boolean, p_regions jsonb, p_page_range_start integer, p_page_range_end integer, p_fingerprint jsonb, p_output_mode datasets__pdf_output_mode, p_llm_model text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_pdf_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_has_original_file boolean, p_regions jsonb, p_page_range_start integer, p_page_range_end integer, p_fingerprint jsonb, p_output_mode datasets__pdf_output_mode, p_llm_model text) to "authenticated";
