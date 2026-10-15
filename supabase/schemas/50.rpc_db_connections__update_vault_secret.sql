/**
 * Rotates an existing Vault secret's value in place (same secret id,
 * new plaintext), for the "rotate this connection's credential" path of
 * `test-and-save` (triggered when the caller already has a `connectionId`
 * to rotate rather than create anew). Updating in place, rather than
 * creating a new secret and repointing `vault_secret_id`, avoids leaving an
 * orphaned secret behind on every rotation.
 *
 * Same access rule as the create path: `vault.update_secret` is never
 * reachable directly, only through this `security definer` wrapper,
 * `service_role`-only.
 *
 * @param p_secret_id The existing secret id (`db_connections__postgres.vault_secret_id`).
 * @param p_new_secret The new plaintext value to encrypt.
 */
create or replace function public.rpc_db_connections__update_vault_secret (
  p_secret_id uuid,
  p_new_secret text
) returns void language plpgsql security definer
set
  search_path = public, vault as $$
begin
  perform vault.update_secret(p_secret_id, p_new_secret);
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the only path allowed to rotate a connector credential in Vault.
revoke
execute on function public.rpc_db_connections__update_vault_secret (uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_db_connections__update_vault_secret (uuid, text) to service_role;
