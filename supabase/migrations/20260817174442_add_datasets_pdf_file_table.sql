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
    "detection_mode" public.datasets__pdf_detection_mode not null,
    "grid_x" jsonb,
    "grid_y" jsonb,
    "page_range" int4range,
    "header_rows" integer not null default 1,
    "fill_merged_cells" boolean not null default true,
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

grant references on table "public"."datasets__pdf_file" to "anon";

grant trigger on table "public"."datasets__pdf_file" to "anon";

grant truncate on table "public"."datasets__pdf_file" to "anon";

grant delete on table "public"."datasets__pdf_file" to "authenticated";

grant insert on table "public"."datasets__pdf_file" to "authenticated";

grant references on table "public"."datasets__pdf_file" to "authenticated";

grant select on table "public"."datasets__pdf_file" to "authenticated";

grant trigger on table "public"."datasets__pdf_file" to "authenticated";

grant truncate on table "public"."datasets__pdf_file" to "authenticated";

grant update on table "public"."datasets__pdf_file" to "authenticated";

grant delete on table "public"."datasets__pdf_file" to "service_role";

grant insert on table "public"."datasets__pdf_file" to "service_role";

grant references on table "public"."datasets__pdf_file" to "service_role";

grant select on table "public"."datasets__pdf_file" to "service_role";

grant trigger on table "public"."datasets__pdf_file" to "service_role";

grant truncate on table "public"."datasets__pdf_file" to "service_role";

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


