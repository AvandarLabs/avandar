\set ON_ERROR_STOP on

/**
 * `vault.decrypted_secrets` must never be reachable by `anon` or
 * `authenticated` - a structural improvement over the plain-text
 * `tokens__google` precedent: there is no RLS policy on the secret to get
 * wrong, because the client-reachable tables never contain the plaintext.
 *
 * `rpc_db_connections__get_decrypted_secret` is the one function allowed to
 * read that view; `rpc_db_connections__create_vault_secret`,
 * `rpc_db_connections__update_vault_secret`, and
 * `rpc_db_connections__delete_vault_secret` are the only functions allowed
 * to write or remove one. All four must be `service_role`-only.
 */
begin;

set search_path to extensions, public;

select plan(14);

select ok(
  not has_column_privilege('anon', 'vault.decrypted_secrets', 'decrypted_secret', 'SELECT'),
  'anon cannot select vault.decrypted_secrets.decrypted_secret'
);

select ok(
  not has_column_privilege('authenticated', 'vault.decrypted_secrets', 'decrypted_secret', 'SELECT'),
  'authenticated cannot select vault.decrypted_secrets.decrypted_secret'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_db_connections__get_decrypted_secret(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute rpc_db_connections__get_decrypted_secret'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_db_connections__get_decrypted_secret(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute rpc_db_connections__get_decrypted_secret'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_db_connections__get_decrypted_secret(uuid)',
    'EXECUTE'
  ),
  'service_role can execute rpc_db_connections__get_decrypted_secret'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_db_connections__create_vault_secret(text, text, text)',
    'EXECUTE'
  ),
  'anon cannot execute rpc_db_connections__create_vault_secret'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_db_connections__create_vault_secret(text, text, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute rpc_db_connections__create_vault_secret'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_db_connections__create_vault_secret(text, text, text)',
    'EXECUTE'
  ),
  'service_role can execute rpc_db_connections__create_vault_secret'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_db_connections__update_vault_secret(uuid, text)',
    'EXECUTE'
  ),
  'anon cannot execute rpc_db_connections__update_vault_secret'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_db_connections__update_vault_secret(uuid, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute rpc_db_connections__update_vault_secret'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_db_connections__update_vault_secret(uuid, text)',
    'EXECUTE'
  ),
  'service_role can execute rpc_db_connections__update_vault_secret'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_db_connections__delete_vault_secret(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute rpc_db_connections__delete_vault_secret'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.rpc_db_connections__delete_vault_secret(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute rpc_db_connections__delete_vault_secret'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.rpc_db_connections__delete_vault_secret(uuid)',
    'EXECUTE'
  ),
  'service_role can execute rpc_db_connections__delete_vault_secret'
);

select * from finish();

rollback;
