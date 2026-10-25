/**
 * Rotates an existing Vault secret's value in place (same secret id,
 * new plaintext), for the "rotate this connection's credential" path of
 * `test-and-save` (triggered when the caller already has a `connectionId`
 * to rotate rather than create anew). Updating in place, rather than
 * creating a new secret and repointing `vault_secret_id`, avoids leaving an
 * orphaned secret behind on every rotation.
 *
 * Refuses unless `p_secret_id` belongs to a `connections__postgres` row
 * scoped to `p_workspace_id` - the one real caller
 * (`testAndSaveConnection.ts`'s `_rotateConnection`) already reads that row
 * through a workspace-scoped lookup before ever calling this, so this check
 * is redundant with that, deliberately: it closes the failure mode for any
 * future caller that skipped the same scoping, not just makes it less
 * likely. Same reasoning as `rpc_connections__get_decrypted_secret`.
 *
 * Same access rule as the create path: `vault.update_secret` is never
 * reachable directly, only through this `security definer` wrapper,
 * `service_role`-only.
 *
 * @param p_secret_id The existing secret id (`connections__postgres.vault_secret_id`).
 * @param p_new_secret The new plaintext value to encrypt.
 * @param p_workspace_id The workspace the caller is acting in. The rotation
 *   is refused unless this matches the workspace of the connection row that
 *   actually owns `p_secret_id`.
 */
create or replace function public.rpc_connections__update_vault_secret (
  p_secret_id uuid,
  p_new_secret text,
  p_workspace_id uuid
) returns void language plpgsql security definer
set
  search_path = public, vault as $$
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id = p_workspace_id
  ) then
    raise exception 'Secret % does not belong to a connection in this workspace', p_secret_id;
  end if;

  perform vault.update_secret(p_secret_id, p_new_secret);
end;
$$;

-- `service_role` only. Never grant this to `authenticated` or `anon` - it
-- is the only path allowed to rotate a connector credential in Vault.
revoke
execute on function public.rpc_connections__update_vault_secret (uuid, text, uuid)
from
  public,
  anon,
  authenticated;

grant
execute on function public.rpc_connections__update_vault_secret (uuid, text, uuid) to service_role;
