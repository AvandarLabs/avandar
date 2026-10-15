/**
 * Returns the decrypted password behind a saved Postgres connection's Vault
 * secret, by the `vault_secret_id` stored on `db_connections__postgres`.
 *
 * This is the only code path allowed to read `vault.decrypted_secrets`:
 * `security definer`, and restricted to `service_role` by the revoke/grant
 * pair below - `anon` and `authenticated`
 * have no EXECUTE grant on this function at all, so even a bug that let an
 * unauthorized caller reach it could not leak a password to the browser.
 * Called from the `external-datasets` edge function using `SupabaseAdmin`,
 * only after that function's own `util__auth_user_meets_min_app_role` check
 * has passed for the caller's own session.
 *
 * @param p_vault_secret_id The `db_connections__postgres.vault_secret_id`
 *   to decrypt.
 * @returns The decrypted password, or null if no such secret exists.
 */
create or replace function public.rpc_db_connections__get_decrypted_secret (
  p_vault_secret_id uuid
) returns text language plpgsql security definer
set
  search_path = public, vault as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_vault_secret_id;

  return v_secret;
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the single path allowed to decrypt a connection secret.
revoke
execute on function public.rpc_db_connections__get_decrypted_secret (uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_db_connections__get_decrypted_secret (uuid) to service_role;
