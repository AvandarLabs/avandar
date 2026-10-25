\set ON_ERROR_STOP on

/**
 * A Postgres connection's Vault secret lives exactly as long as the
 * connection that owns it: deleting the connection, or the workspace that
 * cascades it away, deletes the secret too, so a decryptable credential
 * never outlives the row that pointed at it. Because the delete follows the
 * row, two connections may never share one secret.
 */
begin;

set search_path to extensions, public, vault;

select plan (4);

insert into auth.users (id, email, aud, role)
values ('0c030001-0000-4000-8000-000000000001'::uuid, 'vaultlife_owner@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('0c031001-0000-4000-8000-000000000001'::uuid, '0c030001-0000-4000-8000-000000000001'::uuid, 'vaultlife ws a', 'vaultlife-ws-a'),
  ('0c031002-0000-4000-8000-000000000002'::uuid, '0c030001-0000-4000-8000-000000000001'::uuid, 'vaultlife ws b', 'vaultlife-ws-b')
on conflict (id) do nothing;

insert into public.connections (id, workspace_id, connection_type, name)
values
  ('0c034001-0000-4000-8000-000000000001'::uuid, '0c031001-0000-4000-8000-000000000001'::uuid, 'postgres'::public.connections__connection_type, 'deleted directly'),
  ('0c034002-0000-4000-8000-000000000002'::uuid, '0c031002-0000-4000-8000-000000000002'::uuid, 'postgres'::public.connections__connection_type, 'deleted with its workspace'),
  ('0c034003-0000-4000-8000-000000000003'::uuid, '0c031001-0000-4000-8000-000000000001'::uuid, 'postgres'::public.connections__connection_type, 'tries to share a secret')
on conflict (id) do nothing;

select vault.create_secret('direct-delete-password', 'vaultlife-direct', 'pgTAP fixture') as direct_secret_id \gset
select vault.create_secret('workspace-delete-password', 'vaultlife-workspace', 'pgTAP fixture') as workspace_secret_id \gset
select vault.create_secret('bystander-password', 'vaultlife-bystander', 'pgTAP fixture') as bystander_secret_id \gset

insert into public.connections__postgres (
  connection_id, workspace_id, host, port, database_name, username, vault_secret_id
)
values
  ('0c034001-0000-4000-8000-000000000001'::uuid, '0c031001-0000-4000-8000-000000000001'::uuid, 'db.example.org', 5432, 'reporting', 'reader', :'direct_secret_id'::uuid),
  ('0c034002-0000-4000-8000-000000000002'::uuid, '0c031002-0000-4000-8000-000000000002'::uuid, 'db.example.org', 5432, 'reporting', 'reader', :'workspace_secret_id'::uuid);

-- 1. Two connections cannot point at one secret: deleting either would
-- otherwise delete the other's credential.
select throws_ok (
  format(
    $$insert into public.connections__postgres (connection_id, workspace_id, host, port, database_name, username, vault_secret_id)
      values ('0c034003-0000-4000-8000-000000000003', '0c031001-0000-4000-8000-000000000001', 'db.example.org', 5432, 'reporting', 'reader', %L)$$,
    :'direct_secret_id'
  ),
  '23505',
  null,
  'two connections cannot share one Vault secret'
);

-- A connection in the same workspace that is never deleted, so its secret
-- must survive every delete below.
insert into public.connections__postgres (
  connection_id, workspace_id, host, port, database_name, username, vault_secret_id
)
values
  ('0c034003-0000-4000-8000-000000000003'::uuid, '0c031001-0000-4000-8000-000000000001'::uuid, 'db.example.org', 5432, 'reporting', 'reader', :'bystander_secret_id'::uuid);

-- 2. Deleting a connection deletes its secret.
delete from public.connections where id = '0c034001-0000-4000-8000-000000000001'::uuid;

select is (
  (select count(*)::int from vault.secrets where id = :'direct_secret_id'::uuid),
  0,
  'deleting a connection deletes its Vault secret'
);

-- 3. Deleting a workspace, which cascades its connections away, deletes
-- their secrets too.
delete from public.workspaces where id = '0c031002-0000-4000-8000-000000000002'::uuid;

select is (
  (select count(*)::int from vault.secrets where id = :'workspace_secret_id'::uuid),
  0,
  'deleting a workspace deletes its connections'' Vault secrets'
);

-- 4. Nothing but the owning row's own secret is touched.
select is (
  (select count(*)::int from vault.secrets where id = :'bystander_secret_id'::uuid),
  1,
  'a connection that is not deleted keeps its Vault secret through those deletes'
);

select * from finish ();

rollback;
