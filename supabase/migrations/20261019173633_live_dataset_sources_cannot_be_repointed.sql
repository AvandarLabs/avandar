drop trigger if exists "tr__datasets__postgres_table__prevent_source_change" on "public"."datasets__postgres_table";

drop policy "User can update datasets__postgres_table in their workspace" on "public"."datasets__postgres_table";

drop policy "User can insert dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can insert datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

revoke update on table "public"."datasets__postgres_table" from "authenticated";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.dataset_columns__prevent_postgres_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    (
      new.original_name is distinct from old.original_name or
      new.dataset_id is distinct from old.dataset_id or
      new.workspace_id is distinct from old.workspace_id
    ) and
    (
      public.datasets__is_postgres_table (old.dataset_id) or
      public.datasets__is_postgres_table (new.dataset_id)
    )
  then
    raise exception 'a Postgres dataset column cannot be renamed at its source'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__auth_user_may_add_column(p_dataset_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select
        d.source_type <> 'postgres_table' or
        public.util__auth_user_meets_min_app_role (
          d.workspace_id,
          'data_sources',
          'editor'
        )
      from public.datasets d
      where d.id = p_dataset_id
    ),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__google_sheets__prevent_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    new.dataset_id is distinct from old.dataset_id or
    new.google_account_id is distinct from old.google_account_id or
    new.google_document_id is distinct from old.google_document_id or
    new.sheet_name is distinct from old.sheet_name
  then
    raise exception 'a Google Sheets dataset cannot be repointed at another sheet'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__is_postgres_table(p_dataset_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.datasets
    where id = p_dataset_id and source_type = 'postgres_table'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__prevent_source_type_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.source_type is distinct from old.source_type then
    raise exception 'dataset source_type cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.datasets__postgres_table__prevent_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if
    new.dataset_id is distinct from old.dataset_id or
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


  create policy "User can insert dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND public.datasets__auth_user_may_add_column(dataset_id)));



  create policy "User can insert datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level) AND (EXISTS ( SELECT 1
   FROM public.tokens__google
  WHERE ((tokens__google.google_account_id = datasets__google_sheets.google_account_id) AND (tokens__google.user_id = ( SELECT auth.uid() AS uid)))))));


CREATE TRIGGER tr__dataset_columns__prevent_postgres_source_change BEFORE UPDATE OF original_name, dataset_id, workspace_id ON public.dataset_columns FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__prevent_postgres_source_change();

CREATE TRIGGER tr__datasets__prevent_source_type_change BEFORE UPDATE OF source_type ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.datasets__prevent_source_type_change();

CREATE TRIGGER tr__datasets__google_sheets__prevent_source_change BEFORE UPDATE OF dataset_id, google_account_id, google_document_id, sheet_name ON public.datasets__google_sheets FOR EACH ROW EXECUTE FUNCTION public.datasets__google_sheets__prevent_source_change();

CREATE TRIGGER tr__datasets__postgres_table__prevent_source_change BEFORE UPDATE OF dataset_id, connection_id, schema_name, table_name ON public.datasets__postgres_table FOR EACH ROW EXECUTE FUNCTION public.datasets__postgres_table__prevent_source_change();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.dataset_columns__prevent_postgres_source_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__auth_user_may_add_column(p_dataset_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.datasets__auth_user_may_add_column(p_dataset_id uuid) to "authenticated";
revoke all privileges on function public.datasets__google_sheets__prevent_source_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__is_postgres_table(p_dataset_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.datasets__is_postgres_table(p_dataset_id uuid) to "authenticated";
grant EXECUTE on function public.datasets__is_postgres_table(p_dataset_id uuid) to "service_role";
revoke all privileges on function public.datasets__prevent_source_type_change() from public, anon, authenticated, service_role;
