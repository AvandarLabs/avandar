\set ON_ERROR_STOP on

/**
 * Everyone who can see a Google Sheets dataset reads its tab with the Google
 * grant of the account its satellite row names. So that row may only name
 * the inserting user's own Google account, and nobody may change its
 * dataset, account, document or tab afterwards.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('0c050001-0000-4000-8000-000000000001'::uuid, 'gsheets_importer@test.dev', 'authenticated', 'authenticated'),
  ('0c050002-0000-4000-8000-000000000002'::uuid, 'gsheets_other@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('0c051001-0000-4000-8000-000000000001'::uuid, '0c050001-0000-4000-8000-000000000001'::uuid, 'gsheets ws', 'gsheets-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('0c052001-0000-4000-8000-000000000001'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c050001-0000-4000-8000-000000000001'::uuid),
  ('0c052002-0000-4000-8000-000000000002'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c050002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('0c053001-0000-4000-8000-000000000001'::uuid, '0c050001-0000-4000-8000-000000000001'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c052001-0000-4000-8000-000000000001'::uuid, 'Importer', 'Importer'),
  ('0c053002-0000-4000-8000-000000000002'::uuid, '0c050002-0000-4000-8000-000000000002'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c052002-0000-4000-8000-000000000002'::uuid, 'Other', 'Other')
on conflict (id) do nothing;

-- Each user has connected their own Google account.
insert into public.tokens__google (
  user_id, google_account_id, google_email, access_token, refresh_token, expiry_date, scope
)
values
  ('0c050001-0000-4000-8000-000000000001'::uuid, 'gsheets-importer-account', 'importer@gmail.test', 'access-1', 'refresh-1', now() + interval '1 hour', 'drive.file'),
  ('0c050002-0000-4000-8000-000000000002'::uuid, 'gsheets-other-account', 'other@gmail.test', 'access-2', 'refresh-2', now() + interval '1 hour', 'drive.file');

-- Two Sheets datasets the importer owns, the first already imported.
insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('0c055001-0000-4000-8000-000000000001'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c050001-0000-4000-8000-000000000001'::uuid, '0c053001-0000-4000-8000-000000000001'::uuid,
   'gsheets imported dataset', 'google_sheets'::public.datasets__source_type),
  ('0c055002-0000-4000-8000-000000000002'::uuid, '0c051001-0000-4000-8000-000000000001'::uuid, '0c050001-0000-4000-8000-000000000001'::uuid, '0c053001-0000-4000-8000-000000000001'::uuid,
   'gsheets new dataset', 'google_sheets'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__google_sheets (
  id, dataset_id, workspace_id, google_account_id, google_document_id, sheet_name
)
values (
  '0c056001-0000-4000-8000-000000000001'::uuid,
  '0c055001-0000-4000-8000-000000000001'::uuid,
  '0c051001-0000-4000-8000-000000000001'::uuid,
  'gsheets-importer-account',
  'importer-document',
  'Kenya'
);

select plan (7);

-- 1. A dataset editor cannot name another user's Google account, which would
-- read that person's files for everyone who can see the dataset.
select throws_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c050001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  insert into public.datasets__google_sheets (dataset_id, workspace_id, google_account_id, google_document_id)
  values (
    '0c055002-0000-4000-8000-000000000002'::uuid,
    '0c051001-0000-4000-8000-000000000001'::uuid,
    'gsheets-other-account',
    'other-document'
  );
  $t1$,
  '42501',
  null,
  'a Sheets dataset cannot name another user''s Google account'
);

-- 2. Positive control for 1: they can name their own.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c050001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  insert into public.datasets__google_sheets (dataset_id, workspace_id, google_account_id, google_document_id)
  values (
    '0c055002-0000-4000-8000-000000000002'::uuid,
    '0c051001-0000-4000-8000-000000000001'::uuid,
    'gsheets-importer-account',
    'importer-second-document'
  );
  $t2$,
  'a Sheets dataset can name the inserting user''s own Google account'
);

-- 3. Positive control for 4 to 7: a column that is not the source can still
-- change.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c050001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.datasets__google_sheets
  set rows_to_skip = 2
  where id = '0c056001-0000-4000-8000-000000000001'::uuid;
  $t3$,
  'a Sheets dataset''s rows-to-skip can still change'
);

-- 4 to 7. Its account, document, tab and dataset cannot, even for a write
-- that bypasses RLS.
select throws_ok (
  $t4$
  reset role;
  update public.datasets__google_sheets
  set google_account_id = 'gsheets-other-account'
  where id = '0c056001-0000-4000-8000-000000000001'::uuid;
  $t4$,
  '23514',
  'a Google Sheets dataset cannot be repointed at another sheet',
  'a Sheets dataset cannot be switched to another Google account'
);

select throws_ok (
  $t5$
  reset role;
  update public.datasets__google_sheets
  set google_document_id = 'other-document'
  where id = '0c056001-0000-4000-8000-000000000001'::uuid;
  $t5$,
  '23514',
  'a Google Sheets dataset cannot be repointed at another sheet',
  'a Sheets dataset cannot be pointed at another document'
);

select throws_ok (
  $t6$
  reset role;
  update public.datasets__google_sheets
  set sheet_name = 'Payroll'
  where id = '0c056001-0000-4000-8000-000000000001'::uuid;
  $t6$,
  '23514',
  'a Google Sheets dataset cannot be repointed at another sheet',
  'a Sheets dataset cannot be pointed at another tab'
);

select throws_ok (
  $t7$
  reset role;
  update public.datasets__google_sheets
  set dataset_id = '0c055002-0000-4000-8000-000000000002'::uuid
  where id = '0c056001-0000-4000-8000-000000000001'::uuid;
  $t7$,
  '23514',
  'a Google Sheets dataset cannot be repointed at another sheet',
  'a Sheets satellite row cannot be moved onto another dataset'
);

select * from finish ();

rollback;
