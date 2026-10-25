/**
 * Deletes a Vault secret by id - the counterpart to
 * `rpc_db_connections__create_vault_secret`, used when a connector
 * credential's owning row is removed (e.g. connection cleanup, or test
 * teardown) and the secret it pointed at must not outlive it.
 *
 * `vault.secrets` has no delete RPC of its own, so this `security definer`
 * wrapper is the only path allowed to remove one - same access rule as the
 * create/update paths, `service_role`-only.
 *
 * @param p_secret_id The secret id to delete
 *   (`db_connections__postgres.vault_secret_id`).
 */
create or replace function public.rpc_db_connections__delete_vault_secret (p_secret_id uuid) returns void language plpgsql security definer
set
  search_path = public,
  vault as $$
begin
  delete from vault.secrets where id = p_secret_id;
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the only path allowed to remove a connector credential from Vault.
revoke
execute on function public.rpc_db_connections__delete_vault_secret (uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_db_connections__delete_vault_secret (uuid) to service_role;
