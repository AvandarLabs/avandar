do $$
declare
  legacy_revision constant uuid :=
    '00000000-0000-0000-0000-000000000000'::uuid;
  public_revision uuid;
  workspace_revision uuid;
  draft_revision uuid;
begin
  select snapshot_revision
  into public_revision
  from public.dashboards
  where id = 'f5004001-0000-4000-8000-000000000001'::uuid;

  select snapshot_revision
  into workspace_revision
  from public.dashboards
  where id = 'f5004002-0000-4000-8000-000000000002'::uuid;

  select snapshot_revision
  into draft_revision
  from public.dashboards
  where id = 'f5004003-0000-4000-8000-000000000003'::uuid;

  if public_revision is distinct from legacy_revision then
    raise exception 'public dashboard was not backfilled to the legacy revision';
  end if;

  if workspace_revision is distinct from legacy_revision then
    raise exception 'workspace dashboard was not backfilled to the legacy revision';
  end if;

  if draft_revision is not null then
    raise exception 'draft dashboard revision must remain null';
  end if;
end;
$$;

rollback;
