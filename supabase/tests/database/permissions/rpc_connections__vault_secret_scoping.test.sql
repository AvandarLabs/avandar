\set ON_ERROR_STOP on

/**
 * All three Vault secret RPCs that take an existing secret id
 * (`..._get_decrypted_secret`, `..._update_vault_secret`,
 * `..._delete_vault_secret`) must refuse to act on a real Vault secret when
 * the caller's `p_workspace_id` does not match the workspace that actually
 * owns it - the RPC-level half of the single-caller invariant each
 * function's own docstring documents (the one real caller's own
 * workspace-scoped lookup is the other half). This is deliberately
 * redundant with that lookup: the point is that it still holds even if a
 * future caller skips it.
 *
 * `..._delete_vault_secret` is looser by necessity: it is also the rollback
 * path for a secret that was just created and never got an owning row at
 * all (a failed `_createConnection`), so it refuses only when the secret is
 * owned by a *different* workspace, not when it has no owner yet.
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

-- A second secret, owned by workspace A the same way, dedicated to the
-- update/delete tests below so they cannot disturb the decrypt assertions
-- above by mutating or removing the first secret.
select vault.create_secret('rotate-me-password', 'rpc-scope-test-secret-2', 'pgTAP fixture') as secret_id_2 \gset

insert into public.connections (id, workspace_id, connection_type, name, created_by)
values (
  '0c024002-0000-4000-8000-000000000002'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'postgres'::public.connections__connection_type,
  'secretscope connection 2',
  '0c020001-0000-4000-8000-000000000001'::uuid
)
on conflict (id) do nothing;

insert into public.connections__postgres (
  connection_id, workspace_id, host, port, database_name, username, vault_secret_id
)
values (
  '0c024002-0000-4000-8000-000000000002'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'db2.example.org',
  5432,
  'reporting2',
  'readonly_user2',
  :'secret_id_2'::uuid
)
on conflict (connection_id) do nothing;

-- A third, truly orphaned secret - created but never given an owning row,
-- the exact shape a failed _createConnection rolls back.
select vault.create_secret('orphan-password', 'rpc-scope-test-secret-orphan', 'pgTAP fixture') as orphan_secret_id \gset

select plan(8);

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

select throws_ok(
  format(
    $$select public.rpc_connections__update_vault_secret(%L::uuid, 'hostile-rotate', %L::uuid)$$,
    :'secret_id_2', '0c021002-0000-4000-8000-000000000002'
  ),
  'P0001',
  null,
  'a different workspace cannot rotate a secret that belongs to another workspace''s connection'
);

select lives_ok(
  format(
    $$select public.rpc_connections__update_vault_secret(%L::uuid, 'rotated-password', %L::uuid)$$,
    :'secret_id_2', '0c021001-0000-4000-8000-000000000001'
  ),
  'the owning workspace can rotate its own connection''s secret'
);

select is(
  (select public.rpc_connections__get_decrypted_secret(:'secret_id_2'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid)),
  'rotated-password',
  'the rotation actually took effect'
);

select throws_ok(
  format(
    $$select public.rpc_connections__delete_vault_secret(%L::uuid, %L::uuid)$$,
    :'secret_id_2', '0c021002-0000-4000-8000-000000000002'
  ),
  'P0001',
  null,
  'a different workspace cannot delete a secret that belongs to another workspace''s connection'
);

select lives_ok(
  format(
    $$select public.rpc_connections__delete_vault_secret(%L::uuid, %L::uuid)$$,
    :'orphan_secret_id', '0c021002-0000-4000-8000-000000000002'
  ),
  'a truly orphaned secret (no owning row at all) can be deleted regardless of which workspace asks - the rollback case'
);

select * from finish();

rollback;
