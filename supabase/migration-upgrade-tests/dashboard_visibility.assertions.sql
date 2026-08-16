-- Verify visibility values survive the migration and is_public becomes a
-- generated column derived from dashboard visibility.
do $$
declare
  public_visibility public.dashboard_visibility;
  draft_visibility public.dashboard_visibility;
  is_public_generated text;
begin
  select visibility
  into public_visibility
  from public.dashboards
  where id = 'f6004001-0000-4000-8000-000000000001'::uuid;

  select visibility
  into draft_visibility
  from public.dashboards
  where id = 'f6004002-0000-4000-8000-000000000002'::uuid;

  select is_generated
  into is_public_generated
  from information_schema.columns
  where
    table_schema = 'public' and
    table_name = 'dashboards' and
    column_name = 'is_public';

  if public_visibility is distinct from 'public'::public.dashboard_visibility then
    raise exception 'public dashboard visibility was not preserved';
  end if;

  if draft_visibility is distinct from 'draft'::public.dashboard_visibility then
    raise exception 'private dashboard did not remain draft';
  end if;

  if is_public_generated is distinct from 'ALWAYS' then
    raise exception 'is_public was not replaced with a generated column';
  end if;
end;
$$;

rollback;
