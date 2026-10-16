/**
 * Creates a new Vault secret holding a connector's credential (the password
 * alone), returning the secret's id to store in
 * `db_connections__postgres.vault_secret_id`.
 *
 * `vault.create_secret` lives in the `vault` schema, which is never exposed
 * over the Data API (that is the entire point of Vault - every access goes
 * through a `security definer` function in `public` instead, same as the
 * read path `rpc_db_connections__get_decrypted_secret`). Called from the
 * `connectors` edge function using `SupabaseAdmin`, only after that
 * function's own `util__auth_user_meets_min_app_role` check has passed.
 *
 * @param p_secret The plaintext value to encrypt (the connection password).
 * @param p_name A short, unique-enough label for the secret (shown only in
 *   `vault.secrets` itself, never to end users).
 * @param p_description Free-text context for the secret.
 * @returns The new secret's id.
 */
create or replace function public.rpc_db_connections__create_vault_secret (
  p_secret text,
  p_name text,
  p_description text
) returns uuid language plpgsql security definer
set
  search_path = public, vault as $$
declare
  v_secret_id uuid;
begin
  v_secret_id := vault.create_secret(p_secret, p_name, p_description);
  return v_secret_id;
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the only path allowed to write a connector credential into Vault.
revoke
execute on function public.rpc_db_connections__create_vault_secret (text, text, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_db_connections__create_vault_secret (text, text, text) to service_role;
