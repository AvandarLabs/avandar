drop trigger if exists "tr__plugin_data_slot_bindings__check_workspace" on "public"."plugin_data_slot_bindings";

revoke update on table "public"."plugin_data_slot_bindings" from "authenticated";

alter table "public"."plugin_data_slot_bindings" drop constraint "plugin_data_slot_bindings_concept_id_fkey";

alter table "public"."plugin_data_slot_bindings" drop constraint "plugin_data_slot_bindings_dataset_id_fkey";

alter table "public"."plugin_data_slot_bindings" drop constraint "plugin_data_slot_bindings_installation_id_fkey";

drop function if exists "public"."plugin_data_slot_bindings__check_workspace"();

CREATE UNIQUE INDEX concepts__id_workspace_id_key ON public.concepts USING btree (id, workspace_id);

CREATE INDEX idx_plugin_content_imports__dataset_id ON public.plugin_content_imports USING btree (dataset_id);

CREATE INDEX idx_plugin_data_slot_bindings__concept_id ON public.plugin_data_slot_bindings USING btree (concept_id);

CREATE INDEX idx_plugin_data_slot_bindings__dataset_id ON public.plugin_data_slot_bindings USING btree (dataset_id);

CREATE INDEX idx_plugin_data_slot_bindings__workspace_id ON public.plugin_data_slot_bindings USING btree (workspace_id);

CREATE UNIQUE INDEX plugin_installations__id_workspace_id_key ON public.plugin_installations USING btree (id, workspace_id);

alter table "public"."concepts" add constraint "concepts__id_workspace_id_key" UNIQUE using index "concepts__id_workspace_id_key";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__concept_in_workspace_fkey" FOREIGN KEY (concept_id, workspace_id) REFERENCES public.concepts(id, workspace_id) ON UPDATE CASCADE ON DELETE SET NULL (concept_id) not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__concept_in_workspace_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__dataset_in_workspace_fkey" FOREIGN KEY (dataset_id, workspace_id) REFERENCES public.datasets(id, workspace_id) ON UPDATE CASCADE ON DELETE SET NULL (dataset_id) not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__dataset_in_workspace_fkey";

alter table "public"."plugin_data_slot_bindings" add constraint "plugin_data_slot_bindings__installation_in_workspace_fkey" FOREIGN KEY (installation_id, workspace_id) REFERENCES public.plugin_installations(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."plugin_data_slot_bindings" validate constraint "plugin_data_slot_bindings__installation_in_workspace_fkey";

alter table "public"."plugin_installations" add constraint "plugin_installations__id_workspace_id_key" UNIQUE using index "plugin_installations__id_workspace_id_key";


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges (attribute_map) on table public.plugin_data_slot_bindings from public, anon, authenticated, service_role;
grant UPDATE (attribute_map) on table public.plugin_data_slot_bindings to "authenticated";
revoke all privileges (bound_by) on table public.plugin_data_slot_bindings from public, anon, authenticated, service_role;
grant UPDATE (bound_by) on table public.plugin_data_slot_bindings to "authenticated";
revoke all privileges (concept_id) on table public.plugin_data_slot_bindings from public, anon, authenticated, service_role;
grant UPDATE (concept_id) on table public.plugin_data_slot_bindings to "authenticated";
revoke all privileges (dataset_id) on table public.plugin_data_slot_bindings from public, anon, authenticated, service_role;
grant UPDATE (dataset_id) on table public.plugin_data_slot_bindings to "authenticated";
revoke all privileges (source_type) on table public.plugin_data_slot_bindings from public, anon, authenticated, service_role;
grant UPDATE (source_type) on table public.plugin_data_slot_bindings to "authenticated";
