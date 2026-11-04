-- Verify the backfill re-seeds the built-in groups with both case apps at
-- their tier, mirrors a custom group's data_sources role into both case apps,
-- gives no case role to a custom group with no data_sources role, and keeps a
-- case role a custom group already held.
do $$
begin
  if (
    select
      array_agg(
        rg.name || ':' || rgar.app::text || ':' || rgar.role::text
        order by rg.name, rgar.app::text
      )
    from
      public.role_groups rg
      join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = 'ca001001-0000-4000-8000-000000000001'::uuid and
      rg.is_builtin and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array[
    'Global Admin:case_records:admin',
    'Global Admin:case_types:admin',
    'Global Editor:case_records:editor',
    'Global Editor:case_types:editor',
    'Global Viewer:case_records:viewer',
    'Global Viewer:case_types:viewer'
  ] then
    raise exception 'built-in groups were not re-seeded with their case roles';
  end if;

  if (
    select array_agg(rgar.app::text || ':' || rgar.role::text order by rgar.app::text)
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002001-0000-4000-8000-000000000001'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array['case_records:editor', 'case_types:editor'] then
    raise exception 'a custom group did not mirror its data_sources role into both case apps';
  end if;

  if exists (
    select 1
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002002-0000-4000-8000-000000000002'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) then
    raise exception 'a custom group with no data_sources role was given a case role';
  end if;

  if (
    select array_agg(rgar.app::text || ':' || rgar.role::text order by rgar.app::text)
    from public.role_group_app_roles rgar
    where
      rgar.role_group_id = 'ca002003-0000-4000-8000-000000000003'::uuid and
      rgar.app::text in ('case_types', 'case_records')
  ) is distinct from array['case_records:admin', 'case_types:viewer'] then
    raise exception 'a case role a custom group already held was overwritten';
  end if;
end;
$$;

rollback;
