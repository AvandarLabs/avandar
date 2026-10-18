alter table "public"."datasets__postgres_table" drop constraint "datasets__postgres_table_connection_id_fkey";

CREATE UNIQUE INDEX connections__id_workspace_id_key ON public.connections USING btree (id, workspace_id);

alter table "public"."connections" add constraint "connections__id_workspace_id_key" UNIQUE using index "connections__id_workspace_id_key";

alter table "public"."datasets__postgres_table" add constraint "datasets__postgres_table__connection_in_workspace_fkey" FOREIGN KEY (connection_id, workspace_id) REFERENCES public.connections(id, workspace_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."datasets__postgres_table" validate constraint "datasets__postgres_table__connection_in_workspace_fkey";

