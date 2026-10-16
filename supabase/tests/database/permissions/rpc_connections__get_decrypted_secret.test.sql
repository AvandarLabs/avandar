\set ON_ERROR_STOP on

/**
 * `rpc_connections__get_decrypted_secret` must refuse to decrypt a real
 * Vault secret when the caller's `p_workspace_id` does not match the
 * workspace of the `connections__postgres` row that actually owns it - the
 * RPC-level half of the single-caller invariant documented on the function
 * itself (`postgresConnectionRow.ts`'s own workspace-scoped lookup is the
 * other half). This is deliberately redundant with that lookup: the point
 * is that this still holds even if a future caller skips it.
 */
begin;

set search_path to extensions, public, vault;

insert into auth.users (id, email, aud, role)
values ('0c020001-0000-4000-8000-000000000001'::uuid, 'secretscope_owner@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, 'secretscope ws a', 'secretscope-ws-a'),
  ('0c021002-0000-4000-8000-000000000002'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, 'secretscope ws b', 'secretscope-ws-b')
on conflict (id) do nothing;

insert into public.connections (id, workspace_id, connection_type, name, created_by)
values (
  '0c024001-0000-4000-8000-000000000001'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'postgres'::public.connections__connection_type,
  'secretscope connection',
  '0c020001-0000-4000-8000-000000000001'::uuid
)
on conflict (id) do nothing;

-- A real Vault secret, not a bare random uuid, so the matching-workspace
-- case can assert the actual decrypted value comes back, not just that the
-- call did not error.
select vault.create_secret('correct-horse-battery-staple', 'rpc-scope-test-secret', 'pgTAP fixture') as secret_id \gset

insert into public.connections__postgres (
  connection_id, workspace_id, host, port, database_name, username, vault_secret_id
)
values (
  '0c024001-0000-4000-8000-000000000001'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'db.example.org',
  5432,
  'reporting',
  'readonly_user',
  :'secret_id'::uuid
)
on conflict (connection_id) do nothing;

select plan(3);

select is(
  (select public.rpc_connections__get_decrypted_secret(:'secret_id'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid)),
  'correct-horse-battery-staple',
  'the owning workspace decrypts its own connection''s secret'
);

select is(
  (select public.rpc_connections__get_decrypted_secret(:'secret_id'::uuid, '0c021002-0000-4000-8000-000000000002'::uuid)),
  null,
  'a different workspace cannot decrypt a secret that belongs to another workspace''s connection'
);

select is(
  (select public.rpc_connections__get_decrypted_secret(gen_random_uuid(), '0c021001-0000-4000-8000-000000000001'::uuid)),
  null,
  'a vault_secret_id with no matching connections__postgres row at all decrypts to null'
);

select * from finish();

rollback;
