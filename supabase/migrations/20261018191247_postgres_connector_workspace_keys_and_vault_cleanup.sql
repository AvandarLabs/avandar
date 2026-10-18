alter table "public"."datasets__postgres_table" drop constraint "datasets__postgres_table_connection_id_fkey";

alter table "public"."datasets__postgres_table" drop constraint "datasets__postgres_table_dataset_id_fkey";

CREATE UNIQUE INDEX connections__id_workspace_id_key ON public.connections USING btree (id, workspace_id);

CREATE UNIQUE INDEX connections__postgres_vault_secret_id_key ON public.connections__postgres USING btree (vault_secret_id);

CREATE UNIQUE INDEX datasets__id_workspace_id_key ON public.datasets USING btree (id, workspace_id);

alter table "public"."connections" add constraint "connections__id_workspace_id_key" UNIQUE using index "connections__id_workspace_id_key";

alter table "public"."connections__postgres" add constraint "connections__postgres_vault_secret_id_key" UNIQUE using index "connections__postgres_vault_secret_id_key";

alter table "public"."datasets" add constraint "datasets__id_workspace_id_key" UNIQUE using index "datasets__id_workspace_id_key";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table__connection_in_workspace_fkey" FOREIGN KEY (connection_id, workspace_id) REFERENCES public.connections(id, workspace_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table__connection_in_workspace_fkey";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table__dataset_in_workspace_fkey" FOREIGN KEY (dataset_id, workspace_id) REFERENCES public.datasets(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table__dataset_in_workspace_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__connections__postgres__delete_vault_secret()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$function$
;

CREATE TRIGGER tr_connections__postgres__delete_vault_secret AFTER DELETE ON public.connections__postgres FOR EACH ROW EXECUTE FUNCTION public.util__connections__postgres__delete_vault_secret();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.util__connections__postgres__delete_vault_secret() from public, anon, authenticated, service_role;
