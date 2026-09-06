\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `datasets__pdf_file`.
 *
 * Locks this table's four policies: a member of one workspace must not read, insert, update, or delete another
 * workspace's rows, and `anon` must not reach the table at all.
 *
 * Read directly the policies look correct, all four gating on
 * `workspace_id = any(array(select util__get_auth_user_workspaces()))`. This
 * file exists so that nothing silently narrows or drops that predicate later.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f4000001-0000-4000-8000-000000000001'::uuid, 'pdffile_insider@test.dev', 'authenticated', 'authenticated'),
  ('f4000002-0000-4000-8000-000000000002'::uuid, 'pdffile_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f4001001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid, 'pdffile ws a', 'pdffile-ws-a'),
  ('f4001002-0000-4000-8000-000000000002'::uuid, 'f4000002-0000-4000-8000-000000000002'::uuid, 'pdffile ws b', 'pdffile-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('f4002001-0000-4000-8000-000000000001'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid),
  ('f4002002-0000-4000-8000-000000000002'::uuid, 'f4001002-0000-4000-8000-000000000002'::uuid, 'f4000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('f4003001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4002001-0000-4000-8000-000000000001'::uuid, 'Insider', 'Insider'),
  ('f4003002-0000-4000-8000-000000000002'::uuid, 'f4000002-0000-4000-8000-000000000002'::uuid, 'f4001002-0000-4000-8000-000000000002'::uuid, 'f4002002-0000-4000-8000-000000000002'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('f400b002-0000-4000-8000-000000000002'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid, 'f4003001-0000-4000-8000-000000000001'::uuid,
   'ws a pdf dataset', 'pdf_file'::public.datasets__source_type),
  ('f400b003-0000-4000-8000-000000000003'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 'f4000001-0000-4000-8000-000000000001'::uuid, 'f4003001-0000-4000-8000-000000000001'::uuid,
   'ws a spare dataset', 'pdf_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__pdf_file (
  id, dataset_id, workspace_id, size_in_bytes, regions, fingerprint
)
values (
  'f400a001-0000-4000-8000-000000000001'::uuid,
  'f400b002-0000-4000-8000-000000000002'::uuid,
  'f4001001-0000-4000-8000-000000000001'::uuid,
  1024,
  '[]'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

select plan (6);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f4000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__pdf_file t
      where t.id = 'f400a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own datasets__pdf_file row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the datasets__pdf_file row'
);

-- 2. A member of another workspace reads nothing. This is the cross-tenant
-- boundary: the whole point of the file.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f4000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__pdf_file t
      where t.workspace_id = 'f4001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read datasets__pdf_file rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no datasets__pdf_file rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f4000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.datasets__pdf_file (id, dataset_id, workspace_id, size_in_bytes, regions, fingerprint)
  values ('f400b001-0000-4000-8000-000000000001'::uuid, 'f400b003-0000-4000-8000-000000000003'::uuid, 'f4001001-0000-4000-8000-000000000001'::uuid, 2048, '[]'::jsonb, '{}'::jsonb);
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a datasets__pdf_file row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
-- Checked as the superuser after resetting the role.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f4000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.datasets__pdf_file
  set size_in_bytes = 9999
  where id = 'f400a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__pdf_file t
      where t.id = 'f400a001-0000-4000-8000-000000000001'::uuid and t.size_in_bytes = 1024
    ) <> 1 then
      raise exception 'an outsider updated a datasets__pdf_file row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a datasets__pdf_file row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f4000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.datasets__pdf_file where id = 'f400a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__pdf_file t
      where t.id = 'f400a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a datasets__pdf_file row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a datasets__pdf_file row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.datasets__pdf_file;
  $t6$,
  '42501',
  null,
  'anon cannot select datasets__pdf_file'
);

select * from finish ();

rollback;
