CREATE INDEX idx_individuals__workspace_id_assigned_to ON public.individuals USING btree (workspace_id, assigned_to);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.individuals__check_assignment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  if tg_op = 'INSERT' and new.assigned_to is null then
    return new;
  end if;

  if not public.util__auth_user_meets_min_app_role (
    new.workspace_id,
    'case_records'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Records editors can assign a record'
      using errcode = '42501', hint = 'case_records_editor_required';
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = new.workspace_id
      and membership.user_id = new.assigned_to
  ) then
    raise exception 'A record can only be assigned to a member of its workspace'
      using errcode = '23514', hint = 'assignee_not_in_workspace';
  end if;

  return new;
end;
$function$
;

CREATE TRIGGER tr_individuals__check_assignment_change BEFORE INSERT OR UPDATE OF assigned_to ON public.individuals FOR EACH ROW EXECUTE FUNCTION public.individuals__check_assignment_change();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.individuals__check_assignment_change() from public, anon, authenticated, service_role;
