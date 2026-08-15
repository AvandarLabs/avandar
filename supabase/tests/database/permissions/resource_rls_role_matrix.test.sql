\set ON_ERROR_STOP on

/**
 * RLS matrix for dashboards and datasets by effective resource role
 * (viewer / editor / admin via direct user shares on restricted resources).
 *
 *   viewer: SELECT
 *   editor: SELECT, UPDATE, INSERT (workspace editor+ app role)
 *   admin:  SELECT, UPDATE, DELETE
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'matrix_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2000002-0000-4000-8000-000000000002'::uuid,
    'matrix_viewer@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2000003-0000-4000-8000-000000000003'::uuid,
    'matrix_editor@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'matrix_admin@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'e2001001-0000-4000-8000-000000000001'::uuid,
  'e2000001-0000-4000-8000-000000000001'::uuid,
  'resource matrix ws',
  'resource-matrix-ws'
)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e2002001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e2002002-0000-4000-8000-000000000002'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'e2002003-0000-4000-8000-000000000003'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000003-0000-4000-8000-000000000003'::uuid
  ),
  (
    'e2002004-0000-4000-8000-000000000004'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000004-0000-4000-8000-000000000004'::uuid
  )
on conflict (id) do nothing;

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
    'e2003001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2002001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'e2003002-0000-4000-8000-000000000002'::uuid,
    'e2000002-0000-4000-8000-000000000002'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2002002-0000-4000-8000-000000000002'::uuid,
    'Viewer',
    'Viewer'
  ),
  (
    'e2003003-0000-4000-8000-000000000003'::uuid,
    'e2000003-0000-4000-8000-000000000003'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2002003-0000-4000-8000-000000000003'::uuid,
    'Editor',
    'Editor'
  ),
  (
    'e2003004-0000-4000-8000-000000000004'::uuid,
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2002004-0000-4000-8000-000000000004'::uuid,
    'Admin',
    'Admin'
  )
on conflict (id) do nothing;

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'e2001001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e2000001-0000-4000-8000-000000000001'::uuid then 'Global Admin'
    when 'e2000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    when 'e2000003-0000-4000-8000-000000000003'::uuid then 'Global Editor'
    else 'Global Admin'
  end;

insert into public.datasets (
  id,
  owner_id,
  owner_profile_id,
  workspace_id,
  name,
  description,
  source_type,
  is_restricted
)
values
  (
    'e200d001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e2003001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'shared dataset',
    '',
    'csv_file'::public.datasets__source_type,
    true
  ),
  (
    'e200d002-0000-4000-8000-000000000002'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e2003001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'admin delete dataset',
    '',
    'csv_file'::public.datasets__source_type,
    true
  )
on conflict (id) do nothing;

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  description,
  visibility,
  config,
  is_restricted
)
values
  (
    'e200b001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e2003001-0000-4000-8000-000000000001'::uuid,
    'shared dashboard',
    '',
    'draft',
    '{}'::jsonb,
    true
  ),
  (
    'e200b002-0000-4000-8000-000000000002'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e2003001-0000-4000-8000-000000000001'::uuid,
    'admin delete dashboard',
    '',
    'draft',
    '{}'::jsonb,
    true
  )
on conflict (id) do nothing;

insert into public.resource_shares (
  id,
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role
)
values
  (
    'e2005001-0000-4000-8000-000000000001'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    'e200d001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'e2005002-0000-4000-8000-000000000002'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    'e200d001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000003-0000-4000-8000-000000000003'::uuid,
    'editor'::public.role_level
  ),
  (
    'e2005003-0000-4000-8000-000000000003'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    'e200d001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'admin'::public.role_level
  ),
  (
    'e2005004-0000-4000-8000-000000000004'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    'e200d002-0000-4000-8000-000000000002'::uuid,
    'user'::public.share_principal_type,
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'admin'::public.role_level
  ),
  (
    'e2005011-0000-4000-8000-000000000011'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    'e200b001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'e2005012-0000-4000-8000-000000000012'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    'e200b001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000003-0000-4000-8000-000000000003'::uuid,
    'editor'::public.role_level
  ),
  (
    'e2005013-0000-4000-8000-000000000013'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    'e200b001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'admin'::public.role_level
  ),
  (
    'e2005014-0000-4000-8000-000000000014'::uuid,
    'e2001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    'e200b002-0000-4000-8000-000000000002'::uuid,
    'user'::public.share_principal_type,
    'e2000004-0000-4000-8000-000000000004'::uuid,
    'admin'::public.role_level
  )
on conflict (id) do nothing;

select
  plan (18);

-- Dataset SELECT (viewer / editor / admin shares)
select
  lives_ok (
    $sel_ds_viewer$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.datasets d
        where
          d.id = 'e200d001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'viewer share cannot select dataset';
      end if;
    end $chk$;
    $sel_ds_viewer$
  );

select
  lives_ok (
    $sel_ds_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.datasets d
        where
          d.id = 'e200d001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'editor share cannot select dataset';
      end if;
    end $chk$;
    $sel_ds_editor$
  );

select
  lives_ok (
    $sel_ds_admin$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000004-0000-4000-8000-000000000004","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.datasets d
        where
          d.id = 'e200d001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'admin share cannot select dataset';
      end if;
    end $chk$;
    $sel_ds_admin$
  );

-- Dataset UPDATE / DELETE
select
  lives_ok (
    $upd_ds_viewer$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_updated int;
    begin
      update public.datasets
      set
        name = 'viewer tried update'
      where
        id = 'e200d001-0000-4000-8000-000000000001'::uuid;

      get diagnostics v_updated = row_count;

      if v_updated > 0 then
        raise exception 'viewer share updated dataset';
      end if;
    end $chk$;
    $upd_ds_viewer$
  );

select
  lives_ok (
    $upd_ds_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    update public.datasets
    set
      name = 'editor updated dataset'
    where
      id = 'e200d001-0000-4000-8000-000000000001'::uuid;
    $upd_ds_editor$
  );

select
  lives_ok (
    $del_ds_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.datasets
      where
        id = 'e200d001-0000-4000-8000-000000000001'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted > 0 then
        raise exception 'editor share deleted dataset';
      end if;
    end $chk$;
    $del_ds_editor$
  );

select
  lives_ok (
    $del_ds_admin$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000004-0000-4000-8000-000000000004","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.datasets
      where
        id = 'e200d002-0000-4000-8000-000000000002'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted <> 1 then
        raise exception 'admin share did not delete dataset';
      end if;
    end $chk$;
    $del_ds_admin$
  );

-- Dashboard SELECT
select
  lives_ok (
    $sel_dash_viewer$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.dashboards d
        where
          d.id = 'e200b001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'viewer share cannot select dashboard';
      end if;
    end $chk$;
    $sel_dash_viewer$
  );

select
  lives_ok (
    $sel_dash_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.dashboards d
        where
          d.id = 'e200b001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'editor share cannot select dashboard';
      end if;
    end $chk$;
    $sel_dash_editor$
  );

select
  lives_ok (
    $sel_dash_admin$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000004-0000-4000-8000-000000000004","role":"authenticated"}',
        true
      );

    do $chk$
    begin
      if (
        select
          count(*)::int
        from
          public.dashboards d
        where
          d.id = 'e200b001-0000-4000-8000-000000000001'::uuid
      ) <> 1 then
        raise exception 'admin share cannot select dashboard';
      end if;
    end $chk$;
    $sel_dash_admin$
  );

-- Dashboard UPDATE / DELETE
select
  lives_ok (
    $upd_dash_viewer$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_updated int;
    begin
      update public.dashboards
      set
        name = 'viewer tried update'
      where
        id = 'e200b001-0000-4000-8000-000000000001'::uuid;

      get diagnostics v_updated = row_count;

      if v_updated > 0 then
        raise exception 'viewer share updated dashboard';
      end if;
    end $chk$;
    $upd_dash_viewer$
  );

select
  lives_ok (
    $upd_dash_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    update public.dashboards
    set
      name = 'editor updated dashboard'
    where
      id = 'e200b001-0000-4000-8000-000000000001'::uuid;
    $upd_dash_editor$
  );

select
  lives_ok (
    $del_dash_editor$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      delete from public.dashboards
      where
        id = 'e200b001-0000-4000-8000-000000000001'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted > 0 then
        raise exception 'editor share deleted dashboard';
      end if;
    end $chk$;
    $del_dash_editor$
  );

select
  lives_ok (
    $del_dash_admin$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000004-0000-4000-8000-000000000004","role":"authenticated"}',
        true
      );

    do $chk$
    declare
      v_deleted int;
    begin
      update public.dashboards
      set
        snapshot_transition_kind = 'delete',
        snapshot_transition_revision = 'e2009002-0000-4000-8000-000000000002'::uuid,
        snapshot_transition_prior_revision = snapshot_revision,
        snapshot_transition_prior_visibility = visibility,
        snapshot_transition_target_visibility = null
      where
        id = 'e200b002-0000-4000-8000-000000000002'::uuid;

      delete from public.dashboards
      where
        id = 'e200b002-0000-4000-8000-000000000002'::uuid;

      get diagnostics v_deleted = row_count;

      if v_deleted <> 1 then
        raise exception 'admin share did not delete dashboard';
      end if;
    end $chk$;
    $del_dash_admin$
  );

-- INSERT: workspace app role editor+ required
select
  throws_ok (
    $ins_viewer_ds$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
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
      'e200d099-0000-4000-8000-000000000099'::uuid,
      'e2000002-0000-4000-8000-000000000002'::uuid,
      'e2003002-0000-4000-8000-000000000002'::uuid,
      'e2001001-0000-4000-8000-000000000001'::uuid,
      'viewer insert',
      '',
      'csv_file'::public.datasets__source_type
    );
    $ins_viewer_ds$,
    '42501'
  );

select
  lives_ok (
    $ins_editor_ds$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
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
      'e200d098-0000-4000-8000-000000000098'::uuid,
      'e2000003-0000-4000-8000-000000000003'::uuid,
      'e2003003-0000-4000-8000-000000000003'::uuid,
      'e2001001-0000-4000-8000-000000000001'::uuid,
      'editor insert',
      '',
      'csv_file'::public.datasets__source_type
    );
    $ins_editor_ds$
  );

select
  throws_ok (
    $ins_viewer_dash$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000002-0000-4000-8000-000000000002","role":"authenticated"}',
        true
      );

    insert into public.dashboards (
      id,
      workspace_id,
      owner_id,
      owner_profile_id,
      name,
      description,
      visibility,
      config
    ) values (
      'e200b099-0000-4000-8000-000000000099'::uuid,
      'e2001001-0000-4000-8000-000000000001'::uuid,
      'e2000002-0000-4000-8000-000000000002'::uuid,
      'e2003002-0000-4000-8000-000000000002'::uuid,
      'viewer insert dash',
      '',
      'draft',
      '{}'::jsonb
    );
    $ins_viewer_dash$,
    '42501'
  );

select
  lives_ok (
    $ins_editor_dash$
    set local role authenticated;

    select
      set_config(
        'request.jwt.claims',
        '{"sub":"e2000003-0000-4000-8000-000000000003","role":"authenticated"}',
        true
      );

    insert into public.dashboards (
      id,
      workspace_id,
      owner_id,
      owner_profile_id,
      name,
      description,
      visibility,
      config
    ) values (
      'e200b098-0000-4000-8000-000000000098'::uuid,
      'e2001001-0000-4000-8000-000000000001'::uuid,
      'e2000003-0000-4000-8000-000000000003'::uuid,
      'e2003003-0000-4000-8000-000000000003'::uuid,
      'editor insert dash',
      '',
      'draft',
      '{}'::jsonb
    );
    $ins_editor_dash$
  );

select
  *
from
  finish ();

rollback;
