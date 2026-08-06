\set ON_ERROR_STOP on

/**
 * Hardened RLS for top-level datasets and dashboards: INSERT requires editor+
 * app role and self-ownership; UPDATE requires effective editor+; DELETE
 * requires effective admin+. SELECT uses `util__auth_user_may_select_*` so
 * Global Editors cannot read others' unrestricted resources without a share.
 * Cross-workspace INSERT must fail.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'rls_mgr_o@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'f1000002-0000-4000-8000-000000000002'::uuid,
    'rls_mgr_e@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'f1000003-0000-4000-8000-000000000003'::uuid,
    'rls_mgr_p@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'rls mgr w1',
    'rls-mgr-w1'
  ),
  (
    'f1001002-0000-4000-8000-000000000002'::uuid,
    'f1000003-0000-4000-8000-000000000003'::uuid,
    'rls mgr w2',
    'rls-mgr-w2'
  )
on conflict (id) do nothing;

insert into public.workspace_memberships (
  id,
  workspace_id,
  user_id,
  role_group_id
)
values
  (
    'f1002001-0000-4000-8000-000000000001'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    null
  ),
  (
    'f1002002-0000-4000-8000-000000000002'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1000002-0000-4000-8000-000000000002'::uuid,
    null
  ),
  (
    'f1002003-0000-4000-8000-000000000003'::uuid,
    'f1001002-0000-4000-8000-000000000002'::uuid,
    'f1000003-0000-4000-8000-000000000003'::uuid,
    null
  )
on conflict (id) do nothing;

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'f1001001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  (
    (
      wm.user_id = 'f1000001-0000-4000-8000-000000000001'::uuid and
      rg.name = 'Global Admin'
    ) or
    (
      wm.user_id = 'f1000002-0000-4000-8000-000000000002'::uuid and
      rg.name = 'Global Editor'
    )
  );

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'f1001002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  wm.user_id = 'f1000003-0000-4000-8000-000000000003'::uuid and
  rg.name = 'Global Admin';

insert into public.user_profiles (
  id,
  user_id,
  workspace_id,
  membership_id,
  full_name,
  display_name
)
values
  (
    'f1003001-0000-4000-8000-000000000001'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1002001-0000-4000-8000-000000000001'::uuid,
    'O',
    'O'
  ),
  (
    'f1003002-0000-4000-8000-000000000002'::uuid,
    'f1000002-0000-4000-8000-000000000002'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1002002-0000-4000-8000-000000000002'::uuid,
    'E',
    'E'
  ),
  (
    'f1003003-0000-4000-8000-000000000003'::uuid,
    'f1000003-0000-4000-8000-000000000003'::uuid,
    'f1001002-0000-4000-8000-000000000002'::uuid,
    'f1002003-0000-4000-8000-000000000003'::uuid,
    'P',
    'P'
  )
on conflict (id) do nothing;

insert into public.datasets (
  id,
  owner_id,
  owner_profile_id,
  workspace_id,
  name,
  description,
  source_type
)
values
  (
    'f100d010-0000-4000-8000-000000000010'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'f1003001-0000-4000-8000-000000000001'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'seed owner ds',
    '',
    'csv_file'::public.datasets__source_type
  )
on conflict (id) do nothing;

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  description,
  is_public,
  config
)
values
  (
    'f100b010-0000-4000-8000-000000000010'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'f1003001-0000-4000-8000-000000000001'::uuid,
    'seed owner dash',
    '',
    false,
    '{}'::jsonb
  )
on conflict (id) do nothing;

insert into public.datasets (
  id,
  owner_id,
  owner_profile_id,
  workspace_id,
  name,
  description,
  source_type
)
values
  (
    'f100d020-0000-4000-8000-000000000020'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'f1003001-0000-4000-8000-000000000001'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'disposable owner ds',
    '',
    'csv_file'::public.datasets__source_type
  )
on conflict (id) do nothing;

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  description,
  is_public,
  config
)
values
  (
    'f100b020-0000-4000-8000-000000000020'::uuid,
    'f1001001-0000-4000-8000-000000000001'::uuid,
    'f1000001-0000-4000-8000-000000000001'::uuid,
    'f1003001-0000-4000-8000-000000000001'::uuid,
    'disposable owner dash',
    '',
    false,
    '{}'::jsonb
  )
on conflict (id) do nothing;

select
  plan (18);

select
  lives_ok (
    $ins_ds_home$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    insert into public.datasets (
      id,
      owner_id,
      owner_profile_id,
      workspace_id,
      name,
      description,
      source_type
    ) values (
      'f100d001-0000-4000-8000-000000000001'::uuid,
      'f1000002-0000-4000-8000-000000000002'::uuid,
      'f1003002-0000-4000-8000-000000000002'::uuid,
      'f1001001-0000-4000-8000-000000000001'::uuid,
      'editor ds',
      '',
      'csv_file'::public.datasets__source_type
    );
    $ins_ds_home$
  );

select
  lives_ok (
    $ins_dash_home$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    insert into public.dashboards (
      id,
      workspace_id,
      owner_id,
      owner_profile_id,
      name,
      description,
      is_public,
      config
    ) values (
      'f100b001-0000-4000-8000-000000000001'::uuid,
      'f1001001-0000-4000-8000-000000000001'::uuid,
      'f1000002-0000-4000-8000-000000000002'::uuid,
      'f1003002-0000-4000-8000-000000000002'::uuid,
      'editor dash',
      '',
      false,
      '{}'::jsonb
    );
    $ins_dash_home$
  );

select
  throws_ok (
    $ins_ds_foreign$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    insert into public.datasets (
      id,
      owner_id,
      owner_profile_id,
      workspace_id,
      name,
      description,
      source_type
    ) values (
      'f100d002-0000-4000-8000-000000000002'::uuid,
      'f1000002-0000-4000-8000-000000000002'::uuid,
      'f1003002-0000-4000-8000-000000000002'::uuid,
      'f1001002-0000-4000-8000-000000000002'::uuid,
      'cross ws ds',
      '',
      'csv_file'::public.datasets__source_type
    );
    $ins_ds_foreign$,
    '42501'
  );

select
  lives_ok (
    $ins_ds_owner$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
        true
      );

    insert into public.datasets (
      id,
      owner_id,
      owner_profile_id,
      workspace_id,
      name,
      description,
      source_type
    ) values (
      'f100d003-0000-4000-8000-000000000003'::uuid,
      'f1000001-0000-4000-8000-000000000001'::uuid,
      'f1003001-0000-4000-8000-000000000001'::uuid,
      'f1001001-0000-4000-8000-000000000001'::uuid,
      'owner ds',
      '',
      'csv_file'::public.datasets__source_type
    );
    $ins_ds_owner$
  );

select
  throws_ok (
    $ins_dash_foreign$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    insert into public.dashboards (
      id,
      workspace_id,
      owner_id,
      owner_profile_id,
      name,
      description,
      is_public,
      config
    ) values (
      'f100b002-0000-4000-8000-000000000002'::uuid,
      'f1001002-0000-4000-8000-000000000002'::uuid,
      'f1000002-0000-4000-8000-000000000002'::uuid,
      'f1003002-0000-4000-8000-000000000002'::uuid,
      'cross dash',
      '',
      false,
      '{}'::jsonb
    );
    $ins_dash_foreign$,
    '42501'
  );

select
  lives_ok (
    $ins_dash_owner$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
        true
      );

    insert into public.dashboards (
      id,
      workspace_id,
      owner_id,
      owner_profile_id,
      name,
      description,
      is_public,
      config
    ) values (
      'f100b003-0000-4000-8000-000000000003'::uuid,
      'f1001001-0000-4000-8000-000000000001'::uuid,
      'f1000001-0000-4000-8000-000000000001'::uuid,
      'f1003001-0000-4000-8000-000000000001'::uuid,
      'owner dash',
      '',
      false,
      '{}'::jsonb
    );
    $ins_dash_owner$
  );

select
  lives_ok (
    $upd_ds_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_updated int;
    begin
      update public.datasets
      set
        name = 'hacked ds'
      where
        id = 'f100d010-0000-4000-8000-000000000010'::uuid;

      get diagnostics v_updated = row_count;

      if v_updated > 0 then
        raise exception 'Global editor updated another user dataset'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $upd_ds_editor$
  );

select
  lives_ok (
    $upd_dash_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_updated int;
    begin
      update public.dashboards
      set
        name = 'hacked dash'
      where
        id = 'f100b010-0000-4000-8000-000000000010'::uuid;

      get diagnostics v_updated = row_count;

      if v_updated > 0 then
        raise exception 'Global editor updated another user dashboard'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $upd_dash_editor$
  );

select
  lives_ok (
    $upd_ds_owner$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
        true
      );

    update public.datasets
    set
      name = 'owner renamed ds'
    where
      id = 'f100d010-0000-4000-8000-000000000010'::uuid;
    $upd_ds_owner$
  );

select
  lives_ok (
    $upd_dash_owner$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
        true
      );

    update public.dashboards
    set
      name = 'owner renamed dash'
    where
      id = 'f100b010-0000-4000-8000-000000000010'::uuid;
    $upd_dash_owner$
  );

set local role postgres;

set local role authenticated;

select
  set_config(
    'request.jwt.claims',
    '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );

select
  is (
    (
      select
        count(*)::int
      from
        public.datasets d
      where
        d.id = 'f100d010-0000-4000-8000-000000000010'::uuid
    ),
    0,
    'editor cannot select another user dataset'
  );

select
  is (
    (
      select
        count(*)::int
      from
        public.dashboards d
      where
        d.id = 'f100b010-0000-4000-8000-000000000010'::uuid
    ),
    0,
    'editor cannot select another user dashboard'
  );

set local role postgres;

set local role authenticated;

select
  set_config(
    'request.jwt.claims',
    '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );

select
  is (
    (
      select
        count(*)::int
      from
        public.datasets d
      where
        d.id = 'f100d010-0000-4000-8000-000000000010'::uuid
    ),
    1,
    'owner can select own dataset'
  );

select
  is (
    (
      select
        count(*)::int
      from
        public.dashboards d
      where
        d.id = 'f100b010-0000-4000-8000-000000000010'::uuid
    ),
    1,
    'owner can select own dashboard'
  );

select
  lives_ok (
    $del_ds_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.datasets
      where
        id = 'f100d020-0000-4000-8000-000000000020'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted > 0 then
        raise exception 'Global editor deleted owner dataset'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $del_ds_editor$
  );

select
  lives_ok (
    $del_dash_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.dashboards
      where
        id = 'f100b020-0000-4000-8000-000000000020'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted > 0 then
        raise exception 'Global editor deleted owner dashboard'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $del_dash_editor$
  );

set local role postgres;

set local role authenticated;

select
  set_config(
    'request.jwt.claims',
    '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );

select
  lives_ok (
    $del_ds_owner$
    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.datasets
      where
        id = 'f100d020-0000-4000-8000-000000000020'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted <> 1 then
        raise exception 'owner delete dataset expected one row'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $del_ds_owner$
  );

select
  lives_ok (
    $del_dash_owner$
    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.dashboards
      where
        id = 'f100b020-0000-4000-8000-000000000020'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted <> 1 then
        raise exception 'owner delete dashboard expected one row'
          using errcode = 'insufficient_privilege';
      end if;
    end $chk$;
    $del_dash_owner$
  );

select
  *
from
  finish ();

rollback;
