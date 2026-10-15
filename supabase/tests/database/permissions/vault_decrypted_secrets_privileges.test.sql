\set ON_ERROR_STOP on

/**
 * `vault.decrypted_secrets` must never be reachable by `anon` or
 * `authenticated` - the structural improvement over the plain-text
 * `tokens__google` precedent this feature's design spec (section 5.2)
 * explicitly calls out: there is no RLS policy on the secret to get wrong,
 * because the client-reachable tables never contain the plaintext.
 *
 * `rpc_db_connections__get_decrypted_secret` is the one function allowed to
 * read that view; it must be `service_role`-only.
 */
begin;

set search_path to extensions, public;

select plan(5);

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

select * from finish();

rollback;
