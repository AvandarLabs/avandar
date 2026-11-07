/**
 * Deletes a Vault secret by id - the counterpart to
 * `rpc_connections__create_vault_secret`, used when a connector
 * credential's owning row is removed (e.g. connection cleanup, or test
 * teardown) and the secret it pointed at must not outlive it. Also the
 * rollback path for a secret that was just created and never got an owning
 * row at all, when a later step in the same creation request fails
 * (`testAndSaveConnection.ts`'s `_createConnection`) - unlike
 * `rpc_connections__update_vault_secret`/`..._get_decrypted_secret`, a
 * matching `connections__postgres` row is not guaranteed to exist here, so
 * this cannot require one the way those two do.
 *
 * Refuses only when `p_secret_id` is actively owned by a *different*
 * workspace's connection, not when it has no owner at all - that weaker
 * check is what still lets the orphan-rollback case through while closing
 * the actual cross-tenant failure mode: a future caller passing the wrong
 * secret id could delete some other workspace's still-in-use credential.
 *
 * `vault.secrets` has no delete RPC of its own, so this `security definer`
 * wrapper is the only path allowed to remove one - same access rule as the
 * create/update paths, `service_role`-only.
 *
 * @param p_secret_id The secret id to delete
 *   (`connections__postgres.vault_secret_id`).
 * @param p_workspace_id The workspace the caller is acting in. The delete is
 *   refused if `p_secret_id` belongs to a connection in a *different*
 *   workspace; an orphaned secret with no owning row at all is always
 *   deletable.
 */
create or replace function public.rpc_connections__delete_vault_secret (p_secret_id uuid, p_workspace_id uuid) returns void language plpgsql security definer
set
  search_path = public,
  vault as $$
begin
  if exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id <> p_workspace_id
  ) then
    raise exception 'Secret % belongs to a connection in a different workspace', p_secret_id;
  end if;

  delete from vault.secrets where id = p_secret_id;
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the only path allowed to remove a connector credential from Vault.
revoke
execute on function public.rpc_connections__delete_vault_secret (uuid, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_connections__delete_vault_secret (uuid, uuid) to service_role;
