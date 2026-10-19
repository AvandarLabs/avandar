drop policy "User can insert datasets__postgres_table in their workspace" on "public"."datasets__postgres_table";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.datasets__postgres_table__prevent_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    new.connection_id is distinct from old.connection_id or
    new.schema_name is distinct from old.schema_name or
    new.table_name is distinct from old.table_name
  then
    raise exception 'a Postgres dataset cannot be repointed at another table'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

  create policy "User can insert datasets__postgres_table in their workspace"
  on "public"."datasets__postgres_table"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)));


CREATE TRIGGER tr__datasets__postgres_table__prevent_source_change BEFORE UPDATE OF connection_id, schema_name, table_name ON public.datasets__postgres_table FOR EACH ROW EXECUTE FUNCTION public.datasets__postgres_table__prevent_source_change();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.datasets__postgres_table__prevent_source_change() from public, anon, authenticated, service_role;
