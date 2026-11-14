\set ON_ERROR_STOP on

/**
 * RLS for `crosswalks`.
 *
 *   viewer: SELECT every crosswalk in the workspace
 *   editor: INSERT crosswalks they own, UPDATE any, DELETE their own
 *   admin:  DELETE any crosswalk in the workspace
 *
 * A signed-in user cannot move a crosswalk to another workspace, set or
 * change its combined dataset, when it was compiled, or the code lists it
 * embedded, or change its owner or id. Deleting the combined dataset clears
 * `output_dataset_id`, `compiled_at`, and `compiled_code_lists` and keeps
 * the crosswalk.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('c1000001-0000-4000-8000-000000000001'::uuid, 'cw_rls_owner@test.dev', 'authenticated', 'authenticated'),
  ('c1000002-0000-4000-8000-000000000002'::uuid, 'cw_rls_viewer@test.dev', 'authenticated', 'authenticated'),
  ('c1000003-0000-4000-8000-000000000003'::uuid, 'cw_rls_editor@test.dev', 'authenticated', 'authenticated'),
  ('c1000004-0000-4000-8000-000000000004'::uuid, 'cw_rls_outsider@test.dev', 'authenticated', 'authenticated'),
  ('c1000005-0000-4000-8000-000000000005'::uuid, 'cw_rls_admin@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'crosswalk rls ws', 'crosswalk-rls-ws'),
  ('c1100002-0000-4000-8000-000000000002'::uuid, 'c1000004-0000-4000-8000-000000000004'::uuid, 'crosswalk other ws', 'crosswalk-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('c1200001-0000-4000-8000-000000000001'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid),
  ('c1200002-0000-4000-8000-000000000002'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000002-0000-4000-8000-000000000002'::uuid),
  ('c1200003-0000-4000-8000-000000000003'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid),
  ('c1200004-0000-4000-8000-000000000004'::uuid, 'c1100002-0000-4000-8000-000000000002'::uuid, 'c1000004-0000-4000-8000-000000000004'::uuid),
  ('c1200005-0000-4000-8000-000000000005'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('c1300001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('c1300002-0000-4000-8000-000000000002'::uuid, 'c1000002-0000-4000-8000-000000000002'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('c1300003-0000-4000-8000-000000000003'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('c1300004-0000-4000-8000-000000000004'::uuid, 'c1000004-0000-4000-8000-000000000004'::uuid, 'c1100002-0000-4000-8000-000000000002'::uuid, 'c1200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider'),
  ('c1300005-0000-4000-8000-000000000005'::uuid, 'c1000005-0000-4000-8000-000000000005'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1200005-0000-4000-8000-000000000005'::uuid, 'Admin', 'Admin')
on conflict (id) do nothing;

-- The viewer gets Global Viewer and the admin Global Admin (Data Sources
-- admin). The owner and the editor get Global Editor; the owner is also
-- the workspace owner.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'c1100001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'c1000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    when 'c1000005-0000-4000-8000-000000000005'::uuid then 'Global Admin'
    else 'Global Editor'
  end;

-- The combined dataset of the first crosswalk, and an ordinary dataset.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('c1450001-0000-4000-8000-000000000001'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'c1300001-0000-4000-8000-000000000001'::uuid, 'Kings and Queens (combined)', 'virtual'::public.datasets__source_type),
  ('c1450002-0000-4000-8000-000000000002'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'c1300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('c1400001-0000-4000-8000-000000000001'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'c1300001-0000-4000-8000-000000000001'::uuid, 'Kings and Queens'),
  ('c1400002-0000-4000-8000-000000000002'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1300003-0000-4000-8000-000000000003'::uuid, 'Editor crosswalk'),
  ('c1400003-0000-4000-8000-000000000003'::uuid, 'c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1300003-0000-4000-8000-000000000003'::uuid, 'Admin deletes this'),
  ('c1400004-0000-4000-8000-000000000004'::uuid, 'c1100002-0000-4000-8000-000000000002'::uuid, 'c1000004-0000-4000-8000-000000000004'::uuid, 'c1300004-0000-4000-8000-000000000004'::uuid, 'Other workspace crosswalk')
on conflict (id) do nothing;

select plan (27);

-- 1. A viewer reads a crosswalk in their workspace.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where workspace_id = 'c1100001-0000-4000-8000-000000000001'::uuid) <> 3 then
      raise exception 'viewer cannot read the workspace''s crosswalks';
    end if;
  end $chk$;
  $t1$,
  'a viewer reads every crosswalk in their workspace'
);
reset role;

-- 2. A member of another workspace reads none of them.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where workspace_id = 'c1100001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'outsider read another workspace''s crosswalks';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no crosswalks'
);
reset role;

-- 3. Anonymous callers cannot reach the table.
select throws_ok (
  $t3$
  set local role anon;
  select count(*) from public.crosswalks;
  $t3$,
  '42501',
  null,
  'anon cannot select crosswalks'
);
reset role;

-- 4. A viewer cannot create a crosswalk.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000002-0000-4000-8000-000000000002'::uuid, 'c1300002-0000-4000-8000-000000000002'::uuid, 'viewer attempt');
  $t4$,
  '42501',
  null,
  'a viewer cannot create a crosswalk'
);
reset role;

-- 5. An editor creates a crosswalk they own.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1300003-0000-4000-8000-000000000003'::uuid, 'Untitled crosswalk');
  $t5$,
  'an editor creates a crosswalk'
);
reset role;

-- 6. An editor cannot create a crosswalk in someone else's name. The
-- owner's profile matches the owner, so the insert policy refuses it.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000001-0000-4000-8000-000000000001'::uuid, 'c1300001-0000-4000-8000-000000000001'::uuid, 'someone else''s');
  $t6$,
  '42501',
  null,
  'an editor cannot create a crosswalk owned by someone else'
);
reset role;

-- 7. A user outside the workspace cannot create a crosswalk in it. The
-- owner-profile trigger refuses first (23514), because an outsider has no
-- profile in this workspace.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000004-0000-4000-8000-000000000004'::uuid, 'c1300004-0000-4000-8000-000000000004'::uuid, 'outsider attempt');
  $t7$,
  '23514',
  null,
  'a user outside the workspace cannot create a crosswalk in it'
);
reset role;

-- 8. An editor renames another member's crosswalk.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks set name = 'Kings and Queens (renamed)' where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid) <> 'Kings and Queens (renamed)' then
      raise exception 'editor rename did not apply';
    end if;
  end $chk$;
  $t8$,
  'an editor renames a crosswalk'
);

-- 9. A viewer's update is filtered out.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.crosswalks set name = 'viewer rename' where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid) = 'viewer rename' then
      raise exception 'viewer renamed a crosswalk';
    end if;
  end $chk$;
  $t9$,
  'a viewer cannot rename a crosswalk'
);

-- 10. An outsider's update is filtered out.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.crosswalks set name = 'outsider rename' where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid) = 'outsider rename' then
      raise exception 'outsider renamed a crosswalk';
    end if;
  end $chk$;
  $t10$,
  'a user outside the workspace cannot rename a crosswalk'
);

-- 11. A crosswalk cannot move to another workspace.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks set workspace_id = 'c1100002-0000-4000-8000-000000000002'::uuid where id = 'c1400002-0000-4000-8000-000000000002'::uuid;
  $t11$,
  '23514',
  null,
  'a crosswalk cannot be moved to another workspace'
);
reset role;

-- The managed columns.

-- 12.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name, output_dataset_id)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1300003-0000-4000-8000-000000000003'::uuid, 'preset output', 'c1450002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '42501',
  'a new crosswalk has no combined dataset yet',
  'an editor cannot insert a crosswalk with a combined dataset'
);
reset role;

-- 13.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks (workspace_id, owner_id, owner_profile_id, name, compiled_code_lists)
  values ('c1100001-0000-4000-8000-000000000001'::uuid, 'c1000003-0000-4000-8000-000000000003'::uuid, 'c1300003-0000-4000-8000-000000000003'::uuid, 'preset lists', '[]'::jsonb);
  $t13$,
  '42501',
  'a new crosswalk has no combined dataset yet',
  'an editor cannot insert a crosswalk with compiled code lists'
);
reset role;

-- 14.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks set output_dataset_id = 'c1450002-0000-4000-8000-000000000002'::uuid where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  $t14$,
  '42501',
  'a crosswalk''s owner and combined dataset are managed',
  'an editor cannot point a crosswalk at a dataset'
);
reset role;

-- 15.
select throws_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks set compiled_at = now() where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  $t15$,
  '42501',
  'a crosswalk''s owner and combined dataset are managed',
  'an editor cannot set when a crosswalk was compiled'
);
reset role;

-- 16. The guard fires before the owner-profile trigger, which would
-- accept this profile for this owner.
select throws_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks
  set owner_id = 'c1000001-0000-4000-8000-000000000001'::uuid, owner_profile_id = 'c1300001-0000-4000-8000-000000000001'::uuid
  where id = 'c1400002-0000-4000-8000-000000000002'::uuid;
  $t16$,
  '42501',
  'a crosswalk''s owner and combined dataset are managed',
  'an editor cannot hand a crosswalk to another owner'
);
reset role;

-- 17. A signed-in user cannot change a crosswalk's id either: the children
-- would follow it through the cascade.
select throws_ok (
  $t17a$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks set id = 'c14000ff-0000-4000-8000-0000000000ff'::uuid where id = 'c1400002-0000-4000-8000-000000000002'::uuid;
  $t17a$,
  '42501',
  'a crosswalk''s owner and combined dataset are managed',
  'an editor cannot change a crosswalk''s id'
);
reset role;

-- 18. A whole-row update, as the CRUD client sends, carries the same
-- managed values and passes.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks
  set
    name = 'Kings and Queens (renamed again)',
    owner_id = 'c1000001-0000-4000-8000-000000000001'::uuid,
    owner_profile_id = 'c1300001-0000-4000-8000-000000000001'::uuid,
    output_dataset_id = null,
    compiled_at = null,
    compiled_code_lists = null,
    codes_output_as = 'codes',
    adds_source_column = false
  where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid) <> 'Kings and Queens (renamed again)' then
      raise exception 'the whole-row update did not apply';
    end if;
  end $chk$;
  $t17$,
  'an editor sends a whole row with the managed columns unchanged'
);

-- Deleting.

-- 19. An editor cannot delete another member's crosswalk.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an editor deleted another member''s crosswalk';
    end if;
  end $chk$;
  $t18$,
  'an editor cannot delete another member''s crosswalk'
);

-- 20. A viewer cannot delete.
select lives_ok (
  $t19$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.crosswalks where id = 'c1400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where id = 'c1400002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'a viewer deleted a crosswalk';
    end if;
  end $chk$;
  $t19$,
  'a viewer cannot delete a crosswalk'
);

-- 21. An editor deletes their own crosswalk.
select lives_ok (
  $t20$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.crosswalks where id = 'c1400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where id = 'c1400002-0000-4000-8000-000000000002'::uuid) <> 0 then
      raise exception 'an editor could not delete their own crosswalk';
    end if;
  end $chk$;
  $t20$,
  'an editor deletes their own crosswalk'
);

-- 22. A Data Sources admin deletes another member's crosswalk.
select lives_ok (
  $t21$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000005-0000-4000-8000-000000000005","role":"authenticated"}', true);
  delete from public.crosswalks where id = 'c1400003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.crosswalks where id = 'c1400003-0000-4000-8000-000000000003'::uuid) <> 0 then
      raise exception 'a Data Sources admin could not delete another member''s crosswalk';
    end if;
  end $chk$;
  $t21$,
  'a Data Sources admin deletes another member''s crosswalk'
);

-- The combined dataset, recorded as the table owner the way
-- `rpc_crosswalks__save_combined_dataset` records it, then deleted by the
-- workspace owner through the Data API. The foreign key's set null runs
-- as the table's owner, so the managed-column guard lets it through.
update public.crosswalks
set
  output_dataset_id = 'c1450001-0000-4000-8000-000000000001'::uuid,
  compiled_at = now(),
  compiled_code_lists = '[{"code_list_id":"c1500001-0000-4000-8000-000000000001","fingerprint":"p1.0123456789abcdef"}]'::jsonb
where id = 'c1400001-0000-4000-8000-000000000001'::uuid;

-- 23.
select lives_ok (
  $t22$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c1000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.datasets where id = 'c1450001-0000-4000-8000-000000000001'::uuid;
  $t22$,
  'the workspace owner deletes a crosswalk''s combined dataset'
);
reset role;

-- 24.
select results_eq (
  $q$
    select
      (select count(*)::int from public.datasets where id = 'c1450001-0000-4000-8000-000000000001'::uuid),
      (select output_dataset_id is null from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid),
      (select compiled_at is null from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid),
      (select compiled_code_lists is null from public.crosswalks where id = 'c1400001-0000-4000-8000-000000000001'::uuid)
  $q$,
  $q$ values (0, true, true, true) $q$,
  'deleting the combined dataset clears output_dataset_id, compiled_at, and compiled_code_lists and keeps the crosswalk'
);

-- Shape.

-- 25.
select col_type_is ('public', 'crosswalks', 'codes_output_as', 'public', 'crosswalks__codes_output', 'codes_output_as is the codes output enum');

-- 26.
select fk_ok ('public', 'crosswalks', 'output_dataset_id', 'public', 'datasets', 'id', 'a crosswalk names its combined dataset');

-- 27.
select has_index ('public', 'crosswalks', 'idx_crosswalks__output_dataset_id', 'a dataset finds the crosswalk that combines it by index');

select * from finish ();

rollback;
