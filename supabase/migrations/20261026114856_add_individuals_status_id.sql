alter table "public"."individuals" add column "status_id" uuid;

CREATE INDEX idx_individuals__concept_id_status_id ON public.individuals USING btree (concept_id, status_id);

alter table "public"."individuals" add constraint "individuals__status_fkey" FOREIGN KEY (status_id, concept_id) REFERENCES public.concept_statuses(id, concept_id) not valid;

alter table "public"."individuals" validate constraint "individuals__status_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.individuals__check_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status_id is not distinct from old.status_id then
    return new;
  end if;

  if tg_op = 'INSERT' and (
    new.status_id is null or
    new.status_id = (
      select c.default_status_id
      from public.concepts c
      where c.id = new.concept_id
    )
  ) then
    return new;
  end if;

  if not public.util__auth_user_meets_min_app_role (
    new.workspace_id,
    'case_records'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Records editors can change a record''s status'
      using errcode = '42501', hint = 'case_records_editor_required';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.individuals__set_default_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status_id is null then
    select c.default_status_id
    into new.status_id
    from public.concepts c
    where c.id = new.concept_id;
  end if;
  return new;
end;
$function$
;

CREATE TRIGGER tr_individuals__check_status_change BEFORE INSERT OR UPDATE OF status_id ON public.individuals FOR EACH ROW EXECUTE FUNCTION public.individuals__check_status_change();

CREATE TRIGGER tr_individuals__set_default_status BEFORE INSERT ON public.individuals FOR EACH ROW EXECUTE FUNCTION public.individuals__set_default_status();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.individuals__check_status_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.individuals__set_default_status() from public, anon, authenticated, service_role;
